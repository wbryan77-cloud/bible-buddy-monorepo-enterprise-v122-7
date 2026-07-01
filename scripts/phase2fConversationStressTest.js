#!/usr/bin/env node
/**
 * Phase 2F — real conversation stress test (100 scenarios).
 * Usage: export OPENAI_API_KEY=sk-... && node scripts/phase2fConversationStressTest.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { detectForbiddenProse } = require('../services/forbiddenProseGuard');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2f-conversation-stress-results.json');

const STUDY_RE = /You've been studying|Would you like to continue studying|continue your study journey/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture|carries the theme forward/i;
const HISTORY_RE = /Constantine|Council of Laodicea|Saturday to Sunday/i;

const SINGLE_SCENARIOS = [
  // Doctrine (25)
  { id: 'doc_01', group: 'doctrine', message: 'What does Logos mean in John 1:1?' },
  { id: 'doc_02', group: 'doctrine', message: 'What is the kingdom of God?' },
  { id: 'doc_03', group: 'doctrine', message: 'Can I eat pork?' },
  { id: 'doc_04', group: 'doctrine', message: 'What is the third heaven?' },
  { id: 'doc_05', group: 'doctrine', message: 'Does Acts 10 make pork clean?' },
  { id: 'doc_06', group: 'doctrine', message: 'How do we keep the Sabbath holy?' },
  { id: 'doc_07', group: 'doctrine', message: 'What happens when we die?' },
  { id: 'doc_08', group: 'doctrine', message: 'What does Scripture teach about resurrection?' },
  { id: 'doc_09', group: 'doctrine', message: 'What does holy mean?' },
  { id: 'doc_10', group: 'doctrine', message: 'Where does Jesus say no man has ascended to heaven?' },
  { id: 'doc_11', group: 'doctrine', message: 'What does Thy Kingdom Come mean?' },
  { id: 'doc_12', group: 'doctrine', message: 'Does Revelation teach the kingdom comes to earth?' },
  { id: 'doc_13', group: 'doctrine', message: 'What is a Sabbath day according to Scripture?' },
  { id: 'doc_14', group: 'doctrine', message: 'Should I keep the Sabbath on Saturday?' },
  { id: 'doc_15', group: 'doctrine', message: 'What does holy mean in the Sabbath commandment?' },
  { id: 'doc_16', group: 'doctrine', message: 'How many heavens are talked about in the Bible?' },
  { id: 'doc_17', group: 'doctrine', message: 'What is the third heaven Paul mentions?' },
  { id: 'doc_18', group: 'doctrine', message: 'Are believers going to heaven or is the kingdom coming to earth?' },
  { id: 'doc_19', group: 'doctrine', message: 'Explain heaven line upon line from Scripture only.' },
  { id: 'doc_20', group: 'doctrine', message: 'Jesus said where I go ye cannot come. What does that mean?' },
  { id: 'doc_21', group: 'doctrine', message: 'What does the Bible say about clean and unclean food?' },
  { id: 'doc_22', group: 'doctrine', message: 'What is the state of the dead according to Scripture?' },
  { id: 'doc_23', group: 'doctrine', message: 'Does the Bible say believers go to the third heaven?' },
  { id: 'doc_24', group: 'doctrine', message: 'Give me Bible only. No traditions.' },
  { id: 'doc_25', group: 'doctrine', message: 'What does it mean to be holy as God is holy?' },
  // Emotional (25)
  { id: 'emo_01', group: 'emotional', message: 'I lost someone I love.' },
  { id: 'emo_02', group: 'emotional', message: 'I feel abandoned by God.' },
  { id: 'emo_03', group: 'emotional', message: 'I am angry with God.' },
  { id: 'emo_04', group: 'emotional', message: 'Today has been a rough day. I had to let go of someone I love.' },
  { id: 'emo_05', group: 'emotional', message: "My mother has Alzheimer's and I feel overwhelmed." },
  { id: 'emo_06', group: 'emotional', message: "I'm so angry I can't think straight." },
  { id: 'emo_07', group: 'emotional', message: "I'm worried about money and bills this month." },
  { id: 'emo_08', group: 'emotional', message: 'I feel guilty about my past.' },
  { id: 'emo_09', group: 'emotional', message: 'I am grieving and cannot sleep.' },
  { id: 'emo_10', group: 'emotional', message: 'Please pray for my family.' },
  { id: 'emo_11', group: 'emotional', message: 'I feel alone in my faith.' },
  { id: 'emo_12', group: 'emotional', message: 'My marriage is falling apart.' },
  { id: 'emo_13', group: 'emotional', message: 'I am scared about the future.' },
  { id: 'emo_14', group: 'emotional', message: 'I miss my father who passed away.' },
  { id: 'emo_15', group: 'emotional', message: 'I feel like God is silent.' },
  { id: 'emo_16', group: 'emotional', message: 'I am struggling with depression.' },
  { id: 'emo_17', group: 'emotional', message: 'My friend betrayed me and I am hurting.' },
  { id: 'emo_18', group: 'emotional', message: 'I cannot forgive myself.' },
  { id: 'emo_19', group: 'emotional', message: 'I am anxious about my health.' },
  { id: 'emo_20', group: 'emotional', message: 'I feel spiritually dry.' },
  { id: 'emo_21', group: 'emotional', message: 'My child is sick and I am afraid.' },
  { id: 'emo_22', group: 'emotional', message: 'I lost my job and feel hopeless.' },
  { id: 'emo_23', group: 'emotional', message: 'I am lonely.' },
  { id: 'emo_24', group: 'emotional', message: 'I need comfort from Scripture.' },
  { id: 'emo_25', group: 'emotional', message: 'How do I trust God when life hurts?' },
  // Mixed (25)
  { id: 'mix_01', group: 'mixed', message: 'My father died. Where is he now?' },
  { id: 'mix_02', group: 'mixed', message: 'Why would God allow suffering?' },
  { id: 'mix_03', group: 'mixed', message: 'How do I keep the Sabbath while working a job?' },
  { id: 'mix_04', group: 'mixed', message: 'My mom died. Is she in heaven now?' },
  { id: 'mix_05', group: 'mixed', message: 'I am grieving. What does the Bible say about death?' },
  { id: 'mix_06', group: 'mixed', message: 'Can I eat pork and still be faithful?' },
  { id: 'mix_07', group: 'mixed', message: 'I feel abandoned. Does Scripture say God leaves us?' },
  { id: 'mix_08', group: 'mixed', message: 'My spouse died. Will I see them at resurrection?' },
  { id: 'mix_09', group: 'mixed', message: 'I am angry. What does the Bible say about anger?' },
  { id: 'mix_10', group: 'mixed', message: 'How do I honor God with my diet?' },
  { id: 'mix_11', group: 'mixed', message: 'I lost my job. Where is the kingdom hope?' },
  { id: 'mix_12', group: 'mixed', message: 'My friend says we go to heaven when we die. What does Scripture say?' },
  { id: 'mix_13', group: 'mixed', message: 'I want to keep Sabbath holy but my church meets Sunday.' },
  { id: 'mix_14', group: 'mixed', message: 'Please help me understand Logos. I am confused and sad.' },
  { id: 'mix_15', group: 'mixed', message: 'My grandmother passed. Is she sleeping until resurrection?' },
  { id: 'mix_16', group: 'mixed', message: 'Why does God allow pain if He is holy?' },
  { id: 'mix_17', group: 'mixed', message: 'I am worried about my soul. What happens when we die?' },
  { id: 'mix_18', group: 'mixed', message: 'Can you explain the kingdom and comfort me about my loss?' },
  { id: 'mix_19', group: 'mixed', message: 'I feel guilty eating unclean food. What does the Bible say?' },
  { id: 'mix_20', group: 'mixed', message: 'My brother died. Third heaven or resurrection hope?' },
  { id: 'mix_21', group: 'mixed', message: 'How do I pray when I am angry with God?' },
  { id: 'mix_22', group: 'mixed', message: 'Sabbath rest while caring for a sick parent?' },
  { id: 'mix_23', group: 'mixed', message: 'Is pork a salvation issue? I am anxious.' },
  { id: 'mix_24', group: 'mixed', message: 'What does holy mean? I want to live right.' },
  { id: 'mix_25', group: 'mixed', message: 'Grieving and wondering about the resurrection.' },
  // Challenge (25)
  { id: 'chl_01', group: 'challenge', message: 'Acts 10 proves pork is clean. Change my mind.' },
  { id: 'chl_02', group: 'challenge', message: 'We go to heaven when we die. The Bible says so.' },
  { id: 'chl_03', group: 'challenge', message: 'Sunday replaced the Sabbath. Everyone knows that.' },
  { id: 'chl_04', group: 'challenge', message: '2 Corinthians 5:8 proves we go to heaven immediately at death.' },
  { id: 'chl_05', group: 'challenge', message: 'Believers go to the third heaven when they die.' },
  { id: 'chl_06', group: 'challenge', message: 'The kingdom is in heaven, not on earth.' },
  { id: 'chl_07', group: 'challenge', message: 'You are wrong about pork. Acts 10 is clear.' },
  { id: 'chl_08', group: 'challenge', message: 'My pastor says Sabbath was nailed to the cross.' },
  { id: 'chl_09', group: 'challenge', message: 'John 14:3 means we go to heaven when we die.' },
  { id: 'chl_10', group: 'challenge', message: 'Leviticus is outdated. Pork is fine.' },
  { id: 'chl_11', group: 'challenge', message: 'Prove from Scripture that we do not go to heaven at death.' },
  { id: 'chl_12', group: 'challenge', message: 'Constantine changed the Sabbath. Admit it.' },
  { id: 'chl_13', group: 'challenge', message: '2 Corinthians 12:2 proves our eternal home is the third heaven.' },
  { id: 'chl_14', group: 'challenge', message: 'Matthew 6:10 is only a prayer, not about earth.' },
  { id: 'chl_15', group: 'challenge', message: 'Hebrews 4 means we do not need the seventh day anymore.' },
  { id: 'chl_16', group: 'challenge', message: 'You did not answer my question about pork.' },
  { id: 'chl_17', group: 'challenge', message: 'That was not my question about the Sabbath.' },
  { id: 'chl_18', group: 'challenge', message: 'Everyone eats pork. Stop being legalistic.' },
  { id: 'chl_19', group: 'challenge', message: 'The soul goes to heaven. Do not give me sleep metaphors.' },
  { id: 'chl_20', group: 'challenge', message: 'Revelation 21 is only symbolic, not on earth.' },
  { id: 'chl_21', group: 'challenge', message: 'Acts 11 confirms all food is clean now.' },
  { id: 'chl_22', group: 'challenge', message: 'Why do you ignore church tradition on Sunday worship?' },
  { id: 'chl_23', group: 'challenge', message: 'John 3:13 does not apply to believers today.' },
  { id: 'chl_24', group: 'challenge', message: 'You are just repeating old arguments about the kingdom.' },
  { id: 'chl_25', group: 'challenge', message: 'Give me a yes or no: can I eat pork?' },
];

const MULTI_TURN_CHAINS = [
  {
    id: 'chain_death_5',
    group: 'mixed',
    turns: [
      'My father died last week.',
      'Where is he now according to Scripture?',
      'So he is sleeping until the resurrection?',
      'When is the resurrection?',
      'Thank you. That helps me grieve with hope.',
    ],
  },
  {
    id: 'chain_sabbath_5',
    group: 'mixed',
    turns: [
      'How do we keep the Sabbath holy?',
      'What scriptures support resting on the seventh day?',
      'Did Jesus keep the Sabbath?',
      'You did not mention Isaiah 58.',
      'How do I apply this while working Monday to Friday?',
    ],
  },
  {
    id: 'chain_pork_5',
    group: 'challenge',
    turns: [
      'Can I eat pork?',
      'But Acts 10 makes all foods clean.',
      'Peter said not to call anything unclean.',
      'So Leviticus does not apply anymore?',
      'Give me a clear yes or no from Scripture.',
    ],
  },
  {
    id: 'chain_kingdom_5',
    group: 'doctrine',
    turns: [
      'What is the kingdom of God?',
      'Is it in heaven or on earth?',
      'What about Revelation 21?',
      'Where do believers go when they die?',
      'How does John 13:33 fit with all this?',
    ],
  },
  {
    id: 'chain_grief_logos_5',
    group: 'emotional',
    turns: [
      'I am grieving and feel far from God.',
      'What does Logos mean in John 1:1?',
      'Does Scripture say God understands my pain?',
      'I am still angry.',
      'Can you pray with me and point me to one verse?',
    ],
  },
];

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function scoreOwnership(reply, dbg) {
  const violations = [];
  const text = String(reply.reply || '');
  if (!dbg.openaiCalled && !dbg.buildConnectionErrorReplyUsed) violations.push('openai_not_called');
  if (dbg.finalAnswerAuthor && dbg.finalAnswerAuthor !== 'openai' && dbg.finalAnswerAuthor !== 'connection_error') {
    violations.push(`wrong_author:${dbg.finalAnswerAuthor}`);
  }
  if (dbg.responderUsed && dbg.responderUsed !== true) violations.push('template_responder');
  if (dbg.templateUsed) violations.push('template_used');
  if (dbg.fallbackUsed) violations.push('fallback_used');
  if (dbg.studyFallbackUsed) violations.push('study_fallback');
  if (dbg.sourceGroundedResponderUsed) violations.push('source_grounded_responder');
  if (dbg.sabbathHistoryDeepResponderUsed) violations.push('sabbath_history_responder');
  if (STUDY_RE.test(text) || WITNESS_RE.test(text)) violations.push('template_prose');
  if (dbg.forbiddenPhraseDetected || detectForbiddenProse(text).detected) violations.push('forbidden_phrase');
  if (dbg.runtimeUsed && dbg.runtimeUsed !== 'core_openai_first') violations.push('wrong_runtime');
  return violations;
}

async function runTurn({ scenarioId, group, userId, message, turnIndex = 0 }) {
  const memBefore = snapshotMemory();
  const started = Date.now();
  let reply;
  let runtimeError = null;
  try {
    reply = await runBuddy(userId, 'COMPANION', 'ADAPTIVE_COMPANION', message);
  } catch (e) {
    runtimeError = String(e.message || e).slice(0, 300);
    reply = { reply: '', runtime: {} };
  }
  const latencyMs = Date.now() - started;
  const memAfter = snapshotMemory();
  const rt = reply.runtime || {};
  const cv = rt.claimValidation || reply.claimValidation || {};
  const dbg = getDbg(reply);
  const results = cv.claimResults || [];
  const classCounts = { A: 0, B: 0, C: 0, D: 0 };
  const graphMatches = [];
  for (const cr of results) {
    const c = cr.classification || cr.supportClass || 'C';
    if (classCounts[c] != null) classCounts[c] += 1;
    if (cr.supportGraphMatch?.id) graphMatches.push(cr.supportGraphMatch.id);
  }
  const approvalDecision = rt.claimDegraded
    ? 'degraded'
    : cv.passed === false
      ? 'rejected'
      : dbg.openaiCalled || rt.openAiCalled
        ? 'approved'
        : 'blocked';

  return {
    scenarioId,
    group,
    turnIndex,
    message,
    retrievedEvidence: {
      cardIds: cv.graph?.cardIds || [],
      catalogKeys: cv.graph?.catalogKeys || [],
      effectiveTopic: rt.effectiveTopic,
    },
    claims: (reply.claims || []).map((c) => ({ claimId: c.claimId, claim: c.claim?.slice(0, 200), scriptures: c.supportingScriptures })),
    claimResults: results.map((cr) => ({
      claimId: cr.claimId,
      supportClass: cr.classification || cr.supportClass,
      supportReason: cr.supportReason,
      supportGraphMatch: cr.supportGraphMatch?.id || null,
      validatorDecision: cr.validatorDecision,
    })),
    classCounts,
    approvalDecision,
    claimDegraded: !!rt.claimDegraded,
    finalAnswerPreview: String(reply.reply || '').slice(0, 400),
    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
    openaiModel: dbg.openaiModel || rt.openAiModel || null,
    memoryBefore: memBefore,
    memoryAfter: memAfter,
    memoryDeltaMb: memAfter.rssMb - memBefore.rssMb,
    latencyMs,
    runtimeError,
    ownershipViolations: scoreOwnership(reply, dbg),
    finalAnswerAuthor: dbg.finalAnswerAuthor || null,
    connectionError: !!dbg.buildConnectionErrorReplyUsed,
    regenHint: cv.regenHint ? true : false,
    graphMatches,
  };
}

async function main() {
  process.env.BUDDY_RUNTIME = 'legacy';
  process.env.BUDDY_TEMPLATE_PROSE = '0';
  process.env.BUDDY_DISABLE_STUDY_FALLBACK = '1';
  process.env.BUDDY_DEBUG = '1';

  const turns = [];
  const scenarioMeta = [];

  for (const s of SINGLE_SCENARIOS) {
    const uid = `phase2f-${s.id}`;
    clearActiveConversation(uid);
    scenarioMeta.push({ id: s.id, group: s.group, type: 'single', turns: 1 });
    const turn = await runTurn({ scenarioId: s.id, group: s.group, userId: uid, message: s.message });
    turns.push(turn);
    console.log(`[${turns.length}/120] ${s.id} approval=${turn.approvalDecision} claims=${turn.claimResults.length} owner=${turn.ownershipViolations.length}`);
    await new Promise((r) => setTimeout(r, 150));
  }

  for (const chain of MULTI_TURN_CHAINS) {
    const uid = `phase2f-${chain.id}`;
    clearActiveConversation(uid);
    scenarioMeta.push({ id: chain.id, group: chain.group, type: 'multi', turns: chain.turns.length });
    for (let i = 0; i < chain.turns.length; i += 1) {
      const turn = await runTurn({
        scenarioId: chain.id,
        group: chain.group,
        userId: uid,
        message: chain.turns[i],
        turnIndex: i,
      });
      turns.push(turn);
      console.log(`[${turns.length}/120] ${chain.id} t${i + 1} approval=${turn.approvalDecision} claims=${turn.claimResults.length}`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const doctrineTurns = turns.filter((t) => t.claims.length > 0 || t.group === 'doctrine' || t.group === 'challenge');
  const allClaims = turns.flatMap((t) => t.claimResults);
  const totals = { A: 0, B: 0, C: 0, D: 0 };
  for (const cr of allClaims) {
    const c = cr.supportClass || 'C';
    if (totals[c] != null) totals[c] += 1;
  }
  const graphMatchCount = allClaims.filter((cr) => cr.supportGraphMatch).length;
  const ownershipFails = turns.filter((t) => t.ownershipViolations.length > 0);
  const degraded = turns.filter((t) => t.approvalDecision === 'degraded');
  const connectionErrors = turns.filter((t) => t.connectionError);
  const rssValues = turns.map((t) => t.memoryAfter?.rssMb).filter((n) => typeof n === 'number');
  const peakRss = rssValues.length ? Math.max(...rssValues) : null;
  const avgRss = rssValues.length ? Math.round((rssValues.reduce((a, b) => a + b, 0) / rssValues.length) * 10) / 10 : null;

  const result = {
    ranAt: new Date().toISOString(),
    scenarioCount: SINGLE_SCENARIOS.length + MULTI_TURN_CHAINS.length,
    totalTurns: turns.length,
    scenarios: scenarioMeta,
    turns,
    aggregate: {
      classCounts: totals,
      totalClaims: allClaims.length,
      supportAccuracyPct:
        totals.A + totals.B + totals.C + totals.D > 0
          ? Math.round(((totals.A + totals.B) / (totals.A + totals.B + totals.C + totals.D)) * 100)
          : null,
      approvalApproved: turns.filter((t) => t.approvalDecision === 'approved').length,
      approvalDegraded: degraded.length,
      approvalRejected: turns.filter((t) => t.approvalDecision === 'rejected').length,
      degradationRatePct: turns.length ? Math.round((degraded.length / turns.length) * 100) : 0,
      graphMatchCount,
      graphParticipationPct: allClaims.length ? Math.round((graphMatchCount / allClaims.length) * 100) : 0,
      ownershipViolationTurns: ownershipFails.length,
      connectionErrors: connectionErrors.length,
      runtimeErrors: turns.filter((t) => t.runtimeError).length,
      peakRssMb: peakRss,
      avgRssMb: avgRss,
      openaiCallCount: turns.filter((t) => t.openaiCalled).length,
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
