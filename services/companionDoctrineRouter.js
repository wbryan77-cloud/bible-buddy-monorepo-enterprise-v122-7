/**
 * Phase 4M — Two lanes, one router. Current user message wins.
 */

const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
const {
  detectBibleConcept,
  hasExplicitConcept,
  detectConceptFromContinuation,
  CONTINUATION_PHRASE_RE,
} = require('./bibleConceptConcordance');
const { detectSemanticConcept, shouldClearStaleTopic } = require('./bibleSemanticConceptNormalizer');
const { mapTopicToConceptId } = require('./followUpContextResolver');
const { isCorrectionMessage, buildCorrectionAcknowledgment } = require('./userCorrectionMemory');
const {
  getDoctrineConversationState,
  getActiveDoctrineTopic,
  releaseDoctrineTopic,
  TOPIC_LABELS,
} = require('./doctrineConversationState');
const { detectHumanNeed } = require('./humanNeedDetector');

const STRICT_DOCTRINE_TOPICS = [
  'acts_10',
  'dietary_law',
  'death_state',
  'sabbath',
  'resurrection',
  'kingdom',
  'holy_spirit',
  'david',
  'new_jerusalem',
];

const DEFAULT_NON_DOCTRINE_RELEASE_TURNS = Number(
  process.env.BIBLEBUDDY_DOCTRINE_RELEASE_TURNS || 1,
);

const BEFORE_THAT_PATTERNS = [/\bbefore that\b/i, /\bwhat did we discuss before\b/i];

const DOCTRINE_CONTINUATION_PATTERNS = [
  /\bshow me another (verse|witness|scripture|passage)\b/i,
  /\bgive me another (verse|witness|scripture|passage)\b/i,
  /\banother (verse|witness|scripture|passage)\b/i,
  /\bmore (verses?|scripture|witnesses?)\b/i,
  /\bprove it\b/i,
  /\bexplain that verse\b/i,
  /\bwhat about that verse\b/i,
  /\bwhy did you say that\b/i,
  /\bwhy (are you|did you) say\b/i,
  /^continue$/i,
  /\bcontinue (that|this|the)\b/i,
  /\bgive me more\b/i,
];

function isBeforeThatRecall(message = '') {
  return BEFORE_THAT_PATTERNS.some((re) => re.test(String(message)));
}

const STOP_RELEASE_PATTERNS = [
  /^stop\.?$/i,
  /\bplease stop\b/i,
  /\bstop talking about\b/i,
  /\bstop that\b/i,
];

const EMOTIONAL_SUPPORT_PATTERNS = [
  /\bbad day\b/i,
  /\bi am sad\b/i,
  /\bi'm sad\b/i,
  /\bi had a\b.{0,30}\b(hard|rough|bad|awful|terrible)\b/i,
  /\btired and discouraged\b/i,
  /\bi am tired\b/i,
  /\bi'm tired\b/i,
  /\bdiscouraged\b/i,
  /\bfeeling down\b/i,
  /\bpray with me\b/i,
  /\bneed prayer\b/i,
  /\bneed help\b/i,
  /\bi need help\b/i,
  /\bare you broken\b/i,
  /\bwhy are you not listening\b/i,
  /\bwhy aren't you listening\b/i,
  /\byou are not listening\b/i,
  /\banswer my question\b/i,
  /\bnot talking about\b/i,
  /\bi am not talking about\b/i,
  /\bi'm not talking about\b/i,
  /\blove life\b/i,
  /\blife is crashing\b/i,
  /\bwhy won't you answer\b/i,
  /\bwhy won'?t you answer\b/i,
  /\bwhy are you not answering\b/i,
];

const MEMORY_RECALL_PATTERNS = [
  /\bdo you remember (my|what|our)\b/i,
  /\bcan you remember\b/i,
  /\bwhat was my last question\b/i,
  /\bremember my last question\b/i,
  /\bwhat were we (talking about|discussing)\b/i,
];

