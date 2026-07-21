#!/usr/bin/env node
/**
 * Companion turn-intent validation — reason-first RACL + posture rebalance.
 *
 * Usage:
 *   BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node scripts/companionTurnIntentValidation.js
 */

try {
  require('dotenv').config();
} catch (_) {}

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { estimateProseBreakdown } = require('../services/reasonFirstTrace');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildCompanionTurnIntent } = require('../services/companionTurnIntent');
const { validateCompanionPosture } = require('../services/companionPostureValidator');
const { overlapRatio } = require('../services/correctionLedger');
const { analyzeConversationShape, aggregateShape } = require('../services/conversationShapeAnalyzer');

const ROOT = path.join(__dirname, '..');
const BASELINE_JSON = path.join(ROOT, 'docs', 'racl', 'validation-results.json');
const OUT_JSON = path.join(ROOT, 'docs', 'companion-turn-intent', 'validation-results.json');
const OUT_REPORT = path.join(ROOT, 'CompanionTurnIntentImplementationReport.md');

const THREADS = [
  { id: 'job', name: 'Job opportunity', humanFeel: 'Job discernment' },
  { id: 'alz', name: "Alzheimer's caregiver", humanFeel: "Alzheimer's caregiver" },
  { id: 'distant', name: 'Feeling distant from God', humanFeel: 'Feeling distant from God' },
  { id: 'sabbath', name: 'Sabbath wording thread', humanFeel: 'Sabbath wording correction' },
  { id: 'grief', name: 'Grief thread', humanFeel: 'Grief' },
  { id: 'health', name: 'Health thread', humanFeel: 'Knee pain' },
];

const MESSAGES = {
  job: ['I have a job opportunity.', 'The company is far away from home.', "I'm not sure whether to push or wait on this offer."],
  alz: ["My mom was recently diagnosed with Alzheimer's.", "Some days she doesn't remember who I am.", 'How do I stay close to God while grieving who she used to be?'],
  distant: ['I feel distant from God lately.', 'I pray but it feels empty.', 'Does that mean my faith is failing?'],
  sabbath: [
    'Why should we keep Sunday as the day of worship onto the Lord?',
    'Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?',
    'Why are you using the term Roman church when the technical name is the Roman Catholic Church?',
    "No, I'm not asking about the shift. I'm asking about your wording.",
    'Why are you not answering my question?',
    "No, I'm not asking about history. I'm asking about your wording.",
    'Are you not listening to what I am asking?',
  ],
  grief: ['I lost a friend Wednesday.', 'It is still bothering me.'],
  health: ['My knees hurt.', 'My knees are hurting again today.'],
};

const GATE = {
  minListening: 7.2,
  targetListening: 7.5,
  minWarmth: 6.7,
  minFollowUp: 7.0,
  sabbathT7Listening: 8.0,
  minOpenAiPct: 70,
  maxTemplatePct: 20,
};

function uid(prefix) {
  return `turn-intent-${prefix}-${Date.now()}`;
}

function clamp(n) {
  return Math.max(0, Math.min(10, n));
}

function tokenize(text = '') {
  return String(text).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
}

function threadDetailHits(reply, priorMessages = []) {
  const corpus = priorMessages.join(' ').toLowerCase();
  const keywords = [...new Set(tokenize(corpus).filter((w) => w.length > 4))];
  return keywords.filter((w) => reply.toLowerCase().includes(w)).length;
}

function isCorrectionTurn(message = '') {
  return /wording|not asking|not answering|not listening|you call it|what i'?m asking/i.test(message);
}

