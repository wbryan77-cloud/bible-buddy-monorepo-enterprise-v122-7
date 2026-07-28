/**
 * Phase 7A/7B — Relationship context selector (thin adapter).
 * Assembles care-relevant context from EXISTING stores.
 * Does not persist, route, compose final replies, or invent memory.
 * Provenance/confidence for safe, non-confabulating use.
 */

const { getRelationshipContext } = require('./relationshipMemoryEngine');
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

const PERSON_STOPWORDS =
  /^(me|us|this|that|it|him|her|them|you|the|a|an|thing|things|what|whatever|someone|somebody|anyone|something)$/i;

function normalizePersonLabel(raw = '') {
  return String(raw || '')
    .replace(/['’]s$/i, '')
    .replace(/[^a-zA-Z\-]/g, '')
    .trim();
}

function extractPrayerSubjectFromMessage(message = '') {
  const m = String(message || '');
  // Prefer kinship first so "my mother's surgery" → mother (not "mother's")
  const kinship = m.match(
    /\b(?:my|our)\s+(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|children|parents?)\b/i,
  );
  if (kinship) {
    return { person: kinship[1].toLowerCase(), confidence: CONFIDENCE.CURRENT_TURN, source: 'message_kinship' };
  }
  const forPerson = m.match(
    /\bpray(?:er)?(?:\s+with\s+me)?\s+(?:for|about)\s+(?:my\s+)?([a-z][a-z\-']{1,40})(?:\s|'s|\.|,|\?|$)/i,
  );
  if (forPerson) {
    const cleaned = normalizePersonLabel(forPerson[1]);
    if (cleaned && !PERSON_STOPWORDS.test(cleaned)) {
      return { person: cleaned, confidence: CONFIDENCE.CURRENT_TURN, source: 'message' };
    }
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
  return /\b(do not remember|don'?t remember|forget what i|forget that|do not save|forget what i said about)\b/i.test(
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

function isVaguePriorPrayerAsk(message = '') {
  return /\bpray(?:er)?\b.+\b(the thing|what i (told|mentioned|said)|last week|before)\b/i.test(String(message || ''));
}

function compactBurdenText(struggle = '') {
  const s = String(struggle || '').trim();
  if (!s) return null;
  if (/^hi[, ]|my name is|^actually,?\s+pray|^please just pray|^pray for|^pray about/i.test(s)) return null;
  if (/\bpray\b/i.test(s) && !/\b(hospital|sick|ill|worried|scared|surgery|cancer)\b/i.test(s)) return null;
  return (
    s.match(/\b((?:dad|father|mom|mother|son|daughter)[^.!?]{0,60}(?:hospital|sick|ill|scared|worried|home now|recovered)[^.!?]{0,40})/i)?.[0] ||
    s.match(/\b((?:hospital|sick|ill|cancer|surgery|worried about|scared)[^.!?]{0,60})/i)?.[0] ||
    null
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

  const priorPrayerSubject =
    prayerSubject ||
    extractPrayerSubjectFromMessage(rel.lastPrayerRequest || '') ||
    extractPrayerSubjectFromMessage(cont?.lastUserMessage || '');

  const activeBurdens = [];
  if (rel.currentStruggle && rel.recentConcern !== 'resolved') {
    const compact = compactBurdenText(rel.currentStruggle);
    if (compact) {
      activeBurdens.push({
        text: compact.slice(0, 100),
        confidence: CONFIDENCE.CURRENT_CONVERSATION,
        source: 'relationshipMemoryEngine.currentStruggle',
      });
    }
  }

  const prayerContext = {
    lastRequest: rel.lastPrayerRequest || (/\bpray\b/i.test(String(cont?.lastUserMessage || '')) ? cont.lastUserMessage : null),
    subjectFromMessage: prayerSubject || priorPrayerSubject,
    confidence:
      prayerSubject?.confidence ||
      priorPrayerSubject?.confidence ||
      (rel.lastPrayerRequest ? CONFIDENCE.CURRENT_CONVERSATION : CONFIDENCE.UNKNOWN),
    vaguePriorAsk: isVaguePriorPrayerAsk(message),
  };

  const personIdentity = {
    displayName: displayName || null,
    confidence: displayName ? CONFIDENCE.CURRENT_TURN : CONFIDENCE.UNKNOWN,
  };

  const importantPeople = [];
  const personLabel = prayerSubject?.person || priorPrayerSubject?.person;
  if (personLabel) {
    importantPeople.push({
      label: personLabel,
      confidence: (prayerSubject || priorPrayerSubject).confidence,
      source: (prayerSubject || priorPrayerSubject).source,
    });
  }

  if (!importantPeople.length && /\bpray(?:\s+with\s+me)?\s+again\b/i.test(String(message || ''))) {
    const fromReply = String(cont?.lastReply || '').match(/\bpray for my (dad|father|mom|mother|son|daughter)\b/i);
    if (fromReply) {
      importantPeople.push({
        label: fromReply[1],
        confidence: CONFIDENCE.RECENT_CONVERSATION,
        source: 'continuation.lastReply',
      });
    }
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
    burdenResolved: rel.recentConcern === 'resolved',
    suggestedCareAction: null,
    _meta: {
      selector: 'relationshipContextSelector',
      noNewStore: true,
      noPersist: true,
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

/**
 * Strip remember framing for the memory owner to persist — selector does not write.
 */
function personalRememberContent(message = '') {
  const raw = String(message || '');
  return raw
    .replace(/^(please\s+)?remember(\s+that)?\s+/i, '')
    .replace(/^keep in mind(\s+that)?\s+/i, '')
    .trim()
    .slice(0, 240);
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
  isVaguePriorPrayerAsk,
  companionRememberAck,
  personalRememberContent,
  compactBurdenText,
};
