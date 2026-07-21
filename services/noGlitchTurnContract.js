/**
 * Phase 5F — No-Glitch Turn Contract: decide before retrieval or OpenAI.
 */

const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
const { hasExplicitConcept } = require('./bibleConceptGraph');
const { isPendingQuestionChallenge } = require('./pendingQuestionResolver');
const { LEARNING_ACK } = require('./reflectionMemoryEngine');

const BARE_CONTINUATION_RE =
  /\b(show me another|another verse|give me more|more scriptures?|more verses?|continue)\b/i;

const EXPLICIT_TOPIC_IN_CONTINUATION_RE =
  /\b(about|on|regarding|for)\s+[\w\s]{3,}/i;

const EMOTIONAL_RE =
  /\b(overwhelmed|bad day|sad|discouraged|tired|feeling down|hard day|rough day|need help|nervous|worried|anxious)\b/i;

const PRAYER_RE = /\b(pray with me|can you pray|please pray|need prayer)\b/i;

const MEMORY_RE =
  /\b(do you remember|can you remember|what were we (talking|discussing)|before that|remember what we)\b/i;

const LEARNING_RE =
  /\b(remember that|put (it|this) in your database|when others ask|for others|don't answer it that way|that is not what i asked|i wasn't asking about)\b/i;

const CORRECTION_RE =
  /\b(stop saying|why (are you|did you) say|that is confusing|you got it wrong|not what i asked|why won'?t you answer|why are you not answering|why won't you answer)\b/i;

const STOP_RE = /^(stop\.?|please stop|stop that|stop talking about)\b/i;

const BIBLE_QUESTION_RE =
  /\b(what does|what is|what are|can (we|i|you)|is |are |how do|how are|explain|tell me about|scripture says|bible says)\b/i;

const CLARIFIER_REPLY =
  'I can do that. Which Bible topic would you like more Scriptures about — the Sabbath, the Kingdom, clean foods, death, or something else?';

function hasContinuationContext(state = {}) {
  if (state.releaseRequested) return false;
  return !!(
    state.activeDoctrineTopic ||
    state.activeBibleConcept ||
    state.lastAnsweredConcept ||
    state.lastAnsweredTopic ||
    state.lastStrictDoctrineTopic
  );
}

function isBareContinuation(message = '') {
  const m = String(message || '').trim();
  if (!m) return false;
  if (!BARE_CONTINUATION_RE.test(m)) return false;
  if (EXPLICIT_TOPIC_IN_CONTINUATION_RE.test(m)) return false;
  if (detectStrictTopicFromMessage(m)) return false;
  if (hasExplicitConcept(m)) return false;
  if (detectSemanticConcept(m)) return false;
  return true;
}