function scoreHumanListening({ reply, message, turnIndex, priorReply, priorMessages, threadId }) {
  if (/unavailable/i.test(reply)) return { total: 0, dimensions: {} };

  const detailHits = threadDetailHits(reply, priorMessages);
  let answeredLatest = 5;
  if (/\?/.test(message)) {
    if (reply.length > 50) answeredLatest += 2;
    if (/wording|roman catholic/i.test(message) && /wording|roman catholic|shorthand|term/i.test(reply)) answeredLatest += 2;
    if (/faith is failing|empty|distant/i.test(message) && /faith|empty|distant|failing/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(message) && /constantine|laodicea/i.test(reply)) answeredLatest -= 3;
  } else if (detailHits >= 1 || reply.length > 40) answeredLatest += 2;

  let threadSpecific = 4;
  if (detailHits >= 2) threadSpecific += 2;
  if (detailHits >= 4) threadSpecific += 2;
  if (/again today|wednesday|your mom|alzheimer|far away|push or wait|knee/i.test(reply)) threadSpecific += 2;
  if (turnIndex > 0 && detailHits === 0 && reply.length > 100) threadSpecific -= 2;

  let noRepeat = 7;
  if (priorReply) {
    const ratio = overlapRatio(reply, priorReply);
    if (ratio >= 0.65) noRepeat -= 4;
    else if (ratio >= 0.5) noRepeat -= 2;
    else if (ratio < 0.35) noRepeat += 1;
  }

  let correctionRecovery = null;
  if (isCorrectionTurn(message)) {
    correctionRecovery = 5;
    if (/misunderstood|you('re| are) right|to be direct|i will use|my mistake/i.test(reply)) correctionRecovery += 2;
    if (/roman catholic|wording/i.test(message) && /roman catholic|wording/i.test(reply)) correctionRecovery += 2;
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(message)) correctionRecovery -= 2;
    correctionRecovery = clamp(correctionRecovery);
  }

  let feltHeard = 5;
  if (detailHits >= 2) feltHeard += 2;
  if (/not listening|not answering/i.test(message) && !/wording|roman catholic|directly/i.test(reply)) feltHeard -= 2;
  if (threadId === 'alz' && /mom|alzheimer/i.test(reply)) feltHeard += 1;

  const dims = {
    answeredLatest: clamp(answeredLatest),
    threadSpecific: clamp(threadSpecific),
    noRepeat: clamp(noRepeat),
    feltHeard: clamp(feltHeard),
  };
  if (correctionRecovery !== null) dims.correctionRecovery = correctionRecovery;
  const values = Object.values(dims);
  return { total: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10, dimensions: dims };
}

function scoreWarmth(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  if (/i'?m sorry|so sorry|with you|not alone|gentle|heavy|painful/i.test(reply)) s += 2;
  if (/\bthus\b|\btherefore\b|as an ai/i.test(reply)) s -= 2;
  return clamp(s);
}

function scoreFollowUp(reply, turnIndex, priorMessages) {
  if (turnIndex === 0 || /unavailable/i.test(reply)) return null;
  let s = 5;
  const prior = priorMessages.join(' ').toLowerCase();
  const matched = tokenize(prior).filter((w) => reply.toLowerCase().includes(w)).length;
  if (matched >= 2) s += 2;
  if (/again today|wednesday|far away|push or wait|your mom/i.test(reply)) s += 2;
  if (matched === 0 && reply.length > 120) s -= 2;
  return clamp(s);
}

function scorePostureFit(reply, intent, postureValidation) {
  if (!intent?.posture || /unavailable/i.test(reply)) return 0;
  let s = 6;
  if (postureValidation.passed) s += 2;
  if ((postureValidation.mustDoMisses || []).length === 0) s += 1;
  if ((postureValidation.mustAvoidHits || []).length > 0) s -= 2;
  if ((postureValidation.softWarnings || []).some((w) => w.type === 'over_answer_walk')) s -= 1;
  return clamp(s);
}

function scoreUsefulness(reply, intent) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  const p = intent?.posture;
  if (p === 'REFLECT_THEN_HELP' && reply.length > 80 && reply.length < 450) s += 2;
  if (p === 'CORRECTION_RECOVERY' && /roman catholic|wording/i.test(reply)) s += 2;
  if (p === 'WALK_WITH_ME' && reply.length < 350) s += 1;
  if (p === 'DIRECT_ANSWER' && reply.length > 60) s += 1;
  if (reply.length > 600) s -= 2;
  return clamp(s);
}

function scoreNaturalness(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 6;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 1;
  if ((reply.match(/proverbs|james|psalm/gi) || []).length >= 3) s -= 2;
  if (/\bwould you like to pray\b/i.test(reply) && reply.length < 200) s -= 1;
  if (reply.split(/[.!?]+/).filter((x) => x.trim().length > 10).length <= 5) s += 1;
  return clamp(s);
}

function scoreExtendedTurn(ctx) {
  const listening = scoreHumanListening(ctx);
  const warmth = scoreWarmth(ctx.reply);
  const followUp = scoreFollowUp(ctx.reply, ctx.turnIndex, ctx.priorMessages);
  const postureFit = scorePostureFit(ctx.reply, ctx.intent, ctx.postureValidation);
  const usefulness = scoreUsefulness(ctx.reply, ctx.intent);
  const naturalness = scoreNaturalness(ctx.reply);
  const dims = {
    listening: listening.total,
    postureFit,
    feltHeard: listening.dimensions.feltHeard,
    threadSpecific: listening.dimensions.threadSpecific,
    usefulness,
    naturalness,
    correctionRecovery: listening.dimensions.correctionRecovery,
    warmth,
    followUp,
  };
  const core = [postureFit, dims.feltHeard, dims.threadSpecific, usefulness, naturalness];
  if (dims.correctionRecovery != null) core.push(dims.correctionRecovery);
  const composite = Math.round((core.reduce((a, b) => a + b, 0) / core.length) * 10) / 10;
  return { ...dims, listeningDimensions: listening.dimensions, composite };
}

async function runThread(spec) {
  const prev = process.env.BUDDY_RUNTIME;
  process.env.BUDDY_RUNTIME = 'reason_first';
  const userId = uid(spec.id);
  clearActiveConversation(userId);
  const messages = MESSAGES[spec.id];
  const turns = [];
  const priorMessages = [];

  const H = require('../services/buddyBrain');
  const { buildRuntimeContext } = require('../services/runtimeOrchestrator');

  try {
    for (let i = 0; i < messages.length; i += 1) {
      const message = messages[i];
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

      const expectedIntent = buildCompanionTurnIntent(message, evidencePack);
      const structured = await runBuddy({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
      const reply = String(structured?.reply || '');
      const openaiCalled = !!(structured?.runtime?.openaiCalled || structured?.runtime?.masterRoute === 'reason_first_openai');
      const breakdown = estimateProseBreakdown(reply, 'reason_first', openaiCalled);
      const priorReply = i > 0 ? turns[i - 1].reply : null;

      const packForValidation = { ...evidencePack, userMessage: message, companionTurnIntent: expectedIntent };
      const postureValidation = validateCompanionPosture({ reply, evidencePack: packForValidation });

      const scores = scoreExtendedTurn({
        reply,
        message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
        threadId: spec.id,
        intent: expectedIntent,
        postureValidation,
      });

      const shape = analyzeConversationShape(reply);

      turns.push({
        turn: i + 1,
        message,
        reply,
        companionTurnIntent: structured?.runtime?.companionTurnIntent || {
          posture: expectedIntent.posture,
          why: expectedIntent.why,
        },
        expectedPosture: expectedIntent.posture,
        postureValidation: {
          passed: postureValidation.passed,
          hardIssues: postureValidation.hardIssues,
          softCount: (postureValidation.softWarnings || []).length,
          mustDoMisses: postureValidation.mustDoMisses?.length || 0,
        },
        openaiCalled,
        templateCharsPct: breakdown.templateCharsPct,
        humanListening: scores.listening,
        scores,
        shape,
        overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
        postureWarnings: structured?.runtime?.postureWarnings || [],
        evidence: {
          threadLocalHitCount: evidencePack.threadLocal?.hitCount || 0,
          memorySnippetCount: evidencePack.memory?.snippets?.length || 0,
        },
      });

      priorMessages.push(message);
    }
  } finally {
    process.env.BUDDY_RUNTIME = prev;
  }

  return { ...spec, userId, turns };
}

function scoreHumanFeelThread(thread) {
  const turns = thread.turns;
  const avg = (fn) => Math.round((turns.reduce((s, t) => s + fn(t), 0) / turns.length) * 10) / 10;
  return {
    name: thread.humanFeel,
    postureFit: avg((t) => t.scores.postureFit),
    feltHeard: avg((t) => t.scores.feltHeard),
    threadSpecific: avg((t) => t.scores.threadSpecific),
    usefulness: avg((t) => t.scores.usefulness),
    naturalness: avg((t) => t.scores.naturalness),
    correctionRecovery:
      turns.filter((t) => t.scores.correctionRecovery != null).length > 0
        ? avg((t) => t.scores.correctionRecovery ?? 5)
        : null,
    listening: avg((t) => t.humanListening),
    composite: avg((t) => t.scores.composite),
  };
}

function aggregateMetrics(results) {
  const turns = results.flatMap((r) => r.turns);
  const n = turns.length || 1;
  const avg = (k) => Math.round((turns.reduce((s, t) => s + (t.scores[k] ?? t[k] ?? 0), 0) / n) * 10) / 10;
  const followTurns = turns.filter((t) => t.scores.followUp != null);
  const shapes = turns.map((t) => ({ ...t.shape, reply: t.reply }));

  return {
    turns: n,
    openaiPct: Math.round((turns.filter((t) => t.openaiCalled).length / n) * 1000) / 10,
    avgTemplatePct: Math.round((turns.reduce((s, t) => s + t.templateCharsPct, 0) / n) * 10) / 10,
    avgHumanListening: avg('listening'),
    avgComposite: Math.round((turns.reduce((s, t) => s + t.scores.composite, 0) / n) * 10) / 10,
    avgPostureFit: avg('postureFit'),
    avgWarmth: avg('warmth'),
    avgFollowUp: followTurns.length
      ? Math.round((followTurns.reduce((s, t) => s + t.scores.followUp, 0) / followTurns.length) * 10) / 10
      : null,
    avgUsefulness: avg('usefulness'),
    avgNaturalness: avg('naturalness'),
    inThreadMemoryHitTurns: turns.filter((t) => t.evidence?.threadLocalHitCount > 0).length,
    shape: aggregateShape(shapes, 'reply'),
    postureHardFails: turns.filter((t) => !t.postureValidation.passed).length,
  };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_JSON)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_JSON, 'utf8'));
}

