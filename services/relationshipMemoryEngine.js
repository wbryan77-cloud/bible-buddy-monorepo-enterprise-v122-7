/**
 * Phase 5G — Safe relationship memory (companion context, not global doctrine).
 */

const fs = require('fs');
const path = require('path');
const { getDoctrineConversationState, updateDoctrineConversationState } = require('./doctrineConversationState');
const { getUserAnswerPreferences, recordUserCorrection } = require('./userCorrectionMemory');

const MEMORY_PATH = path.join(__dirname, '..', 'data', 'relationship-memory.json');
const MAX_SIGNALS_PER_USER = 30;

const PERSONAL_SENSITIVE_RE =
  /\b(address|phone|ssn|credit card|password|exact age|full name of|where i live)\b/i;

const PREFERENCE_RE =
  /\b(remember that i|i like direct|say no first|direct answers|no primarily|no interpretations vary|line upon line)\b/i;

const FAMILY_CONTEXT_RE =
  /\b(family disagree|talking to (them|family)|explain to (them|family)|nervous about talking)\b/i;

const PRACTICAL_WORRY_RE = /\b(nervous|afraid|scared|worried).{0,40}(family|them|talking)\b/i;

function loadAll() {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    }
  } catch {
    /* fresh */
  }
  return { users: {} };
}

