#!/usr/bin/env node
/**
 * Companion conversation experiment — current RACL vs explore-before-advise (test-only).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/companionConversationExperiment.js
 *
 * Does not modify production, legacy, doctrine, memory, or RACL modules.
 */

try {
  require('dotenv').config();
} catch (_) {}

const fs = require('fs');
const path = require('path');
const {
  runCompanionConversationExperimentRuntime,
  clearTestSessions,
} = require('../services/companionConversationExperimentRuntime');
const { analyzeConversationShape, aggregateShape } = require('../services/conversationShapeAnalyzer');
const { overlapRatio } = require('../services/correctionLedger');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const CACHED_CURRENT = path.join(ROOT, 'docs', 'racl', 'validation-results.json');
const OUT_JSON = path.join(ROOT, 'docs', 'companion-conversation-experiment', 'results.json');
const OUT_REPORT = path.join(ROOT, 'ConversationExperimentReport.md');

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

function getBuddyHelpers() {
  const H = require('../services/buddyBrain');
  return {
    normalizeInput: (a, b, c, d) => {
      if (typeof a === 'object' && a !== null) {
        return { userId: a.userId, mode: a.mode || 'COMPANION', personaKey: a.personaKey || 'ADAPTIVE_COMPANION', message: a.message };
      }
      return { userId: a, mode: b || 'COMPANION', personaKey: c || 'ADAPTIVE_COMPANION', message: d };
    },
    getUserCompanionProfile: H.getUserCompanionProfile,
    getRecentSessions: H.getRecentSessions,
    classifySafety: H.classifySafety,
    enrichRuntimeContextWithMemory: H.enrichRuntimeContextWithMemory,
  };
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
  if (/unavailable/i.test(reply)) return { total: 0, dimensions: {} };

  const msg = String(message).toLowerCase();
  const detailHits = threadDetailHits(reply, priorMessages);

  let answeredLatest = 5;
  if (isQuestion(message)) {
    if (reply.length > 60) answeredLatest += 2;
    if (/wording|roman catholic|roman church/i.test(msg) && /shorthand|precise|term|wording|name|will use/i.test(reply)) answeredLatest += 2;
    if (/distant|faith is failing|empty/i.test(msg) && /distant|empty|faith|pray|feel/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(msg) && /constantine|laodicea|historical chain/i.test(reply)) answeredLatest -= 3;
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
    if (/misunderstood|you('re| are) right|fair point|clarify|my mistake|to be direct|i will use/i.test(reply)) correctionRecovery += 2;
    if (/roman catholic|wording|shorthand|precise name/i.test(msg) && /roman catholic|shorthand|wording|precise/i.test(reply)) correctionRecovery += 2;
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(msg)) correctionRecovery -= 2;
    correctionRecovery = clamp(correctionRecovery);
  }

  let feltHeard = 5;
  if (shallowAckOnly(reply, priorMessages)) feltHeard -= 3;
  else if (detailHits >= 2) feltHeard += 2;
  if (/not listening|not answering/i.test(msg) && !/direct|specifically|wording|roman catholic/i.test(reply)) feltHeard -= 2;
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

function scoreWarmth(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let score = 5;
  if (/i'?m sorry|so sorry|that sounds|that must|heavy|painful|with you|not alone|here for you|care about/i.test(reply)) score += 2;
  if (/thank you for your thoughtful question|as an ai|language model/i.test(reply)) score -= 2;
  if (/\b(shall|thus|therefore|accordingly)\b/i.test(reply)) score -= 1;
  return clamp(score);
}

function scoreFollowUpQuality(reply, message, turnIndex, priorMessages) {
  if (turnIndex === 0 || /unavailable/i.test(reply)) return null;
  let score = 5;
  const prior = priorMessages.join(' ').toLowerCase();
  const words = prior.split(/\W+/).filter((w) => w.length > 4);
  const matched = words.filter((w) => reply.toLowerCase().includes(w)).length;
  if (matched >= 2) score += 2;
  if (matched >= 4) score += 1;
  if (/again today|still|as you mentioned|earlier|this offer|your mom|your friend|your knees|wednesday|far away|push or wait/i.test(reply)) score += 2;
  if (turnIndex > 0 && matched === 0 && reply.length > 100) score -= 2;
  return clamp(score);
}

/** Lower = more answer-engine; higher = more companion pacing */
function scoreAnswerEngineFeeling(reply, shape) {
  if (/unavailable/i.test(reply)) return 0;
  let score = 5;
  const deliver = shape.deliverModePct || 0;
  const companion = shape.companionModePct || 0;
  if (deliver >= 75) score -= 2;
  else if (deliver >= 65) score -= 1;
  if (companion >= 35) score += 2;
  else if (companion >= 25) score += 1;
  if (shape.hasExploratoryQuestion) score += 2;
  if (shape.explaining >= 40) score -= 2;
  else if (shape.explaining >= 30) score -= 1;
  if (shape.hasTransactionalClose) score -= 1;
  if (reply.length > 550 && !shape.hasExploratoryQuestion) score -= 1;
  return clamp(score);
}

function scoreTurn(ctx) {
  const shape = analyzeConversationShape(ctx.reply);
  const listening = scoreHumanListening(ctx);
  return {
    listening: listening.total,
    listeningDimensions: listening.dimensions,
    warmth: scoreWarmth(ctx.reply),
    followUp: scoreFollowUpQuality(ctx.reply, ctx.message, ctx.turnIndex, ctx.priorMessages),
    answerEngineFeeling: scoreAnswerEngineFeeling(ctx.reply, shape),
    shape,
  };
}

function loadCurrentResults() {
  if (!fs.existsSync(CACHED_CURRENT)) return null;
  return JSON.parse(fs.readFileSync(CACHED_CURRENT, 'utf8'));
}

async function runExperimentThread(spec) {
  const H = getBuddyHelpers();
  const userId = `conv-exp-${spec.id}-${Date.now()}`;
  clearTestSessions(userId);
  clearActiveConversation(userId);

  const turns = [];
  const priorMessages = [];

  for (let i = 0; i < spec.messages.length; i += 1) {
    const message = spec.messages[i];
    const out = await runCompanionConversationExperimentRuntime(H, userId, 'COMPANION', 'ADAPTIVE_COMPANION', message);
    const reply = String(out.reply || '');
    const priorReply = i > 0 ? turns[i - 1].experimentReply : null;
    const scores = scoreTurn({
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
      experimentReply: reply,
      openaiCalled: !!out.runtime?.openaiCalled,
      allowExploratoryQuestion: !!out.runtime?.allowExploratoryQuestion,
      conversationBehavior: out.runtime?.conversationBehavior || null,
      promptSizes: out.promptSizes,
      overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
      scores,
    });
    priorMessages.push(message);
  }

  return { ...spec, userId, turns };
}

function mergeWithCurrent(experimentResults, cached) {
  return experimentResults.map((exp) => {
    const cur = cached.results.find((r) => r.id === exp.id);
    const turns = exp.turns.map((et, i) => {
      const ct = cur.turns[i];
      const priorMessages = cur.turns.slice(0, i).map((t) => t.message);
      const currentScores = scoreTurn({
        reply: ct.reply,
        message: et.message,
        turnIndex: i,
        priorReply: i > 0 ? cur.turns[i - 1].reply : null,
        priorMessages,
        threadId: exp.id,
      });
      return {
        turn: et.turn,
        message: et.message,
        currentReply: ct.reply,
        experimentReply: et.experimentReply,
        allowExploratoryQuestion: et.allowExploratoryQuestion,
        currentScores,
        experimentScores: et.scores,
        deltas: {
          listening: Math.round((et.scores.listening - currentScores.listening) * 10) / 10,
          warmth: Math.round((et.scores.warmth - currentScores.warmth) * 10) / 10,
          followUp:
            et.scores.followUp != null && currentScores.followUp != null
              ? Math.round((et.scores.followUp - currentScores.followUp) * 10) / 10
              : null,
          answerEngineFeeling:
            Math.round((et.scores.answerEngineFeeling - currentScores.answerEngineFeeling) * 10) / 10,
        },
        shapeDelta: {
          asking: Math.round((et.scores.shape.asking - currentScores.shape.asking) * 10) / 10,
          reflecting: Math.round((et.scores.shape.reflecting - currentScores.shape.reflecting) * 10) / 10,
          explaining: Math.round((et.scores.shape.explaining - currentScores.shape.explaining) * 10) / 10,
          advising: Math.round((et.scores.shape.advising - currentScores.shape.advising) * 10) / 10,
          answering: Math.round((et.scores.shape.answering - currentScores.shape.answering) * 10) / 10,
          deliverMode: Math.round((et.scores.shape.deliverModePct - currentScores.shape.deliverModePct) * 10) / 10,
        },
      };
    });
    return { ...exp, turns };
  });
}

function aggregateScores(merged, prefix) {
  const turns = merged.flatMap((t) => t.turns);
  const avg = (arr) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  const key = (k) => turns.map((t) => t[`${prefix}Scores`][k]);
  const follow = turns.map((t) => t[`${prefix}Scores`].followUp).filter((v) => v != null);
  const shapes = turns.map((t) => ({ ...t[`${prefix}Scores`].shape, reply: t[prefix === 'current' ? 'currentReply' : 'experimentReply'] }));
  return {
    listening: avg(key('listening')),
    warmth: avg(key('warmth')),
    followUp: follow.length ? avg(follow) : null,
    answerEngineFeeling: avg(key('answerEngineFeeling')),
    shape: aggregateShape(shapes, 'reply'),
  };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function truncate(s, n = 400) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function buildReport({ merged, agg, openaiAvailable, verdict, cachedMetrics }) {
  const lines = [];
  lines.push('# Companion Conversation Experiment Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('**Test only.** `companionConversationExperimentRuntime` is not wired to production.');
  lines.push('');
  lines.push('## Hypothesis');
  lines.push('');
  lines.push('The remaining companion gap is caused primarily by **conversation behavior** (explain/advise-first monologues) rather than retrieval or reasoning — when retrieval (RACL) and doctrine are held constant.');
  lines.push('');
  lines.push('## Experiment design');
  lines.push('');
  lines.push('| Layer | Current RACL (baseline) | Conversation experiment |');
  lines.push('| --- | --- | --- |');
  lines.push('| Retrieval | `buildRetrievalEvidencePack` (unchanged) | Same |');
  lines.push('| Memory / doctrine / RACL modules | Production reason-first path | **Not modified** |');
  lines.push('| Compose | Full `reasonFirstComposer` + legacy prompt stack | Test runtime: minimal compose + **explore-before-advise rules only** |');
  lines.push('| Validation | Full doctrine + listening validators | Doctrine boundaries only (test harness) |');
  lines.push('');
  lines.push('> **Confound note:** The experiment uses a **lite compose shell** (~1.2K system chars) to isolate conversation rules from the ~14K legacy instruction stack. Score deltas therefore mix *conversation behavior* with *prompt size*. Shape metrics (asking %, deliver-mode %) isolate behavior more cleanly than raw listening alone.');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **OpenAI unavailable** — live experiment replies not generated. Re-run with `OPENAI_API_KEY`.');
    lines.push('');
  }
  lines.push('## Part C — Conversation shape (aggregate, 20 turns)');
  lines.push('');
  lines.push(mdTable(
    ['Function', 'Current RACL %', 'Experiment %', 'Δ (Exp − Cur)'],
    [
      ['Explaining', `${agg.current.shape.explaining}`, openaiAvailable ? `${agg.experiment?.shape?.explaining ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.explaining - agg.current.shape.explaining) : '—'],
      ['Advising', `${agg.current.shape.advising}`, openaiAvailable ? `${agg.experiment?.shape?.advising ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.advising - agg.current.shape.advising) : '—'],
      ['Reflecting', `${agg.current.shape.reflecting}`, openaiAvailable ? `${agg.experiment?.shape?.reflecting ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.reflecting - agg.current.shape.reflecting) : '—'],
      ['Answering', `${agg.current.shape.answering}`, openaiAvailable ? `${agg.experiment?.shape?.answering ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.answering - agg.current.shape.answering) : '—'],
      ['Asking', `${agg.current.shape.asking}`, openaiAvailable ? `${agg.experiment?.shape?.asking ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.asking - agg.current.shape.asking) : '—'],
      ['Engaging', `${agg.current.shape.engaging}`, openaiAvailable ? `${agg.experiment?.shape?.engaging ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.engaging - agg.current.shape.engaging) : '—'],
      ['Deliver-mode (ans+adv+exp)', `${agg.current.shape.deliverModePct}`, openaiAvailable ? `${agg.experiment?.shape?.deliverModePct ?? '—'}` : 'pending', openaiAvailable ? fmtDelta(agg.experiment.shape.deliverModePct - agg.current.shape.deliverModePct) : '—'],
      ['Exploratory Q turns', `${agg.current.shape.exploratoryQuestionTurns}/20`, openaiAvailable ? `${agg.experiment?.shape?.exploratoryQuestionTurns ?? 0}/20` : 'pending', '—'],
    ]
  ));
  lines.push('');
  lines.push('## Part D — Benchmark scores');
  lines.push('');
  lines.push(mdTable(
    ['Metric', 'Current RACL', 'Conversation experiment', 'Δ'],
    [
      ['Listening (human rubric)', `${agg.current.listening}`, openaiAvailable ? `${agg.experiment?.listening ?? 'pending'}` : 'pending', fmtDelta(agg.delta?.listening)],
      ['Warmth', `${agg.current.warmth}`, openaiAvailable ? `${agg.experiment?.warmth ?? 'pending'}` : 'pending', fmtDelta(agg.delta?.warmth)],
      ['Follow-up quality', `${agg.current.followUp ?? 'n/a'}`, openaiAvailable ? `${agg.experiment?.followUp ?? 'n/a'}` : 'pending', fmtDelta(agg.delta?.followUp)],
      ['Companion feel (inverse answer-engine)', `${agg.current.answerEngineFeeling}`, openaiAvailable ? `${agg.experiment?.answerEngineFeeling ?? 'pending'}` : 'pending', fmtDelta(agg.delta?.answerEngineFeeling)],
    ]
  ));
  lines.push('');
  if (cachedMetrics) {
    lines.push(`Baseline from cached validation: listening **${cachedMetrics.avgHumanListening}/10**, memory hits **${cachedMetrics.inThreadMemoryHitTurns}/${cachedMetrics.turns}**, OpenAI **${cachedMetrics.openaiPct}%**.`);
    lines.push('');
  }
  lines.push('## Part E — Decision');
  lines.push('');
  lines.push(`**Verdict: ${verdict}**`);
  lines.push('');
  lines.push('### 1. Does asking/exploring before advising increase listening?');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('*Pending live run.* Baseline listening **6.4/10**; experiment not executed.');
  } else if (agg.delta.listening > 0.15) {
    lines.push(`**Yes (modest).** Listening **${agg.current.listening} → ${agg.experiment.listening}** (${fmtDelta(agg.delta.listening)} aggregate). Exploratory-question turns: **${agg.experiment.shape.exploratoryQuestionTurns}/20** vs current **${agg.current.shape.exploratoryQuestionTurns}/20**.`);
  } else if (agg.delta.listening > 0) {
    lines.push(`**Marginally.** Listening delta **${fmtDelta(agg.delta.listening)}** — within rubric noise; shape shift may be clearer than score.`);
  } else {
    lines.push(`**No clear gain.** Listening delta **${fmtDelta(agg.delta.listening)}** — conversation rules alone did not move the rubric materially.`);
  }
  lines.push('');
  lines.push('### 2. Does it reduce the "answer engine" feeling?');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('*Pending live run.* Audit baseline: deliver-mode ~72%, exploratory asking ~2%.');
  } else if (agg.delta.answerEngineFeeling > 0.15 || agg.delta.shape.deliverMode < -5) {
    lines.push(`**Yes.** Companion-feel score **${agg.current.answerEngineFeeling} → ${agg.experiment.answerEngineFeeling}** (${fmtDelta(agg.delta.answerEngineFeeling)}). Deliver-mode **${agg.current.shape.deliverModePct}% → ${agg.experiment.shape.deliverModePct}%** (${fmtDelta(agg.experiment.shape.deliverModePct - agg.current.shape.deliverModePct)}).`);
  } else {
    lines.push(`**Partially or no.** Companion-feel delta **${fmtDelta(agg.delta.answerEngineFeeling)}**; deliver-mode delta **${fmtDelta(agg.experiment.shape.deliverModePct - agg.current.shape.deliverModePct)} pts.`);
  }
  lines.push('');
  lines.push('### 3. What is the score delta?');
  lines.push('');
  lines.push('| Metric | Δ (Experiment − Current RACL) |');
  lines.push('| --- | --- |');
  lines.push(`| Listening | ${openaiAvailable ? fmtDelta(agg.delta.listening) : 'pending'} |`);
  lines.push(`| Warmth | ${openaiAvailable ? fmtDelta(agg.delta.warmth) : 'pending'} |`);
  lines.push(`| Follow-up | ${openaiAvailable && agg.delta.followUp != null ? fmtDelta(agg.delta.followUp) : 'pending'} |`);
  lines.push(`| Companion feel | ${openaiAvailable ? fmtDelta(agg.delta.answerEngineFeeling) : 'pending'} |`);
  lines.push(`| Asking % | ${openaiAvailable ? fmtDelta(agg.experiment.shape.asking - agg.current.shape.asking) + ' pts' : 'pending'} |`);
  lines.push('');
  lines.push('### Bottleneck read (evidence-only)');
  lines.push('');
  if (openaiAvailable && agg.experiment.shape.exploratoryQuestionTurns >= 6 && agg.delta.listening > 0.2) {
    lines.push('Conversation behavior is a **confirmed lever** — shape and listening moved together. Retrieval/reasoning may still cap `threadSpecific`, but monologue shape is not the only blocker.');
  } else if (openaiAvailable && agg.experiment.shape.exploratoryQuestionTurns >= 4 && agg.delta.listening <= 0.1) {
    lines.push('Conversation shape **can change** (more asking) without proportional listening gain — supports audit: **compose-time specificity** and prompt pressure remain co-bottlenecks.');
  } else if (!openaiAvailable) {
    lines.push('Re-run with API key to complete evidence. Cached audit attributes ~**38%** of gap to conversation shape.');
  } else {
    lines.push('Experiment did not substantially shift shape or scores — remaining gap likely **shared** with prompt stack and compose specificity, not conversation rules alone.');
  }
  lines.push('');
  lines.push('## Per-thread summary');
  lines.push('');

  for (const thread of merged) {
    const curAvg = Math.round((thread.turns.reduce((s, t) => s + t.currentScores.listening, 0) / thread.turns.length) * 10) / 10;
    const expScores = thread.turns.map((t) => t.experimentScores).filter(Boolean);
    const expAvg =
      expScores.length > 0
        ? Math.round((expScores.reduce((s, sc) => s + sc.listening, 0) / expScores.length) * 10) / 10
        : null;
    const exploreCount = thread.turns.filter((t) => t.experimentScores?.shape?.hasExploratoryQuestion).length;
    lines.push(`### ${thread.name}`);
    lines.push('');
    lines.push(`Listening: **${curAvg}** → **${openaiAvailable && expAvg != null ? expAvg : 'pending'}** | Exploratory Qs in experiment: **${openaiAvailable ? `${exploreCount}/${thread.turns.length}` : 'pending'}**`);
    lines.push('');
    lines.push(mdTable(
      ['Turn', 'Listen Δ', 'Ask % Δ', 'Deliver Δ', 'Explore allowed?'],
      thread.turns.map((t) => [
        String(t.turn),
        openaiAvailable && t.deltas ? fmtDelta(t.deltas.listening) : '—',
        t.shapeDelta ? fmtDelta(t.shapeDelta.asking) : '—',
        t.shapeDelta ? fmtDelta(t.shapeDelta.deliverMode) : '—',
        t.allowExploratoryQuestion != null ? (t.allowExploratoryQuestion ? 'yes' : 'no') : '—',
      ])
    ));
    lines.push('');
    const sample = thread.turns[thread.turns.length - 1];
    lines.push('<details><summary>Last turn — Current vs Experiment</summary>');
    lines.push('');
    lines.push(`**User:** ${sample.message}`);
    lines.push('');
    lines.push('**Current RACL:**');
    lines.push('```');
    lines.push(truncate(sample.currentReply, 480));
    lines.push('```');
    lines.push('');
    lines.push('**Experiment:**');
    lines.push('```');
    lines.push(truncate(sample.experimentReply, 480));
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Stop conditions');
  lines.push('');
  lines.push('- No production wiring, legacy changes, doctrine/memory/RACL edits, deploy, or push');
  lines.push('- Evidence: `docs/companion-conversation-experiment/results.json`');
  lines.push('');

  return lines.join('\n');
}

function fmtDelta(n) {
  if (n == null || Number.isNaN(n)) return 'pending';
  const v = Math.round(n * 10) / 10;
  return v >= 0 ? `+${v}` : `${v}`;
}

function writeInconclusiveReport(cached) {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const merged = cached.results.map((thread) => {
    const turns = thread.turns.map((ct, i) => {
      const priorMessages = thread.turns.slice(0, i).map((t) => t.message);
      const currentScores = scoreTurn({
        reply: ct.reply,
        message: ct.message,
        turnIndex: i,
        priorReply: i > 0 ? thread.turns[i - 1].reply : null,
        priorMessages,
        threadId: thread.id,
      });
      return {
        turn: ct.turn,
        message: ct.message,
        currentReply: ct.reply,
        experimentReply: '[Pending — OPENAI_API_KEY required]',
        currentScores,
        experimentScores: null,
        deltas: null,
      };
    });
    return { id: thread.id, name: thread.name, turns };
  });

  const currentAgg = aggregateScores(merged, 'current');
  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable: false,
    verdict: 'INCONCLUSIVE',
    aggregate: {
      current: currentAgg,
      experiment: null,
      delta: null,
    },
    merged,
    baselineCachedListening: cached.metrics?.avgHumanListening ?? null,
    note: 'Run: OPENAI_API_KEY=sk-... node scripts/companionConversationExperiment.js',
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(
    OUT_REPORT,
    `${buildReport({
      merged,
      agg: {
        current: currentAgg,
        experiment: null,
        delta: { listening: null, warmth: null, followUp: null, answerEngineFeeling: null },
      },
      openaiAvailable: false,
      verdict: 'INCONCLUSIVE',
      cachedMetrics: cached.metrics,
    })}\n`
  );
  console.log(`Wrote ${OUT_REPORT} (INCONCLUSIVE — no API key)`);
}

async function main() {
  const openai = require('../services/openaiClient');
  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;

  const cached = loadCurrentResults();
  if (!cached) {
    console.error('Missing docs/racl/validation-results.json');
    process.exit(1);
  }

  if (!openaiAvailable) {
    writeInconclusiveReport(cached);
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const experimentResults = [];
  for (const spec of THREADS) {
    experimentResults.push(await runExperimentThread(spec));
  }

  const merged = mergeWithCurrent(experimentResults, cached);
  const currentAgg = aggregateScores(merged, 'current');
  const experimentAgg = aggregateScores(merged, 'experiment');

  const delta = {
    listening: Math.round((experimentAgg.listening - currentAgg.listening) * 10) / 10,
    warmth: Math.round((experimentAgg.warmth - currentAgg.warmth) * 10) / 10,
    followUp:
      experimentAgg.followUp != null && currentAgg.followUp != null
        ? Math.round((experimentAgg.followUp - currentAgg.followUp) * 10) / 10
        : null,
    answerEngineFeeling: Math.round((experimentAgg.answerEngineFeeling - currentAgg.answerEngineFeeling) * 10) / 10,
  };

  const verdict =
    delta.listening > 0.2 || (delta.answerEngineFeeling > 0.25 && experimentAgg.shape.exploratoryQuestionTurns >= 5)
      ? 'CONVERSATION_BEHAVIOR_HELPS'
      : delta.listening > 0.05 || experimentAgg.shape.exploratoryQuestionTurns >= 4
        ? 'PARTIAL — shape shifts, scores marginal'
        : 'CONVERSATION_BEHAVIOR_INSUFFICIENT';

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable: true,
    verdict,
    aggregate: { current: currentAgg, experiment: experimentAgg, delta },
    merged,
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(
    OUT_REPORT,
    `${buildReport({
      merged,
      agg: payload.aggregate,
      openaiAvailable: true,
      verdict,
      cachedMetrics: cached.metrics,
    })}\n`
  );

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Verdict: ${verdict}`);
  console.log(
    `Listening: ${currentAgg.listening} → ${experimentAgg.listening} (${fmtDelta(delta.listening)}) | Ask turns: ${currentAgg.shape.exploratoryQuestionTurns} → ${experimentAgg.shape.exploratoryQuestionTurns}`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
