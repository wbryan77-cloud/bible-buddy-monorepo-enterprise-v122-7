/**
 * Phase 5H — Companion intent classifier: understand need before answering.
 */

const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const { isPendingQuestionChallenge } = require('./pendingQuestionResolver');
const { isWitnessReestablishment } = require('./twoWitnessStandard');
const { CONTINUATION_PHRASE_RE } = require('./bibleConceptGraph');

function resolveConceptFromState(state = {}) {
  const primary =
    state.lastAnsweredConcept ||
    state.turnMemory?.lastAnsweredConcept ||
    state.sessionMemory?.activeConcept ||
    state.activeBibleConcept ||
    null;

  if (primary === 'acts_10_people_not_food' || primary === 'acts_10') {
    const hist = state.topicHistory || [];
    if (hist.includes('dietary_law') || hist.includes('acts_10')) {
      return 'dietary_pork_unclean';
    }
  }

  return (
    primary ||
    (state.lastAnsweredTopic === 'dietary_law' ? 'dietary_pork_unclean' : null) ||
    (state.lastAnsweredTopic === 'acts_10' ? 'acts_10_people_not_food' : null) ||
    null
  );
}

const STOP_RE = /^(stop\.?|please stop|stop that|stop talking about)\b/i;
const PRAYER_RE = /\b(can you pray with me|pray with me|please pray|will you pray with me|pray for me)\b/i;
const EMOTIONAL_RE =
  /\b(overwhelmed|my feeling overwhelmed|bad day|i am sad|i'm sad|discouraged|feeling down|heartbreak|crashing|nervous|worried|anxious)\b/i;
const LEARNING_RE =
  /\b(put (it |this )?in your database|when others ask|for others to|learning candidate)\b/i;
const PREFERENCE_RE = /\bremember that i (like|want|prefer)\b/i;
const BOUNDARY_TELL_RE = /\b(how do i tell (her|him)|if i'?m not ready.{0,40}tell (her|him))\b/i;
const FAMILY_EXPLAIN_RE =
  /\b(how (should|do|can) i explain|but how do i explain|how do i tell (my |the )?(family|them))\b/i;
const FAMILY_DISAGREE_RE = /\b(what if my family|family (still )?disagree)/i;
const VERSE_REMEMBER_RE = /\bwhat verse should i remember\b/i;
const NERVOUS_FAMILY_RE = /\bnervous about talking\b/i;
const NERVOUS_BARE_RE = /\bnervous\b/i;
const SEXUAL_PRESSURE_RE =
  /\b(want to have sex|strings attached|sex with this girl|sex without marriage)\b/i;

function hasEstablishedTopic(state = {}) {
  return !!(
    state.lastAnsweredConcept ||
    state.turnMemory?.lastAnsweredConcept ||
    state.sessionMemory?.activeConcept ||
    state.activeDoctrineTopic ||
    state.lastAnsweredTopic
  );
}

function isDatingOrSexualContext(state = {}) {
  const c =
    resolveConceptFromState(state) ||
    state.lastAnsweredConcept ||
    state.sessionMemory?.activeConcept ||
    '';
  return /fornication|sexual_boundaries|dating|marriage_bed/i.test(String(c));
}

function detectPrayerNeed(message = '') {
  return PRAYER_RE.test(String(message || ''));
}

function detectEmotionalNeed(message = '') {
  const m = String(message || '');
  return EMOTIONAL_RE.test(m) && !/\b(can we eat|what does|scripture says)\b/i.test(m);
}

function detectRelationshipNeed(message = '', state = {}) {
  const m = String(message || '');
  return (
    FAMILY_DISAGREE_RE.test(m) ||
    NERVOUS_FAMILY_RE.test(m) ||
    (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext)) ||
    (FAMILY_EXPLAIN_RE.test(m) && !BOUNDARY_TELL_RE.test(m)) ||
    state.familyConversationContext
  );
}

function detectPracticalNeed(message = '', state = {}) {
  const m = String(message || '');
  if (BOUNDARY_TELL_RE.test(m)) return true;
  if (FAMILY_EXPLAIN_RE.test(m) && hasEstablishedTopic(state)) return true;
  if (FAMILY_DISAGREE_RE.test(m)) return true;
  if (VERSE_REMEMBER_RE.test(m)) return true;
  if (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext)) return true;
  if (NERVOUS_FAMILY_RE.test(m)) return true;
  if (/^why\??$/i.test(m) && hasEstablishedTopic(state)) return true;
  return false;
}

function detectMemoryNeed(message = '') {
  const m = String(message || '');
  return PREFERENCE_RE.test(m) || /\bwhat do you remember\b/i.test(m) || /\bforget\b/i.test(m);
}

