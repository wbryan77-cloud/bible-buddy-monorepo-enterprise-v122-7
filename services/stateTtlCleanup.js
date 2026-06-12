/**
 * Phase 4F — TTL cleanup for doctrine/session state maps.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_TTL_MS = Number(process.env.BIBLEBUDDY_STATE_TTL_MS || 24 * 60 * 60 * 1000);
const MAX_CORRECTIONS_PER_TOPIC = Number(
  process.env.BIBLEBUDDY_MAX_CORRECTIONS_PER_TOPIC || process.env.BIBLEBUDDY_MAX_CORRECTIONS || 20,
);
const MAX_WITNESSES_PER_TOPIC = Number(process.env.BIBLEBUDDY_MAX_WITNESSES || 24);
const MAX_USERS_IN_STATE = Number(process.env.BIBLEBUDDY_MAX_STATE_USERS || 500);
const ACTIVE_CONVERSATION_TTL_MS = Number(process.env.BIBLEBUDDY_STATE_TTL_MS || 24 * 60 * 60 * 1000);

const STATE_FILES = [
  'doctrine-conversation-state.json',
  'doctrine-correction-memory.json',
  'doctrine-witness-state.json',
  'active-conversation-state.json',
];

function isExpired(ts, ttlMs = DEFAULT_TTL_MS) {
  if (!ts) return true;
  const t = Date.parse(ts);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > ttlMs;
}

function trimUserDoctrineState(userState = {}) {
  const used = userState.usedWitnesses || [];
  if (used.length > MAX_WITNESSES_PER_TOPIC) {
    userState.usedWitnesses = used.slice(-MAX_WITNESSES_PER_TOPIC);
  }
  const approved = userState.usedApproved || [];
  if (approved.length > MAX_WITNESSES_PER_TOPIC) {
    userState.usedApproved = approved.slice(-MAX_WITNESSES_PER_TOPIC);
  }
  const prefs = userState.correctionPreferences || [];
  if (prefs.length > MAX_CORRECTIONS_PER_TOPIC) {
    userState.correctionPreferences = prefs.slice(-MAX_CORRECTIONS_PER_TOPIC);
  }
  if (userState.lastDoctrineAnswerSummary) {
    userState.lastDoctrineAnswerSummary = String(userState.lastDoctrineAnswerSummary).slice(0, 400);
  }
  if (userState.lastApprovedAnswerSummary) {
    userState.lastApprovedAnswerSummary = String(userState.lastApprovedAnswerSummary).slice(0, 400);
  }
  return userState;
}

function trimActiveConversationEntry(entry = {}) {
  if (entry.lastAnswerSummary) entry.lastAnswerSummary = String(entry.lastAnswerSummary).slice(0, 400);
  if (entry.lastUserQuestion) entry.lastUserQuestion = String(entry.lastUserQuestion).slice(0, 400);
  return entry;
}

function cleanupJsonUsers(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return { file: fileName, removed: 0 };
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const isFlatUserMap = fileName === 'active-conversation-state.json';
    const users = isFlatUserMap ? data : data.users || {};
    let removed = 0;
    for (const [userId, state] of Object.entries(users)) {
      const ts = state.lastUpdatedAt || state.loggedAt || state.updatedAt;
      const ageExpired = isFlatUserMap
        ? Date.now() - (state.updatedAtMs || 0) > ACTIVE_CONVERSATION_TTL_MS
        : isExpired(ts);
      if (ageExpired) {
        delete users[userId];
        removed += 1;
      } else if (isFlatUserMap) {
        users[userId] = trimActiveConversationEntry(state);
      } else {
        users[userId] = trimUserDoctrineState(state);
      }
    }
    const keys = Object.keys(users);
    if (keys.length > MAX_USERS_IN_STATE) {
      const sorted = keys
        .map((k) => ({
          k,
          t: isFlatUserMap
            ? users[k].updatedAtMs || 0
            : Date.parse(users[k].lastUpdatedAt || 0) || 0,
        }))
        .sort((a, b) => a.t - b.t);
      const excess = sorted.slice(0, keys.length - MAX_USERS_IN_STATE);
      for (const { k } of excess) {
        delete users[k];
        removed += 1;
      }
    }
    if (!isFlatUserMap) data.users = users;
    else Object.assign(data, users);
    if (isFlatUserMap) {
      const cleaned = {};
      for (const [k, v] of Object.entries(users)) cleaned[k] = v;
      fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8');
    } else {
      data.users = users;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
    return { file: fileName, removed };
  } catch (e) {
    console.warn(`[stateTtl] cleanup failed ${fileName}:`, e.message);
    return { file: fileName, removed: 0, error: e.message };
  }
}

function runStateTtlCleanup() {
  const results = STATE_FILES.map(cleanupJsonUsers);
  return { ttlMs: DEFAULT_TTL_MS, results, at: new Date().toISOString() };
}

let cleanupTimer = null;

function scheduleStateTtlCleanup(intervalMs = Math.min(DEFAULT_TTL_MS, 60 * 60 * 1000)) {
  if (cleanupTimer) return;
  runStateTtlCleanup();
  cleanupTimer = setInterval(runStateTtlCleanup, intervalMs);
  if (cleanupTimer.unref) cleanupTimer.unref();
}

module.exports = {
  DEFAULT_TTL_MS,
  runStateTtlCleanup,
  scheduleStateTtlCleanup,
  trimUserDoctrineState,
};