const DIETARY_LEAK_TERMS = /\b(pork|shellfish|swine|shrimp|isaiah\s*66|acts\s*10|peter|dietary law|unclean food)\b/i;

function normalizeMessage(message = '') {
  return String(message || '').trim();
}

function matchesAny(message, patterns) {
  return patterns.some((re) => re.test(message));
}

function buildRoutingContext(userId, extra = {}) {
  const state = userId ? getDoctrineConversationState(userId) : {};
  return {
    userId,
    activeDoctrineTopic: state.activeDoctrineTopic || null,
    lastUserQuestion: state.lastUserQuestion || null,
    lastAnsweredTopic: state.lastAnsweredTopic || state.activeDoctrineTopic || null,
    lastStrictDoctrineTopic: state.lastStrictDoctrineTopic || null,
    releaseRequested: !!state.releaseRequested,
    nonDoctrineTurnCount: state.nonDoctrineTurnCount || 0,
    activeBibleConcept: state.activeBibleConcept || null,
    lastBibleConcept: state.lastBibleConcept || state.activeBibleConcept || null,
    usedConceptWitnesses: state.usedConceptWitnesses || [],
    lastPendingQuestion: state.lastPendingQuestion || null,
    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept || null,
    previousDoctrineTopic: state.previousDoctrineTopic || null,
    topicHistory: state.topicHistory || [],
    ...extra,
  };
}

function classifyCurrentTurnIntent(message = '', context = {}) {
  const m = normalizeMessage(message);
  if (!m) return 'unclear';

  if (matchesAny(m, STOP_RELEASE_PATTERNS)) return 'stop_release';
  if (isCorrectionMessage(m)) return 'user_correction';
  if (matchesAny(m, EMOTIONAL_SUPPORT_PATTERNS)) return 'emotional_support';
  if (matchesAny(m, MEMORY_RECALL_PATTERNS)) return 'memory_recall';
  if (isBeforeThatRecall(m)) return 'before_that_recall';

  const semanticConcept = detectSemanticConcept(m, context);
  if (semanticConcept && !semanticConcept.strictTopic) {
    return 'bible_concept_direct';
  }

  const bibleConcept = semanticConcept || detectBibleConcept(m);
  const conceptContinuation = detectConceptFromContinuation(m);

  if (conceptContinuation) return 'bible_concept_continuation';
  if (bibleConcept && CONTINUATION_PHRASE_RE.test(m)) return 'bible_concept_continuation';

  const messageTopic = detectStrictTopicFromMessage(m);
  if (messageTopic && STRICT_DOCTRINE_TOPICS.includes(messageTopic)) {
    if (shouldUseActiveDoctrineTopic(m, context)) {
      return 'doctrine_continuation';
    }
    return 'strict_doctrine_direct';
  }

  if (bibleConcept && bibleConcept.strictTopic) {
    const strictMapped = bibleConcept.strictTopic;
    if (STRICT_DOCTRINE_TOPICS.includes(strictMapped)) {
      if (shouldUseActiveDoctrineTopic(m, context)) return 'doctrine_continuation';
      return 'strict_doctrine_direct';
    }
  }

  if (bibleConcept) return 'bible_concept_direct';

  if (shouldUseActiveDoctrineTopic(m, context) || shouldUseActiveBibleConcept(m, context)) {
    if (/\bwhy (are you|did you) say\b/i.test(m) || /\bstop saying\b/i.test(m)) {
      return 'doctrine_correction';
    }
    if (shouldUseActiveBibleConcept(m, context)) return 'bible_concept_continuation';
    return 'doctrine_continuation';
  }

  if (
    /\b(fornication|sex without marriage|adultery|10 commandments|commandments)\b/i.test(m) ||
    /\bcan we have sex\b/i.test(m)
  ) {
    return 'new_topic';
  }

  if (/\bwhy (are you|did you) say\b/i.test(m) && context.activeDoctrineTopic) {
    return 'doctrine_correction';
  }

  if (m.length < 4) return 'unclear';
  return 'companion_general';
}

