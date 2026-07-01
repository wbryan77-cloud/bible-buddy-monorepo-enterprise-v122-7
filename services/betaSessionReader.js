const fs = require('fs');
const path = require('path');

const SESSIONS_FILE = path.join(__dirname, '..', 'data', 'buddy-sessions.jsonl');
const FEEDBACK_FILE = path.join(__dirname, '..', 'data', 'companion-feedback.jsonl');

function readJsonl(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function normalizeTurn(entry) {
  const testerId = entry.testerId || entry.userId || null;
  return {
    testerId,
    userId: entry.userId || testerId,
    sessionId: entry.sessionId || null,
    cohort: entry.cohort || null,
    mode: entry.mode || null,
    message: entry.message || '',
    reply: entry.reply || '',
    createdAt: entry.createdAt || null,
    quality: entry.quality || null,
    safety: entry.safety || null,
  };
}

function listSessionSummaries({ testerId = null, cohort = null, since = null, limit = 200 } = {}) {
  const sinceMs = since ? Date.parse(since) : null;
  const bySession = new Map();

  for (const raw of readJsonl(SESSIONS_FILE)) {
    const turn = normalizeTurn(raw);
    if (testerId && turn.testerId !== testerId && turn.userId !== testerId) continue;
    if (cohort && turn.cohort !== cohort) continue;
    if (!turn.sessionId) continue;
    if (sinceMs && turn.createdAt && Date.parse(turn.createdAt) < sinceMs) continue;

    const existing = bySession.get(turn.sessionId) || {
      sessionId: turn.sessionId,
      testerId: turn.testerId,
      cohort: turn.cohort,
      turnCount: 0,
      firstAt: turn.createdAt,
      lastAt: turn.createdAt,
    };
    existing.turnCount += 1;
    if (turn.createdAt && (!existing.firstAt || turn.createdAt < existing.firstAt)) {
      existing.firstAt = turn.createdAt;
    }
    if (turn.createdAt && (!existing.lastAt || turn.createdAt > existing.lastAt)) {
      existing.lastAt = turn.createdAt;
    }
    bySession.set(turn.sessionId, existing);
  }

  return [...bySession.values()]
    .sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
    .slice(0, limit);
}

function getSessionTranscript(sessionId) {
  const turns = readJsonl(SESSIONS_FILE)
    .map(normalizeTurn)
    .filter((t) => t.sessionId === sessionId)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  if (!turns.length) return null;
  return {
    sessionId,
    testerId: turns[0].testerId,
    cohort: turns[0].cohort,
    turns,
  };
}

function listFeedback({ testerId = null, sessionId = null, limit = 200 } = {}) {
  return readJsonl(FEEDBACK_FILE)
    .filter((row) => {
      const tid = row.testerId || row.userId;
      if (testerId && tid !== testerId) return false;
      if (sessionId && row.sessionId !== sessionId) return false;
      return true;
    })
    .slice(-limit)
    .reverse();
}

function getReviewBundle({ sessionId }) {
  const transcript = getSessionTranscript(sessionId);
  const feedback = listFeedback({ sessionId, limit: 20 });
  return { transcript, feedback };
}

function listReviewIndex({ cohort = null, since = null, limit = 100 } = {}) {
  const sessions = listSessionSummaries({ cohort, since, limit });
  return sessions.map((s) => ({
    ...s,
    feedback: listFeedback({ sessionId: s.sessionId, limit: 5 }),
  }));
}

module.exports = {
  SESSIONS_FILE,
  FEEDBACK_FILE,
  readJsonl,
  listSessionSummaries,
  getSessionTranscript,
  listFeedback,
  getReviewBundle,
  listReviewIndex,
};