function evaluateGate(metrics, results) {
  const sabbathT7 = results.find((r) => r.id === 'sabbath')?.turns[6];
  const checks = [
    { name: `Listening >= ${GATE.minListening}`, pass: metrics.avgHumanListening >= GATE.minListening, value: `${metrics.avgHumanListening}/10` },
    { name: `Listening target >= ${GATE.targetListening}`, pass: metrics.avgHumanListening >= GATE.targetListening, value: `${metrics.avgHumanListening}/10` },
    { name: `Warmth >= ${GATE.minWarmth}`, pass: metrics.avgWarmth >= GATE.minWarmth, value: `${metrics.avgWarmth}/10` },
    { name: `Follow-up >= ${GATE.minFollowUp}`, pass: (metrics.avgFollowUp ?? 0) >= GATE.minFollowUp, value: `${metrics.avgFollowUp ?? 'n/a'}/10` },
    { name: `Sabbath T7 >= ${GATE.sabbathT7Listening}`, pass: (sabbathT7?.humanListening ?? 0) >= GATE.sabbathT7Listening, value: `${sabbathT7?.humanListening ?? 'n/a'}/10` },
    { name: `OpenAI >= ${GATE.minOpenAiPct}%`, pass: metrics.openaiPct >= GATE.minOpenAiPct, value: `${metrics.openaiPct}%` },
    { name: `Template <= ${GATE.maxTemplatePct}%`, pass: metrics.avgTemplatePct <= GATE.maxTemplatePct, value: `${metrics.avgTemplatePct}%` },
  ];
  return { checks, pass: checks.filter((c) => c.name.includes('target')).every((c) => c.pass) && checks.filter((c) => !c.name.includes('target')).every((c) => c.pass) };
}