function detectTeachingNeed(message = '', concept = null) {
  const m = String(message || '');
  if (detectPracticalNeed(m) || detectPrayerNeed(m) || detectEmotionalNeed(m)) return false;
  return !!concept || /\b(what does|what is|can we|can i eat|scripture|bible says)\b/i.test(m);
}

function detectNextLikelyNeed({ concept = null, emotionalState = '' } = {}) {
  const id = concept?.id || concept || '';
  const needs = [];
  if (/dietary|pork|acts_10/i.test(id)) {
    needs.push('Acts 10 objection', 'family disagreement', 'how to explain it', 'prayer for courage', 'verse to remember');
  } else if (/fornication|sexual_boundaries/i.test(id)) {
    needs.push('what to say', 'fear of rejection', 'how to leave situation', 'prayer for strength');
  } else if (/overwhelmed|emotional/i.test(emotionalState)) {
    needs.push('tell me what happened', 'pray with me', 'verse to hold onto', 'one practical step tonight');
  }
  return needs.slice(0, 4);
}

function classifyCompanionIntent({ message = '', state = {}, concept = null } = {}) {
  const m = String(message || '').trim();
  const conceptMatch = concept || detectSemanticConcept(m, state);
  const stateCst conceptId = stateConceptId || conceptMatch?.id || null;

  if (!m) {
    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
  }

  if (STOP_RE.test(m)) {
    return { category: 'stop_release', conceptId: null, practicalType: null, priority: 1 };
  }

  if (detectPrayerNeed(m)) {
    return { category: 'prayer_request', conceptId: 'prayer_with_user', practicalType: 'prayer', priority: 2 };
  }

  if (detectEmotionalNeed(m) && !detectPracticalNeed(m, state)) {
    return {
      category: 'emotional_support',
      conceptId: conceptId || 'overwhelmed_comfort',
      practicalType: null,
      priority: 3,
    };
  }

  if (BOUNDARY_TELL_RE.test(m) || (/\bhow do i tell (her|him)\b/i.test(m) && isDatingOrSexualContext(state))) {
    return {
      category: 'boundary_script',
      conceptId: conceptId || 'fornication_sexual_sin',
      practicalType: 'boundary_script',
    m) || (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext))) {
    return {
      category: 'emotional_support',
      conceptId,
      practicalType: 'nervous_family',
      priority: 3,
      blockClarification: true,
    };
  }

  if (FAMILY_EXPLAIN_RE.test(m) && hasEstablishedTopic(state)) {
    return {
      category: 'family_explanation',
      conceptId: conceptId || 'dietary_pork_unclean',
      practicalType: 'family_explanation',
      priority: 5,
      blockClarification: true,
    };
  }

  if (FAMILY_DISAGREE_RE.test(m)) {
    return {
      category: 'family_explanation',
      conceptId: conceptId || 'dietary_pork_unclean',
      practicalType: 'family_disagreement',
      priority: 5,
      blockClarification: true,
    };
  }

  if (VERSE_REMEMBER_RE.test(m)) {
    return {
      category: 'verse_to_remember'y\??$/i.test(m) && hasEstablishedTopic(state)) {
    return {
      category: 'doctrine_answer',
      conceptId,
      practicalType: 'why_followup',
      priority: 6,
      isContinuation: true,
      reestablishWitness: true,
    };
  }

  if (SEXUAL_PRESSURE_RE.test(m) && !hasEstablishedTopic(state)) {
    return {
      category: 'doctrine_answer',
      conceptId: 'fornication_sexual_sin',
      practicalType: null,
      priority: 6,
      isNewDoctrine: true,
    };
  }

  if (CONTINUATION_PHRASE_RE.test(m) && hasEstablishedTopic(state) && !detectSemanticConcept(m, state)) {
    return {
      category: 'more_scripture',
      conceptId,
      practicalType: null,
      priority: 7,
      isContinuation: true,
    };
  }

  if (PREFERENCE_RE.test(m)) {
    return { category: 'memory_preference', conceptId: null, practicalType: null, priority: 8 };
  }

  if (Lype: null, priority: 8 };
  }

  if (isPendingQuestionChallenge(m) || /\bwhy won'?t you answer\b/i.test(m)) {
    return { category: 'correction', conceptId, practicalType: null, priority: 8 };
  }

  if (detectTeachingNeed(m, conceptMatch) || isWitnessReestablishment(m)) {
    return {
      category: 'doctrine_answer',
      conceptId: conceptMatch?.id || conceptId,
      practicalType: null,
      priority: 6,
      isNewDoctrine: !hasEstablishedTopic(state),
      reestablishWitness: isWitnessReestablishment(m),
    };
  }

  if (!hasEstablishedTopic(state) && m.length < 20 && !conceptMatch) {
    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
  }

  if (conceptMatch) {
    return {
      category: 'doctrine_answer',
      conceptId: conceptMatch.id,
      practicalType: null,
      priority: 6,
      isContinuation: hasEstablishedTopic(state),
    9,
    isContinuation: false,
  };
} = {}) {
  const m = String(message || '').trim();
  const conceptMatch = concept || detectSemanticConcept(m, state);
  const stateConceptId = resolveCononceptId || conceptMatch?.id || null;

  if (!m) {
    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
  }

  if (STOP_RE.test(m)) {
    return { category: 'stop_release', conceptId: null, practicalType: null, priority: 1 };
  }

  if (detectPrayerNeed(m)) {
    return { category: 'prayer_request', conceptId: 'prayer_with_user', practicalType: 'prayer', priority: 2 };
  }

  if (detectEmotionalNeed(m) && !detectPracticalNeed(m, state)) {
    return {
      category: 'emotional_support',
      conceptId: conceptId || 'overwhelmed_comfort',
      practicalType: null,
      priority: 3,
    };
  }

  if (BOUNDARY_TELL_RE.test(m) || (/\bhow do i tell (her|him)\b/i.test(m) && isDatingOrSexualContext(state))) {
    return {
      category: 'boundary_script',
      conceptId: conceptId || 'fornication_sexual_sin',
      practicalType: 'boundary_script',
      priority: 4,
  E.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext))) {
    return {
      category: 'emotional_support',
      conceptId,
      practicalType: 'nervous_family',
      priority: 3,
      blockClarification: true,
    };
  }

  if (FAMILY_EXPLAIN_RE.test(m) && hasEstablishedTopic(state)) {
    return {
      category: 'family_explanation',
      conceptId: conceptId || 'dietary_pork_unclean',
      practicalType: 'family_explanation',
      priority: 5,
      blockClarification: true,
    };
  }

  if (FAMILY_DISAGREE_RE.test(m)) {
    return {
      category: 'family_explanation',
      conceptId: conceptId || 'dietary_pork_unclean',
      practicalType: 'family_disagreement',
      priority: 5,
      blockClarification: true,
    };
  }

  if (VERSE_REMEMBER_RE.test(m)) {
    return {
      category: 'verse_to_remember',
      conceptasEstablishedTopic(state)) {
    return {
      category: 'doctrine_answer',
      conceptId,
      practicalType: 'why_followup',
      priority: 6,
      isContinuation: true,
      reestablishWitness: true,
    };
  }

  if (SEXUAL_PRESSURE_RE.test(m) && !hasEstablishedTopic(state)) {
    return {
      category: 'doctrine_answer',
      conceptId: 'fornication_sexual_sin',
      practicalType: null,
      priority: 6,
      isNewDoctrine: true,
    };
  }

  if (CONTINUATION_PHRASE_RE.test(m) && hasEstablishedTopic(state) && !detectSemanticConcept(m, state)) {
    return {
      category: 'more_scripture',
      conceptId,
      practicalType: null,
      priority: 7,
      isContinuation: true,
    };
  }

  if (PREFERENCE_RE.test(m)) {
    return { category: 'memory_preference', conceptId: null, practicalType: null, priority: 8 };
  }

  if (LEARNING_RE.test(m) ||8 };
  }

  if (isPendingQuestionChallenge(m) || /\bwhy won'?t you answer\b/i.test(m)) {
    return { category: 'correction', conceptId, practicalType: null, priority: 8 };
  }

  if (detectTeachingNeed(m, conceptMatch) || isWitnessReestablishment(m)) {
    return {
      category: 'doctrine_answer',
      conceptId: conceptMatch?.id || conceptId,
      practicalType: null,
      priority: 6,
      isNewDoctrine: !hasEstablishedTopic(state),
      reestablishWitness: isWitnessReestablishment(m),
    };
  }

  if (!hasEstablishedTopic(state) && m.length < 20 && !conceptMatch) {
    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
  }

  if (conceptMatch) {
    return {
      category: 'doctrine_answer',
      conceptId: conceptMatch.id,
      practicalType: null,
      priority: 6,
      isContinuation: hasEstablishedTopic(state),
    };
  }

  return : false,
  };
} = {}) {
  const m = String(message || '').trim();
  const conceptMatch = concept || detectSemanticConcept(m, state);
  const conceptId = resolveConceptFromState(state) || conceptMatch?.id || null;

  if (!m) {
    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
  }

  if (STOP_RE.test(m)) {
    return { category: 'stop_release', conceptId: null, practicalType: null, priority: 1 };
  }

  if (detectPrayerNeed(m)) {
    return { category: 'prayer_request', conceptId: 'prayer_with_user', practicalType: 'prayer', priority: 2 };
  }

  if (detectEmotionalNeed(m) && !detectPracticalNeed(m, state)) {
    return {
      category: 'emotional_support',
      conceptId: conceptId || 'overwhelmed_comfort',
      practicalType: null,
      priority: 3,
    };
  }

  if (BOUNDARY_TELL_RE.test(m) || (/\bhow do i tell (her|him)\b/i.test(m) && isDatingOrSexualContext(state))) {
    return {
      category: 'boundary_script',
      conceptId: conceptId || 'fornication_sexual_sin',
      practicalType: 'boundary_script',
      priority: 4,
      blockClarification: true,
    };
  }

  if (NERVOUS_FAMILY_RE.test(m) || (NERVOUS_BARE_RE.test(m) && (state.familyConversationContext || state.sessionMemory?.familyContext))) {
    return {
      category: 'emotional_support',
      conceptId: conceptId,
      practicalType: 'nervous_family',
      priority: 3,
      blockClarification: true,
    };
  }

  if (FAMILY_EXPLAIN_RE.test(m) && hasEstablishedTopic(state)) {
    return {
      category: 'family_explanation',
      conceptId: conceptId || 'dietary_pork_unclean',
      practicalType: 'family_explanation',
      priority: 5,
      blockClarification: true,
    };
  }

  if (FAMILY_DISAGREE_RE.test(m)) {
    return {
      category: 'family_explanation',
      conceptId: conceptId || 'dietary_pork_unclean',
      practicalType: 'family_disagreement',
      priority: 5,
      blockClarification: true,
    };
  }

  if (VERSE_REMEMBER_RE.test(m)) {
    return {
      category: 'verse_to_remember',
      conceptId: conceptId,
      practicalType: 'verse_for_situation',
      priority: 5,
      blockClarification: true,
    };
  }

  if (/^why\??$/i.test(m) && hasEstablishedTopic(state)) {
    return {
      category: 'doctrine_answer',
      conceptId,
      practicalType: 'why_followup',
      priority: 6,
      isContinuation: true,
      reestablishWitness: true,
    };
  }

  if (SEXUAL_PRESSURE_RE.test(m) && !hasEstablishedTopic(state)) {
    return {
      category: 'doctrine_answer',
      conceptId: 'fornication_sexual_sin',
      practicalType: null,
      priority: 6,
      isNewDoctrine: true,
    };
  }

  if (CONTINUATION_PHRASE_RE.test(m) && hasEstablishedTopic(state) && !detectSemanticConcept(m, state)) {
    return {
      category: 'more_scripture',
      conceptId,
      practicalType: null,
      priority: 7,
      isContinuation: true,
    };
  }

  if (PREFERENCE_RE.test(m)) {
    return { category: 'memory_preference', conceptId: null, practicalType: null, priority: 8 };
  }

  if (LEARNING_RE.test(m) || /\bremember that when others\b/i.test(m)) {
    return { category: 'learning_candidate', conceptId: null, practicalType: null, priority: 8 };
  }

  if (isPendingQuestionChallenge(m) || /\bwhy won'?t you answer\b/i.test(m)) {
    return { category: 'correction', conceptId, practicalType: null, priority: 8 };
  }

  if (detectTeachingNeed(m, conceptMatch) || isWitnessReestablishment(m)) {
    return {
      category: 'doctrine_answer',
      conceptId: conceptMatch?.id || conceptId,
      practicalType: null,
      priority: 6,
      isNewDoctrine: !hasEstablishedTopic(state),
      reestablishWitness: isWitnessReestablishment(m),
    };
  }

  if (!hasEstablishedTopic(state) && m.length < 20 && !conceptMatch) {
    return { category: 'clarification_needed', conceptId: null, practicalType: null, priority: 9 };
  }

  return {
    category: 'doctrine_answer',
    conceptId: conceptMatch?.id || conceptId,
    practicalType: null,
    priority: 6,
    isContinuation: hasEstablishedTopic(state),
  };
}

module.exports = {
  classifyCompanionIntent,
  detectPracticalNeed,
  detectEmotionalNeed,
  detectRelationshipNeed,
  detectPrayerNeed,
  detectMemoryNeed,
  detectTeachingNeed,
  detectNextLikelyNeed,
  hasEstablishedTopic,
  isDatingOrSexualContext,
  resolveConceptFromState,
};