const HUMAN_NEED_COMPANION_INTENTS = new Set([
  'app_identity',
  'prayer',
  'practical_words_to_say',
  'memory_recall',
  'memory_update',
  'correction_repair',
  'emotional_support',
  'anxiety_support',
  'conflict_guidance',
  'temptation_boundary',
  'one_anchor_verse',
  'next_steps',
  'grief_comfort',
  'health_support',
]);

function isProtectedHumanNeed(humanNeed) {
  return HUMAN_NEED_COMPANION_INTENTS.has(humanNeed);
}

function shouldUseActiveBibleConcept(message = '', context = {}) {
  const m = normalizeMessage(message);
  if (!context.activeBibleConcept && !context.lastBibleConcept) return false;
  if (detectBibleConcept(m)) return false;
  if (matchesAny(m, STOP_RELEASE_PATTERNS)) return false;
  if (matchesAny(m, EMOTIONAL_SUPPORT_PATTERNS)) return false;
  if (matchesAny(m, MEMORY_RECALL_PATTERNS)) return false;
  return CONTINUATION_PHRASE_RE.test(m);
}

function getContinuationDoctrineTopic(context = {}) {
  if (context.releaseRequested) return null;
  if (context.activeDoctrineTopic) return context.activeDoctrineTopic;
  const recentNonDoctrine = (context.nonDoctrineTurnCount || 0) <= DEFAULT_NON_DOCTRINE_RELEASE_TURNS;
  if (recentNonDoctrine && context.lastAnsweredTopic) return context.lastAnsweredTopic;
  if (recentNonDoctrine && context.lastStrictDoctrineTopic) return context.lastStrictDoctrineTopic;
  return null;
}

function shouldUseActiveDoctrineTopic(message = '', context = {}) {
  const m = normalizeMessage(message);
  const continuationTopic = getContinuationDoctrineTopic(context);
  if (!continuationTopic) return false;
  if (matchesAny(m, STOP_RELEASE_PATTERNS)) return false;
  if (matchesAny(m, EMOTIONAL_SUPPORT_PATTERNS)) return false;
  if (matchesAny(m, MEMORY_RECALL_PATTERNS)) return false;

  const newTopic = detectStrictTopicFromMessage(m);
  if (newTopic && newTopic !== continuationTopic) return false;

  return matchesAny(m, DOCTRINE_CONTINUATION_PATTERNS);
}

function shouldReleaseDoctrineTopic(message = '', context = {}) {
  const intent = classifyCurrentTurnIntent(message, context);
  if (shouldClearStaleTopic(message, context.activeDoctrineTopic || context.activeBibleConcept, context)) {
    return true;
  }
  if (intent === 'strict_doctrine_direct') return false;
  if (intent === 'bible_concept_direct' || intent === 'bible_concept_continuation') return false;
  if (intent === 'user_correction') return false;
  if (intent === 'doctrine_continuation' || intent === 'doctrine_correction') return false;
  if (intent === 'before_that_recall') return false;
  if (intent === 'stop_release' || intent === 'emotional_support') return true;
  if (intent === 'memory_recall') return true;
  if (intent === 'new_topic') return true;
  if (intent === 'companion_general' && context.activeDoctrineTopic) return true;
  if (intent === 'unclear' && context.activeDoctrineTopic) return true;

  const newTopic = detectStrictTopicFromMessage(normalizeMessage(message));
  if (
    context.activeDoctrineTopic &&
    newTopic &&
    newTopic !== context.activeDoctrineTopic &&
    !shouldUseActiveDoctrineTopic(message, context)
  ) {
    return true;
  }

  if (
    context.activeDoctrineTopic &&
    (context.nonDoctrineTurnCount || 0) >= DEFAULT_NON_DOCTRINE_RELEASE_TURNS &&
    !shouldUseActiveDoctrineTopic(message, context)
  ) {
    return true;
  }

  return false;
}

