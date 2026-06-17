/**
 * Phase 5A / 5E — Reflection memory: learn corrections without doctrine mutation.
 */

const fs = require('fs');
const path = require('path');
const { recordUserCorrection, getUserAnswerPreferences } = require('./userCorrectionMemory');

const MEMORY_PATH = path.join(__dirname, '..', 'data', 'reflection-memory.json');
const CANDIDATES_PATH = path.join(
  __dirname,
  '..',
  'docs',
  'bible-learning',
  'concept-growth-candidates.json',
);
const MAX_RECORDS_PER_USER = Number(process.env.BIBLEBUDDY_REFLECTION_MAX_PER_USER || 40);
const MAX_CANDIDATES = Number(process.env.BIBLEBUDDY_BNC_CANDIDATES_MAX || 200);
const SESSION_TTL_MS = Number(process.env.BIBLEBUDDY_REFLECTION_SESSION_TTL_MS || 86400000);

const LEARNING_PHRASE_RE =
  /\b(remember that|put (it|this) in your database|when others ask|for others|you got it|don't answer it that way|that is not what i asked|i wasn't asking about|can you remember that when others)\b/i;

const MEMORY_TYPES = [
  'answer_style_preference',
  'synonym_candidate',
  'routing_failure',
  'pending_question',
  'correction_rule',
  'companion_preference',
  'concept_learning_candidate',
];

const LEARNING_ACK =
  'Yes. I can save that as a learning candidate for review so Buddy can answer that wording better later. I will not automatically change doctrine authority without review.';

function loadAll() {
  try {
    if (fs.existsSync(MEMORY_PATH)) {
      return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    }
  } catch {
    /* fresh */
  }
  return { users: {}, globalCandidates: [] };
}

function loadCandidates() {
  try {
    if (fs.existsSync(CANDIDATES_PATH)) {
      return JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
    }
  } catch {
    /* fresh */
  }
  return { candidates: [], updatedAt: null };
}

function saveAll(state) {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function saveCandidates(data) {
  const dir = path.dirname(CANDIDATES_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  data.updatedAt = new Date().toISOString();
  data.candidates = (data.candidates || []).slice(-MAX_CANDIDATES);
  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function pruneUserRecords(records = []) {
  const now = Date.now();
  return records
    .filter((r) => {
      if (!r.expiresAt) return true;
      return new Date(r.expiresAt).getTime() > now;
    })
    .slice(-MAX_RECORDS_PER_USER);
}

function recordReflection(userId, entry = {}) {
  if (!userId) return null;
  const state = loadAll();
  if (!state.users[userId]) {
    state.users[userId] = { records: [], preferences: {} };
  }
  const record = {
    type: entry.type || 'correction_rule',
    label: String(entry.label || 'reflection').slice(0, 80),
    userMessage: String(entry.userMessage || '').slice(0, 200),
    conceptId: entry.conceptId || null,
    pendingQuestion: entry.pendingQuestion ? String(entry.pendingQuestion).slice(0, 300) : null,
    loggedAt: new Date().toISOString(),
    expiresAt: entry.sessionOnly
      ? new Date(Date.now() + SESSION_TTL_MS).toISOString()
      : null,
    sessionOnly: !!entry.sessionOnly,
  };
  state.users[userId].records.push(record);
  state.users[userId].records = pruneUserRecords(state.users[userId].records);

  if (entry.type === 'synonym_candidate' && entry.label) {
    const exists = state.globalCandidates.some(
      (c) => c.label === entry.label && c.userMessage === record.userMessage,
    );
    if (!exists) {
      state.globalCandidates.push({
        label: entry.label,
        userMessage: record.userMessage.slice(0, 160),
        conceptId: entry.conceptId,
        status: 'pending_review',
        loggedAt: record.loggedAt,
      });
      state.globalCandidates = state.globalCandidates.slice(-200);
    }
  }

  saveAll(state);
  return record;
}

function recordConceptLearningCandidate({
  phrase = '',
  proposedConcept = null,
  correction = '',
  refs = [],
  source = 'user_message',
  status = 'pending_review',
  userId = '',
} = {}) {
  const data = loadCandidates();
  const entry = {
    phrase: String(phrase).slice(0, 200),
    proposedConcept,
    correction: String(correction).slice(0, 300),
    refs: (refs || []).slice(0, 10),
    source,
    status,
    userId: userId ? 'set' : '',
    loggedAt: new Date().toISOString(),
  };
  const dup = data.candidates.some(
    (c) => c.phrase === entry.phrase && c.proposedConcept === entry.proposedConcept,
  );
  if (!dup) {
    data.candidates.push(entry);
    saveCandidates(data);
  }
  if (userId) {
    recordReflection(userId, {
      type: 'concept_learning_candidate',
      label: 'bnc_learning_candidate',
      userMessage: phrase,
      conceptId: proposedConcept,
      sessionOnly: false,
    });
  }
  return entry;
}

function ingestUserMessage(userId, message = '') {
  const correction = recordUserCorrection(userId, message);
  if (correction) {
    recordReflection(userId, {
      type: 'answer_style_preference',
      label: correction.label || 'correction',
      userMessage: message,
      sessionOnly: true,
    });
  }
  if (/\bsex\b.*\bfornication\b/i.test(message) || /\bmeans fornication\b/i.test(message)) {
    recordReflection(userId, {
      type: 'synonym_candidate',
      label: 'sex_fornication_alias',
      userMessage: message,
      conceptId: 'fornication_sexual_sin',
      sessionOnly: false,
    });
  }
  if (LEARNING_PHRASE_RE.test(message)) {
    recordConceptLearningCandidate({
      phrase: message,
      proposedConcept: null,
      correction: message,
      source: 'user_remember_phrase',
      userId,
    });
    return { correction, preferences: getUserAnswerPreferences(userId), learningCandidate: true, learningAck: LEARNING_ACK };
  }
  return { correction, preferences: getUserAnswerPreferences(userId) };
}

function getReflectionState(userId) {
  const state = loadAll();
  const user = state.users[userId] || { records: [], preferences: {} };
  return {
    records: pruneUserRecords(user.records || []),
    preferences: getUserAnswerPreferences(userId),
    globalCandidates: (state.globalCandidates || []).slice(-20),
    growthCandidates: (loadCandidates().candidates || []).slice(-20),
  };
}

function recordPendingQuestion(userId, question = '') {
  if (!userId || !question) return;
  recordReflection(userId, {
    type: 'pending_question',
    label: 'pending_question',
    pendingQuestion: question,
    userMessage: question,
    sessionOnly: true,
  });
}

function recordRoutingFailure(userId, message = '', reason = '') {
  recordReflection(userId, {
    type: 'routing_failure',
    label: String(reason || 'routing_failure').slice(0, 80),
    userMessage: message,
    sessionOnly: true,
  });
}

module.exports = {
  MEMORY_TYPES,
  MEMORY_PATH,
  CANDIDATES_PATH,
  LEARNING_ACK,
  ingestUserMessage,
  recordReflection,
  recordPendingQuestion,
  recordRoutingFailure,
  recordConceptLearningCandidate,
  getReflectionState,
  getUserAnswerPreferences,
  loadGrowthCandidates: loadCandidates,
};
