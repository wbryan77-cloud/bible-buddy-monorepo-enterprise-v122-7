/**
 * Phase 5A — Companion state: listener, teacher, prayer partner, clarifier.
 */

const { planCompanionDoctrineRouting, buildRoutingContext } = require('./companionDoctrineRouter');
const { detectConceptFromGraph } = require('./bibleConceptGraph');
const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const { isPendingQuestionChallenge } = require('./pendingQuestionResolver');
const { buildPrayerResponse } = require('./practicalGuidanceEngine');
const { isCorrectionMessage } = require('./userCorrectionMemory');

const EMOTIONAL_PATTERNS = [
  /\bbad day\b/i,
  /\bi am sad\b/i,
  /\bi'm sad\b/i,
  /\btired and discouraged\b/i,
  /\bdiscouraged\b/i,
  /\bpray with me\b/i,
  /\bneed prayer\b/i,
  /\blove life\b/i,
  /\bheartbreak\b/i,
  /\bcrashing\b/i,
  /\boverwhelmed\b/i,
  /\bmy feeling overwhelmed\b/i,
];

const COMFORT_SCRIPTURE = {
  heartbreak: { ref: 'Psalm 34:18', text: 'the LORD is nigh unto them that are of a broken heart' },
  prayer: { ref: '1 Peter 5:7', text: 'Casting all your care upon him; for he careth for you' },
  grief: { ref: 'Psalm 34:18', text: 'the LORD is nigh unto them that are of a broken heart' },
  default: { ref: 'Psalm 34:18', text: 'the LORD is nigh unto them that are of a broken heart' },
};

function classifyCompanionState({ message = '', userId = '', recentSessions = [], runtimeContext = {} } = {}) {
  const m = String(message || '').trim();
  const context = buildRoutingContext(userId, { runtimeContext, recentSessions });
  const routePlan = planCompanionDoctrineRouting({ userId, message, recentSessions, runtimeContext });
  const concept = detectSemanticConcept(m, context) || detectConceptFromGraph(m);

  let mode = 'companion_general';
  if (routePlan.lane === 'strict_doctrine') mode = 'bible_teacher';
  else if (routePlan.lane === 'bible_wide') mode = 'bible_teacher';
  else if (routePlan.intent === 'emotional_support' || EMOTIONAL_PATTERNS.some((re) => re.test(m))) {
    mode = 'listener';
  } else if (/\bpray\b/i.test(m)) mode = 'prayer_partner';
  else if (isPendingQuestionChallenge(m) || routePlan.intent === 'memory_recall') mode = 'memory_helper';
  else if (isCorrectionMessage(m) || routePlan.intent === 'user_correction') mode = 'clarifier';
  else if (concept) mode = 'bible_teacher';

  const emotional = mode === 'listener' || /\blove life\b/i.test(m) && /\bcrash/i.test(m);
  const comfortKey = /\bpray\b/i.test(m) ? 'prayer' : /\blove life|heartbreak|crash/i.test(m) ? 'heartbreak' : 'default';
  const comfort = COMFORT_SCRIPTURE[comfortKey];

  return {
    mode,
    tone: emotional ? 'warm_listener' : 'companion',
    shouldUseOpenAI: mode === 'companion_general' && !concept && !routePlan.immediateCompanionReply,
    shouldUseScripture: mode === 'bible_teacher' || emotional,
    scriptureComfortRefs: emotional ? [comfort] : [],
    followUpQuestion: emotional
      ? /\blove life\b/i.test(m)
        ? 'What happened today that made it feel like it’s crashing?'
        : /\bbad day\b/i.test(m)
          ? 'Want to tell me what happened?'
          : 'What’s weighing on you right now?'
      : null,
    routePlan,
    concept,
    context,
  };
}

function buildCompanionSupportReply({ message = '', state = {} } = {}) {
  const m = String(message || '').toLowerCase();

  if (/\blove life\b/i.test(m) && /\bcrash/i.test(m)) {
    const comfort = state.scriptureComfortRefs?.[0] || COMFORT_SCRIPTURE.heartbreak;
    return {
      reply: `I'm sorry. That kind of heartbreak can feel heavy. I'm here with you. ${state.followUpQuestion || 'What happened today?'} One Scripture that may steady the heart is ${comfort.ref} — ${comfort.text}.`,
      scripture: [{ reference: comfort.ref, theme: 'comfort' }],
    };
  }

  if (/\boverwhelmed\b/i.test(m) || /\bmy feeling overwhelmed\b/i.test(m)) {
    const comfort = COMFORT_SCRIPTURE.default;
    return {
      reply: `I hear that you feel overwhelmed. You are not alone. What's weighing on you most right now? ${comfort.ref} — ${comfort.text}.`,
      scripture: [{ reference: comfort.ref, theme: 'comfort' }, { reference: '1 Peter 5:7', theme: 'comfort' }],
    };
  }

  if (/\bbad day\b/i.test(m)) {
    return {
      reply: "I'm sorry today was hard. I'm here with you. Want to tell me what happened?",
      scripture: [],
    };
  }

  if (/\bcan you pray with me\b/i.test(m) || /\bpray with me\b/i.test(m) || /\bneed prayer\b/i.test(m)) {
    const prayer = buildPrayerResponse({ message, state: {}, userId: '' });
    return {
      reply: prayer.reply,
      scripture: prayer.scripture,
    };
  }

  return null;
}

module.exports = {
  classifyCompanionState,
  buildCompanionSupportReply,
  EMOTIONAL_PATTERNS,
};
