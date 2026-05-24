const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSION_FILE = path.join(DATA_DIR, 'continuity-study-sessions.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return {};
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Continuity study session write failed:', error.message);
  }
}

function saveStudySession({ userId, topic, references = [], notes = '' }) {
  const store = readStore();
  const sessions = store[userId] || [];

  sessions.push({
    topic,
    references,
    notes,
    createdAt: new Date().toISOString(),
  });

  store[userId] = sessions.slice(-250);
  writeStore(store);
}

function getRecentStudySessions(userId, limit = 10) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildStudyContinuation({ userId, topic = '' }) {
  const sessions = getRecentStudySessions(userId, 15);

  const related = sessions.filter((item) =>
    String(item.topic || '').toLowerCase().includes(String(topic || '').toLowerCase())
  );

  return {
    topic,
    relatedSessions: related,
    continuationEnabled: true,
    scriptureFirst: true,
    suggestedContinuation: related.length
      ? `Continue previous ${topic} study continuity.`
      : `Begin new ${topic} Scripture study continuity.`,
  };
}

module.exports = {
  saveStudySession,
  getRecentStudySessions,
  buildStudyContinuation,
};
