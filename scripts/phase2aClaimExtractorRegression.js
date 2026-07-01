#!/usr/bin/env node
/**
 * Phase 2A — claim extractor regression via production runBuddy path.
 * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2aClaimExtractorRegression.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { extractClaims } = require('../services/claimExtractor');
const { buildDoctrineConclusion } = require('../services/doctrineConclusionBuilder');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2a-claim-extractor-regression.json');

const TOPICS = [
  { id: 'logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'third_heaven', message: 'What is the third heaven?' },
  { id: 'acts_10', message: 'Does Acts 10 make pork clean?' },
  { id: 'pork', message: 'Can I eat pork?' },
  { id: 'sabbath', message: 'How do we keep the Sabbath holy?' },
  { id: 'death_state', message: 'What happens when we die?' },
  { id: 'kingdom', message: 'What is the kingdom of God?' },
];

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

async function runTopic({ id, message }) {
  const uid = `phase2a-${id}`;
  clearActiveConversation(uid);
  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', message);
  const rt = reply.runtime || {};
  const dbg = getDbg(reply);
  const claims = reply.claims || [];
  const cv = rt.claimValidation || reply.claimValidation || {};
  const inferred = claims.some((c) => c.claimId === 'c_inferred');
  const mapped = claims.filter((c) => (c.supportingScriptures || []).length > 0).length;
  const extractor = claims.filter(
    (c) => c.derivedFrom === 'scripture_witness' || c.derivedFrom === 'sentence_ref'
  ).length;

  return {
    id,
    message,
    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
    claimsExtracted: claims.length,
    claimsMapped: mapped,
    extractorClaims: extractor,
    inferredUsed: inferred,
    confidence: claims.map((c) => ({
      claimId: c.claimId,
      confidence: c.confidence,
      refs: (c.supportingScriptures || []).length,
      derivedFrom: c.derivedFrom,
    })),
    doctrineConclusion: reply.doctrineConclusion || '',
    doctrineConclusionLen: String(reply.doctrineConclusion || '').length,
    validator: {
      passed: cv.passed,
      classifications: (cv.claimResults || []).map((c) => ({
        claimId: c.claimId,
        classification: c.classification,
        decision: c.validatorDecision,
        issues: c.issues,
      })),
    },
    approval: {
      decision: rt.claimDegraded
        ? 'degraded'
        : cv.passed === false
          ? 'rejected'
          : dbg.openaiCalled || rt.openAiCalled
            ? 'approved'
            : 'blocked',
      claimDegraded: !!rt.claimDegraded,
      admin_flags: reply.admin_flags || [],
    },
    claims: claims.map((c) => ({
      claimId: c.claimId,
      claim: String(c.claim || '').slice(0, 160),
      supportingScriptures: c.supportingScriptures || [],
      sourceSentence: c.sourceSentence ? String(c.sourceSentence).slice(0, 120) : null,
      confidence: c.confidence,
      derivedFrom: c.derivedFrom,
    })),
    replyPreview: String(reply.reply || '').slice(0, 200),
  };
}

async function main() {
  const topics = [];
  for (const t of TOPICS) {
    topics.push(await runTopic(t));
  }

  const ok = topics.filter((t) => t.openaiCalled);
  const result = {
    ranAt: new Date().toISOString(),
    topics,
    aggregate: {
      total: topics.length,
      openaiSuccess: ok.length,
      totalClaims: ok.reduce((n, t) => n + t.claimsExtracted, 0),
      totalMapped: ok.reduce((n, t) => n + t.claimsMapped, 0),
      inferredCount: ok.filter((t) => t.inferredUsed).length,
      extractorClaimCount: ok.reduce((n, t) => n + t.extractorClaims, 0),
      doctrineConclusionPopulated: ok.filter((t) => t.doctrineConclusionLen > 0).length,
      validatorPassed: ok.filter((t) => t.validator.passed).length,
      approvalApproved: ok.filter((t) => t.approval.decision === 'approved').length,
      approvalDegraded: ok.filter((t) => t.approval.decision === 'degraded').length,
      mappedRate: ok.length
        ? Math.round((ok.reduce((n, t) => n + t.claimsMapped, 0) / Math.max(1, ok.reduce((n, t) => n + t.claimsExtracted, 0))) * 100)
        : 0,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, aggregate: result.aggregate }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
