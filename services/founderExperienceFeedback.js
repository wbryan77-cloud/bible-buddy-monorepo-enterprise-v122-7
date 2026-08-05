/**
 * BIE v1.1 — Founder Experience capture workflow.
 * Maps Founder marks → experience events + learning-record candidates.
 * Does not change doctrine or production answers.
 */

const { appendExperienceEvent } = require('./experienceEventLedger');
const { createLearningRecord } = require('./learningRecordStore');

const FOUNDER_MARKS = Object.freeze([
  'ACCEPTED',
  'REJECTED',
  'INCOMPLETE',
  'WRONG_TOPIC',
  'WRONG_FACT',
  'WRONG_SCRIPTURE',
  'WRONG_HISTORY',
  'WRONG_INFERENCE',
  'TOO_LONG',
  'TOO_SHORT',
  'NOT_WARM',
  'NOT_A_COMPANION',
  'MEMORY_MISS',
  'MEMORY_OVERREACH',
  'GOOD_COMPANION_MOMENT',
  'EXCELLENT_ANSWER',
  'OTHER',
]);

const MARK_TO_EVENT = {
  ACCEPTED: 'ANSWER_ACCEPTED',
  REJECTED: 'ANSWER_REJECTED',
  INCOMPLETE: 'INCOMPLETE_ANSWER',
  WRONG_TOPIC: 'TOPIC_DRIFT',
  WRONG_FACT: 'CURRENT_MESSAGE_MISS',
  WRONG_SCRIPTURE: 'SCRIPTURE_FIDELITY_FAILURE',
  WRONG_HISTORY: 'HISTORICAL_ACCURACY_FAILURE',
  WRONG_INFERENCE: 'GROUNDING_FAILURE',
  TOO_LONG: 'INCOMPLETE_ANSWER',
  TOO_SHORT: 'INCOMPLETE_ANSWER',
  NOT_WARM: 'COMPANION_TRUST_BREAK',
  NOT_A_COMPANION: 'COMPANION_TRUST_BREAK',
  MEMORY_MISS: 'MEMORY_MISS',
  MEMORY_OVERREACH: 'MEMORY_OVERREACH',
  GOOD_COMPANION_MOMENT: 'COMPANION_TRUST_GAIN',
  EXCELLENT_ANSWER: 'ANSWER_ACCEPTED',
  OTHER: 'FOUNDER_FEEDBACK',
};

const MARK_TO_FAMILY = {
  ACCEPTED: 'accepted_answer',
  REJECTED: 'rejected_answer',
  INCOMPLETE: 'incomplete_answer',
  WRONG_TOPIC: 'topic_control',
  WRONG_FACT: 'factual_accuracy',
  WRONG_SCRIPTURE: 'scripture_fidelity',
  WRONG_HISTORY: 'historical_accuracy',
  WRONG_INFERENCE: 'inference_boundary',
  TOO_LONG: 'response_length',
  TOO_SHORT: 'response_length',
  NOT_WARM: 'companion_warmth',
  NOT_A_COMPANION: 'companion_quality',
  MEMORY_MISS: 'memory_precision',
  MEMORY_OVERREACH: 'memory_overreach',
  GOOD_COMPANION_MOMENT: 'companion_trust_gain',
  EXCELLENT_ANSWER: 'excellent_answer',
  OTHER: 'other',
};

function inferOwnerFromMark(mark) {
  if (/SCRIPTURE|INFERENCE/.test(mark)) return 'doctrineFinalAuthorityEngine/claimSupportVerifier';
  if (/HISTORY/.test(mark)) return 'historicalKnowledgeProvider';
  if (/MEMORY/.test(mark)) return 'durableUserMemory/activeConversationManager';
  if (/WARM|COMPANION/.test(mark)) return 'reasonFirstComposer/companion lanes';
  if (/TOPIC/.test(mark)) return 'companionDoctrineRouter/currentMessageIntent';
  return 'openAiFirstCompanionRuntime';
}

/**
 * Record Founder mark for a prior turn. Attaches IDs automatically when provided.
 */
