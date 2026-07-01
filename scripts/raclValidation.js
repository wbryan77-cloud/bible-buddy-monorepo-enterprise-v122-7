#!/usr/bin/env node
/**
 * RACL validation — reason-first only, live OpenAI.
 *
 * Usage:
 *   BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node scripts/raclValidation.js
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { estimateProseBreakdown } = require('../services/reasonFirstTrace');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { overlapRatio } = require('../services/correctionLedger');

const ROOT = path.join(__dirname, '..');
const OUT_REPORT = path.join(ROOT, 'RACLImplementationReport.md');
const OUT_JSON = path.join(ROOT, 'docs', 'racl', 'validation-results.json');

const THREADS = [
  { id: 'job', name: 'Job opportunity', messages: ['I have a job opportunity.', 'The company is far away from home.', "I'm not sure whether to push or wait on this offer."] },
  { id: 'alz', name: "Alzheimer's caregiver", messages: ["My mom was recently diagnosed with Alzheimer's.", "Some days she doesn't remember who I am.", 'How do I stay close to God while grieving who she used to be?'] },
  { id: 'distant', name: 'Feeling distant from God', messages: ['I feel distant from God lately.', 'I pray but it feels empty.', 'Does that mean my faith is failing?'] },
  { id: 'sabbath', name: 'Sabbath wording thread', messages: [
    'Why should we keep Sunday as the day of worship onto the Lord?',
    'Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?',
    'Why are you using the term Roman church when the technical name is the Roman Catholic Church?',
    "No, I'm not asking about the shift. I'm asking about your wording.",
    'Why are you not answering my question?',
    "No, I'm not asking about history. I'm asking about your wording.",
    'Are you not listening to what I am asking?',
  ]},
  { id: 'grief', name: 'Grief thread', messages: ['I lost a friend Wednesday.', 'It is still bothering me.'] },
  { id: 'health', name: 'Health thread', messages: ['My knees hurt.', 'My knees are hurting again today.'] },
];

const GATE = {
  minOpenAiPct: 70,
  maxTemplatePct: 20,
  minListening: 7,
  sabbathT7Listening: 8,
};

function uid(prefix) {
  return `racl-${prefix}-${Date.now()}`;
}

function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);
}

function threadDetailHits(reply, priorMessages = []) {
  const corpus = priorMessages.join(' ').toLowerCase();
  const keywords = tokenize(corpus).filter((w) => w.length > 4);
  const unique = [...new Set(keywords)];
  return unique.filter((w) => reply.toLowerCase().includes(w)).length;
}

function shallowAckOnly(reply, priorMessages = []) {
  const hasShallow = /\bi hear\b|\bit sounds like\b|\bi understand\b/i.test(reply);
  if (!hasShallow) return false;
  const detailHits = threadDetailHits(reply, priorMessages);
  return detailHits < 2;
}

function isCorrectionTurn(message = '') {
  return /wording|not asking|not answering|not listening|you call it|i mean|i said|what i'?m asking/i.test(message);
}

function isQuestion(message = '') {
  return /\?/.test(message) || /why|how|does that mean|what/i.test(message);
}

/**
 * Human listening rubric (0-10) — five dimensions averaged.
 */