function buildReport({ results, metrics, gate, baseline, openaiAvailable, humanFeel }) {
  const lines = [];
  lines.push('# Companion Turn-Intent Implementation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('Reason-first RACL + `companionTurnIntent` posture rebalance. Production default unchanged.');
  lines.push('');

  if (!openaiAvailable) {
    lines.push('> **INCONCLUSIVE** — `OPENAI_API_KEY` required for live validation.');
    lines.push('');
  }

  const baseListen = baseline?.metrics?.avgHumanListening ?? 6.4;
  const deltaListen = metrics.avgHumanListening != null ? Math.round((metrics.avgHumanListening - baseListen) * 10) / 10 : null;

  lines.push('## Aggregate metrics');
  lines.push('');
  lines.push('| Metric | Baseline (RACL) | Turn-intent | Δ |');
  lines.push('| --- | --- | --- | --- |');
  lines.push(`| Listening | ${baseListen} | ${metrics.avgHumanListening ?? 'pending'} | ${deltaListen != null ? (deltaListen >= 0 ? '+' : '') + deltaListen : 'pending'} |`);
  lines.push(`| Composite rubric | — | ${metrics.avgComposite ?? 'pending'} | — |`);
  lines.push(`| Posture fit | — | ${metrics.avgPostureFit ?? 'pending'} | — |`);
  lines.push(`| Warmth | — | ${metrics.avgWarmth ?? 'pending'} | — |`);
  lines.push(`| Follow-up | — | ${metrics.avgFollowUp ?? 'pending'} | — |`);
  lines.push(`| Usefulness | — | ${metrics.avgUsefulness ?? 'pending'} | — |`);
  lines.push(`| Naturalness | — | ${metrics.avgNaturalness ?? 'pending'} | — |`);
  lines.push(`| Deliver-mode % | ~84.7 | ${metrics.shape?.deliverModePct ?? 'pending'} | — |`);
  lines.push(`| Posture hard fails | — | ${metrics.postureHardFails ?? 0}/20 | — |`);
  lines.push('');

  lines.push('## Gate');
  lines.push('');
  lines.push(`**${gate.pass ? 'PASS' : 'FAIL'}**`);
  lines.push('');
  for (const c of gate.checks) {
    lines.push(`- ${c.pass ? 'PASS' : 'FAIL'}: ${c.name} — ${c.value}`);
  }
  lines.push('');

  lines.push('## Part E — Decision');
  lines.push('');
  lines.push('### 1. Did posture selection improve companion feel?');
  if (!openaiAvailable) {
    lines.push('*Pending live run.*');
  } else if (deltaListen != null && deltaListen >= 0.3 && (metrics.shape?.deliverModePct ?? 100) < 80) {
    lines.push(`**Yes (partial).** Listening ${baseListen} → ${metrics.avgHumanListening} (${deltaListen >= 0 ? '+' : ''}${deltaListen}). Deliver-mode ${metrics.shape?.deliverModePct}%.`);
  } else if (deltaListen != null && deltaListen >= 0) {
    lines.push(`**Marginally.** Listening +${deltaListen}; may be within rubric noise. Posture fit ${metrics.avgPostureFit}/10.`);
  } else {
    lines.push(`**No clear gain.** Listening delta ${deltaListen}. Review per-thread regressions.`);
  }
  lines.push('');
  lines.push('### 2. Which turns improved? / 3. Which got worse?');
  lines.push('See per-thread tables in JSON and below.');
  lines.push('');
  lines.push('### 4. Still feel like an answer engine?');
  if (metrics.shape) {
    const engine = (metrics.shape.deliverModePct ?? 0) > 70 && (metrics.shape.asking ?? 0) < 8;
    lines.push(engine ? '**Mostly yes** — deliver-mode still high or asking still low.' : '**Less so** — deliver-mode down and/or asking up.');
  }
  lines.push('');
  lines.push('### 5. Merge into reason-first RACL?');
  lines.push(gate.pass ? '**Yes — candidate for merge** after review of failing turns.' : '**Revise** — gate not met; tune posture rules or composer before merge.');
  lines.push('');

  lines.push('## Human-feel checks (6 threads)');
  lines.push('');
  lines.push('| Thread | Listening | Posture fit | Felt heard | Thread spec | Usefulness | Naturalness |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const h of humanFeel) {
    lines.push(`| ${h.name} | ${h.listening} | ${h.postureFit} | ${h.feltHeard} | ${h.threadSpecific} | ${h.usefulness} | ${h.naturalness} |`);
  }
  lines.push('');

  if (baseline?.results) {
    lines.push('## Per-turn delta vs baseline');
    lines.push('');
    for (const thread of results) {
      const base = baseline.results.find((r) => r.id === thread.id);
      if (!base) continue;
      lines.push(`### ${thread.name}`);
      lines.push('');
      lines.push('| Turn | Base listen | New listen | Δ | Posture |');
      lines.push('| --- | --- | --- | --- | --- |');
      for (const t of thread.turns) {
        const bt = base.turns[t.turn - 1];
        const d = bt ? Math.round((t.humanListening - bt.humanListening) * 10) / 10 : '—';
        lines.push(`| ${t.turn} | ${bt?.humanListening ?? '—'} | ${t.humanListening} | ${d} | ${t.expectedPosture} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function main() {
  const openai = require('../services/openaiClient');
  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;
  const baseline = loadBaseline();

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  if (!openaiAvailable) {
    const payload = {
      generatedAt: new Date().toISOString(),
      openaiAvailable: false,
      verdict: 'INCONCLUSIVE',
      baselineMetrics: baseline?.metrics ?? null,
      note: 'Set OPENAI_API_KEY and re-run',
    };
    fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(OUT_REPORT, buildReport({
      results: [],
      metrics: {},
      gate: { pass: false, checks: [] },
      baseline,
      openaiAvailable: false,
      humanFeel: [],
    }));
    console.log('INCONCLUSIVE — no OPENAI_API_KEY');
    process.exit(2);
  }

  const results = [];
  for (const spec of THREADS) {
    results.push(await runThread(spec));
  }

  const metrics = aggregateMetrics(results);
  metrics.inThreadMemoryHitTurns = results
    .flatMap((r) => r.turns)
    .filter((t) => (t.evidence?.threadLocalHitCount || 0) > 0).length;
  const gate = evaluateGate(metrics, results);
  const humanFeel = results.map(scoreHumanFeelThread);

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable: true,
    feature: 'companion_turn_intent',
    baselineMetrics: baseline?.metrics ?? null,
    metrics,
    gate,
    humanFeel,
    results,
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(OUT_REPORT, buildReport({ results, metrics, gate, baseline, openaiAvailable: true, humanFeel }));

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Listening: ${metrics.avgHumanListening}/10 (baseline ${baseline?.metrics?.avgHumanListening ?? 6.4})`);
  console.log(`Gate: ${gate.pass ? 'PASS' : 'FAIL'}`);
  process.exit(gate.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
