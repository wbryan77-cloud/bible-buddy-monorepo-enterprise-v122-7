#!/usr/bin/env node
/**
 * Phase 2H — support graph regression + Class C replay + optional live topics.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildClaimTraceabilityMatrix } = require('../services/claimTraceabilityMatrix');
const { classifyDoctrineClaim } = require('../services/claimToScriptureValidator');
const { buildApprovedEvidenceGraph } = require('../services/approvedEvidenceGraph');
const { getCardById, retrieveEvidenceCards } = require('../services/evidenceCards');
const { buildApprovedCatalogEvidence } = require('../services/approvedCatalogEvidence');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');
const { detectForbiddenProse } = require('../services/forbiddenProseGuard');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2h-regression-results.json');
const INV = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2g-class-c-inventory.json');
const PHASE2G = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2f-conversation-stress-results.json');

const TOPICS = [
  { id: 'sabbath', message: 'How do we keep the Sabbath holy?' },
  { id: 'death_state', message: 'What is the state of the dead according to Scripture?' },
  { id: 'resurrection', message: 'What does Scripture teach about resurrection?' },
  { id: 'third_heaven', message: 'What is the third heaven?' },
  { id: 'kingdom', message: 'What is the kingdom of God?' },
  { id: 'acts_10', message: 'Does Acts 10 make pork clean?' },
  { id: 'pork', message: 'Can I eat pork?' },
  { id: 'logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'holy', message: 'What does holy mean?' },
];

const STUDY_RE = /You've been studying|Would you like to continue studying/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture/i;

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function topicToCard(topic) {
  const m = {
    sabbath: 'sabbath',
    holiness: 'holiness',
    deathState: 'deathState',
    kingdom: 'kingdom',
    dietary_law: 'dietaryLaw',
    messiah_logos: 'messiahLogos',
    heavens: 'heavens',
  };
  return m[topic] || null;
}

function replayClassCInventory() {
  const inv = JSON.parse(fs.readFileSync(INV, 'utf8')).inventory;
  let fixed = 0;
  const remain = [];
  for (const e of inv) {
    const cards = retrieveEvidenceCards({ topic: e.topic, message: e.conversation });
    const cardObjs = cards.length ? cards : topicToCard(e.topic) ? [getCardById(topicToCard(e.topic))] : [];
    const cat = buildApprovedCatalogEvidence({
      topic: e.topic,
      message: e.conversation,
      cardTopics: cardObjs.map((c) => c.cardId),
    });
    const graph = buildApprovedEvidenceGraph({
      evidenceCards: { cards: cardObjs },
      approvedCatalogEvidence: cat,
      effectiveTopic: e.topic,
      message: e.conversation,
    });
    const r = classifyDoctrineClaim({ claim: e.claim, supportingScriptures: e.scriptures }, graph);
    if (r.classification === 'C') {
      remain.push({ id: e.id, topic: e.topic, sub: e.rootCause?.sub, claim: e.claim.slice(0, 100) });
    } else {
      fixed++;
    }
  }
  return { total: inv.length, fixed, remain: remain.length, remainList: remain };
}

async function runLiveTopic({ id, message }) {
  const uid = `phase2h-${id}`;
  clearActiveConversation(uid);
  const started = Date.now();
  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', message);
  const rt = reply.runtime || {};
  const cv = rt.claimValidation || reply.claimValidation || {};
  const dbg = getDbg(reply);
  const results = cv.claimResults || [];
  const classCounts = { A: 0, B: 0, C: 0, D: 0 };
  let graphMatches = 0;
  for (const cr of results) {
    const c = cr.classification || cr.supportClass || 'C';
    if (classCounts[c] != null) classCounts[c] += 1;
    if (cr.supportGraphMatch?.id) graphMatches += 1;
  }
  const approvalDecision = rt.claimDegraded
    ? 'degraded'
    : cv.passed === false
      ? 'rejected'
      : dbg.openaiCalled || rt.openAiCalled
        ? 'approved'
        : 'blocked';
  const violations = [];
  if (dbg.responderUsed && dbg.responderUsed !== true) violations.push('responder');
  if (dbg.templateUsed) violations.push('template');
  if (STUDY_RE.test(reply.reply || '') || WITNESS_RE.test(reply.reply || '')) violations.push('template_prose');
  if (dbg.forbiddenPhraseDetected || detectForbiddenProse(reply.reply || '').detected) violations.push('forbidden');

  const matrix = buildClaimTraceabilityMatrix({
    question: message,
    claims: reply.claims || [],
    claimResults: results,
    retrievedEvidence: { cardIds: cv.graph?.cardIds || [], catalogKeys: cv.graph?.catalogKeys || [] },
    validation: cv,
    approval: { decision: approvalDecision, degraded: !!rt.claimDegraded },
  });

  return {
    id,
    message,
    latencyMs: Date.now() - started,
    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
    approvalDecision,
    classCounts,
    graphMatches,
    claims: results.length,
    ownershipViolations: violations,
    matrix: matrix.summary,
  };
}

async function main() {
  process.env.BUDDY_RUNTIME = 'legacy';
  process.env.BUDDY_TEMPLATE_PROSE = '0';
  process.env.BUDDY_DISABLE_STUDY_FALLBACK = '1';
  process.env.BUDDY_DEBUG = '1';

  const classCReplay = replayClassCInventory();
  const edges = getAllApprovedSupportEdges();

  const live = [];
  for (const t of TOPICS) {
    console.log(`[live] ${t.id}...`);
    live.push(await runLiveTopic(t));
    await new Promise((r) => setTimeout(r, 200));
  }

  const totals = { A: 0, B: 0, C: 0, D: 0 };
  let graphMatchClaims = 0;
  let totalClaims = 0;
  let degraded = 0;
  let approved = 0;
  let ownershipFails = 0;
  for (const r of live) {
    for (const [k, v] of Object.entries(r.classCounts)) totals[k] += v;
    totalClaims += r.claims;
    graphMatchClaims += r.graphMatches;
    if (r.approvalDecision === 'degraded') degraded += 1;
    if (r.approvalDecision === 'approved') approved += 1;
    if (r.ownershipViolations.length) ownershipFails += 1;
  }

  const phase2g = JSON.parse(fs.readFileSync(PHASE2G, 'utf8')).aggregate;

  const result = {
    ranAt: new Date().toISOString(),
    supportEdgeCount: edges.length,
    classCReplay,
    liveTopics: live,
    aggregate: {
      liveTopicCount: live.length,
      classCounts: totals,
      totalClaims,
      supportAccuracyPct:
        totalClaims > 0 ? Math.round(((totals.A + totals.B) / totalClaims) * 1000) / 10 : null,
      graphParticipationPct:
        totalClaims > 0 ? Math.round((graphMatchClaims / totalClaims) * 1000) / 10 : null,
      approvalApproved: approved,
      approvalDegraded: degraded,
      degradationRatePct: live.length ? Math.round((degraded / live.length) * 1000) / 10 : 0,
      ownershipViolationTurns: ownershipFails,
      openaiCallCount: live.filter((r) => r.openaiCalled).length,
    },
    comparePhase2F: {
      classC_stress: phase2g.classCounts.C,
      supportAccuracy_stress: phase2g.supportAccuracyPct,
      degradation_stress: phase2g.degradationRatePct,
      graphParticipation_stress: phase2g.graphParticipationPct,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, out: OUT, classCReplay, aggregate: result.aggregate }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