function shouldSwitchDoctrineTopic(message = '', context = {}) {
  const m = normalizeMessage(message);
  const newTopic = detectStrictTopicFromMessage(m);
  if (!newTopic) return false;
  if (!context.activeDoctrineTopic) return true;
  if (newTopic !== context.activeDoctrineTopic && !shouldUseActiveDoctrineTopic(m, context)) {
    return true;
  }
  return false;
}

function shouldRouteToCompanion(message = '', context = {}) {
  const intent = classifyCurrentTurnIntent(message, context);
  if (intent === 'bible_concept_direct' || intent === 'bible_concept_continuation') return false;
  if (intent === 'strict_doctrine_direct') {
    const m = normalizeMessage(message);
    const topic = detectStrictTopicFromMessage(m);
    if (topic && !shouldUseActiveDoctrineTopic(m, context)) return false;
  }
  if (intent === 'doctrine_continuation' || intent === 'doctrine_correction') {
    if (shouldUseActiveDoctrineTopic(message, context)) return false;
    return !detectStrictTopicFromMessage(normalizeMessage(message));
  }
  if (intent === 'before_that_recall') return false;
  return [
    'stop_release',
    'emotional_support',
    'memory_recall',
    'new_topic',
    'companion_general',
    'unclear',
  ].includes(intent);
}

function buildCompanionReleaseReply(message = '', context = {}) {
  const m = normalizeMessage(message).toLowerCase();
  const intent = classifyCurrentTurnIntent(message, context);

  if (intent === 'stop_release') {
    return "I hear you. I'll stop that topic. What do you want to talk about now?";
  }
  if (intent === 'user_correction' || isCorrectionMessage(message)) {
    return buildCorrectionAcknowledgment(message);
  }
  if (/\bbad day\b/i.test(m) || /\b(hard|rough|bad|awful) day\b/i.test(m)) {
    return "I'm sorry today was hard. I'm here with you. Want to tell me what happened?";
  }
  if (/\bnot talking about\b/i.test(m) || /\bnot talking about peter\b/i.test(m)) {
    return "You're right. I should not keep repeating the last Bible topic. What are you asking about now?";
  }
  if (/\bnot listening\b/i.test(m) || /\banswer my question\b/i.test(m)) {
    return "You're right to call that out. I was stuck on the last Bible topic instead of listening to your new message. I'm with you now. What do you want me to answer?";
  }
  if (/\bwhy won'?t you answer\b/i.test(m) || /\bwhy are you not answering\b/i.test(m)) {
    const pending = context.lastPendingQuestion || context.lastUserQuestion;
    if (pending && !/^(stop|why)/i.test(pending)) {
      return `You're right — I should have answered more directly. Your last question was about "${String(pending).slice(0, 120)}." I'm with you now — what would you like me to clarify?`;
    }
    return "You're right to call that out. I'm here and listening. What do you want me to answer directly from Scripture?";
  }
  if (intent === 'memory_recall') {
    const lastQ = context.lastUserQuestion || 'your last message';
    if (/last question/i.test(m)) {
      return `Your last question was: "${String(lastQ).slice(0, 200)}." What would you like to explore next?`;
    }
    if (/what were we|remember what we|talking about|discussing/i.test(m)) {
      const topicLabel = context.lastAnsweredTopic
        ? TOPIC_LABELS[context.lastAnsweredTopic] || String(context.lastAnsweredTopic).replace(/_/g, ' ')
        : null;
      if (topicLabel) {
        return `We were discussing ${topicLabel}. What would you like to explore next?`;
      }
    }
    return `I remember you asked about "${String(lastQ).slice(0, 160)}." What would you like to focus on now?`;
  }
  if (/\bare you broken\b/i.test(m)) {
    return "I'm here and listening. Something went wrong with how I stayed on an old topic — I'm with you now. What do you want to talk about?";
  }
  if (/\btired\b/i.test(m) && /\bdiscouraged\b/i.test(m)) {
    return "I'm sorry you're feeling worn down. I'm here with you. What's been weighing on you lately?";
  }
  if (/\blove life\b/i.test(m) && /\bcrash/i.test(m)) {
    return "I'm sorry. That kind of hurt can feel heavy. I'm here with you. What happened today that made it feel like it's crashing? One Scripture that may steady the heart is Psalm 34:18 — the LORD is nigh unto them that are of a broken heart.";
  }
  const bareContinuation =
    matchesAny(normalizeMessage(message), DOCTRINE_CONTINUATION_PATTERNS) &&
    !isBeforeThatRecall(message) &&
    !detectStrictTopicFromMessage(normalizeMessage(message)) &&
    !hasExplicitConcept(message) &&
    !detectBibleConcept(normalizeMessage(message));
  if (bareContinuation && !context.activeDoctrineTopic && !context.activeBibleConcept) {
    const mapped = context.releaseRequested
      ? null
      : context.lastAnsweredConcept ||
        mapTopicToConceptId(context.lastAnsweredTopic) ||
        mapTopicToConceptId(context.lastStrictDoctrineTopic);
    if (mapped) return null;
    return "Which Bible topic would you like me to continue? I don't have one active right now — what do you want to explore?";
  }
  return null;
}

