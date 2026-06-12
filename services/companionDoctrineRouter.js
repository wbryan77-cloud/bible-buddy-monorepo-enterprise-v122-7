/**
 * Phase 4M — Two lanes, one router. Current user message wins.
 */

const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
const {
  getDoctrineConversationState,
  getActiveDoctrineTopic,
  releaseDoctrineTopic,
  TOPIC_LABELS,
} = require('./doctrineConversationState');

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

const DOCTRINE_CONTINUATION_PATTERNS = [
  /\bshow me another (verse|witness|scripture|passage)\b/i,
  /\bgive me another (verse|witness|scripture|passage)\b/i,
  /\banother (verse|witness|scripture|passage)\b/i,
  /\bmore (verses?|scripture|witnesses?)\b/i,
  /\bprove it\b/i,
  /\bexplain that verse\b/i,
  /\bwhat about that verse\b/i,
  /\bbefore that\b/i,
  /\bwhy did you say that\b/i,
  /\bwhy (are you|did you) say\b/i,
  /^continue$/i,
  /\bcontinue (that|this|the)\b/i,
  /\bgive me more\b/i,
];

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
    lastLane: state.lastLane || 'companion',
    lastStrictDoctrineTopic: state.lastStrictDoctrineTopic || null,
    releaseRequested: !!state.releaseRequested,
    nonDoctrineTurnCount: state.nonDoctrineTurnCount || 0,
    ...extra,
  };
}

function classifyCurrentTurnIntent(message = '', context = {}) {
  const m = normalizeMessage(message);
  if (!m) return 'unclear';

  if (matchesAny(m, STOP_RELEASE_PATTERNS)) return 'stop_release';
  if (matchesAny(m, EMOTIONAL_SUPPORT_PATTERNS)) return 'emotional_support';
  if (matchesAny(m, MEMORY_RECALL_PATTERNS)) return 'memory_recall';

  const messageTopic = detectStrictTopicFromMessage(m);
  if (messageTopic && STRICT_DOCTRINE_TOPICS.includes(messageTopic)) {
    if (shouldUseActiveDoctrineTopic(m, context)) {
      return 'doctrine_continuation';
    }
    return 'strict_doctrine_direct';
  }

  if (shouldUseActiveDoctrineTopic(m, context)) {
    if (/\bwhy (are you|did you) say\b/i.test(m) || /\bstop saying\b/i.test(m)) {
      return 'doctrine_correction';
    }
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
  if (intent === 'strict_doctrine_direct') return false;
  if (intent === 'doctrine_continuation' || intent === 'doctrine_correction') return false;
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
  if (intent === 'strict_doctrine_direct') {
    const m = normalizeMessage(message);
    const topic = detectStrictTopicFromMessage(m);
    if (topic && !shouldUseActiveDoctrineTopic(m, context)) return false;
  }
  if (intent === 'doctrine_continuation' || intent === 'doctrine_correction') {
    if (shouldUseActiveDoctrineTopic(message, context)) return false;
    return !detectStrictTopicFromMessage(normalizeMessage(message));
  }
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
  if (/\bbad day\b/i.test(m) || /\b(hard|rough|bad|awful) day\b/i.test(m)) {
    return "I'm sorry today was hard. I'm here with you. Want to tell me what happened?";
  }
  if (/\bnot talking about\b/i.test(m) || /\bnot talking about peter\b/i.test(m)) {
    return "You're right. I should not keep repeating the last Bible topic. What are you asking about now?";
  }
  if (/\bnot listening\b/i.test(m) || /\banswer my question\b/i.test(m)) {
    return "You're right to call that out. I was stuck on the last Bible topic instead of listening to your new message. I'm with you now. What do you want me to answer?";
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
  if (matchesAny(normalizeMessage(message), DOCTRINE_CONTINUATION_PATTERNS) && !context.activeDoctrineTopic) {
    return "Which Bible topic would you like me to continue? I don't have one active right now — what do you want to explore?";
  }
  return null;
}

function planCompanionDoctrineRouting({ userId, message, recentSessions = [], runtimeContext = {} } = {}) {
  const context = buildRoutingContext(userId, { runtimeContext, recentSessions });
  const intent = classifyCurrentTurnIntent(message, context);
  const m = normalizeMessage(message);
  const messageTopic = detectStrictTopicFromMessage(m);
  const clearDoctrine = shouldReleaseDoctrineTopic(message, context);
  const useActive = shouldUseActiveDoctrineTopic(message, context);
  const companionReleaseReply = buildCompanionReleaseReply(message, context);

  let lane = 'companion';
  let strictTopic = null;

  if (intent === 'stop_release' || intent === 'emotional_support') {
    lane = 'companion';
  } else if (intent === 'memory_recall') {
    lane = 'companion';
  } else if (intent === 'strict_doctrine_direct' && messageTopic) {
    lane = 'strict_doctrine';
    strictTopic = messageTopic;
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

  if (shouldRouteToCompanion(message, context) && lane !== 'strict_doctrine') {
    lane = 'companion';
    strictTopic = null;
  }

  return {
    intent,
    lane,
    strictTopic,
    clearDoctrine,
    releaseReason: intent,
    useActiveDoctrineTopic: useActive,
    companionReleaseReply:
      lane === 'companion' && companionReleaseReply ? companionReleaseReply : null,
    immediateCompanionReply:
      companionReleaseReply &&
      (intent === 'stop_release' ||
        intent === 'emotional_support' ||
        intent === 'memory_recall' ||
        (matchesAny(m, DOCTRINE_CONTINUATION_PATTERNS) && !context.activeDoctrineTopic)),
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

  if (
    /\bfornication\b/i.test(m) ||
    /\bsex without marriage\b/i.test(m) ||
    /\bcan we have sex\b/i.test(m) ||
    /\badultery\b/i.test(m)
  ) {
    return {
      reply:
        'Scripture honors marriage and warns against fornication — sexual union outside marriage. Paul urges believers to flee fornication in 1 Corinthians 6:18. What part of this would you like to look at in the Bible?',
      scripture: [
        { reference: '1 Corinthians 6:18', theme: 'fornication' },
        { reference: 'Hebrews 13:4', theme: 'marriage' },
      ],
    };
  }

  if (/\b10 commandments\b/i.test(m) || /\bten commandments\b/i.test(m)) {
    return {
      reply:
        'The ten commandments are recorded in Exodus 20 and Deuteronomy 5. Which commandment would you like to explore together?',
      scripture: [
        { reference: 'Exodus 20', theme: 'law_commandments' },
        { reference: 'Deuteronomy 5', theme: 'law_commandments' },
      ],
    };
  }

  if (/\bcommandments\b/i.test(m)) {
    return {
      reply:
        'Scripture records God’s commandments in Exodus 20 and Deuteronomy 5. What commandment or passage do you want to start with?',
      scripture: [{ reference: 'Exodus 20', theme: 'law_commandments' }],
    };
  }

  const release = buildCompanionReleaseReply(message, context);
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
};
