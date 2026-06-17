/**
 * Phase 5I — Turn-level relationship context before answering.
 */

const { resolveConceptFromState } = require('./companionIntentIntelligence');
const { detectNextLikelyNeed } = require('./companionIntentIntelligence');

const PRAYER_RE = /\b(can you pray with me|pray with me|please pray|will you pray with me|pray for me)\b/i;
const EMOTIONAL_RE =
  /\b(overwhelmed|my feeling overwhelmed|bad day|i am sad|i'm sad|discouraged|feeling down|heartbreak|crashing|nervous|afraid|scared|worried)\b/i;
const EXPLAIN_RE = /\bhow (should|do|can) i explain|but how do i explain\b/i;
const BOUNDARY_TELL_RE = /\b(how do i tell (her|him)|if i'?m not ready.{0,40}tell (her|him))\b/i;
const FAMILY_RE = /\b(family|them|my parents|talking to them)\b/i;
const VERSE_RE = /\bwhat verse should i remember|give me a verse\b/i;
const SEXUAL_RE = /\b(want to have sex|strings attached|sex with|fornication|not ready)\b/i;
const FEAR_REJECTION_RE = /\b(fear of losing|afraid (she|he|they)|reject)\b/i;

function detectUserEmotion(message = '') {
  const m = String(message || '').toLowerCase();
  if (/\blove life\b/.test(m) && /\bcrash/.test(m)) return 'heartbreak';
  if (/\boverwhelmed\b/.test(m) && !/\blove life\b/.test(m)) return 'overwhelmed';
  if (/\bcrashing\b/.test(m) && !/\blove life\b/.test(m)) return 'overwhelmed';
  if (/\bbad day\b|\bhard day\b/.test(m)) return 'discouraged';
  if (/\bnervous|worried\b/.test(m)) return 'nervous_or_concerned';
  if (/\bafraid|scared|fear\b/.test(m)) return 'fear';
  if (/\bsad|discouraged|heartbreak\b/.test(m)) return 'sad';
  if (/\bpressure|strings attached\b/.test(m)) return 'sexual_pressure';
  return null;
}

function detectCurrentStruggle(message = '', state = {}) {
  const m = String(message || '');
  if (SEXUAL_RE.test(m)) return 'sexual_pressure';
  if (/\boverwhelmed\b/i.test(m)) return 'emotional_overwhelm';
  if (/\bnervous about talking\b/i.test(m)) return 'family_conversation_anxiety';
  if (state.currentStruggle) return state.currentStruggle;
  if (state.sessionMemory?.currentStruggle) return state.sessionMemory.currentStruggle;
  return null;
}

function detectUserGoal(message = '', state = {}) {
  const m = String(message || '');
  if (EXPLAIN_RE.test(m) && resolveConceptFromState(state)) return 'explain_to_family';
  if (BOUNDARY_TELL_RE.test(m)) return 'set_boundary';
  if (VERSE_RE.test(m)) return 'verse_to_remember';
  if (PRAYER_RE.test(m)) return 'prayer';
  if (/\bwhat if my family|family disagree\b/i.test(m)) return 'handle_family_disagreement';
  if (/\bwhy\??$/i.test(m) && resolveConceptFromState(state)) return 'understand_doctrine';
  if (SEXUAL_RE.test(m)) return 'sexual_boundary_guidance';
  if (/\boverwhelmed\b/i.test(m)) return 'emotional_support';
  if (/\bbad day\b|\bhard day\b/i.test(m)) return 'emotional_support';
  if (/\blove life\b/i.test(m) && /\bcrash/i.test(m)) return 'emotional_support';
  return null;
}

function detectRelationalObject(message = '', state = {}) {
  const m = String(message || '').toLowerCase();
  if (/\b(her|him|this girl|this guy|boyfriend|girlfriend)\b/.test(m)) return 'partner';
  if (/\b(family|them|parents|mother|father)\b/.test(m) || state.familyConversationContext) return 'family';
  if (/\btalking to them\b/.test(m)) return 'family';
  return null;
}

function resolvePronounsAndReferences(message = '', state = {}) {
  const priorTopic = resolveConceptFromState(state);
  const m = String(message || '').toLowerCase();
  const resolved = { priorTopic, referent: null };

  if (/\b(it|this|that)\b/.test(m) && priorTopic) {
    resolved.referent = priorTopic;
  }
  if (/\b(them|they)\b/.test(m) && (state.familyConversationContext || priorTopic === 'dietary_pork_unclean')) {
    resolved.referent = 'family';
  }
  if (/\b(her|him)\b/.test(m)) {
    resolved.referent = 'partner';
  }
  return resolved;
}

function detectMultiIntent(message = '') {
  const m = String(message || '');
  const prayer = PRAYER_RE.test(m);
  const verse =
    /\bverse\b/i.test(m) && /\b(family|talking|them|remember|courage)\b/i.test(m);
  const explain = EXPLAIN_RE.test(m);
  return {
    prayer,
    verse,
    explain,
    multiIntent: (prayer && verse) || (prayer && explain),
  };
}

function buildRelationshipContext({ userId, message = '', state = {} } = {}) {
  const m = String(message || '').trim();
  const priorTopic =
    resolveConceptFromState(state) ||
    state.lastAnsweredConcept ||
    state.sessionMemory?.activeConcept ||
    null;
  const emotionalState = detectUserEmotion(m) || state.emotionalState || null;
  const userGoal = detectUserGoal(m, state);
  const relationalObject = detectRelationalObject(m, state);
  const refs = resolvePronounsAndReferences(m, state);
  const multi = detectMultiIntent(m);

  const priorPracticalNeed =
    state.lastPracticalRequest ||
    state.wantsPracticalWording
      ? 'practical_wording'
      : userGoal === 'explain_to_family'
        ? 'family_explanation'
        : null;

  const prayerNeed = PRAYER_RE.test(m);
  const memoryPreference = /\bremember that i (like|want|prefer)\b/i.test(m);

  const context = {
    userId,
    currentStruggle: detectCurrentStruggle(m, state),
    emotionalState:
      emotionalState ||
      (relationalObject === 'family' && /\bnervous\b/i.test(m) ? 'nervous_or_concerned' : null),
    userGoal,
    relationalObject: relationalObject || refs.referent,
    priorTopic: priorTopic || refs.priorTopic,
    priorPracticalNeed,
    prayerNeed,
    memoryPreference,
    unresolvedQuestion: state.pendingQuestion || null,
    lastHelpfulScripture:
      state.turnMemory?.lastRefsShown?.[0] ||
      state.sessionMemory?.lastScripture ||
      null,
    nextLikelyNeed: detectNextLikelyNeed({
      concept: priorTopic,
      emotionalState: emotionalState || '',
    })[0] || null,
    familyConversationContext: state.familyConversationContext || relationalObject === 'family',
    multiIntent: multi,
    message: m,
  };

  if (FEAR_REJECTION_RE.test(m)) {
    context.emotionalState = 'fear_of_rejection';
  }

  return context;
}

function buildContextSummary(context = {}) {
  const parts = [];
  if (context.currentStruggle) parts.push(`struggle: ${context.currentStruggle}`);
  if (context.emotionalState) parts.push(`emotion: ${context.emotionalState}`);
  if (context.userGoal) parts.push(`goal: ${context.userGoal}`);
  if (context.relationalObject) parts.push(`with: ${context.relationalObject}`);
  if (context.priorTopic) parts.push(`topic: ${context.priorTopic}`);
  if (context.priorPracticalNeed) parts.push(`need: ${context.priorPracticalNeed}`);
  if (context.prayerNeed) parts.push('prayer requested');
  return parts.length ? parts.join('; ') : 'general companion turn';
}

module.exports = {
  buildRelationshipContext,
  detectCurrentStruggle,
  detectUserEmotion,
  detectUserGoal,
  detectRelationalObject,
  resolvePronounsAndReferences,
  buildContextSummary,
  detectMultiIntent,
};