function planCompanionDoctrineRouting({ userId, message, recentSessions = [], runtimeContext = {} } = {}) {
  const context = buildRoutingContext(userId, { runtimeContext, recentSessions });
  const humanNeed = detectHumanNeed(message, {}, context);
  const intent = classifyCurrentTurnIntent(message, context);
  const m = normalizeMessage(message);
  const messageTopic = detectStrictTopicFromMessage(m);
  const bibleConcept = detectBibleConcept(m) || detectConceptFromContinuation(m);
  const clearDoctrine = shouldReleaseDoctrineTopic(message, context);
  const useActive = shouldUseActiveDoctrineTopic(message, context);
  const useActiveConcept = shouldUseActiveBibleConcept(message, context);
  const companionReleaseReply = buildCompanionReleaseReply(message, context);

  if (isProtectedHumanNeed(humanNeed)) {
    return {
      intent,
      humanNeed,
      lane: 'companion',
      strictTopic: null,
      bibleConceptId: null,
      clearDoctrine: shouldReleaseDoctrineTopic(message, context),
      releaseReason: humanNeed,
      useActiveDoctrineTopic: false,
      useActiveBibleConcept: false,
      companionReleaseReply: null,
      immediateCompanionReply: false,
      protectedHumanNeed: true,
    };
  }

  let lane = 'companion';
  let strictTopic = null;
  let bibleConceptId = bibleConcept?.id || null;

  if (intent === 'user_correction') {
    lane = 'companion';
  } else if (intent === 'stop_release' || intent === 'emotional_support') {
    lane = 'companion';
  } else if (intent === 'memory_recall') {
    lane = 'companion';
  } else if (intent === 'before_that_recall') {
    lane = 'strict_doctrine';
    const hist = context.topicHistory || [];
    strictTopic =
      context.previousDoctrineTopic ||
      (hist.length >= 2 ? hist[hist.length - 2] : hist.length ? hist[hist.length - 1] : null) ||
      null;
  } else if (intent === 'strict_doctrine_direct' && messageTopic) {
    lane = 'strict_doctrine';
    strictTopic = messageTopic;
    bibleConceptId = null;
  } else if (
    intent === 'strict_doctrine_direct' &&
    bibleConcept?.strictTopic &&
    STRICT_DOCTRINE_TOPICS.includes(bibleConcept.strictTopic)
  ) {
    lane = 'strict_doctrine';
    strictTopic = bibleConcept.strictTopic;
    bibleConceptId = null;
  } else if (intent === 'bible_concept_direct' && bibleConcept) {
    lane = bibleConcept.strictTopic ? 'strict_doctrine' : 'bible_wide';
    strictTopic = bibleConcept.strictTopic || null;
    bibleConceptId = bibleConcept.id;
  } else if (intent === 'bible_concept_continuation' && bibleConcept) {
    lane = bibleConcept.strictTopic && !CONTINUATION_PHRASE_RE.test(m) ? 'strict_doctrine' : 'bible_wide';
    strictTopic = bibleConcept.strictTopic || null;
    bibleConceptId = bibleConcept.id;
  } else if (
    (intent === 'bible_concept_continuation' || useActiveConcept) &&
    context.activeBibleConcept
  ) {
    lane = 'bible_wide';
    bibleConceptId = context.activeBibleConcept;
  } else if (
    (intent === 'doctrine_continuation' || intent === 'doctrine_correction') &&
    useActive
  ) {
    lane = 'strict_doctrine';
    strictTopic = getContinuationDoctrineTopic(context);
  } else if (intent === 'doctrine_correction' && messageTopic) {
    lane = 'strict_doctrine';
    strictTopic = messageTopic;
  } else {
    lane = 'companion';
  }

  if (shouldRouteToCompanion(message, context) && lane !== 'strict_doctrine' && lane !== 'bible_wide') {
    lane = 'companion';
    strictTopic = null;
    bibleConceptId = null;
  }

  return {
    intent,
    humanNeed,
    lane,
    strictTopic,
    bibleConceptId,
    clearDoctrine,
    releaseReason: intent,
    useActiveDoctrineTopic: useActive,
    useActiveBibleConcept: useActiveConcept,
    companionReleaseReply:
      lane === 'companion' && companionReleaseReply ? companionReleaseReply : null,
    immediateCompanionReply:
      companionReleaseReply &&
      (intent === 'stop_release' ||
        intent === 'emotional_support' ||
        intent === 'memory_recall' ||
        intent === 'user_correction' ||
        (matchesAny(m, DOCTRINE_CONTINUATION_PATTERNS) &&
          !context.activeDoctrineTopic &&
          !context.activeBibleConcept &&
          !messageTopic &&
          !bibleConcept)),
    protectedHumanNeed: false,
  };
}