function classifyTurnContract({ message = '', state = {}, conceptMatch = null } = {}) {
  const m = String(message || '').trim();
  const concept = conceptMatch || detectSemanticConcept(m, state);

  if (!m) {
    return {
      category: 'unknown_or_incomplete',
      blockRetrieval: true,
      blockOpenAI: true,
      needsClarifier: true,
      conceptId: null,
      strictTopic: null,
    };
  }

  if (STOP_RE.test(m)) {
    return {
      category: 'stop_release',
      blockRetrieval: true,
      blockOpenAI: true,
      clearState: true,
      conceptId: null,
      strictTopic: null,
    };
  }

  if (LEARNING_RE.test(m)) {
    return {
      category: 'learning_request',
      blockRetrieval: true,
      blockOpenAI: true,
      learningAck: LEARNING_ACK,
      conceptId: concept?.id || null,
      strictTopic: concept?.strictTopic || null,
    };
  }

  if (CORRECTION_RE.test(m)) {
    return {
      category: 'correction_request',
      blockRetrieval: true,
      blockOpenAI: true,
      conceptId: concept?.id || state.lastAnsweredConcept || null,
      strictTopic: state.activeDoctrineTopic || null,
    };
  }

  if (PRAYER_RE.test(m)) {
    return {
      category: 'prayer_request',
      blockRetrieval: true,
      blockOpenAI: true,
      conceptId: 'prayer_with_user',
      strictTopic: null,
    };
  }

  if (EMOTIONAL_RE.test(m) && !BIBLE_QUESTION_RE.test(m)) {
    return {
      category: 'emotional_support',
      blockRetrieval: true,
      blockOpenAI: true,
      conceptId: concept?.id || 'overwhelmed_comfort',
      strictTopic: null,
    };
  }

  if (MEMORY_RE.test(m)) {
    return {
      category: 'memory_recall',
      blockRetrieval: true,
      blockOpenAI: true,
      conceptId: null,
      strictTopic: state.previousDoctrineTopic || state.lastStrictDoctrineTopic || null,
    };
  }

  if (isPendingQuestionChallenge(m)) {
    return {
      category: 'correction_request',
      blockRetrieval: true,
      blockOpenAI: true,
      pendingChallenge: true,
      conceptId: state.lastAnsweredConcept || null,
      strictTopic: state.lastAnsweredTopic || state.lastStrictDoctrineTopic || null,
    };
  }

  if (/^why\??$/i.test(m) && hasContinuationContext(state)) {
    return {
      category: 'complete_bible_question',
      blockRetrieval: true,
      blockOpenAI: true,
      safeToAnswer: true,
      conceptId: state.lastAnsweredConcept || null,
      strictTopic: state.lastAnsweredTopic || state.lastStrictDoctrineTopic || null,
      whyReestablish: true,
    };
  }

  const strictTopicFromMessage = detectStrictTopicFromMessage(m);
  const explicitConceptInMessage = hasExplicitConcept(m) || EXPLICIT_TOPIC_IN_CONTINUATION_RE.test(m);

  if (isBareContinuation(m)) {
    const continuationConcept = explicitConceptInMessage ? concept : null;
    const continuationStrict =
      strictTopicFromMessage ||
      (explicitConceptInMessage ? continuationConcept?.strictTopic : null) ||
      null;

    if (continuationStrict || explicitConceptInMessage) {
      return {
        category: 'explicit_continuation_with_topic',
        blockRetrieval: false,
        blockOpenAI: true,
        conceptId: continuationConcept?.id || null,
        strictTopic: continuationStrict,
      };
    }
    if (hasContinuationContext(state)) {
      return {
        category: 'bare_continuation_with_context',
        blockRetrieval: false,
        blockOpenAI: true,
        conceptId:
          state.lastAnsweredConcept ||
          state.activeBibleConcept ||
          state.lastAnsweredTopic ||
          null,
        strictTopic: state.activeDoctrineTopic || state.lastStrictDoctrineTopic || continuationStrict,
      };
    }
    return {
      category: 'bare_continuation_without_context',
      blockRetrieval: true,
      blockOpenAI: true,
      needsClarifier: true,
      conceptId: null,
      strictTopic: null,
    };
  }

  const strictTopic = strictTopicFromMessage || concept?.strictTopic || null;

  if (concept || strictTopic || BIBLE_QUESTION_RE.test(m)) {
    const cat = concept?.strictTopic || strictTopic ? 'complete_bible_question' : 'complete_bible_question';
    if (!concept && !strictTopic && !BIBLE_QUESTION_RE.test(m)) {
      return {
        category: 'unknown_or_incomplete',
        blockRetrieval: true,
        blockOpenAI: true,
        needsClarifier: true,
        conceptId: null,
        strictTopic: null,
      };
    }
    return {
      category: cat,
      blockRetrieval: false,
      blockOpenAI: true,
      conceptId: concept?.id || null,
      strictTopic,
      safeToAnswer: true,
    };
  }

  // A short current-turn request is not automatically incomplete.
  // Only a true bare continuation without context receives a clarifier.
  return {
    category: 'complete_companion_question',
    blockRetrieval: false,
    blockOpenAI: false,
    conceptId: null,
    strictTopic: null,
    shortUtterance: m.length < 12,
  };
}

function shouldBlockRetrieval(contract = {}) {
  return !!contract.blockRetrieval;
}

function shouldBlockOpenAI(contract = {}) {
  return !!contract.blockOpenAI;
}

function buildContractSafeReply({ contract = {}, state = {} } = {}) {
  if (!contract) return null;

  if (contract.category === 'bare_continuation_without_context' || contract.needsClarifier) {
    return {
      reply: CLARIFIER_REPLY,
      scripture: [],
      masterRoute: 'no_glitch_clarifier',
      contractCategory: contract.category,
    };
  }

  if (contract.category === 'stop_release') {
    return {
      reply: "I hear you. I'll stop that topic. What do you want to talk about now?",
      scripture: [],
      masterRoute: 'no_glitch_stop_release',
      contractCategory: contract.category,
      clearState: true,
    };
  }

  if (contract.category === 'learning_request' && contract.learningAck) {
    return {
      reply: contract.learningAck,
      scripture: [],
      masterRoute: 'no_glitch_learning_candidate',
      contractCategory: contract.category,
      learningCandidate: true,
    };
  }

  return null;
}

function explainTurnContract(contract = {}) {
  return {
    category: contract.category || 'unknown',
    blockRetrieval: shouldBlockRetrieval(contract),
    blockOpenAI: shouldBlockOpenAI(contract),
    conceptId: contract.conceptId || null,
    strictTopic: contract.strictTopic || null,
  };
}

module.exports = {
  CLARIFIER_REPLY,
  classifyTurnContract,
  shouldBlockRetrieval,
  shouldBlockOpenAI,
  buildContractSafeReply,
  explainTurnContract,
  isBareContinuation,
  hasContinuationContext,
};