function scoreHumanListening({ reply, message, turnIndex, priorReply, priorMessages, threadId }) {
  if (/unavailable|composer unavailable/i.test(reply)) return { total: 0, dimensions: {} };

  const msg = String(message).toLowerCase();
  const prior = priorMessages.join(' ').toLowerCase();
  const detailHits = threadDetailHits(reply, priorMessages);

  // 1. Answered latest user message?
  let answeredLatest = 5;
  if (isQuestion(message)) {
    if (reply.length > 60) answeredLatest += 2;
    if (/wording|roman catholic|roman church/i.test(msg) && /shorthand|precise|term|wording|name/i.test(reply)) answeredLatest += 2;
    if (/distant|faith is failing|empty/i.test(msg) && /distant|empty|faith|pray|feel/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(msg) && /constantine|laodicea|historical chain|sabbath definition block/i.test(reply)) answeredLatest -= 3;
    if (/why do you think i feel distant/i.test(msg) && /template|generic prayer/i.test(reply)) answeredLatest -= 2;
  } else {
    if (detailHits >= 1 || reply.length > 50) answeredLatest += 2;
  }

  // 2. Used specific thread details?
  let threadSpecific = 4;
  if (detailHits >= 2) threadSpecific += 2;
  if (detailHits >= 4) threadSpecific += 2;
  if (/again today|still bothering|your mom|alzheimer|caregiv|job offer|far away|knee|friend wednesday/i.test(reply)) threadSpecific += 2;
  if (turnIndex > 0 && detailHits === 0 && reply.length > 120) threadSpecific -= 2;

  // 3. Avoided repeating prior answer?
  let noRepeat = 7;
  if (priorReply) {
    const ratio = overlapRatio(reply, priorReply);
    if (ratio >= 0.65) noRepeat -= 4;
    else if (ratio >= 0.5) noRepeat -= 2;
    else if (ratio < 0.35) noRepeat += 1;
    if (openingMatch(reply, priorReply)) noRepeat -= 3;
  }

  // 4. Recovered when corrected?
  let correctionRecovery = null;
  if (isCorrectionTurn(message)) {
    correctionRecovery = 5;
    if (/misunderstood|you('re| are) right|fair point|clarify|my mistake|to be direct/i.test(reply)) correctionRecovery += 2;
    if (/roman catholic|wording|shorthand|precise name/i.test(msg) && /roman catholic|shorthand|wording|precise/i.test(reply)) correctionRecovery += 2;
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(msg)) correctionRecovery -= 2;
    correctionRecovery = Math.max(0, Math.min(10, correctionRecovery));
  }

  // 5. Would a human feel heard?
  let feltHeard = 5;
  if (shallowAckOnly(reply, priorMessages)) feltHeard -= 3;
  else if (detailHits >= 2) feltHeard += 2;
  if (/you('re| are) asking about|what you('re| are) asking/i.test(reply) && detailHits >= 1) feltHeard += 1;
  if (/not listening|not answering/i.test(msg) && !/direct|specifically|wording|roman catholic/i.test(reply)) feltHeard -= 2;

  // Thread-specific bonuses
  if (threadId === 'alz' && /mom|alzheimer|caregiv|remember who/i.test(reply)) feltHeard += 1;
  if (threadId === 'distant' && /distant|empty|faith|pray/i.test(reply) && !/just pray more/i.test(reply)) feltHeard += 1;

  const dims = {
    answeredLatest: clamp(answeredLatest),
    threadSpecific: clamp(threadSpecific),
    noRepeat: clamp(noRepeat),
    feltHeard: clamp(feltHeard),
  };
  if (correctionRecovery !== null) dims.correctionRecovery = correctionRecovery;

  const values = Object.values(dims);
  const total = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

  return { total, dimensions: dims };
}

function openingMatch(a, b) {
  const open = (t) => {
    const m = String(t || '').trim().match(/^(.+?[.!?])/);
    return (m ? m[1] : String(t).slice(0, 100)).toLowerCase().trim();
  };
  return open(a) === open(b) && open(a).length > 20;
}

function clamp(n) {
  return Math.max(0, Math.min(10, n));
}

async function runThread(spec) {
  const prev = process.env.BUDDY_RUNTIME;
  process.env.BUDDY_RUNTIME = 'reason_first';
  const userId = uid(spec.id);
  clearActiveConversation(userId);
  const turns = [];
  const priorMessages = [];

  const H = require('../services/buddyBrain');
  const { buildRuntimeContext } = require('../services/runtimeOrchestrator');

  try {
    for (let i = 0; i < spec.messages.length; i += 1) {
      const message = spec.messages[i];
      const recentSessions = H.getRecentSessions(userId, 10);
      const profile = H.getUserCompanionProfile(userId);
      const safety = H.classifySafety(message);
      let runtimeContext = buildRuntimeContext({ message, mode: 'COMPANION', profile, recentSessions, safety });
      runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });

      const evidencePack = buildRetrievalEvidencePack({
        userId,
        message,
        mode: 'COMPANION',
        recentSessions,
        runtimeContext,
        profile,
        safety,
      });

      const structured = await runBuddy({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
      const reply = String(structured?.reply || '');
      const openaiCalled = !!(structured?.runtime?.openaiCalled || structured?.runtime?.masterRoute === 'reason_first_openai');
      const breakdown = estimateProseBreakdown(reply, 'reason_first', openaiCalled);
      const priorReply = i > 0 ? turns[i - 1].reply : null;
      const humanListening = scoreHumanListening({
        reply,
        message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
        threadId: spec.id,
      });

      turns.push({
        turn: i + 1,
        message,
        reply,
        masterRoute: structured?.runtime?.masterRoute,
        openaiCalled,
        templateCharsPct: breakdown.templateCharsPct,
        humanListening: humanListening.total,
        listeningDimensions: humanListening.dimensions,
        evidence: {
          threadLocalHitCount: evidencePack.threadLocal?.hitCount || 0,
          memorySnippetCount: evidencePack.memory?.snippets?.length || 0,
          correctionActive: !!evidencePack.correctionLedger?.active,
          priorAssistantQuote: evidencePack.correctionLedger?.priorAssistantQuote || null,
          companionTopic: evidencePack.companionThreadContext?.companionTopic || null,
          historyIncluded: !!evidencePack.history?.included,
        },
        overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
        companionTurnIntent: structured?.runtime?.companionTurnIntent || null,
        postureWarnings: structured?.runtime?.postureWarnings || [],
      });

      priorMessages.push(message);
    }
  } finally {
    process.env.BUDDY_RUNTIME = prev;
  }

  return { ...spec, userId, turns };
}

function aggregateMetrics(results) {
  const turns = results.flatMap((r) => r.turns);
  const nonCrisis = turns.filter((t) => t.masterRoute !== 'reason_first_crisis' && t.masterRoute !== 'crisis');
  const total = nonCrisis.length || 1;
  const openaiCount = nonCrisis.filter((t) => t.openaiCalled).length;
  const avgTemplate = nonCrisis.reduce((s, t) => s + t.templateCharsPct, 0) / total;
  const avgListening = nonCrisis.reduce((s, t) => s + t.humanListening, 0) / total;
  const memoryHits = nonCrisis.filter((t) => (t.evidence?.threadLocalHitCount || 0) > 0 || (t.evidence?.memorySnippetCount || 0) > 0).length;

  return {
    turns: total,
    openaiCount,
    openaiPct: Math.round((openaiCount / total) * 1000) / 10,
    avgTemplatePct: Math.round(avgTemplate * 10) / 10,
    avgHumanListening: Math.round(avgListening * 10) / 10,
    inThreadMemoryHitTurns: memoryHits,
  };
}

function evaluateSuccessCriteria(results, metrics) {
  const sabbath = results.find((r) => r.id === 'sabbath');
  const sabbathT7 = sabbath?.turns[6];
  const alz = results.find((r) => r.id === 'alz');
  const alzTurns = alz?.turns || [];

  const romanRepeatAfterCorrection = sabbath?.turns.slice(3).some(
    (t, idx) => {
      const prior = sabbath.turns[idx + 2]?.reply;
      return prior && overlapRatio(t.reply, prior) >= 0.55 && /roman church|constantine/i.test(t.reply);
    }
  );

  const alzContextOk = alzTurns.some((t) => /mom|alzheimer|caregiv|remember/i.test(t.reply));

  const checks = [
    {
      name: `Sabbath T7 human listening >= ${GATE.sabbathT7Listening}/10`,
      pass: (sabbathT7?.humanListening || 0) >= GATE.sabbathT7Listening,
      value: `${sabbathT7?.humanListening ?? 'n/a'}/10`,
    },
    {
      name: 'No repeated Roman church paragraph after correction',
      pass: !romanRepeatAfterCorrection,
      value: romanRepeatAfterCorrection ? 'FAIL — high overlap detected' : 'PASS',
    },
    {
      name: "Alzheimer's thread references mom/Alzheimer's/caregiver",
      pass: alzContextOk,
      value: alzContextOk ? 'PASS' : 'FAIL',
    },
    {
      name: 'In-thread memory hits on follow-ups',
      pass: metrics.inThreadMemoryHitTurns >= Math.floor(metrics.turns * 0.5),
      value: `${metrics.inThreadMemoryHitTurns}/${metrics.turns} turns`,
    },
    {
      name: `Average human listening >= ${GATE.minListening}/10`,
      pass: metrics.avgHumanListening >= GATE.minListening,
      value: `${metrics.avgHumanListening}/10`,
    },
    {
      name: `OpenAI usage >= ${GATE.minOpenAiPct}%`,
      pass: metrics.openaiPct >= GATE.minOpenAiPct,
      value: `${metrics.openaiPct}%`,
    },
    {
      name: `Template prose <= ${GATE.maxTemplatePct}%`,
      pass: metrics.avgTemplatePct <= GATE.maxTemplatePct,
      value: `${metrics.avgTemplatePct}%`,
    },
  ];

  return { checks, pass: checks.every((c) => c.pass) };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function buildReport({ results, metrics, gate, openaiAvailable }) {
  const lines = [];
  lines.push('# RACL Implementation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('Retrieval-Anchored Correction Loop (RACL) — reason-first path only. No production default change.');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **OpenAI unavailable.** Set `OPENAI_API_KEY` for live validation.');
    lines.push('');
  }
  lines.push(`**Validation gate:** ${gate.pass ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## RACL Components Implemented');
  lines.push('');
  lines.push('| Part | Component | File |');
  lines.push('| --- | --- | --- |');
  lines.push('| A | Thread-local memory snippets | `services/retrievalEvidencePack.js` |');
  lines.push('| B | Correction ledger | `services/correctionLedger.js` |');
  lines.push('| C | Prior assistant quote on meta/correction turns | `services/retrievalEvidencePack.js` |');
  lines.push('| D | Loop-control (no sentence reuse) | `services/doctrineBoundaryValidator.js` |');
  lines.push('| E | Companion thread context repair | `services/retrievalEvidencePack.js` |');
  lines.push('| F | Companion scripture stubs | `services/retrievalEvidencePack.js` |');
  lines.push('| G | Composer RACL addendum | `services/reasonFirstComposer.js` |');
  lines.push('| H | Human listening rubric | `scripts/raclValidation.js` |');
  lines.push('');
  lines.push('## Aggregate Metrics');
  lines.push('');
  lines.push(mdTable(
    ['Metric', 'Value'],
    [
      ['Turns', String(metrics.turns)],
      ['OpenAI %', `${metrics.openaiPct}%`],
      ['Avg template %', `${metrics.avgTemplatePct}%`],
      ['Avg human listening', `${metrics.avgHumanListening}/10`],
      ['In-thread memory hit turns', `${metrics.inThreadMemoryHitTurns}/${metrics.turns}`],
    ]
  ));
  lines.push('');
  lines.push('## Success Criteria');
  lines.push('');
  lines.push(mdTable(
    ['Check', 'Result', 'Value'],
    gate.checks.map((c) => [c.name, c.pass ? 'PASS' : 'FAIL', c.value])
  ));
  lines.push('');
  lines.push('## Per-Thread Results');
  lines.push('');

  for (const thread of results) {
    const avgListen = Math.round((thread.turns.reduce((s, t) => s + t.humanListening, 0) / thread.turns.length) * 10) / 10;
    lines.push(`### ${thread.name}`);
    lines.push('');
    lines.push(`Avg human listening: **${avgListen}/10**`);
    lines.push('');
    lines.push(mdTable(
      ['Turn', 'Listening', 'OpenAI', 'Thread mem', 'Correction', 'Overlap %'],
      thread.turns.map((t) => [
        String(t.turn),
        `${t.humanListening}/10`,
        t.openaiCalled ? 'yes' : 'no',
        String(t.evidence.threadLocalHitCount),
        t.evidence.correctionActive ? 'yes' : 'no',
        String(t.overlapWithPrior),
      ])
    ));
    lines.push('');
    const last = thread.turns[thread.turns.length - 1];
    lines.push('<details><summary>Last turn sample</summary>');
    lines.push('');
    lines.push(`**User:** ${last.message}`);
    lines.push('');
    lines.push('**Reply:**');
    lines.push('```');
    lines.push(last.reply.slice(0, 700));
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Human Listening Rubric');
  lines.push('');
  lines.push('Five dimensions (0-10 each), averaged:');
  lines.push('');
  lines.push('1. Answered the latest user message');
  lines.push('2. Used specific thread details');
  lines.push('3. Avoided repeating prior answer');
  lines.push('4. Recovered when corrected (correction turns only)');
  lines.push('5. Would a human feel heard');
  lines.push('');
  lines.push('Shallow "I hear" / "It sounds like" without thread details are penalized.');
  lines.push('');
  lines.push('## Stop Conditions');
  lines.push('');
  lines.push('- No deploy, no push, no Sprint 3');
  lines.push('- Production default remains `BUDDY_RUNTIME=legacy`');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const openai = require('../services/openaiClient');
  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const results = [];
  for (const spec of THREADS) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runThread(spec));
  }

  const metrics = aggregateMetrics(results);
  const gate = evaluateSuccessCriteria(results, metrics);

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable,
    runtime: 'reason_first',
    raclVersion: '1.0',
    metrics,
    gate,
    results,
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(OUT_REPORT, `${buildReport({ results, metrics, gate, openaiAvailable })}\n`);

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Gate: ${gate.pass ? 'PASS' : 'FAIL'} | Listening: ${metrics.avgHumanListening}/10 | OpenAI: ${metrics.openaiPct}%`);
  process.exit(gate.pass && openaiAvailable ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
