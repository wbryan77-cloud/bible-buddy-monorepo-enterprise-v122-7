#!/usr/bin/env node
/**
 * Phase 2B — support relationship engine regression.
 * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2bSupportRelationshipRegression.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildClaimTraceabilityMatrix } = require('../services/claimTraceabilityMatrix');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2b-support-relationship-regression.json');
const MATRIX_OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'claim-traceability-matrix-v2.json');

const TOPICS = [
  { id: 'third_heaven', message: 'What is the third heaven?' },
  { id: 'kingdom', message: 'What is the kingdom of God?' },
  { id: 'acts_10', message: 'Does Acts 10 make pork clean?' },
  { id: 'pork', message: 'Can I eat pork?' },
  { id: 'sabbath', message: 'How do we keep the Sabbath holy?' },
  { id: 'death_state', message: 'What happens when we die?' },
  { id: 'resurrection', message: 'What does Scripture teach about resurrection?' },
  { id: 'logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'holy', message: 'What does holy mean?' },
];

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

async function runTopic({ id, message }) {
  const uid = `phase2b-${id}`;
  clearActiveConversation(uid);
  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', message);
  const rt = reply.runtime || {};
  const cv = rt.claimValidation || reply.claimValidation || {};
  const results = cv.claimResults || reply.claims || [];

  const approvalDecision = rt.claimDegraded
    ? 'degraded'
    : cv.passed === false
      ? 'rejected'
      : getDbg(reply).openaiCalled || rt.openAiCalled
        ? 'approved'
        : 'blocked';

  const retrievedEvidence = {
    cardIds: (rt.evidenceCards || cv.graph?.cardIds || []).length
      ? cv.graph?.cardIds
      : undefined,
    topic: rt.evidenceTopic || rt.effectiveTopic,
    effectiveTopic: rt.effectiveTopic,
  };
  if (cv.graph) {
    retrievedEvidence.cardIds = cv.graph.cardIds;
    retrievedEvidence.catalogKeys = cv.graph.catalogKeys;
  }

  const matrix = buildClaimTraceabilityMatrix({
    question: message,
    claims: reply.claims || [],
    claimResults: results,
    retrievedEvidence: {
      cardIds: cv.graph?.cardIds || [],
      catalogKeys: cv.graph?.catalogKeys || [],
      effectiveTopic: rt.effectiveTopic,
    },
    validation: cv,
    approval: { decision: approvalDecision, degraded: !!rt.claimDegraded },
  });

  const classCounts = matrix.summary.classCounts;

  return {
    id,
    message,
    openaiCalled: !!(getDbg(reply).openaiCalled ?? rt.openAiCalled),
    claimsExtracted: results.length,
    classCounts,
    supportAccuracyPct: matrix.summary.supportAccuracyPct,
    validatorPassed: cv.passed,
    approvalDecision,
    claimDegraded: !!rt.claimDegraded,
    matrix: matrix.matrix,
    summary: matrix.summary,
  };
}

async function main() {
  const topics = [];
  for (const t of TOPICS) {
    topics.push(await runTopic(t));
  }

  const ok = topics.filter((t) => t.openaiCalled);
  const totals = { A: 0, B: 0, C: 0, D: 0 };
  for (const t of ok) {
    for (const k of Object.keys(totals)) totals[k] += t.classCounts[k] || 0;
  }

  const result = {
    ranAt: new Date().toISOString(),
    topics,
    aggregate: {
      total: topics.length,
      openaiSuccess: ok.length,
      totalClaims: ok.reduce((n, t) => n + t.claimsExtracted, 0),
      classCounts: totals,
      supportAccuracyPct:
        totals.A + totals.B + totals.C + totals.D > 0
          ? Math.round(((totals.A + totals.B) / (totals.A + totals.B + totals.C + totals.D)) * 100)
          : null,
      validatorPassed: ok.filter((t) => t.validatorPassed).length,
      approvalApproved: ok.filter((t) => t.approvalDecision === 'approved').length,
      approvalDegraded: ok.filter((t) => t.approvalDecision === 'degraded').length,
      allHaveSupportReason: ok.every((t) => t.matrix.every((r) => r.supportReason)),
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  fs.writeFileSync(
    MATRIX_OUT,
    JSON.stringify(
      {
        version: 2,
        ranAt: result.ranAt,
        turns: topics.map((t) => ({
          id: t.id,
          question: t.message,
          approvalDecision: t.approvalDecision,
          matrix: t.matrix,
        })),
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ ok: true, out: OUT, aggregate: result.aggregate }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