function applyDoctrineRoutingSideEffects(userId, plan, message = '') {
  if (!userId || !plan) return;
  if (plan.clearDoctrine) {
    const blockContinuation = plan.intent !== 'memory_recall';
    releaseDoctrineTopic(userId, plan.releaseReason || 'companion_turn', { blockContinuation });
  }
}

/**
 * Warm local fallback when companion lane cannot reach OpenAI.
 * Scripture-grounded, not strict-doctrine template repetition.
 */
function buildCompanionLaneFallbackReply(message = '', context = {}) {
  const m = normalizeMessage(message).toLowerCase();
  if (!m) return null;

  const humanNeed = detectHumanNeed(message, {}, context);
  const protectedHumanNeed = isProtectedHumanNeed(humanNeed);
  const release = buildCompanionReleaseReply(message, context);

  if (protectedHumanNeed && release) {
    return { reply: release, scripture: [] };
  }

  if (protectedHumanNeed) {
    return {
      reply: "I'm here with you. Tell me what happened, and we can take this one step at a time.",
      scripture: [],
    };
  }

  const { buildBibleWideAnswer } = require('./bibleWideReasoningEngine');
  const { getUserAnswerPreferences } = require('./userCorrectionMemory');
  const conceptAnswer = buildBibleWideAnswer({
    message,
    userId: context.userId,
    userPreferences: getUserAnswerPreferences(context.userId),
  });
  if (conceptAnswer) {
    return {
      reply: conceptAnswer.reply,
      scripture: conceptAnswer.scripture || [],
    };
  }

  if (release) {
    return { reply: release, scripture: [] };
  }

  return null;
}

module.exports = {
  STRICT_DOCTRINE_TOPICS,
  classifyCurrentTurnIntent,
  shouldUseActiveDoctrineTopic,
  shouldReleaseDoctrineTopic,
  shouldSwitchDoctrineTopic,
  shouldRouteToCompanion,
  buildCompanionReleaseReply,
  buildRoutingContext,
  planCompanionDoctrineRouting,
  applyDoctrineRoutingSideEffects,
  buildCompanionLaneFallbackReply,
  DIETARY_LEAK_TERMS,
  HUMAN_NEED_COMPANION_INTENTS,
  isProtectedHumanNeed,
};
