#!/usr/bin/env node
/**
 * RESPONSE STRUCTURE removal experiment — current RACL vs structure-free compose (test-only).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/responseStructureRemovalExperiment.js
 *
 * No production wiring, deploy, push, or Sprint 3.
 */

try {
  require('dotenv').config();
} catch (_) {}

const fs = require('fs');
const path = require('path');
const {
  runResponseStructureRemovalExperimentRuntime,
  clearTestSessions,
  STRUCTURE_REMOVAL_INSTRUCTION,
} = require('../services/responseStructureRemovalExperiment');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { analyzeConversationShape, aggregateShape } = require('../services/conversationShapeAnalyzer');
const { overlapRatio, openingSentence } = require('../services/correctionLedger');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const CACHED_CURRENT = path.join(ROOT, 'docs', 'racl', 'validation-results.json');
const OUT_JSON = path.join(ROOT, 'docs', 'response-structure-removal', 'results.json');
const OUT_REPORT = path.join(ROOT, 'ResponseStructureRemovalExperiment.md');

const THREADS = [
  { id: 'job', name: 'Job opportunity' },
  { id: 'alz', name: "Alzheimer's caregiver" },
  { id: 'distant', name: 'Feeling distant from God' },
  { id: 'sabbath', name: 'Sabbath wording thread' },
  { id: 'grief', name: 'Grief thread' },
  { id: 'health', name: 'Health thread' },
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

function uid(prefix) {
  return `struct-rm-${prefix}-${Date.now()}`;
}

function getBuddyHelpers() {
  const H = require('../services/buddyBrain');
  return {
    normalizeInput: (a, b, c, d) => {
      if (typeof a === 'object' && a !== null) {
        return {
          userId: a.userId,
          mode: a.mode || 'COMPANION',
          personaKey: a.personaKey || 'ADAPTIVE_COMPANION',
          message: a.message,
        };
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
  const keywords = [...new Set(tokenize(corpus).filter((w) => w.length > 4))];
  return keywords.filter((w) => reply.toLowerCase().includes(w)).length;
}

function isCorrectionTurn(message = '') {
  return /wording|not asking|not answering|not listening|you call it|what i'?m asking/i.test(message);
}

function clamp(n) {
  return Math.max(0, Math.min(10, n));
}

function countScripturePrayer(reply = '') {
  let n = 0;
  if (/\b(proverbs|psalm|james|matthew|isaiah|exodus|romans|hebrews|scripture|the bible)\b/i.test(reply)) n += 1;
  if (/\bpray\b|\bprayer\b/i.test(reply) && /would you like|shall we|can i help you with a prayer/i.test(reply)) n += 1;
  return n;
}

function scoreHumanListening({ reply, message, turnIndex, priorReply, priorMessages, threadId }) {
  if (/unavailable/i.test(reply)) return { total: 0, dimensions: {} };

  const msg = String(message).toLowerCase();
  const detailHits = threadDetailHits(reply, priorMessages);

  let answeredLatest = 5;
  if (/\?/.test(message)) {
    if (reply.length > 60) answeredLatest += 2;
    if (/wording|roman catholic/i.test(msg) && /wording|roman catholic|shorthand|term/i.test(reply)) answeredLatest += 2;
    if (/faith is failing|empty|distant/i.test(msg) && /faith|empty|distant|failing/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(msg) && /constantine|laodicea/i.test(reply)) answeredLatest -= 3;
  } else if (detailHits >= 1 || reply.length > 50) answeredLatest += 2;

  let threadSpecific = 4;
  if (detailHits >= 2) threadSpecific += 2;
  if (detailHits >= 4) threadSpecific += 2;
  if (/again today|wednesday|your mom|alzheimer|far away|push or wait|knee/i.test(reply)) threadSpecific += 2;
  if (turnIndex > 0 && detailHits === 0 && reply.length > 120) threadSpecific -= 2;

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
    if (/misunderstood|you('re| are) right|to be direct|i will use|my mistake|fair point/i.test(reply)) correctionRecovery += 2;
    if (/roman catholic|wording/i.test(msg) && /roman catholic|wording/i.test(reply)) correctionRecovery += 2;
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(message)) correctionRecovery -= 2;
    correctionRecovery = clamp(correctionRecovery);
  }

  let feltHeard = 5;
  if (detailHits >= 2) feltHeard += 2;
  if (/not listening|not answering/i.test(msg) && !/wording|roman catholic|directly/i.test(reply)) feltHeard -= 2;
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

function scoreNaturalness(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 6;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 1;
  if ((reply.match(/proverbs|james|psalm/gi) || []).length >= 3) s -= 2;
  if (reply.split(/[.!?]+/).filter((x) => x.trim().length > 10).length <= 5) s += 1;
  return clamp(s);
}

function scoreOverExplaining(reply, shape) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 7;
  if (reply.length > 500) s -= 2;
  if ((shape.deliverModePct || 0) >= 78) s -= 2;
  if ((shape.explaining || 0) + (shape.advising || 0) >= 65) s -= 2;
  return clamp(s);
}

function scoreCompanionPresence(reply, shape) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  const deliver = shape.deliverModePct || 0;
  const reflectComfort = (shape.reflecting || 0) + (shape.engaging || 0);
  if (deliver < 68) s += 2;
  else if (deliver < 75) s += 1;
  if (reflectComfort >= 25) s += 2;
  if (/\bthank you for your thoughtful question\b/i.test(reply)) s -= 2;
  return clamp(s);
}

function scoreTurn(ctx) {
  const shape = analyzeConversationShape(ctx.reply);
  const listening = scoreHumanListening(ctx);
  return {
    listening: listening.total,
    warmth: scoreWarmth(ctx.reply),
    naturalness: scoreNaturalness(ctx.reply),
    threadSpecific: listening.dimensions.threadSpecific,
    feltHeard: listening.dimensions.feltHeard,
    companionPresence: scoreCompanionPresence(ctx.reply, shape),
    overExplaining: scoreOverExplaining(ctx.reply, shape),
    correctionRecovery: listening.dimensions.correctionRecovery,
    shape,
    scripturePrayerCount: countScripturePrayer(ctx.reply),
    replyLength: ctx.reply.length,
    opening: openingSentence(ctx.reply),
  };
}

/** Heuristic: does the opening read like lecture / answer-engine? */
function classifyOpening(opening = '') {
  const o = String(opening).trim();
  const lower = o.toLowerCase();
  const flags = [];
  if (/^(the bible|scripture|biblically|in scripture|proverbs|psalm|exodus|genesis)\b/i.test(o)) flags.push('scripture_led');
  if (/^(it is important|it'?s important|understanding|historically|the sabbath|sunday worship)\b/i.test(lower)) flags.push('lecture_led');
  if (/^it sounds like\b/i.test(lower)) flags.push('template_reflect');
  if (/^thank you for\b/i.test(lower)) flags.push('formal_assistant');
  if (o.length > 180) flags.push('long_opener');
  if (/\?/.test(o) && o.length < 120) flags.push('conversational_question');
  if (/^(i hear|i understand|that must|i'?m sorry|wednesday|your mom|far away|push or wait|knees)\b/i.test(lower)) flags.push('person_led');
  if (/^(you asked|to answer your|regarding your wording|when i use)\b/i.test(lower)) flags.push('direct_address');

  const lectureScore =
    (flags.includes('scripture_led') ? 2 : 0) +
    (flags.includes('lecture_led') ? 2 : 0) +
    (flags.includes('long_opener') ? 1 : 0) +
    (flags.includes('formal_assistant') ? 1 : 0);
  const companionScore =
    (flags.includes('person_led') ? 2 : 0) +
    (flags.includes('conversational_question') ? 2 : 0) +
    (flags.includes('direct_address') ? 1 : 0) -
    (flags.includes('template_reflect') ? 1 : 0);

  return {
    flags,
    lectureLikely: lectureScore >= 2,
    companionLikely: companionScore >= 2 && lectureScore < 2,
  };
}

function loadCurrentResults() {
  if (!fs.existsSync(CACHED_CURRENT)) return null;
  return JSON.parse(fs.readFileSync(CACHED_CURRENT, 'utf8'));
}

async function runExperimentThread(spec) {
  const H = getBuddyHelpers();
  const userId = uid(spec.id);
  clearTestSessions(userId);
  clearActiveConversation(userId);

  const messages = MESSAGES[spec.id];
  const turns = [];
  const priorMessages = [];

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const structured = await runResponseStructureRemovalExperimentRuntime(H, {
      userId,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
      message,
    });
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

    turns.push({
      turn: i + 1,
      message,
      reply,
      openaiCalled: !!structured?.runtime?.openaiCalled,
      scores,
      openingAnalysis: classifyOpening(scores.opening),
      overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
    });
    priorMessages.push(message);
  }

  return { id: spec.id, name: spec.name, turns };
}

function mergeWithCurrent(experimentResults, cached) {
  const byId = Object.fromEntries(cached.results.map((t) => [t.id, t]));
  return experimentResults.map((exp) => {
    const cur = byId[exp.id];
    const turns = exp.turns.map((et, i) => {
      const ct = cur?.turns?.[i];
      const priorMessages = exp.turns.slice(0, i).map((t) => t.message);
      const priorReply = i > 0 ? cur?.turns?.[i - 1]?.reply : null;
      const currentScores = scoreTurn({
        reply: ct?.reply || '',
        message: et.message,
        turnIndex: i,
        priorReply,
        priorMessages,
        threadId: exp.id,
      });
      const experimentScores = et.scores;
      return {
        turn: et.turn,
        message: et.message,
        currentReply: ct?.reply || '',
        experimentReply: et.reply,
        currentOpening: currentScores.opening,
        experimentOpening: experimentScores.opening,
        currentOpeningAnalysis: classifyOpening(currentScores.opening),
        experimentOpeningAnalysis: et.openingAnalysis,
        currentScores,
        experimentScores,
        deltas: {
          listening: Math.round((experimentScores.listening - currentScores.listening) * 10) / 10,
          warmth: Math.round((experimentScores.warmth - currentScores.warmth) * 10) / 10,
          naturalness: Math.round((experimentScores.naturalness - currentScores.naturalness) * 10) / 10,
          companionPresence: Math.round((experimentScores.companionPresence - currentScores.companionPresence) * 10) / 10,
          overExplaining: Math.round((experimentScores.overExplaining - currentScores.overExplaining) * 10) / 10,
        },
      };
    });
    return { id: exp.id, name: exp.name, turns };
  });
}

function avg(turns, key, variant) {
  const field = variant === 'experiment' ? 'experimentScores' : 'currentScores';
  const vals = turns.map((t) => t[field]?.[key]).filter((v) => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function aggregateScores(merged, variant) {
  const allTurns = merged.flatMap((t) => t.turns);
  const shapes = allTurns
    .map((t) => (variant === 'experiment' ? t.experimentScores : t.currentScores)?.shape)
    .filter(Boolean)
    .map((shape) => ({ shape }));
  const shapeAgg = aggregateShape(shapes);

  return {
    listening: avg(allTurns, 'listening', variant),
    warmth: avg(allTurns, 'warmth', variant),
    naturalness: avg(allTurns, 'naturalness', variant),
    threadSpecific: avg(allTurns, 'threadSpecific', variant),
    feltHeard: avg(allTurns, 'feltHeard', variant),
    companionPresence: avg(allTurns, 'companionPresence', variant),
    overExplaining: avg(allTurns, 'overExplaining', variant),
    avgScripturePrayer: Math.round((allTurns.reduce((s, t) => s + (t[`${variant === 'experiment' ? 'experiment' : 'current'}Scores`]?.scripturePrayerCount || 0), 0) / allTurns.length) * 10) / 10,
    shape: shapeAgg,
    deliverModePct: shapeAgg?.deliverModePct,
    answerExplainAdvisePct: shapeAgg
      ? Math.round((shapeAgg.answering + shapeAgg.explaining + shapeAgg.advising) * 10) / 10
      : null,
  };
}

function summarizeOpenings(merged) {
  let lectureCurrent = 0;
  let lectureExp = 0;
  let companionCurrent = 0;
  let companionExp = 0;
  let sameOpeners = 0;
  const n = merged.flatMap((t) => t.turns).length;

  for (const thread of merged) {
    for (const t of thread.turns) {
      if (t.currentOpeningAnalysis?.lectureLikely) lectureCurrent += 1;
      if (t.experimentOpeningAnalysis?.lectureLikely) lectureExp += 1;
      if (t.currentOpeningAnalysis?.companionLikely) companionCurrent += 1;
      if (t.experimentOpeningAnalysis?.companionLikely) companionExp += 1;
      if (
        t.currentOpening &&
        t.experimentOpening &&
        t.currentOpening.toLowerCase().slice(0, 40) === t.experimentOpening.toLowerCase().slice(0, 40)
      ) {
        sameOpeners += 1;
      }
    }
  }

  return {
    turns: n,
    lectureOpenersCurrent: lectureCurrent,
    lectureOpenersExperiment: lectureExp,
    companionOpenersCurrent: companionCurrent,
    companionOpenersExperiment: companionExp,
    identicalOpeningPrefix: sameOpeners,
  };
}

function fmtDelta(n) {
  if (n == null || Number.isNaN(n)) return 'pending';
  const v = Math.round(n * 10) / 10;
  return v >= 0 ? `+${v}` : `${v}`;
}

function truncate(s, n = 200) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function buildReport({ merged, agg, openaiAvailable, verdict, openingSummary, cachedMetrics }) {
  const lines = [];
  lines.push('# Response Structure Removal Experiment');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Verdict:** ${verdict}`);
  lines.push(`**Live OpenAI run:** ${openaiAvailable ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Hypothesis');
  lines.push('');
  lines.push('`buildRuntimeInstructions` **RESPONSE STRUCTURE 1–5** (conflict score 10/10 in `ComposerObjectiveConflictAudit.md`) forces mini-essay turns regardless of RACL, memory, or companion layers.');
  lines.push('');
  lines.push('## What changed (test-only)');
  lines.push('');
  lines.push('| Kept | Removed from compose |');
  lines.push('| --- | --- |');
  lines.push('| Full `buildRetrievalEvidencePack` (RACL) | `buildSystemPrompt` legacy persona |');
  lines.push('| Memory, correction ledger, listening guidance | `buildRuntimeInstructions` (RESPONSE STRUCTURE, Scripture-first, continue-analysis) |');
  lines.push('| Doctrine boundaries + `validateDoctrineBoundaries` | reflect-before-advise, next-steps, prayer-close ordering |');
  lines.push('| — | `companionTurnIntent`, posture validators |');
  lines.push('');
  lines.push('**Sole compose instruction (Part B):**');
  lines.push('');
  lines.push(`> ${STRUCTURE_REMOVAL_INSTRUCTION}`);
  lines.push('');
  lines.push('**Confound:** Minimal system shell (~1K chars) vs full reason-first ~12K — same as other compose isolation experiments.');
  lines.push('');
  lines.push('## Part C — Aggregate metrics (20 turns)');
  lines.push('');

  if (openaiAvailable && agg.delta) {
    lines.push('| Metric | Current RACL | Structure removed | Δ |');
    lines.push('| --- | --- | --- | --- |');
    for (const key of [
      'listening',
      'warmth',
      'naturalness',
      'threadSpecific',
      'feltHeard',
      'companionPresence',
      'overExplaining',
    ]) {
      lines.push(`| ${key} | ${agg.current[key]} | ${agg.experiment[key]} | ${fmtDelta(agg.delta[key])} |`);
    }
    lines.push('');
    lines.push('| Shape | Current | Removed | Δ |');
    lines.push('| --- | --- | --- | --- |');
    lines.push(`| deliver-mode % | ${agg.current.deliverModePct} | ${agg.experiment.deliverModePct} | ${fmtDelta(agg.experiment.deliverModePct - agg.current.deliverModePct)} |`);
    lines.push(`| answer/explain/advise % | ${agg.current.answerExplainAdvisePct} | ${agg.experiment.answerExplainAdvisePct} | ${fmtDelta(agg.experiment.answerExplainAdvisePct - agg.current.answerExplainAdvisePct)} |`);
    lines.push(`| avg scripture/prayer flags | ${agg.current.avgScripturePrayer} | ${agg.experiment.avgScripturePrayer} | ${fmtDelta(agg.experiment.avgScripturePrayer - agg.current.avgScripturePrayer)} |`);
  } else {
    lines.push(`Cached RACL baseline listening: **${cachedMetrics?.avgHumanListening ?? 'n/a'}/10**. Experiment pending \`OPENAI_API_KEY\`.`);
  }

  lines.push('');
  lines.push('## Part D — Opening sentence comparison (all turns)');
  lines.push('');
  if (openingSummary) {
    lines.push('| Signal | Current RACL | Structure removed |');
    lines.push('| --- | --- | --- |');
    lines.push(`| Lecture-like openers (heuristic) | ${openingSummary.lectureOpenersCurrent}/${openingSummary.turns} | ${openingSummary.lectureOpenersExperiment}/${openingSummary.turns} |`);
    lines.push(`| Companion-like openers (heuristic) | ${openingSummary.companionOpenersCurrent}/${openingSummary.turns} | ${openingSummary.companionOpenersExperiment}/${openingSummary.turns} |`);
    lines.push(`| Identical opening prefix (first 40 chars) | ${openingSummary.identicalOpeningPrefix} turns | — |`);
    lines.push('');
  }

  for (const thread of merged) {
    lines.push(`### ${thread.name}`);
    lines.push('');
    lines.push('| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const t of thread.turns) {
      lines.push(
        `| ${t.turn} | ${truncate(t.message, 48)} | ${truncate(t.currentOpening, 90)} | ${truncate(t.experimentOpening, 90)} | ${openaiAvailable ? fmtDelta(t.deltas?.listening) : '—'} |`
      );
    }
    lines.push('');
    lines.push('**Qualitative (openings):**');
    let lectDrop = 0;
    let compGain = 0;
    for (const t of thread.turns) {
      if (t.currentOpeningAnalysis?.lectureLikely && !t.experimentOpeningAnalysis?.lectureLikely) lectDrop += 1;
      if (!t.currentOpeningAnalysis?.companionLikely && t.experimentOpeningAnalysis?.companionLikely) compGain += 1;
    }
    lines.push(`- Lecture-like openers dropped: **${lectDrop}/${thread.turns.length}** turns`);
    lines.push(`- Companion-like openers gained: **${compGain}/${thread.turns.length}** turns`);
    lines.push('');
  }

  lines.push('### Part D synthesis');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('*Pending live run.*');
  } else if (openingSummary) {
    const lectDelta = openingSummary.lectureOpenersExperiment - openingSummary.lectureOpenersCurrent;
    const compDelta = openingSummary.companionOpenersExperiment - openingSummary.companionOpenersCurrent;
    lines.push(`- **Stopped lecturing in opener?** Lecture-like openers ${lectDelta <= 0 ? 'decreased' : 'increased'} (${fmtDelta(lectDelta)} turns).`);
    lines.push(`- **More conversational?** Companion-like openers ${compDelta >= 0 ? 'increased' : 'decreased'} (${fmtDelta(compDelta)} turns).`);
    lines.push(`- **Less repetitive?** See per-thread overlap in JSON; identical prefix count: **${openingSummary.identicalOpeningPrefix}**.`);
    lines.push(`- **Less answer-engine?** Deliver-mode ${fmtDelta(agg.experiment.deliverModePct - agg.current.deliverModePct)} pts; listening ${fmtDelta(agg.delta.listening)}.`);
  }

  lines.push('');
  lines.push('## Part E — Decision');
  lines.push('');
  const deltaL = agg.delta?.listening;
  const deltaCP = agg.delta?.companionPresence;
  const deltaDeliver =
    openaiAvailable && agg.experiment?.deliverModePct != null
      ? agg.experiment.deliverModePct - agg.current.deliverModePct
      : null;
  const deltaScripture =
    openaiAvailable && agg.experiment?.avgScripturePrayer != null
      ? agg.experiment.avgScripturePrayer - agg.current.avgScripturePrayer
      : null;

  lines.push('### 1. Is RESPONSE STRUCTURE the primary suppression mechanism?');
  if (!openaiAvailable) {
    lines.push('**INCONCLUSIVE** — run with API key.');
  } else if (deltaL >= 0.35 && deltaDeliver != null && deltaDeliver <= -5) {
    lines.push('**Yes — strong signal.** Listening and deliver-mode moved together when structure was removed.');
  } else if (deltaL >= 0.15 || (deltaDeliver != null && deltaDeliver <= -3)) {
    lines.push('**Partially yes.** Structure removal helped shape; other compose pressure (JSON contract, evidence density) may remain.');
  } else {
    lines.push('**Not proven as sole primary mechanism** on this run — ceiling may be elsewhere (retrieval stubs, correction directness, rubric).');
  }

  lines.push('');
  lines.push('### 2. If removed, what was the listening delta?');
  lines.push(openaiAvailable ? `**${fmtDelta(deltaL)}** (Current ${agg.current.listening} → ${agg.experiment.listening})` : '*Pending.*');

  lines.push('');
  lines.push('### 3. Did companion presence improve?');
  lines.push(openaiAvailable ? `**${fmtDelta(deltaCP)}** (over-explaining higher=better: ${fmtDelta(agg.delta.overExplaining)})` : '*Pending.*');

  lines.push('');
  lines.push('### 4. Did biblical grounding suffer?');
  if (!openaiAvailable) {
    lines.push('*Pending.* Doctrine validator unchanged; check scripture/prayer flags and manual read of Sabbath turns.');
  } else {
    lines.push(
      `Scripture/prayer flags per turn: **${agg.current.avgScripturePrayer} → ${agg.experiment.avgScripturePrayer}** (${fmtDelta(deltaScripture)}). Doctrine hard-fail regen still active — grounding likely preserved unless flags dropped sharply with doctrine fails in JSON.`
    );
  }

  lines.push('');
  lines.push('### 5. Should the structure be rewritten, reduced, or removed?');
  if (!openaiAvailable) {
    lines.push('**Hold** until benchmark completes.');
  } else if (deltaL >= 0.35) {
    lines.push('**Remove from reason-first compose** (or gate RESPONSE STRUCTURE to doctrinal study mode only); keep boundaries in a short block.');
  } else if (deltaL >= 0.1) {
    lines.push('**Reduce** — replace 5-step structure with moment-conditional guidance; do not ship full removal without second confirm run.');
  } else {
    lines.push('**Rewrite, not only remove** — structure removal alone did not clear +0.5; combine with slim JSON contract and turn-intent off on companion path.');
  }

  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push('- `docs/response-structure-removal/results.json`');
  lines.push('- `services/responseStructureRemovalExperiment.js` (test-only)');
  lines.push('');
  lines.push('## Stop conditions');
  lines.push('');
  lines.push('- No production merge, deploy, or push');
  lines.push('');

  return lines.join('\n');
}

function writeInconclusive(cached) {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  const merged = cached.results.map((thread) => ({
    id: thread.id,
    name: thread.name,
    turns: thread.turns.map((ct, i) => ({
      turn: ct.turn,
      message: ct.message,
      currentReply: ct.reply,
      experimentReply: '[Pending — OPENAI_API_KEY required]',
      currentOpening: openingSentence(ct.reply),
      experimentOpening: null,
      currentScores: scoreTurn({
        reply: ct.reply,
        message: ct.message,
        turnIndex: i,
        priorMessages: thread.turns.slice(0, i).map((t) => t.message),
        threadId: thread.id,
      }),
      experimentScores: null,
    })),
  }));

  const currentAgg = aggregateScores(merged, 'current');
  const openingSummary = summarizeOpenings(merged);

  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        openaiAvailable: false,
        verdict: 'INCONCLUSIVE',
        structureRemovalInstruction: STRUCTURE_REMOVAL_INSTRUCTION,
        baselineCachedListening: cached.metrics?.avgHumanListening,
        aggregate: { current: currentAgg, experiment: null, delta: null },
        openingSummary,
        merged,
      },
      null,
      2
    )}\n`
  );

  fs.writeFileSync(
    OUT_REPORT,
    `${buildReport({
      merged,
      agg: { current: currentAgg, experiment: null, delta: {} },
      openaiAvailable: false,
      verdict: 'INCONCLUSIVE',
      openingSummary,
      cachedMetrics: cached.metrics,
    })}\n`
  );
  console.log(`Wrote ${OUT_REPORT} (INCONCLUSIVE)`);
  console.log(`Wrote ${OUT_JSON}`);
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
    writeInconclusive(cached);
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const experimentResults = [];
  for (const spec of THREADS) {
    console.log(`Running structure removal: ${spec.name}...`);
    experimentResults.push(await runExperimentThread(spec));
  }

  const merged = mergeWithCurrent(experimentResults, cached);
  const currentAgg = aggregateScores(merged, 'current');
  const experimentAgg = aggregateScores(merged, 'experiment');
  const delta = {
    listening: Math.round((experimentAgg.listening - currentAgg.listening) * 10) / 10,
    warmth: Math.round((experimentAgg.warmth - currentAgg.warmth) * 10) / 10,
    naturalness: Math.round((experimentAgg.naturalness - currentAgg.naturalness) * 10) / 10,
    threadSpecific: Math.round((experimentAgg.threadSpecific - currentAgg.threadSpecific) * 10) / 10,
    feltHeard: Math.round((experimentAgg.feltHeard - currentAgg.feltHeard) * 10) / 10,
    companionPresence: Math.round((experimentAgg.companionPresence - currentAgg.companionPresence) * 10) / 10,
    overExplaining: Math.round((experimentAgg.overExplaining - currentAgg.overExplaining) * 10) / 10,
  };

  const openingSummary = summarizeOpenings(merged);

  let verdict = 'STRUCTURE_REMOVAL_INSUFFICIENT';
  if (delta.listening >= 0.35 && experimentAgg.deliverModePct < currentAgg.deliverModePct - 4) {
    verdict = 'STRUCTURE_IS_PRIMARY_SUPPRESSOR';
  } else if (delta.listening >= 0.15 || delta.companionPresence >= 0.2) {
    verdict = 'STRUCTURE_REMOVAL_PARTIAL_GAIN';
  } else if (delta.listening <= -0.1) {
    verdict = 'STRUCTURE_REMOVAL_REGRESSED';
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable: true,
    verdict,
    structureRemovalInstruction: STRUCTURE_REMOVAL_INSTRUCTION,
    baselineCachedListening: cached.metrics?.avgHumanListening,
    aggregate: { current: currentAgg, experiment: experimentAgg, delta },
    openingSummary,
    merged,
    experimentResults,
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(
    OUT_REPORT,
    `${buildReport({
      merged,
      agg: payload.aggregate,
      openaiAvailable: true,
      verdict,
      openingSummary,
      cachedMetrics: cached.metrics,
    })}\n`
  );

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Verdict: ${verdict}`);
  console.log(`Listening: ${currentAgg.listening} → ${experimentAgg.listening} (${fmtDelta(delta.listening)})`);
  console.log(`Deliver-mode: ${currentAgg.deliverModePct}% → ${experimentAgg.deliverModePct}%`);
  process.exit(verdict === 'STRUCTURE_IS_PRIMARY_SUPPRESSOR' ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
