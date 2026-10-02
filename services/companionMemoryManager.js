/**
 * Phase 5I — Unified safe memory interface for Buddy companion lane.
 */

const fs = require('fs');
const path = require('path');
const {
  getDoctrineConversationState,
  updateDoctrineConversationState,
  clearDoctrineConversationState,
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
  clearReflectionMemoryForUser,
  getReflectionState,
  LEARNING_ACK,
} = require('./reflectionMemoryEngine');
const { buildContextSummary } = require('./relationshipContextModel');
const {
  getActiveConversation,
  clearActiveConversation,
} = require('./activeConversationManager');
const {
  getLifeTimeline,
  clearLifeTimelineForUser,
} = require('./lifeTimelineMemory');

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
    // Governed learning-review candidates are not personal-memory disclosure data.
    learningCandidates: [],
    persisted: !!(relationship.updatedAt || preferences.directAnswerFirst),
  };
}

function recordTurnMemory({ userId, context = {}, answer = {} } = {}) {
  if (!userId) return null;

  const state = getDoctrineConversationState(userId);
  recordRelationshipSignal({ userId, message: context.message || '', state });

  const refs = (answer.scripture || []).map((s) => s.reference || s).filter(Boolean);
  updateDoctrineConversationState(userId, {
    turnMemory: {
      ...(state.turnMemory || {}),
      lastUserQuestion: context.message || '',
      lastAnsweredConcept: context.priorTopic || answer.conceptId || null,
      lastRefsShown: refs.slice(0, 5),
      lastAnswerSummary: String(answer.reply || '').slice(0, 200),
    },
    lastAnsweredConcept: context.priorTopic || answer.conceptId || state.lastAnsweredConcept,
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

  let clearedPins = false;
  let clearedDoctrine = false;
  let clearedReflection = false;
  let clearedActiveConversation = false;
  let clearedLifeTimeline = false;
  if (scope === 'all') {
    clearedActiveConversation = !!getActiveConversation(userId);
    clearActiveConversation(userId);
    clearedLifeTimeline = !!clearLifeTimelineForUser(userId);
    clearDoctrineConversationState(userId);
    clearedDoctrine = true;
    clearedReflection = !!clearReflectionMemoryForUser(userId);
    try {
      const { clearPinsForUser } = require('./explicitRememberPin');
      clearedPins = !!clearPinsForUser(userId);
    } catch (_) {
      clearedPins = false;
    }
  }

  if (scope === 'preferences') {
    return {
      cleared: clearedPrefs,
      reply:
        "I've cleared your answer-style preferences. Tell me again if you want direct answers or other preferences.",
    };
  }

  return {
    cleared:
      clearedPrefs ||
      clearedRel ||
      clearedPins ||
      clearedDoctrine ||
      clearedReflection ||
      clearedActiveConversation ||
      clearedLifeTimeline,
    reply:
      "I've cleared the companion memory controlled by this account-level forget action, including stored context and answer preferences. Some governed learning-review records are handled separately from personal memory, so I won't claim broader deletion than this control can prove.",
  };
}

function verifiedSubjectError() {
  return {
    ok: false,
    code: 'VERIFIED_SUBJECT_REQUIRED',
    reply: 'This memory action requires an authenticated account whose subject matches the requested user.',
  };
}

function isVerifiedSubject({ userId, principal } = {}) {
  return !!(
    userId &&
    principal &&
    principal.authenticated === true &&
    String(principal.subjectId || '') === String(userId)
  );
}

async function exportVerifiedSubjectMemory({ userId, principal } = {}) {
  if (!isVerifiedSubject({ userId, principal })) return verifiedSubjectError();

  const durableMemory = require('./durableUserMemory');
  const { getPins } = require('./explicitRememberPin');
  const { readItems, DOC } = require('./founderExperienceDurableStore');

  await durableMemory.ensureHydrated(userId);
  const durablePinStore = await readItems(DOC.explicitRememberPins);
  const durablePinRecord = (durablePinStore.items || []).find(
    (item) => String(item?.userId || '') === String(userId),
  );
  const reflection = getReflectionState(userId);

  return {
    ok: true,
    subjectId: String(userId),
    exportedAt: new Date().toISOString(),
    stores: {
      preferencesRelationship: getMemorySnapshot({ userId }),
      doctrineConversation: getDoctrineConversationState(userId),
      activeConversation: getActiveConversation(userId),
      lifeTimeline: getLifeTimeline(userId, 120),
      reflection: {
        records: reflection.records || [],
        preferences: reflection.preferences || {},
      },
      durableUserMemory: durableMemory.listActive(userId, { includeDeleted: true }),
      explicitRememberPins: Array.isArray(durablePinRecord?.pins)
        ? durablePinRecord.pins
        : getPins(userId),
    },
  };
}

async function withdrawVerifiedSubjectMemory({ userId, principal } = {}) {
  if (!isVerifiedSubject({ userId, principal })) return verifiedSubjectError();

  const durableMemory = require('./durableUserMemory');
  const {
    dualWriteUserPinsNow,
    getPins,
  } = require('./explicitRememberPin');

  await durableMemory.ensureHydrated(userId);
  const bounded = forgetMemory({ userId, scope: 'all' });
  durableMemory.clearAllForUser(userId);
  await durableMemory.flushUser(userId);
  await dualWriteUserPinsNow(userId, []);
  const { readItems, DOC } = require('./founderExperienceDurableStore');
  const durablePinStore = await readItems(DOC.explicitRememberPins);
  const durablePinRecord = (durablePinStore.items || []).find(
    (item) => String(item?.userId || '') === String(userId),
  );
  const doctrine = getDoctrineConversationState(userId);

  return {
    ok: true,
    subjectId: String(userId),
    idempotent: true,
    cleared: !!bounded.cleared,
    verifiedEmpty: {
      preferencesRelationship: !getMemorySnapshot({ userId }).persisted,
      doctrineConversation:
        doctrine.activeDoctrineTopic === null &&
        doctrine.lastAnsweredConcept === null &&
        (doctrine.turnMemory?.lastRefsShown || []).length === 0,
      activeConversation: getActiveConversation(userId) === null,
      lifeTimeline: getLifeTimeline(userId, 1).length === 0,
      reflection: getReflectionState(userId).records.length === 0,
      durableUserMemory:
        durableMemory.listActive(userId, { includeDeleted: true }).length === 0,
      explicitRememberPins:
        getPins(userId).length === 0 &&
        (!durablePinRecord || (durablePinRecord.pins || []).length === 0),
    },
    reply:
      'Verified-subject withdrawal completed for the bounded companion-memory stores controlled by this service. Governed learning-review records remain outside personal-memory export and withdrawal.',
  };
}

function buildMemoryDisclosureReply({ userId } = {}) {
  const recall = recallRelevantMemory({ userId });
  if (!recall.memoryAvailable || recall.items.length === 0) {
    return "I don't see stored companion memory for this account right now. When memory is enabled, I may retain bounded companion context and answer preferences; you can ask me to forget stored companion memory. I won't promise permanent retention or broader deletion than the stores this control actually governs.";
  }
  return `Here's what I can surface from stored companion memory: ${recall.items.join('; ')}. You can ask me to forget stored companion memory. I won't promise permanent retention, and governed learning-review records are handled separately from personal memory.`;
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
  isVerifiedSubject,
  exportVerifiedSubjectMemory,
  withdrawVerifiedSubjectMemory,
  buildMemoryDisclosureReply,
};