function recordFounderExperienceFeedback(input = {}) {
  const mark = String(input.mark || '').toUpperCase();
  if (!FOUNDER_MARKS.includes(mark)) {
    return { ok: false, reason: 'invalid_mark', allowed: FOUNDER_MARKS };
  }

  const eventType = MARK_TO_EVENT[mark] || 'FOUNDER_FEEDBACK';
  const eventResult = appendExperienceEvent({
    eventType,
    requestId: input.requestId || input.turnId || null,
    turnId: input.turnId || input.requestId || null,
    traceId: input.traceId || input.requestId || null,
    conversationId: input.conversationId || input.sessionId || null,
    sessionId: input.sessionId || null,
    userId: input.userId || null,
    clientType: 'founder',
    authenticatedActorClass: 'founder',
    privacyScope: 'FOUNDER_PRIVATE',
    userConsentState: 'founder_workflow',
    currentMessageSummary: input.questionSummary || null,
    founderFeedback: {
      mark,
      correction: input.correction ? String(input.correction).slice(0, 1200) : null,
      expectedBehavior: input.expectedBehavior ? String(input.expectedBehavior).slice(0, 1200) : null,
      notes: input.notes ? String(input.notes).slice(0, 800) : null,
    },
    lane: input.route || input.lane || null,
    topic: input.topic || null,
    finalResponseOwner: input.finalResponseOwner || 'finalizeBuddyResponse',
    selectedEvidenceIds: input.selectedEvidenceIds || [],
    evaluationResults: input.evaluationResults || null,
    releaseCommit: input.releaseCommit || process.env.RENDER_GIT_COMMIT || null,
    governanceStatus: mark === 'ACCEPTED' || mark === 'EXCELLENT_ANSWER' ? 'OBSERVED' : 'READY_FOR_ADMIN_REVIEW',
  });

  let learning = null;
  const createsCandidate = !['ACCEPTED', 'EXCELLENT_ANSWER', 'GOOD_COMPANION_MOMENT'].includes(mark);
  if (createsCandidate || input.forceLearningRecord) {
    learning = createLearningRecord({
      sourceEventIds: eventResult.event?.eventId ? [eventResult.event.eventId] : [],
      behaviorFamily: MARK_TO_FAMILY[mark] || 'other',
      failurePattern: mark,
      expectedBehavior: input.expectedBehavior || input.correction || `Founder marked ${mark}`,
      affectedOwner: input.affectedOwner || inferOwnerFromMark(mark),
      candidateRepair: input.candidateRepair || null,
      evidence: [
        {
          kind: 'founder_mark',
          mark,
          traceId: input.traceId || input.requestId || null,
          route: input.route || null,
        },
      ],
      confidence: input.confidence || 'high',
      generalizationTests: input.generalizationTests || [],
      founderMark: mark,
      traceId: input.traceId || input.requestId || null,
      actorClass: 'founder',
    });
  }

  if (mark === 'ACCEPTED' || mark === 'EXCELLENT_ANSWER') {
    // Preserve accepted outcomes too (success pattern), without implying doctrine.
    learning = createLearningRecord({
      sourceEventIds: eventResult.event?.eventId ? [eventResult.event.eventId] : [],
      behaviorFamily: MARK_TO_FAMILY[mark],
      successPattern: mark,
      expectedBehavior: input.expectedBehavior || 'Preserve this accepted behavior pattern',
      affectedOwner: input.affectedOwner || inferOwnerFromMark(mark),
      evidence: [{ kind: 'founder_mark', mark, traceId: input.traceId || input.requestId || null }],
      confidence: 'high',
      founderMark: mark,
      governanceClassification: 'ACCEPTED_OUTCOME',
      actorClass: 'founder',
    });
  }

  return {
    ok: true,
    mark,
    eventType,
    eventId: eventResult.event?.eventId || null,
    learningRecordId: learning?.learningRecordId || learning?.record?.learningRecordId || null,
    duplicateLearningRecord: !!learning?.duplicate,
    autoPublish: false,
    doctrineChanged: false,
  };
}

module.exports = {
  FOUNDER_MARKS,
  MARK_TO_EVENT,
  recordFounderExperienceFeedback,
};
