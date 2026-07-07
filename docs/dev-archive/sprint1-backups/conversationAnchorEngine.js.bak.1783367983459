/**
 * Phase 5K — Conversation anchor: active human situation per session.
 */

const { resolveConceptFromState } = require('./companionIntentIntelligence');
const { getDoctrineConversationState } = require('./doctrineConversationState');

const CONTEXT_META_RE =
  /\b(what we were talking about|about what we talked|what we talked about|asking what we were talking)\b/i;

function inferFromMessage(message = '', state = {}) {
  const m = String(message || '');
  const anchor = {
    currentTopic: null,
    currentDoctrineConcept: null,
    currentEmotion: null,
    currentGoal: null,
    currentObstacle: null,
    currentRelationshipContext: null,
    currentPrayerContext: false,
    currentScriptureContext: null,
    currentPracticalNeed: null,
    lastHelpfulVerse: null,
    lastActionStep: null,
    unresolvedConcern: null,
  };

  const stableConcept =
    state.sessionMemory?.activeConcept ||
    state.lastAnsweredConcept ||
    resolveConceptFromState(state) ||
    null;
  const concept = CONTEXT_META_RE.test(m) && stableConcept ? stableConcept : resolveConceptFromState(state) || stableConcept;
  anchor.currentDoctrineConcept = concept;
  anchor.currentTopic = concept;

  if (CONTEXT_META_RE.test(m) && stableConcept) {
    anchor.currentPracticalNeed = 'gentle_explanation';
    anchor.currentGoal = 'explain_belief_to_family';
    anchor.currentRelationshipContext = anchor.currentRelationshipContext || 'family';
  }

  if (/dietary|pork|swine|clean food/i.test(m) || concept === 'dietary_pork_unclean') {
    anchor.currentTopic = 'dietary_law';
    anchor.currentDoctrineConcept = 'dietary_pork_unclean';
  }
  if (/family disagree|still disagree|my family|talking to them|explain to (them|family)/i.test(m)) {
    anchor.currentRelationshipContext = 'family';
    anchor.currentGoal = 'explain_belief_to_family';
    anchor.currentObstacle = /disagree/i.test(m) ? 'family_disagreement' : 'explain_to_family';
    anchor.currentPracticalNeed = 'gentle_explanation';
  }
  if (/nervous|worried|anxious/i.test(m)) {
    anchor.currentEmotion = 'nervous_or_concerned';
    if (state.familyConversationContext || anchor.currentRelationshipContext === 'family') {
      anchor.currentGoal = 'talk_with_family';
      anchor.currentObstacle = 'fear_of_conversation';
    }
  }
  if (/overwhelmed|crashing|bad day/i.test(m)) anchor.currentEmotion = 'overwhelmed';
  if (/pray/i.test(m)) anchor.currentPrayerContext = true;
  if (/fornication|sex with|not ready|tell (her|him)/i.test(m)) {
    anchor.currentGoal = 'set_boundary';
    anchor.currentObstacle = 'sexual_pressure';
    anchor.currentRelationshipContext = 'partner';
  }

  const sm = state.sessionMemory || {};
  if (sm.familyContext) anchor.currentRelationshipContext = 'family';
  if (sm.currentStruggle) anchor.unresolvedConcern = sm.currentStruggle;
  if (state.turnMemory?.lastRefsShown?.[0]) anchor.lastHelpfulVerse = state.turnMemory.lastRefsShown[0];

  return anchor;
}

function buildConversationAnchor({ userId, message = '', state = {} } = {}) {
  const doctrineState = state.lastAnsweredConcept ? state : getDoctrineConversationState(userId);
  const merged = { ...doctrineState, ...state };
  return inferFromMessage(message, merged);
}

function updateAnchorFromTurn(anchor = {}, { message = '', reply = {}, conceptId = null } = {}) {
  const next = { ...anchor };
  if (conceptId) {
    next.currentDoctrineConcept = conceptId;
    next.currentTopic = conceptId;
  }
  const refs = (reply.scripture || []).map((s) => s.reference || s).filter(Boolean);
  if (refs[0]) next.lastHelpfulVerse = refs[0];
  if (/family|explain|nervous/i.test(message)) {
    next.currentRelationshipContext = next.currentRelationshipContext || 'family';
  }
  return next;
}

module.exports = {
  buildConversationAnchor,
  updateAnchorFromTurn,
  inferFromMessage,
};
