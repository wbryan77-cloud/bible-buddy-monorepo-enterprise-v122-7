#!/usr/bin/env node
/**
 * Scripture authority vs model authority audit — diagnosis only.
 * Usage: export OPENAI_API_KEY=... && node scripts/scriptureAuthorityAuditRunner.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildApprovedEvidenceGraph } = require('../services/approvedEvidenceGraph');
const { validateClaimToScripture, matchesForbidden } = require('../services/claimToScriptureValidator');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'scripture-authority-audit.json');

const TOPICS = [
  { id: 'third_heaven', label: 'Third heaven', message: 'What is the third heaven?' },
  { id: 'kingdom', label: 'Kingdom of God', message: 'What is the kingdom of God?' },
  { id: 'acts_10', label: 'Acts 10', message: 'Does Acts 10 make pork clean?' },
  { id: 'pork', label: 'Pork', message: 'Can I eat pork?' },
  { id: 'sabbath', label: 'Sabbath', message: 'How do we keep the Sabbath holy?' },
  { id: 'death_state', label: 'Death state', message: 'What happens when we die?' },
  { id: 'resurrection', label: 'Resurrection', message: 'What does Scripture teach about resurrection?' },
  { id: 'logos', label: 'Logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'holy', label: 'Holy', message: 'What does holy mean?' },
];

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function extractClaims(reply = {}) {
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const cv = reply.runtime?.claimValidation;
  if (cv?.claimResults?.length) return cv.claimResults;
  return [];
}

function extractScriptureCited(reply = {}) {
  const fromClaims = extractClaims(reply).flatMap((c) => c.supportingScriptures || []);
  const fromReply = (reply.scripture || []).map((s) => s.reference || s).filter(Boolean);
  return [...new Set([...fromClaims, ...fromReply])];
}

function deriveFromEvidence(claim = {}) {
  const df = claim.derivedFrom || '';
  if (/evidence_card:|catalog:/i.test(df)) return df;
  if ((claim.supportingScriptures || []).length) return 'inference_from_cited_refs';
  return null;
}

function scoreAuthority(claimResults = []) {
  const units = claimResults.filter((c) => !c.orphan || c.classification);
  if (!units.length) {
    return { evidenceDrivenPct: null, modelDrivenPct: null, totalUnits: 0, breakdown: { A: 0, B: 0, C: 0, D: 0 } };
  }
  const breakdown = { A: 0, B: 0, C: 0, D: 0 };
  for (const c of units) {
    const cl = c.classification || 'C';
    if (breakdown[cl] !== undefined) breakdown[cl] += 1;
  }
  const total = units.length;
  const evidence = breakdown.A + breakdown.B;
  const model = breakdown.C + breakdown.D;
  return {
    evidenceDrivenPct: Math.round((evidence / total) * 100),
    modelDrivenPct: Math.round((model / total) * 100),
    totalUnits: total,
    breakdown,
  };
}

function replyLevelModelLeak(reply = '') {
  const text = String(reply || '');
  if (!text || text.length < 20) return [];
  const hits = matchesForbidden(text);
  return hits.map((h) => ({
    claim: h.id,
    classification: h.classification,
    issue: h.issue,
    source: 'reply_orphan_scan',
  }));
}

async function auditTopic(topic) {
  const uid = `auth-audit-${topic.id}`;
  clearActiveConversation(uid);
  const memBefore = snapshotMemory();

  const pack = buildRetrievalEvidencePack({
    userId: uid,
    message: topic.message,
    routingHintsOnly: true,
  });
  pack.userMessage = topic.message;
  const graph = buildApprovedEvidenceGraph(pack);

  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', topic.message);
  const memAfter = snapshotMemory();
  const dbg = getDbg(reply);
  const openaiCalled = !!(dbg.openaiCalled ?? reply.runtime?.openAiCalled);
  const connectionError = !!dbg.buildConnectionErrorReplyUsed || reply.admin_flags?.includes('core_connection_error');

  const claims = extractClaims(reply);
  const validation = validateClaimToScripture({
    reply: reply.reply || '',
    claims,
    evidencePack: pack,
    message: topic.message,
  });

  const claimTraces = (validation.claimResults || []).map((c) => ({
    claim: c.claim,
    supportingScriptures: c.supportingScriptures || [],
    derivedFrom: c.derivedFrom || deriveFromEvidence(c),
    derivedFromEvidence: deriveFromEvidence(c) || (c.evidenceCards || graph.cardIds).join(',') || null,
    derivedFromModel: ['C', 'D'].includes(c.classification) ? 'model_prior_or_unverified' : null,
    confidence: c.confidence || null,
    classification: c.classification,
    supportClass: c.classification,
    supportRelationship: c.supportRelationship || null,
    validatorDecision: c.validatorDecision,
    issues: c.issues || [],
    orphan: !!c.orphan,
  }));

  const replyLeaks = connectionError ? [] : replyLevelModelLeak(reply.reply);
  const allUnits = [
    ...claimTraces,
    ...replyLeaks
      .filter((l) => !claimTraces.some((c) => c.issues?.includes(l.issue)))
      .map((l) => ({
        claim: l.claim,
        supportingScriptures: [],
        derivedFrom: null,
        derivedFromEvidence: null,
        derivedFromModel: 'reply_prose_pattern',
        confidence: null,
        classification: l.classification,
        supportClass: l.classification,
        supportRelationship: 'orphan',
        validatorDecision: l.classification === 'D' ? 'Rejected' : 'Rejected',
        issues: [l.issue],
        orphan: true,
      })),
  ];

  const authority = scoreAuthority(allUnits);
  const preFailureA = topic.id === 'holy' && !(pack.evidenceCards?.cards || []).length;

  return {
    id: topic.id,
    label: topic.label,
    question: topic.message,
    pipelineBlocked: connectionError || !openaiCalled,
    openaiCalled,
    preFailureA,
    retrievedEvidence: {
      topic: pack.topic,
      effectiveTopic: pack.effectiveTopic,
      cardIds: graph.cardIds,
      catalogKeys: graph.catalogKeys,
      approvedRefCount: graph.refs.length,
      bindingRuleCount: graph.bindingRules.length,
      hasEvidence: graph.hasEvidence,
    },
    scripturesCited: extractScriptureCited(reply),
    claimsGenerated: claims.map((c) => ({
      claimId: c.claimId,
      claim: c.claim,
      type: c.type,
      supportingScriptures: c.supportingScriptures || [],
      derivedFrom: c.derivedFrom,
    })),
    claimTraces: allUnits,
    validatorResult: {
      passed: validation.passed,
      skipped: validation.skipped,
      unsupportedClaims: validation.unsupportedClaims,
      contradictedClaims: validation.contradictedClaims,
    },
    finalAnswer: String(reply.reply || '').slice(0, 1500),
    approvalDecision: reply.runtime?.claimDegraded
      ? 'degraded'
      : validation.passed === false
        ? 'rejected_or_failed'
        : connectionError
          ? 'blocked_connection'
          : 'approved',
    authority,
    memoryBefore: memBefore,
    memoryAfter: memAfter,
  };
}

async function main() {
  const results = {
    ranAt: new Date().toISOString(),
    keyPresent: !!process.env.OPENAI_API_KEY,
    topics: [],
  };

  for (const topic of TOPICS) {
    results.topics.push(await auditTopic(topic));
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        topics: results.topics.map((t) => ({
          id: t.id,
          blocked: t.pipelineBlocked,
          evidencePct: t.authority.evidenceDrivenPct,
          modelPct: t.authority.modelDrivenPct,
          units: t.authority.totalUnits,
        })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
