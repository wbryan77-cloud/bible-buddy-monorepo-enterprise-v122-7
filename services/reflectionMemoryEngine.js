/**
 * Phase 5A — Reflection memory: learn corrections without doctrine mutation.
 */

const fs = require('fs');
const path = require('path');
const { recordUserCorrection, getUserAnswerPreferences } = require('./userCorrectionMemory');

const MEMORY_PATH = path.join(__dirname, '..', 'data', 'reflection-memory.json');
const MAX_RECORDS_PER_USER = Number(process.env.BIBLEBUDDY_REFLECTION_MAX_PER_USER || 40);
const SESSION_TTL_MS = Number(process.env.BIBLEBUDDY_REFLECTION_SESSION_TTL_MS || 86400000);

const MEMORY_TYPES = [
  'answer_style_preference',
  'synonym_candidate',
  'routing_failure',
  'pending_question',
  'correction_rule',
  'companion_preference',
];

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

function saveAll(state) {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function pruneUserRecords(records = []) {
  const now = Date.now();
  const kept = records
    .filter((r) => {
      if (!r.expiresAt) return true;
      return new Date(r.expiresAt).getTime() > now;
    })
    .slice(-MAX_RECORDS_PER_USER);
  return kept;
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
  return { correction, preferences: getUserAnswerPreferences(userId) };
}

function getReflectionState(userId) {
  const state = loadAll();
  const user = state.users[userId] || { records: [], preferences: {} };
  return {
    records: pruneUserRecords(user.records || []),
    preferences: getUserAnswerPreferences(userId),
    globalCandidates: (state.globalCandidates || []).slice(-20),
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
  ingestUserMessage,
  recordReflection,
  recordPendingQuestion,
  recordRoutingFailure,
  getReflectionState,
  getUserAnswerPreferences,
};
