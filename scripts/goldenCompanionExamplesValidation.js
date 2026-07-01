#!/usr/bin/env node
/**
 * Golden Companion Examples A/B — current RACL vs RACL + BUDDY_EXAMPLES=golden.
 * TEST ONLY. Production default unchanged.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/goldenCompanionExamplesValidation.js
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
const { overlapRatio } = require('../services/correctionLedger');
const { GOLDEN_EXAMPLES, selectGoldenExamplesForTurn } = require('../services/goldenCompanionExamples');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'golden-companion-examples', 'results.json');
const OUT_REPORT = path.join(ROOT, 'GoldenCompanionExamplesReport.md');
const BASELINE_JSON = path.join(ROOT, 'docs', 'racl', 'validation-results-baseline-pre-person-first-reflect.json');

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

const PASS = {
  minListeningDelta: 0.4,
  targetListening: 6.8,
};

function uid(prefix, arm) {
  return `golden-${prefix}-${arm}-${Date.now()}`;
}

function tokenize(text = '') {
  return String(text).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
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
  return threadDetailHits(reply, priorMessages) < 2;
}

function isCorrectionTurn(message = '') {
  return /wording|not asking|not answering|not listening|you call it|i mean|i said|what i'?m asking/i.test(message);
}

function isQuestion(message = '') {
  return /\?/.test(message) || /why|how|does that mean|what/i.test(message);
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

function scoreHumanListening({ reply, message, turnIndex, priorReply, priorMessages, threadId }) {
  if (/unavailable|composer unavailable/i.test(reply)) return { total: 0, dimensions: {} };

  const msg = String(message).toLowerCase();
  const detailHits = threadDetailHits(reply, priorMessages);

  let answeredLatest = 5;
  if (isQuestion(message)) {
    if (reply.length > 60) answeredLatest += 2;
    if (/wording|roman catholic|roman church/i.test(msg) && /shorthand|precise|term|wording|name/i.test(reply)) answeredLatest += 2;
    if (/distant|faith is failing|empty/i.test(msg) && /distant|empty|faith|pray|feel/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(msg) && /constantine|laodicea|historical chain|sabbath definition block/i.test(reply)) answeredLatest -= 3;
  } else if (detailHits >= 1 || reply.length > 50) answeredLatest += 2;

  let threadSpecific = 4;
  if (detailHits >= 2) threadSpecific += 2;
  if (detailHits >= 4) threadSpecific += 2;
  if (/again today|still bothering|your mom|alzheimer|caregiv|job offer|far away|knee|friend wednesday|wednesday/i.test(reply)) threadSpecific += 2;
  if (turnIndex > 0 && detailHits === 0 && reply.length > 120) threadSpecific -= 2;

  let noRepeat = 7;
  if (priorReply) {
    const ratio = overlapRatio(reply, priorReply);
    if (ratio >= 0.65) noRepeat -= 4;
    else if (ratio >= 0.5) noRepeat -= 2;
    else if (ratio < 0.35) noRepeat += 1;
    if (openingMatch(reply, priorReply)) noRepeat -= 3;
  }

  let correctionRecovery = null;
  if (isCorrectionTurn(message)) {
    correctionRecovery = 5;
    if (/misunderstood|you('re| are) right|fair point|clarify|my mistake|to be direct|will use/i.test(reply)) correctionRecovery += 2;
    if (/roman catholic|wording|shorthand|precise name/i.test(msg) && /roman catholic|shorthand|wording|precise/i.test(reply)) correctionRecovery += 2;
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(msg)) correctionRecovery -= 2;
    correctionRecovery = clamp(correctionRecovery);
  }

  let feltHeard = 5;
  if (shallowAckOnly(reply, priorMessages)) feltHeard -= 3;
  else if (detailHits >= 2) feltHeard += 2;
  if (/not listening|not answering/i.test(msg) && !/direct|specifically|wording|roman catholic|listening/i.test(reply)) feltHeard -= 2;
  if (threadId === 'alz' && /mom|alzheimer|caregiv|remember who/i.test(reply)) feltHeard += 1;

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
  if (/i'?m sorry|so sorry|with you|not alone|gentle|heavy|painful|here with you/i.test(reply)) s += 2;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 1;
  return clamp(s);
}

function scoreNaturalness(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 6;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 2;
  if ((reply.match(/proverbs|james|psalm|matthew/gi) || []).length >= 3) s -= 2;
  if (/\bwould you like to pray\b/i.test(reply) && reply.length < 220) s -= 1;
  if (reply.split(/[.!?]+/).filter((x) => x.trim().length > 10).length <= 5 && reply.length < 450) s += 1;
  return clamp(s);
}

function scoreBiblicalGrounding(reply, message) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  const refs = (reply.match(/\b[A-Za-z]+\s+\d+:\d+/g) || []).length;
  if (/god|faith|pray|scripture|sabbath|grief|bible|worship/i.test(message)) {
    if (refs === 1) s += 2;
    if (refs >= 2 && refs <= 2) s += 1;
    if (refs >= 4) s -= 2;
    if (/psalm|proverbs|genesis|exodus|james/i.test(reply) && refs >= 1) s += 1;
  }
  if (/sunday as biblical sabbath|law abolished/i.test(reply)) s -= 4;
  return clamp(s);
}

function scoreOverExplaining(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 7;
  if (reply.length > 520) s -= 2;
  if (reply.length > 680) s -= 2;
  if ((reply.match(/would you like|next step|consider|might help/gi) || []).length >= 3) s -= 1;
  if (reply.length < 320) s += 1;
  return clamp(s);
}

function scoreCompanionPresence(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  if (/here with you|with you in|not alone|plainly|honest/i.test(reply)) s += 2;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 1;
  if (reply.length > 600 && !/scripture identifies/i.test(reply)) s -= 1;
  if (reply.length >= 80 && reply.length <= 480) s += 1;
  return clamp(s);
}

function scoreTurn(ctx) {
  const listening = scoreHumanListening(ctx);
  return {
    listening: listening.total,
    listeningDimensions: listening.dimensions,
    warmth: scoreWarmth(ctx.reply),
    feltHeard: listening.dimensions.feltHeard,
    threadSpecific: listening.dimensions.threadSpecific,
    naturalness: scoreNaturalness(ctx.reply),
    companionPresence: scoreCompanionPresence(ctx.reply),
    biblicalGrounding: scoreBiblicalGrounding(ctx.reply, ctx.message),
    correctionRecovery: listening.dimensions.correctionRecovery ?? null,
    overExplaining: scoreOverExplaining(ctx.reply),
    shallowAck: shallowAckOnly(ctx.reply, ctx.priorMessages),
  };
}

function aggregateArm(turns) {
  const n = turns.length || 1;
  const avg = (key) => Math.round((turns.reduce((s, t) => s + (t.scores[key] ?? 0), 0) / n) * 10) / 10;
  const correctionTurns = turns.filter((t) => t.scores.correctionRecovery !== null);
  return {
    turns: n,
    listening: avg('listening'),
    warmth: avg('warmth'),
    feltHeard: avg('feltHeard'),
    threadSpecific: avg('threadSpecific'),
    naturalness: avg('naturalness'),
    companionPresence: avg('companionPresence'),
    biblicalGrounding: avg('biblicalGrounding'),
    overExplaining: avg('overExplaining'),
    correctionRecovery:
      correctionTurns.length > 0
        ? Math.round(
            (correctionTurns.reduce((s, t) => s + t.scores.correctionRecovery, 0) / correctionTurns.length) * 10
          ) / 10
        : null,
    shallowAckCount: turns.filter((t) => t.shallowAck).length,
    openaiPct:
      Math.round((turns.filter((t) => t.openaiCalled).length / n) * 1000) / 10,
  };
}

async function runThread(spec, arm) {
  const prevRuntime = process.env.BUDDY_RUNTIME;
  const prevExamples = process.env.BUDDY_EXAMPLES;
  process.env.BUDDY_RUNTIME = 'reason_first';
  process.env.BUDDY_EXAMPLES = arm === 'golden' ? 'golden' : '';

  const userId = uid(spec.id, arm);
  clearActiveConversation(userId);
  const turns = [];
  const priorMessages = [];

  try {
    for (let i = 0; i < spec.messages.length; i += 1) {
      const message = spec.messages[i];
      const structured = await runBuddy({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
      const reply = String(structured?.reply || '');
      const priorReply = i > 0 ? turns[i - 1].reply : null;
      const scores = scoreTurn({
        reply,
        message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
        threadId: spec.id,
      });
      const breakdown = estimateProseBreakdown(reply, 'reason_first', !!structured?.runtime?.openaiCalled);
      const examples = arm === 'golden' ? selectGoldenExamplesForTurn({ message, threadId: spec.id, limit: 2 }) : [];

      turns.push({
        turn: i + 1,
        message,
        reply,
        openaiCalled: !!(structured?.runtime?.openaiCalled),
        masterRoute: structured?.runtime?.masterRoute,
        goldenExampleIds: structured?.runtime?.goldenExampleIds || examples.map((e) => e.id),
        templateCharsPct: breakdown.templateCharsPct,
        overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
        scores,
        shallowAck: scores.shallowAck,
      });
      priorMessages.push(message);
    }
  } finally {
    process.env.BUDDY_RUNTIME = prevRuntime;
    process.env.BUDDY_EXAMPLES = prevExamples;
  }

  return { ...spec, userId, arm, turns };
}

function loadBaselineArm() {
  if (!fs.existsSync(BASELINE_JSON)) return null;
  const data = JSON.parse(fs.readFileSync(BASELINE_JSON, 'utf8'));
  const turns = [];
  const threads = [];
  for (const thread of data.results) {
    const priorMessages = [];
    const scoredTurns = [];
    for (let i = 0; i < thread.turns.length; i += 1) {
      const t = thread.turns[i];
      const priorReply = i > 0 ? thread.turns[i - 1].reply : null;
      const scores = scoreTurn({
        reply: t.reply,
        message: t.message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
        threadId: thread.id,
      });
      const row = {
        threadId: thread.id,
        threadName: thread.name,
        turn: t.turn,
        message: t.message,
        reply: t.reply,
        openaiCalled: t.openaiCalled,
        masterRoute: t.masterRoute,
        scores,
        shallowAck: scores.shallowAck,
      };
      turns.push(row);
      scoredTurns.push({
        turn: t.turn,
        message: t.message,
        reply: t.reply,
        openaiCalled: t.openaiCalled,
        scores,
      });
      priorMessages.push(t.message);
    }
    threads.push({ id: thread.id, name: thread.name, messages: thread.messages, turns: scoredTurns });
  }
  return {
    arm: 'control_cached',
    source: BASELINE_JSON,
    generatedAt: data.generatedAt,
    metrics: aggregateArm(turns),
    turns,
    threads,
  };
}

function turnsToThreadResults(turnsFlat, threads) {
  return threads.map((spec) => ({
    ...spec,
    turns: turnsFlat.filter((t) => t.threadId === spec.id).map((t) => ({
      turn: t.turn,
      message: t.message,
      reply: t.reply,
      openaiCalled: t.openaiCalled,
      humanListening: t.scores.listening,
      listeningDimensions: t.scores.listeningDimensions,
      scores: t.scores,
      goldenExampleIds: t.goldenExampleIds,
    })),
  }));
}

function evaluatePass(delta, goldenMetrics, controlMetrics) {
  const sabbathT7Golden = goldenMetrics.sabbathT7Listening;
  const sabbathT7Control = controlMetrics.sabbathT7Listening;
  return {
    listeningDelta: delta.listening,
    listeningPass: delta.listening >= PASS.minListeningDelta,
    naturalnessImproved: delta.naturalness > 0,
    feltHeardImproved: delta.feltHeard > 0,
    overExplainingImproved: delta.overExplaining > 0,
    sabbathT7NoRegression: sabbathT7Golden >= sabbathT7Control - 0.5,
    biblicalGroundingOk: goldenMetrics.biblicalGrounding >= 5,
    targetListening: goldenMetrics.listening >= PASS.targetListening,
    pass:
      delta.listening >= PASS.minListeningDelta &&
      delta.naturalness >= 0 &&
      delta.feltHeard >= 0 &&
      delta.overExplaining >= 0 &&
      sabbathT7Golden >= sabbathT7Control - 0.5 &&
      goldenMetrics.biblicalGrounding >= 5,
  };
}

function buildQualitativeComparisons(controlThreads, goldenThreads) {
  return THREADS.map((spec) => {
    const control = controlThreads.find((t) => t.id === spec.id);
    const golden = goldenThreads.find((t) => t.id === spec.id);
    const lastControl = control?.turns[control.turns.length - 1];
    const lastGolden = golden?.turns[golden.turns.length - 1];
    const libraryExample = selectGoldenExamplesForTurn({
      message: spec.messages[0],
      threadId: spec.id,
      limit: 1,
    })[0];
    return {
      threadId: spec.id,
      threadName: spec.name,
      sampleMessage: spec.messages[0],
      currentRaclReply: control?.turns[0]?.reply?.slice(0, 500) || '',
      goldenArmReply: golden?.turns[0]?.reply?.slice(0, 500) || '',
      libraryGoldenText: libraryExample?.goldenResponse || '',
      libraryWhy: libraryExample?.whyGoldenWorks || '',
    };
  });
}

function buildReport(payload) {
  const { control, golden, delta = {}, passGate, openaiAvailable, qualitative } = payload;
  const lines = [];
  lines.push('# Golden Companion Examples Report');
  lines.push('');
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push('');
  lines.push('A/B: **Current RACL** (reason-first) vs **RACL + `BUDDY_EXAMPLES=golden`** (few-shot library).');
  lines.push('');
  lines.push(`OpenAI available: **${openaiAvailable}**`);
  lines.push('');
  lines.push('## Success criteria (Part E)');
  lines.push('');
  lines.push(`| Criterion | Result |`);
  lines.push(`| --- | --- |`);
  const fmtDelta = (v) => (v == null ? 'pending' : `${v >= 0 ? '+' : ''}${v}`);
  lines.push(`| Listening +${PASS.minListeningDelta} | ${passGate.listeningPass ? 'PASS' : 'FAIL'} (${fmtDelta(passGate.listeningDelta ?? delta.listening)}) |`);
  lines.push(`| Naturalness improves | ${passGate.naturalnessImproved ? 'PASS' : 'FAIL'} (${fmtDelta(delta.naturalness)}) |`);
  lines.push(`| Felt heard improves | ${passGate.feltHeardImproved ? 'PASS' : 'FAIL'} (${fmtDelta(delta.feltHeard)}) |`);
  lines.push(`| Over-explaining decreases (score up) | ${passGate.overExplainingImproved ? 'PASS' : 'FAIL'} (${fmtDelta(delta.overExplaining)}) |`);
  lines.push(`| Sabbath T7 no regression | ${passGate.sabbathT7NoRegression ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Biblical boundaries intact (≥5) | ${passGate.biblicalGroundingOk ? 'PASS' : 'FAIL'} |`);
  const goldenListen = golden?.metrics?.listening ?? 'n/a';
  lines.push(`| Target listening ≥${PASS.targetListening} | ${passGate.targetListening ? 'PASS' : 'FAIL'} (golden ${goldenListen}) |`);
  lines.push(`| **Overall** | **${passGate.pass ? 'PASS' : 'FAIL'}** |`);
  lines.push('');
  lines.push('## Aggregate metrics');
  lines.push('');
  lines.push('| Metric | Control RACL | Golden examples | Δ |');
  lines.push('| --- | ---: | ---: | ---: |');
  if (!golden?.metrics) {
    lines.push('*Golden arm not run — set `OPENAI_API_KEY` and re-run `node scripts/goldenCompanionExamplesValidation.js`.*');
    lines.push('');
  }
  for (const key of [
    'listening',
    'warmth',
    'feltHeard',
    'threadSpecific',
    'naturalness',
    'companionPresence',
    'biblicalGrounding',
    'overExplaining',
    'correctionRecovery',
  ]) {
    const c = control?.metrics?.[key];
    const g = golden?.metrics?.[key];
    const d = delta[key];
    if (c == null && g == null) continue;
    const dStr = d == null ? '—' : `${d >= 0 ? '+' : ''}${d}`;
    lines.push(`| ${key} | ${c ?? '—'} | ${g ?? '—'} | ${dStr} |`);
  }
  lines.push('');
  lines.push('## Thread-level listening deltas');
  lines.push('');
  lines.push('| Thread | Control | Golden | Δ |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const row of payload.threadDeltas) {
    const g = row.golden == null ? '—' : row.golden;
    const d = row.delta == null ? '—' : `${row.delta >= 0 ? '+' : ''}${row.delta}`;
    lines.push(`| ${row.name} | ${row.control} | ${g} | ${d} |`);
  }
  lines.push('');
  lines.push('## Part D — Qualitative comparison (T1 sample per thread)');
  lines.push('');
  lines.push('## Implementation (Parts A–B)');
  lines.push('');
  lines.push('- **Library:** `services/goldenCompanionExamples.js` — 12 examples (2 × 6 areas)');
  lines.push('- **Test flag:** `BUDDY_EXAMPLES=golden` injects 1–2 matched examples into reason-first system prompt (`buildComposerSystemPrompt`)');
  lines.push('- **Route:** `reason_first_openai_golden` when examples enabled');
  lines.push('- **Unchanged:** RACL, RESPONSE STRUCTURE, correction ledger, doctrine validation, listening signals, production default `legacy`');
  lines.push('');
  lines.push('## Baseline reference (prior audits)');
  lines.push('');
  lines.push('| Metric | Prior RACL run | This control (rescored) |');
  lines.push('| --- | ---: | ---: |');
  lines.push('| Listening | 6.3 | ' + (control?.metrics?.listening ?? '—') + ' |');
  lines.push('| Opening-detail util. | ~51% | pending golden run |');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **Live A/B pending:** Export `OPENAI_API_KEY` and run `node scripts/goldenCompanionExamplesValidation.js`.');
    lines.push('');
  }
  for (const q of qualitative) {
    lines.push(`### ${q.threadName}`);
    lines.push('');
    lines.push('**1. Current RACL reply (baseline)**');
    lines.push('```');
    lines.push(q.currentRaclReply || '(n/a)');
    lines.push('```');
    lines.push('');
    lines.push('**2. Golden-example arm reply**');
    lines.push('```');
    lines.push(q.goldenArmReply || '(n/a)');
    lines.push('```');
    lines.push('');
    lines.push('**Library golden reference**');
    lines.push('```');
    lines.push(q.libraryGoldenText || '(n/a)');
    lines.push('```');
    lines.push('');
    const libWinner = qualitativeWinner(q.currentRaclReply, q.libraryGoldenText, q.threadId);
    lines.push(`**3. Trusted companion (library golden vs current RACL):** **${libWinner.winner}**`);
    lines.push('');
    lines.push(libWinner.why);
    lines.push('');
    lines.push(`**4. Golden arm live reply:** ${q.goldenArmReply ? 'see block 2 above' : 'pending API run'}`);
    lines.push('');
    lines.push(q.qualitativeWhy || '');
    lines.push('');
  }
  lines.push('## Library');
  lines.push('');
  lines.push(`**${GOLDEN_EXAMPLES.length}** examples in services/goldenCompanionExamples.js (2 per benchmark area).`);
  lines.push('');
  lines.push('## Stop conditions');
  lines.push('');
  lines.push('- No deploy, push, Sprint 3, new routes, or architecture experiments');
  lines.push('- Enable test path: `BUDDY_EXAMPLES=golden`');
  lines.push('');
  return lines.join('\n');
}

function qualitativeWinner(controlReply, goldenReply, threadId) {
  if (!goldenReply || /unavailable/i.test(goldenReply)) return { winner: 'baseline (golden run failed)', why: 'Golden arm did not complete.' };
  const cShallow = /^it sounds like\b/i.test(controlReply);
  const gShallow = /^it sounds like\b/i.test(goldenReply);
  if (threadId === 'grief' && /wednesday/i.test(goldenReply) && !/wednesday/i.test(controlReply)) {
    return { winner: 'Golden arm', why: 'Names Wednesday; baseline generic loss opener.' };
  }
  if (threadId === 'job' && /far away from home/i.test(goldenReply) && !/far away/i.test(controlReply)) {
    return { winner: 'Golden arm', why: 'Uses distance/home language; baseline template paraphrase.' };
  }
  if (gShallow && !cShallow) return { winner: 'Baseline', why: 'Golden arm still used template opener.' };
  if (!gShallow && cShallow) return { winner: 'Golden arm', why: 'Drops It-sounds-like template; more concrete.' };
  if (goldenReply.length < controlReply.length * 0.85) {
    return { winner: 'Golden arm', why: 'Shorter, less over-explaining.' };
  }
  return { winner: 'Mixed / read both', why: 'Compare person-detail and correction directness on the live replies above.' };
}

async function main() {
  const openai = require('../services/openaiClient');
  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const controlCached = loadBaselineArm();
  let control = controlCached;
  let golden = null;

  if (openaiAvailable) {
    const controlResults = [];
    for (const spec of THREADS) {
      // eslint-disable-next-line no-await-in-loop
      controlResults.push(await runThread(spec, 'control'));
    }
    const controlTurns = controlResults.flatMap((r) =>
      r.turns.map((t) => ({ ...t, threadId: r.id, threadName: r.name }))
    );
    control = {
      arm: 'control_live',
      metrics: aggregateArm(controlTurns),
      threads: controlResults,
      turns: controlTurns,
    };

    const goldenResults = [];
    for (const spec of THREADS) {
      // eslint-disable-next-line no-await-in-loop
      goldenResults.push(await runThread(spec, 'golden'));
    }
    const goldenTurns = goldenResults.flatMap((r) =>
      r.turns.map((t) => ({ ...t, threadId: r.id, threadName: r.name }))
    );
    golden = {
      arm: 'golden',
      metrics: aggregateArm(goldenTurns),
      threads: goldenResults,
      turns: goldenTurns,
    };
  } else if (controlCached) {
    golden = {
      arm: 'golden',
      metrics: null,
      threads: [],
      blocked: true,
    };
  }

  const delta = {};
  if (golden?.metrics && control?.metrics) {
    for (const key of Object.keys(control.metrics)) {
      if (typeof control.metrics[key] === 'number' && typeof golden.metrics[key] === 'number') {
        delta[key] = Math.round((golden.metrics[key] - control.metrics[key]) * 10) / 10;
      }
    }
  }

  const sabbathT7 = (arm) => {
    const t = arm?.threads?.find((x) => x.id === 'sabbath')?.turns?.[6];
    return t?.scores?.listening ?? t?.humanListening ?? null;
  };
  if (control?.metrics) control.metrics.sabbathT7Listening = sabbathT7(control);
  if (golden?.metrics) golden.metrics.sabbathT7Listening = sabbathT7(golden);

  const threadDeltas = THREADS.map((spec) => {
    const cTurns = control?.threads?.find((t) => t.id === spec.id)?.turns || [];
    const gTurns = golden?.threads?.find((t) => t.id === spec.id)?.turns || [];
    const cAvg = cTurns.length ? cTurns.reduce((s, t) => s + (t.scores?.listening ?? 0), 0) / cTurns.length : 0;
    const gAvg = gTurns.length ? gTurns.reduce((s, t) => s + (t.scores?.listening ?? 0), 0) / gTurns.length : null;
    return {
      id: spec.id,
      name: spec.name,
      control: Math.round(cAvg * 10) / 10,
      golden: gAvg == null ? null : Math.round(gAvg * 10) / 10,
      delta: gAvg == null ? null : Math.round((gAvg - cAvg) * 10) / 10,
    };
  });

  const passGate =
    golden?.metrics && control?.metrics
      ? evaluatePass(delta, golden.metrics, control.metrics)
      : {
          pass: false,
          listeningPass: false,
          naturalnessImproved: false,
          feltHeardImproved: false,
          overExplainingImproved: false,
          sabbathT7NoRegression: false,
          biblicalGroundingOk: false,
          targetListening: false,
          note: 'blocked',
          listeningDelta: null,
        };

  const qualitative = buildQualitativeComparisons(
    control?.threads || controlCached?.threads || [],
    golden?.threads || []
  ).map((q) => {
    const w = qualitativeWinner(q.currentRaclReply, q.goldenArmReply, q.threadId);
    return { ...q, qualitativeWinner: w.winner, qualitativeWhy: w.why };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable,
    libraryExampleCount: GOLDEN_EXAMPLES.length,
    control: {
      arm: control?.arm,
      source: control?.source || 'live',
      metrics: control?.metrics,
    },
    golden: {
      arm: golden?.arm,
      blocked: golden?.blocked || false,
      metrics: golden?.metrics,
    },
    delta,
    passGate,
    threadDeltas,
    qualitative,
    baselineReference: { listening: 6.3, openingUtilAudit: 0.51 },
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(OUT_REPORT, `${buildReport(payload)}\n`);

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Wrote ${OUT_JSON}`);
  if (!openaiAvailable) {
    console.log('OpenAI unavailable — golden arm not run. Control from cached baseline.');
    process.exit(1);
  }
  if (golden?.metrics) {
    console.log(
      `Listening: ${control.metrics.listening} → ${golden.metrics.listening} (Δ ${delta.listening}) | Pass: ${passGate.pass}`
    );
    process.exit(passGate.pass ? 0 : 1);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
