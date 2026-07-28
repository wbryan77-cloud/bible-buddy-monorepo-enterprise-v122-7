/**
 * Phase 7A — Relationship context selector (adapter only).
 * Assembles care-relevant context from EXISTING stores. No new persistence.
 * Provenance/confidence for safe, non-confabulating use.
 */

const { getRelationshipContext, recordRelationshipSignal } = require('./relationshipMemoryEngine');
const { getContinuationMemory } = require('./conversationContinuationMemory');
const { getActiveConversation } = require('./activeConversationManager');

const CONFIDENCE = {
  CURRENT_TURN: 'CURRENT_TURN',
  CURRENT_CONVERSATION: 'CURRENT_CONVERSATION',
  RECENT_CONVERSATION: 'RECENT_CONVERSATION',
  PERSISTENT_USER_MEMORY: 'PERSISTENT_USER_MEMORY',
  POSSIBLE_RECALL: 'POSSIBLE_RECALL',
  UNKNOWN: 'UNKNOWN',
};

function extractPrayerSubjectFromMessage(message = '') {
  const m = String(message || '');
  const forPerson = m.match(
    /\bpray(?:\s+with\s+me)?\s+(?:for|about)\s+(?:my\s+)?([a-z][a-z\-']{1,40})(?:\s|'s|\.|,|\?|$)/i,
  );
  if (forPerson) {
    const raw = forPerson[1].toLowerCase();
    if (!/^(me|us|this|that|it|him|her|them|you)$/.test(raw)) {
      return { person: forPerson[1], confidence: CONFIDENCE.CURRENT_TURN, source: 'message' };
    }
  }
  const kinship = m.match(
    /\b(?:my|our)\s+(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)\b/i,
  );
  if (kinship) {
    return { person: kinship[1], confidence: CONFIDENCE.CURRENT_TURN, source: 'message_kinship' };
  }
  return null;
}

function extractDisplayName(message = '') {
  const m = String(message || '');
  const hit = m.match(/\b(?:my name is|i am|i'm)\s+([A-Z][a-z]{1,30})\b/);
  return hit ? hit[1] : null;
}

function isPersonalRememberRequest(message = '') {
  const m = String(message || '');
  if (!/\bremember\b/i.test(m)) return false;
  if (/\b(when others ask|for others|database|put (it|this) in your database)\b/i.test(m)) return false;
  return /\bremember that\b|\bplease remember\b|\bkeep in mind\b|\bdon'?t remember\b|\bdo not remember\b/i.test(m);
}

function isForgetRequest(message = '') {
  return /\b(do not remember|don'?t remember|forget what i|forget that|do not save)\b/i.test(
    String(message || ''),
  );
}

function isCelebrationOrPresenceMoment(message = '') {
  const m = String(message || '');
  return /\b(made me cry|tears|moved me|touched my heart|i feel hopeful|finally feel|prayer was answered|got the job|i'?m (so )?grateful|praise god|hallelujah|i'?m scared|i'?m afraid|overwhelmed)\b/i.test(
    m,
  );
}

function isEmotionalScriptureResponse(message = '') {
  const m = String(message || '');
  return (
    /\b(made me cry|tears|moved me|touched my heart|so beautiful|convict(ed|ing)?)\b/i.test(m) &&
    /\b(john|matthew|psalm|romans|genesis|scripture|verse|bible)\b/i.test(m)
  );
}

/**
 * @returns {object} slim care context for prayer/presence/recall/return
 */
function selectRelationshipContext({ userId = '', message = '' } = {}) {
  const rel = getRelationshipContext({ userId });
  const cont = userId ? getContinuationMemory(userId) : null;
  const active = userId ? getActiveConversation(userId) : null;
  const prayerSubject = extractPrayerSubjectFromMessage(message);
  const displayName = extractDisplayName(message);

  const activeBurdens = [];
  if (rel.currentStruggle) {
    activeBurdens.push({
      text: String(rel.currentStruggle).slice(0, 160),
      confidence: CONFIDENCE.CURRENT_CONVERSATION,
      source: 'relationshipMemoryEngine.currentStruggle',
    });
  }
  if (active?.emotionalContext && active.emotionalContext !== 'neutral') {
    activeBurdens.push({
      text: `emotional context: ${active.emotionalContext}`,
      confidence: CONFIDENCE.CURRENT_CONVERSATION,
      source: 'activeConversation.emotionalContext',
    });
  }

  const prayerContext = {
    lastRequest: rel.lastPrayerRequest || null,
    subjectFromMessage: prayerSubject,
    confidence: prayerSubject?.confidence || (rel.lastPrayerRequest ? CONFIDENCE.CURRENT_CONVERSATION : CONFIDENCE.UNKNOWN),
  };

  const personIdentity = {
    displayName: displayName || null,
    confidence: displayName ? CONFIDENCE.CURRENT_TURN : CONFIDENCE.UNKNOWN,
  };

  const importantPeople = [];
  if (prayerSubject?.person) {
    importantPeople.push({
      label: prayerSubject.person,
      confidence: prayerSubject.confidence,
      source: prayerSubject.source,
    });
  }

  return {
    personIdentity,
    importantPeople,
    activeBurdens,
    prayerContext,
    emotionalContext: active?.emotionalContext || null,
    relevantPreferences: {
      directAnswerFirst: !!rel.preferences?.directAnswerFirst,
      yesNoDirect: !!rel.preferences?.yesNoDirect,
    },
    ongoingTopics: {
      lastUserMessage: cont?.lastUserMessage || active?.lastUserQuestion || null,
      lastRoute: cont?.lastRoute || null,
      conversationObjective: active?.conversationObjective || null,
    },
    familyConversationContext: !!rel.familyConversationContext,
    suggestedCareAction: null,
    _meta: {
      selector: 'relationshipContextSelector',
      noNewStore: true,
    },
  };
}

function companionRememberAck(message = '') {
  if (isForgetRequest(message)) {
    return "Alright — I won't hold onto that. Thank you for telling me.";
  }
  if (/\bprefer\b|\bshorter answers\b|\bdirect answers\b/i.test(message)) {
    return "I'll keep that in mind for how I answer you.";
  }
  return "I'll remember that. Thank you for trusting me with it.";
}

function notePersonalRemember(userId, message = '') {
  if (!userId) return;
  try {
    const raw = String(message || '');
    const content = raw
      .replace(/^(please\s+)?remember(\s+that)?\s+/i, '')
      .replace(/^keep in mind(\s+that)?\s+/i, '')
      .trim()
      .slice(0, 240);
    recordRelationshipSignal({
      userId,
      message: content || raw.slice(0, 240),
      event: 'personal_remember_request',
    });
  } catch (_) {
    /* never block chat */
  }
}

module.exports = {
  CONFIDENCE,
  selectRelationshipContext,
  extractPrayerSubjectFromMessage,
  extractDisplayName,
  isPersonalRememberRequest,
  isForgetRequest,
  isCelebrationOrPresenceMoment,
  isEmotionalScriptureResponse,
  companionRememberAck,
  notePersonalRemember,
};
