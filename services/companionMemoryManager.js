/**
 * Phase 5I — Unified safe memory interface for Buddy companion lane.
 */

const fs = require('fs');
const path = require('path');
const {
  getDoctrineConversationState,
  updateDoctrineConversationState,
} = require('./doctrineConversationState');
const {
  recordRelationshipSignal,
  getRelationshipContext,
  forgetUserMemory,
  MEMORY_PATH: REL_MEMORY_PATH,
} = require('./relationshipMemoryEngine');
const {
  getUserAnswerPreferences,
  recordUserCorrection,
  clearUserPreferences,
} = require('./userCorrectionMemory');
const {
  recordConceptLearningCandidate,
  LEARNING_ACK,
  loadGrowthCandidates,
} = require('./reflectionMemoryEngine');
const { buildContextSummary } = require('./relationshipContextModel');

const CORRECTION_MEMORY_PATH = path.join(__dirname, '..', 'data', 'user-correction-memory.json');

function getMemorySnapshot({ userId } = {}) {
  if (!userId) {
    return {
      session: {},
      preferences: getUserAnswerPreferences(null),
      relationship: {},
      learningCandidates: [],
      persisted: false,
    };
  }

  const state = getDoctrineConversationState(userId);
  const relationship = getRelationshipContext({ userId });
  const preferences = getUserAnswerPreferences(userId);
  const candidates = (loadGrowthCandidates().candidates || []).slice(-5);

  return {
    session: {
      currentStruggle:
        relationship.currentStruggle || state.sessionMemory?.currentStruggle || null,
      lastTopic:
        state.lastAnsweredConcept ||
        state.turnMemory?.lastAnsweredConcept ||
        state.sessionMemory?.activeConcept ||
        null,
      lastPracticalNeed: relationship.lastPracticalRequest || null,
      lastPrayerNeed: relationship.lastPrayerRequest || null,
      familyContext: relationship.familyConversationContext || false,
      lastRefsShown: state.turnMemory?.lastRefsShown || [],
    },
    preferences,
    relationship: {
      familyConversationContext: relationship.familyConversationContext,
      wantsPracticalWording: relationship.wantsPracticalWording,
      recentConcern: relationship.recentConcern,
    },
    learningCandidates: candidates,
    persisted: !!(relationship.updatedAt || preferences.directAnswerFirst),
  };
}

function recordTurnMemory({ userId, context = {}, answer = {} } = {}) {
  if (!userId) return null;

  const state = getDoctrineConversationState(userId);
  recordRelationshipSignal({ userId, message: context.message || '', state });

  const refs = (answer.scripture || []).map((s) => s.reference || s).filter(Boolean);
  require('./doctrineConversationState').updateTurnMemory(userId, {
    lastUserQuestion: context.message || '',
    lastAnsweredConcept: context.priorTopic || answer.conceptId || null,
    lastRefsShown: refs.slice(0, 5),
    lastAnswerSummary: String(answer.reply || '').slice(0, 200),
  });

  const sessionPatch = {
    sessionMemory: {
      ...(state.sessionMemory || {}),
      activeConcept: context.priorTopic || state.sessionMemory?.activeConcept,
      currentStruggle: context.currentStruggle || state.sessionMemory?.currentStruggle,
      familyContext: context.familyConversationContext || state.sessionMemory?.familyContext,
      lastScripture: refs[0] || state.sessionMemory?.lastScripture,
    },
  };

  if (context.priorTopic) {
    sessionPatch.lastAnsweredConcept = context.priorTopic;
  }

  updateDoctrineConversationState(userId, sessionPatch);

  return getMemorySnapshot({ userId });
}

function recordPreference({ userId, preference = {}, message = '' } = {}) {
  if (!userId) return null;
  if (message) recordUserCorrection(userId, message);
  return getUserAnswerPreferences(userId);
}

function recordLearningCandidate({ userId, candidate = {}, message = '' } = {}) {
  const entry = recordConceptLearningCandidate({
    phrase: candidate.phrase || message,
    proposedConcept: candidate.proposedConcept || null,
    correction: candidate.correction || message,
    source: candidate.source || 'phase5i_companion',
    userId,
  });
  return { entry, ack: LEARNING_ACK };
}

function recallRelevantMemory({ userId, message = '', context = {} } = {}) {
  const snapshot = getMemorySnapshot({ userId });
  const items = [];

  if (snapshot.preferences?.directAnswerFirst) items.push('you prefer direct answers first');
  if (snapshot.preferences?.yesNoDirect) items.push('you want yes/no answered directly');
  if (snapshot.session.familyContext || snapshot.relationship.familyConversationContext) {
    items.push('you were working through talking with family about Scripture');
  }
  if (snapshot.session.lastPracticalNeed) items.push('you asked for practical wording help');
  if (snapshot.session.currentStruggle) items.push('you shared something emotional recently');
  if (snapshot.session.lastPrayerNeed) items.push('you asked for prayer');

  const memoryAvailable = items.length > 0 || snapshot.persisted;
  return {
    items,
    snapshot,
    memoryAvailable,
    contextSummary: buildContextSummary(context),
  };
}

function forgetMemory({ userId, scope = 'all' } = {}) {
  if (!userId) {
    return {
      cleared: false,
      reply: 'I can only clear stored context when I know who I am talking with in this session.',
    };
  }

  let clearedPrefs = false;
  let clearedRel = false;

  if (scope === 'preferences' || scope === 'all') {
    clearedPrefs = clearUserPreferences(userId);
  }

  if (scope === 'relationship' || scope === 'all') {
    const relResult = forgetUserMemory({ userId });
    clearedRel = relResult.cleared;
  }

  if (scope === 'preferences') {
    return {
      cleared: clearedPrefs,
      reply:
        "I've cleared your answer-style preferences. Tell me again if you want direct answers or other preferences.",
    };
  }

  return {
    cleared: clearedPrefs || clearedRel,
    reply:
      "I've cleared what I stored about your companion context and preferences for this account. Session details from earlier in this chat may still be in play until we move on — tell me again what you'd like me to remember.",
  };
}

function buildMemoryDisclosureReply({ userId } = {}) {
  const recall = recallRelevantMemory({ userId });
  if (!recall.memoryAvailable || recall.items.length === 0) {
    return 'In this conversation I mainly have session context — what we have discussed so far. I do not store sensitive personal details long-term unless you ask me to remember a preference like answer style.';
  }
  return `Here's what I actually have stored: ${recall.items.join('; ')}. Session details stay with this conversation; answer-style preferences can carry across when stored.`;
}

module.exports = {
  REL_MEMORY_PATH,
  CORRECTION_MEMORY_PATH,
  getMemorySnapshot,
  recordTurnMemory,
  recordPreference,
  recordLearningCandidate,
  recallRelevantMemory,
  forgetMemory,
  buildMemoryDisclosureReply,
};