function saveAll(data) {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function defaultUserRel() {
  return {
    currentStruggle: null,
    recentConcern: null,
    lastPracticalRequest: null,
    lastPrayerRequest: null,
    familyConversationContext: false,
    wantsPracticalWording: false,
    signals: [],
    updatedAt: null,
  };
}

function shouldStorePersonalMemory(message = '') {
  if (PERSONAL_SENSITIVE_RE.test(String(message))) return false;
  return !/\b(my name is|i live at)\b/i.test(String(message));
}

function shouldStorePreferenceMemory(message = '') {
  return PREFERENCE_RE.test(String(message));
}

function recordRelationshipSignal({ userId, message = '', state = {} } = {}) {
  if (!userId) return null;
  const m = String(message || '').trim();
  const data = loadAll();
  if (!data.users[userId]) data.users[userId] = defaultUserRel();
  const rel = data.users[userId];
  const signal = { message: m.slice(0, 160), at: new Date().toISOString() };

  if (/\boverwhelmed|discouraged|sad|bad day|crashing\b/i.test(m)) {
    rel.currentStruggle = m.slice(0, 120);
    rel.recentConcern = 'emotional';
  }
  // Phase 7A — capture person-centered burdens (worried about dad, mother is sick, etc.)
  if (
    /\b(worried about|anxious about|scared for|afraid for|pray(?:ing)? for|sick|ill|hospital|cancer|surgery)\b/i.test(m) &&
    /\b(dad|father|mom|mother|son|daughter|husband|wife|brother|sister|friend|child|family)\b/i.test(m)
  ) {
    rel.currentStruggle = m.slice(0, 160);
    rel.recentConcern = 'family_burden';
  }
  if (FAMILY_CONTEXT_RE.test(m) || PRACTICAL_WORRY_RE.test(m)) {
    rel.familyConversationContext = true;
    rel.recentConcern = 'family_conversation';
    rel.wantsPracticalWording = /\bhow (do|should|can) i explain|what (words|verse)|nervous\b/i.test(m);
  }
  if (/\bhow (do|should|can) i explain|explain it to them\b/i.test(m)) {
    rel.lastPracticalRequest = m.slice(0, 120);
    rel.wantsPracticalWording = true;
  }
  if (/\bpray\b/i.test(m)) {
    // Phase 7A — do not overwrite a concrete prior prayer subject with bare "pray again"
    const isBareAgain = /\b(pray(?:\s+with\s+me)?\s+again|pray again)\b/i.test(m) &&
      !/\b(for|about)\b/i.test(m);
    if (!isBareAgain) {
      rel.lastPrayerRequest = m.slice(0, 120);
    } else if (!rel.lastPrayerRequest) {
      rel.lastPrayerRequest = m.slice(0, 120);
    }
  }
  if (shouldStorePreferenceMemory(m)) {
    recordUserCorrection(userId, m);
  }

  rel.signals = [...(rel.signals || []), signal].slice(-MAX_SIGNALS_PER_USER);
  rel.updatedAt = new Date().toISOString();
  data.users[userId] = rel;
  saveAll(data);

  const sessionPatch = {};
  if (rel.familyConversationContext) {
    sessionPatch.sessionMemory = {
      ...(state.sessionMemory || {}),
      currentStruggle: rel.currentStruggle || state.sessionMemory?.currentStruggle,
      familyContext: true,
    };
  }
  if (Object.keys(sessionPatch).length) {
    updateDoctrineConversationState(userId, sessionPatch);
  }

  return rel;
}

function getRelationshipContext({ userId } = {}) {
  if (!userId) return defaultUserRel();
  const data = loadAll();
  const rel = data.users[userId] || defaultUserRel();
  const state = getDoctrineConversationState(userId);
  return {
    ...rel,
    lastAnsweredConcept:
      state.lastAnsweredConcept ||
      state.turnMemory?.lastAnsweredConcept ||
      state.sessionMemory?.activeConcept ||
      null,
    lastDoctrineTopic: state.lastAnsweredTopic || state.activeDoctrineTopic || null,
    preferences: getUserAnswerPreferences(userId),
    familyConversationContext:
      rel.familyConversationContext || state.sessionMemory?.familyContext || false,
  };
}

function updateCompanionSummary({ userId, event = '', detail = '' } = {}) {
  if (!userId) return;
  const data = loadAll();
  if (!data.users[userId]) data.users[userId] = defaultUserRel();
  data.users[userId].signals.push({
    event: String(event).slice(0, 60),
    detail: String(detail).slice(0, 120),
    at: new Date().toISOString(),
  });
  data.users[userId].signals = data.users[userId].signals.slice(-MAX_SIGNALS_PER_USER);
  saveAll(data);
}

function buildMemoryAwareOpening({ userId, message = '' } = {}) {
  const ctx = getRelationshipContext({ userId });
  if (ctx.familyConversationContext && /\bnervous|talking to them|family\b/i.test(message)) {
    return 'I remember you were working through how to talk with your family about Scripture.';
  }
  if (ctx.currentStruggle && /\boverwhelmed|still\b/i.test(message)) {
    return 'I’m still with you on what’s been weighing on you.';
  }
  return '';
}

function buildPreferenceAck(message = '', userId = '') {
  if (/remember that i like direct/i.test(message)) {
    const prefs = userId ? getUserAnswerPreferences(userId) : null;
    if (prefs?.directAnswerFirst) {
      return 'I can remember that — direct answers first, grounded in Scripture. I’ll apply that in this conversation and keep it as a preference for how I answer you.';
    }
    return 'I can remember that in this conversation — direct answers first, grounded in Scripture. I don’t store sensitive personal details beyond answer preferences.';
  }
  if (/remember that/i.test(message) && shouldStorePreferenceMemory(message)) {
    return 'I can save that as a preference for how I answer you in this conversation.';
  }
  return null;
}

function buildMemoryRecallReply({ userId, message = '' } = {}) {
  const ctx = getRelationshipContext({ userId });
  const items = [];

  // Phase 7A — person-first before style prefs
  if (ctx.currentStruggle) items.push(`you shared: ${String(ctx.currentStruggle).slice(0, 100)}`);
  if (ctx.lastPrayerRequest) items.push(`you asked prayer about: ${String(ctx.lastPrayerRequest).slice(0, 100)}`);
  if (ctx.familyConversationContext) items.push('you were working through talking with family about Scripture');
  if (ctx.lastPracticalRequest) items.push('you asked for practical wording help');
  if (ctx.preferences?.directAnswerFirst) items.push('you prefer direct answers first');
  if (ctx.preferences?.yesNoDirect) items.push('you want yes/no answered directly');

  if (items.length === 0) {
    return 'In this conversation I mainly have session context — what we’ve discussed so far. I don’t invent personal details. If you want me to remember something, say “please remember…” and I’ll keep it in mind.';
  }

  return `Here’s what stands out about you: ${items.join('; ')}. If I missed something important, tell me and I’ll correct it.`;
}

function forgetUserMemory({ userId } = {}) {
  if (!userId) {
    return { cleared: false, reply: 'I can only clear stored context when I know who I’m talking with in this session.' };
  }
  const data = loadAll();
  data.users[userId] = defaultUserRel();
  saveAll(data);
  return {
    cleared: true,
    reply:
      "I've cleared what I stored about your companion context and session signals. Your answer-style preferences in this session are reset — tell me again if you want direct answers or other preferences.",
  };
}

module.exports = {
  MEMORY_PATH,
  recordRelationshipSignal,
  getRelationshipContext,
  updateCompanionSummary,
  buildMemoryAwareOpening,
  shouldStorePersonalMemory,
  shouldStorePreferenceMemory,
  buildPreferenceAck,
  buildMemoryRecallReply,
  forgetUserMemory,
};
