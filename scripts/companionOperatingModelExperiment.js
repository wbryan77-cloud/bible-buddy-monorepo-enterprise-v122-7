#!/usr/bin/env node
/**
 * Companion Operating Model experiment — current RACL vs human-moment-first compose (test-only).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/companionOperatingModelExperiment.js
 *
 * No production wiring, deploy, push, or Sprint 3.
 */

try {
  require('dotenv').config();
} catch (_) {}

const fs = require('fs');
const path = require('path');
const {
  runCompanionOperatingModelExperimentRuntime,
  clearTestSessions,
  assessHumanMoment,
} = require('../services/companionOperatingModelExperiment');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { analyzeConversationShape, aggregateShape } = require('../services/conversationShapeAnalyzer');
const { overlapRatio } = require('../services/correctionLedger');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const CACHED_CURRENT = path.join(ROOT, 'docs', 'racl', 'validation-results.json');
const OUT_JSON = path.join(ROOT, 'docs', 'companion-operating-model', 'results.json');
const OUT_REPORT = path.join(ROOT, 'CompanionOperatingModelExperimentReport.md');

const SUCCESS_TARGET = { minListeningDelta: 0.5 };

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
  return `op-model-${prefix}-${Date.now()}`;
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

function isQuestion(message = '') {
  return /\?/.test(message);
}

function clamp(n) {
  return Math.max(0, Math.min(10, n));
}

function countQuestions(reply = '') {
  return (String(reply).match(/\?/g) || []).length;
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
  if (isQuestion(message)) {
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
  if (/\byou mentioned\b/i.test(reply)) s -= 1;
  if (/\bwould you like to pray\b/i.test(reply) && reply.length < 220) s -= 1;
  if (reply.split(/[.!?]+/).filter((x) => x.trim().length > 10).length <= 5) s += 1;
  return clamp(s);
}

function scoreUsefulness(reply, message) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  if (isQuestion(message) && reply.length > 50) s += 2;
  if (isCorrectionTurn(message) && /roman catholic|wording/i.test(reply) && reply.length < 400) s += 2;
  if (reply.length > 600) s -= 2;
  return clamp(s);
}

function scoreOverExplaining(reply, shape) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 7;
  const deliver = shape.deliverModePct || 0;
  const sentences = reply.split(/[.!?]+/).filter((x) => x.trim().length > 8).length;
  if (reply.length > 500) s -= 2;
  if (reply.length > 650) s -= 1;
  if (deliver >= 78) s -= 2;
  if ((shape.explaining || 0) + (shape.advising || 0) >= 65) s -= 2;
  if (sentences >= 8) s -= 1;
  if (reply.length < 280 && deliver < 70) s += 1;
  return clamp(s);
}

function scoreCompanionPresence(reply, shape, humanMoment) {
  if (/unavailable/i.test(reply)) return 0;
  let s = 5;
  const deliver = shape.deliverModePct || 0;
  const reflectComfort = (shape.reflecting || 0) + (shape.engaging || 0);
  if (deliver < 68) s += 2;
  else if (deliver < 75) s += 1;
  if (reflectComfort >= 25) s += 2;
  if (humanMoment?.shouldKeepShort && reply.length < 350) s += 1;
  if (humanMoment?.userNeed === 'needs_to_be_heard' && deliver >= 80) s -= 2;
  if (/\bthank you for your thoughtful question\b/i.test(reply)) s -= 2;
  return clamp(s);
}

function scoreTurn(ctx) {
  const shape = analyzeConversationShape(ctx.reply);
  const listening = scoreHumanListening(ctx);
  const warmth = scoreWarmth(ctx.reply);
  const naturalness = scoreNaturalness(ctx.reply);
  const usefulness = scoreUsefulness(ctx.reply, ctx.message);
  const overExplaining = scoreOverExplaining(ctx.reply, shape);
  const companionPresence = scoreCompanionPresence(ctx.reply, shape, ctx.humanMoment);

  return {
    listening: listening.total,
    warmth,
    naturalness,
    threadSpecific: listening.dimensions.threadSpecific,
    feltHeard: listening.dimensions.feltHeard,
    usefulness,
    correctionRecovery: listening.dimensions.correctionRecovery,
    overExplaining,
    companionPresence,
    listeningDimensions: listening.dimensions,
    shape,
    questionCount: countQuestions(ctx.reply),
    scripturePrayerCount: countScripturePrayer(ctx.reply),
    reflectComfortExplorePct: Math.round((shape.reflecting + shape.engaging) * 10) / 10,
    answerExplainAdvisePct: Math.round((shape.answering + shape.explaining + shape.advising) * 10) / 10,
    replyLength: ctx.reply.length,
  };
}

function qualitativeNotes({ reply, message, scores, humanMoment, variant }) {
  const notes = [];
  const companionFeel = scores.companionPresence >= 6 && scores.overExplaining >= 6;
  notes.push(`Companion feel (${variant}): ${companionFeel ? 'yes' : 'weak'} (presence ${scores.companionPresence}, over-explain ${scores.overExplaining})`);
  notes.push(`Over-answer: ${scores.replyLength > 500 || scores.shape.deliverModePct >= 78 ? 'likely' : 'moderate/ok'}`);
  notes.push(
    `Ask vs answer: ${scores.questionCount > 0 && isQuestion(message) === false ? 'asked when sharing' : scores.questionCount === 0 && isQuestion(message) ? 'may under-ask' : 'balanced'}`
  );
  if (/grief|bothering|distant|alzheimer|mom/i.test(message) && scores.shape.deliverModePct >= 75) {
    notes.push('Answer when comfort: possible — high deliver-mode on emotional turn');
  }
  if (humanMoment?.shouldTeach && scores.shape.explaining < 15 && isQuestion(message)) {
    notes.push('Teach too late: possible on factual turn');
  }
  if (scores.scripturePrayerCount >= 1 && /\b(proverbs|psalm)\b/i.test(reply) && reply.length < 200) {
    notes.push(`Scripture/prayer: ${scores.scripturePrayerCount} — check if mechanical`);
  } else if (scores.scripturePrayerCount > 0) {
    notes.push(`Scripture/prayer offers: ${scores.scripturePrayerCount}`);
  } else {
    notes.push('Scripture/prayer: none or woven naturally');
  }
  return notes;
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

  const { buildRuntimeContext } = require('../services/runtimeOrchestrator');
  const messages = MESSAGES[spec.id];
  const turns = [];
  const priorMessages = [];

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

    const humanMoment = assessHumanMoment(message, evidencePack);
    const structured = await runCompanionOperatingModelExperimentRuntime(H, {
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
      humanMoment,
    });

    turns.push({
      turn: i + 1,
      message,
      reply,
      humanMoment,
      openaiCalled: !!structured?.runtime?.openaiCalled,
      scores,
      overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
      qualitative: qualitativeNotes({ reply, message, scores, humanMoment, variant: 'operating_model' }),
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
        humanMoment: et.humanMoment,
      });
      return {
        turn: et.turn,
        message: et.message,
        currentReply: ct?.reply || '',
        experimentReply: et.reply,
        humanMoment: et.humanMoment,
        currentScores,
        experimentScores: et.scores,
        currentQualitative: qualitativeNotes({
          reply: ct?.reply || '',
          message: et.message,
          scores: currentScores,
          humanMoment: et.humanMoment,
          variant: 'current_racl',
        }),
        experimentQualitative: et.qualitative,
        deltas: {
          listening: Math.round((et.scores.listening - currentScores.listening) * 10) / 10,
          warmth: Math.round((et.scores.warmth - currentScores.warmth) * 10) / 10,
          naturalness: Math.round((et.scores.naturalness - currentScores.naturalness) * 10) / 10,
          companionPresence: Math.round((et.scores.companionPresence - currentScores.companionPresence) * 10) / 10,
          overExplaining: Math.round((et.scores.overExplaining - currentScores.overExplaining) * 10) / 10,
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
    usefulness: avg(allTurns, 'usefulness', variant),
    companionPresence: avg(allTurns, 'companionPresence', variant),
    overExplaining: avg(allTurns, 'overExplaining', variant),
    avgQuestions: Math.round((allTurns.reduce((s, t) => s + (t[`${variant === 'experiment' ? 'experiment' : 'current'}Scores`]?.questionCount || 0), 0) / allTurns.length) * 10) / 10,
    avgScripturePrayer: Math.round((allTurns.reduce((s, t) => s + (t[`${variant === 'experiment' ? 'experiment' : 'current'}Scores`]?.scripturePrayerCount || 0), 0) / allTurns.length) * 10) / 10,
    shape: shapeAgg,
    answerExplainAdvisePct: shapeAgg
      ? Math.round((shapeAgg.answering + shapeAgg.explaining + shapeAgg.advising) * 10) / 10
      : null,
    reflectComfortExplorePct: shapeAgg
      ? Math.round((shapeAgg.reflecting + shapeAgg.engaging) * 10) / 10
      : null,
  };
}

function pickBestWorst(turns, variant) {
  const field = variant === 'experiment' ? 'experimentScores' : 'currentScores';
  const replyField = variant === 'experiment' ? 'experimentReply' : 'currentReply';
  const qualField = variant === 'experiment' ? 'experimentQualitative' : 'currentQualitative';
  let best = turns[0];
  let worst = turns[0];
  for (const t of turns) {
    const score = (t[field]?.listening || 0) + (t[field]?.companionPresence || 0) * 0.5;
    const bestScore = (best[field]?.listening || 0) + (best[field]?.companionPresence || 0) * 0.5;
    const worstScore = (worst[field]?.listening || 0) + (worst[field]?.companionPresence || 0) * 0.5;
    if (score > bestScore) best = t;
    if (score < worstScore) worst = t;
  }
  return {
    best: { turn: best.turn, reply: best[replyField], scores: best[field], notes: best[qualField] },
    worst: { turn: worst.turn, reply: worst[replyField], scores: worst[field], notes: worst[qualField] },
  };
}

function fmtDelta(n) {
  if (n == null || Number.isNaN(n)) return 'pending';
  const v = Math.round(n * 10) / 10;
  return v >= 0 ? `+${v}` : `${v}`;
}

function buildDecision({ delta, experimentAgg, currentAgg, openaiAvailable, cachedMetrics }) {
  const lines = [];
  const beatTarget = openaiAvailable && delta.listening >= SUCCESS_TARGET.minListeningDelta;
  const beatRacl = openaiAvailable && delta.listening > 0.15;

  lines.push('## Part G — Decision');
  lines.push('');
  lines.push('### 1. Did Companion Operating Model beat current RACL?');
  if (!openaiAvailable) {
    lines.push('**INCONCLUSIVE** — no live experiment run. Cached RACL baseline listening: **' + (cachedMetrics?.avgHumanListening ?? 'n/a') + '/10**.');
  } else {
    lines.push(
      beatRacl
        ? `**${beatTarget ? 'Yes — meets +0.5 target' : 'Yes — marginal'}**. Listening **${currentAgg.listening} → ${experimentAgg.listening}** (${fmtDelta(delta.listening)}).`
        : `**No**. Listening **${currentAgg.listening} → ${experimentAgg.listening}** (${fmtDelta(delta.listening)}); target was **+${SUCCESS_TARGET.minListeningDelta}**.`
    );
  }
  lines.push('');
  lines.push('### 2. If yes, by how much?');
  lines.push(openaiAvailable ? `Listening **${fmtDelta(delta.listening)}**; companion presence **${fmtDelta(delta.companionPresence)}**; over-explaining (higher=better) **${fmtDelta(delta.overExplaining)}**.` : '*Pending live run.*');
  lines.push('');
  lines.push('### 3. Did it reduce answer-engine feel?');
  if (!openaiAvailable) {
    lines.push('*Pending.* Audit baseline deliver-mode ~72–78%.');
  } else {
    const deliverDelta = (experimentAgg.shape?.deliverModePct || 0) - (currentAgg.shape?.deliverModePct || 0);
    lines.push(
      deliverDelta < -3 || delta.companionPresence > 0.2
        ? `**Likely yes.** Deliver-mode **${currentAgg.shape?.deliverModePct}% → ${experimentAgg.shape?.deliverModePct}%** (${fmtDelta(deliverDelta)} pts). Answer/explain/advise **${currentAgg.answerExplainAdvisePct}% → ${experimentAgg.answerExplainAdvisePct}%**.`
        : `**Partial or no.** Deliver-mode delta **${fmtDelta(deliverDelta)}** pts; reflect/comfort/explore **${currentAgg.reflectComfortExplorePct}% → ${experimentAgg.reflectComfortExplorePct}%**.`
    );
  }
  lines.push('');
  lines.push('### 4. Did it keep biblical grounding?');
  lines.push(
    openaiAvailable
      ? `Scripture/prayer mentions per turn: **${currentAgg.avgScripturePrayer} → ${experimentAgg.avgScripturePrayer}**. Doctrine regen uses existing \`validateDoctrineBoundaries\` only — no new doctrine system.`
      : '*Pending.*'
  );
  lines.push('');
  lines.push('### 5. Did it avoid becoming another template system?');
  lines.push(
    '**Design intent: yes** — no forced openers, posture labels, or mandatory questions; `humanMoment` guides compose only in test runtime. Live proof requires reading replies (see qualitative sections).'
  );
  lines.push('');
  lines.push('### 6. Should we implement it into reason-first RACL?');
  if (!openaiAvailable) {
    lines.push('**Hold** until live benchmark completes.');
  } else if (beatTarget && delta.companionPresence >= 0.2) {
    lines.push('**Yes — pilot merge** of `assessHumanMoment` + composer guidance into `reasonFirstComposer.js` behind a test flag; keep retrieval unchanged.');
  } else if (beatRacl) {
    lines.push('**Maybe — narrow pilot** on companion threads only; insufficient margin for full swap.');
  } else {
    lines.push('**No** — human-moment object alone did not clear the +0.5 listening bar; keep as research artifact.');
  }
  lines.push('');
  lines.push('### 7. If not, what still blocks companion feel?');
  if (!openaiAvailable) {
    lines.push('- Unknown until OpenAI run.');
  } else if (!beatTarget) {
    lines.push('- Composer still **delivers** when `humanMoment` says hear-first but retrieval packs teaching evidence.');
    lines.push('- **Thread specificity** may remain retrieval-limited (`threadSpecific` delta ' + fmtDelta(delta.threadSpecific) + ').');
    lines.push('- **Sabbath correction** overlap/history bleed if meta turns still get history chain in pack.');
    lines.push('- Rubric may reward answers on explicit `?` turns — operating model may under-answer those.');
  } else {
    lines.push('- Residual risks: Sabbath T7, repetitive scripture on short health turns — monitor in production pilot.');
  }
  return lines.join('\n');
}

function buildReport({ merged, agg, openaiAvailable, verdict, cachedMetrics }) {
  const lines = [];
  lines.push('# Companion Operating Model Experiment Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Verdict:** ${verdict}`);
  lines.push(`**OpenAI live run:** ${openaiAvailable ? 'yes' : 'no (cached RACL only)'}`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Test-only: `services/companionOperatingModelExperiment.js` + this script');
  lines.push('- **Not** wired to production, buddyBrain default, deploy, push, or Sprint 3');
  lines.push('- Reuses **existing** `buildRetrievalEvidencePack` (RACL); changes compose purpose only');
  lines.push('- Minimal compose shell (~1.2K system) — confound vs full reason-first prompt stack');
  lines.push('');
  lines.push('## Core principle');
  lines.push('');
  lines.push('Respond to the **human moment** first (comfort, repair, discernment, heard), then answer only as much as the moment needs — not “find detail → insert → answer.”');
  lines.push('');
  lines.push('## Aggregate scores (20 turns)');
  lines.push('');
  if (openaiAvailable && agg.current && agg.experiment) {
    lines.push('| Metric | Current RACL | Operating Model | Δ |');
    lines.push('| --- | --- | --- | --- |');
    for (const key of [
      'listening',
      'warmth',
      'naturalness',
      'threadSpecific',
      'feltHeard',
      'usefulness',
      'companionPresence',
      'overExplaining',
    ]) {
      lines.push(
        `| ${key} | ${agg.current[key]} | ${agg.experiment[key]} | ${fmtDelta(agg.delta[key])} |`
      );
    }
    lines.push('');
    lines.push('| Shape / counts | Current | Model | Δ |');
    lines.push('| --- | --- | --- | --- |');
    lines.push(`| answer/explain/advise % | ${agg.current.answerExplainAdvisePct} | ${agg.experiment.answerExplainAdvisePct} | ${fmtDelta(agg.experiment.answerExplainAdvisePct - agg.current.answerExplainAdvisePct)} |`);
    lines.push(`| reflect/comfort/explore % | ${agg.current.reflectComfortExplorePct} | ${agg.experiment.reflectComfortExplorePct} | ${fmtDelta(agg.experiment.reflectComfortExplorePct - agg.current.reflectComfortExplorePct)} |`);
    lines.push(`| avg questions / turn | ${agg.current.avgQuestions} | ${agg.experiment.avgQuestions} | ${fmtDelta(agg.experiment.avgQuestions - agg.current.avgQuestions)} |`);
    lines.push(`| avg scripture/prayer flags | ${agg.current.avgScripturePrayer} | ${agg.experiment.avgScripturePrayer} | ${fmtDelta(agg.experiment.avgScripturePrayer - agg.current.avgScripturePrayer)} |`);
    lines.push(`| deliver-mode % | ${agg.current.shape?.deliverModePct} | ${agg.experiment.shape?.deliverModePct} | ${fmtDelta(agg.experiment.shape.deliverModePct - agg.current.shape.deliverModePct)} |`);
  } else {
    lines.push(`Cached RACL listening: **${cachedMetrics?.avgHumanListening ?? 'n/a'}/10**. Experiment pending API key.`);
  }
  lines.push('');
  lines.push(buildDecision({ delta: agg.delta || {}, experimentAgg: agg.experiment, currentAgg: agg.current, openaiAvailable, cachedMetrics }));
  lines.push('');
  lines.push('## Per-thread qualitative (best / worst)');
  lines.push('');

  for (const thread of merged) {
    const curBw = pickBestWorst(thread.turns, 'current');
    const expBw = pickBestWorst(thread.turns, 'experiment');
    lines.push(`### ${thread.name}`);
    lines.push('');
    lines.push(`**Current RACL** — best T${curBw.best.turn} (listen ${curBw.best.scores?.listening}), worst T${curBw.worst.turn} (listen ${curBw.worst.scores?.listening})`);
    lines.push('');
    lines.push('<details><summary>Current best</summary>');
    lines.push('');
    lines.push(curBw.best.reply.slice(0, 520));
    lines.push('');
    curBw.best.notes?.forEach((n) => lines.push(`- ${n}`));
    lines.push('</details>');
    lines.push('');
    if (openaiAvailable) {
      lines.push(`**Operating Model** — best T${expBw.best.turn} (listen ${expBw.best.scores?.listening}), worst T${expBw.worst.turn} (listen ${expBw.worst.scores?.listening})`);
      lines.push('');
      lines.push('<details><summary>Model best</summary>');
      lines.push('');
      lines.push(expBw.best.reply.slice(0, 520));
      lines.push('');
      expBw.best.notes?.forEach((n) => lines.push(`- ${n}`));
      lines.push('</details>');
      lines.push('');
      lines.push('<details><summary>Model worst</summary>');
      lines.push('');
      lines.push(expBw.worst.reply.slice(0, 520));
      lines.push('');
      expBw.worst.notes?.forEach((n) => lines.push(`- ${n}`));
      lines.push('</details>');
    }
    lines.push('');
  }

  lines.push('## Success target');
  lines.push('');
  lines.push(`- Listening **+${SUCCESS_TARGET.minListeningDelta}** over current RACL (~${(cachedMetrics?.avgHumanListening ?? 6.3) + SUCCESS_TARGET.minListeningDelta}+)`);
  lines.push('- Companion presence up; over-explaining down; scripture/prayer less repetitive');
  lines.push('- Sabbath correction must not regress; Alzheimer’s / grief / health / job threads more personal');
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push('- `docs/companion-operating-model/results.json`');
  lines.push('- `services/companionOperatingModelExperiment.js` (test-only)');
  lines.push('');

  return lines.join('\n');
}

function writeInconclusive(cached) {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  const merged = cached.results.map((thread) => {
    const turns = thread.turns.map((ct, i) => {
      const priorMessages = thread.turns.slice(0, i).map((t) => t.message);
      const priorReply = i > 0 ? thread.turns[i - 1].reply : null;
      const currentScores = scoreTurn({
        reply: ct.reply,
        message: ct.message,
        turnIndex: i,
        priorReply,
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
      };
    });
    return { id: thread.id, name: thread.name, turns };
  });

  const currentAgg = aggregateScores(merged, 'current');
  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable: false,
    verdict: 'INCONCLUSIVE',
    baselineCachedListening: cached.metrics?.avgHumanListening,
    aggregate: { current: currentAgg, experiment: null, delta: null },
    merged,
    note: 'OPENAI_API_KEY=sk-... node scripts/companionOperatingModelExperiment.js',
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(
    OUT_REPORT,
    `${buildReport({
      merged,
      agg: { current: currentAgg, experiment: null, delta: {} },
      openaiAvailable: false,
      verdict: 'INCONCLUSIVE',
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
    console.log(`Running operating model: ${spec.name}...`);
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
    usefulness: Math.round((experimentAgg.usefulness - currentAgg.usefulness) * 10) / 10,
    companionPresence: Math.round((experimentAgg.companionPresence - currentAgg.companionPresence) * 10) / 10,
    overExplaining: Math.round((experimentAgg.overExplaining - currentAgg.overExplaining) * 10) / 10,
  };

  const beatTarget = delta.listening >= SUCCESS_TARGET.minListeningDelta;
  const verdict = beatTarget
    ? 'OPERATING_MODEL_MEETS_TARGET'
    : delta.listening > 0.2
      ? 'PARTIAL — below +0.5 bar'
      : delta.listening > 0.05
        ? 'MARGINAL'
        : 'OPERATING_MODEL_INSUFFICIENT';

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable: true,
    verdict,
    successTarget: SUCCESS_TARGET,
    baselineCachedListening: cached.metrics?.avgHumanListening,
    aggregate: { current: currentAgg, experiment: experimentAgg, delta },
    experimentResults,
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
  console.log(`Listening: ${currentAgg.listening} → ${experimentAgg.listening} (${fmtDelta(delta.listening)})`);
  process.exit(beatTarget ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
