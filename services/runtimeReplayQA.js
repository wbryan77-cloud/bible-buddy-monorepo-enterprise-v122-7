const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QA_REPLAY_FILE = path.join(DATA_DIR, 'runtime-replay-qa.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(QA_REPLAY_FILE)) return [];
    return JSON.parse(fs.readFileSync(QA_REPLAY_FILE, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(QA_REPLAY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Runtime replay QA write failed:', error.message);
  }
}

function buildReplayRecord({ userId, message, response, runtime }) {
  return {
    userId,
    message: String(message || '').slice(0, 800),
    response: String(response?.reply || '').slice(0, 1200),
    mode: response?.mode || 'companion',
    safety: response?.safety_level || 'standard',
    memoryUsed: !!response?.memory_used,
    qualityScore: response?.quality?.score || null,
    runtime,
    createdAt: new Date().toISOString(),
  };
}

function saveReplayRecord(payload) {
  const store = readStore();
  store.push(buildReplayRecord(payload));
  writeStore(store.slice(-500));
}

function getReplayRecords(limit = 25) {
  const store = readStore();
  return store.slice(-limit);
}

function detectReplayIssues(record = {}) {
  const issues = [];
  const reply = String(record.response || '').toLowerCase();

  if (reply.includes('let’s slow this down together') || reply.includes('lets slow this down together')) {
    issues.push('generic_loop_detected');
  }

  if ((record.qualityScore || 0) < 60) {
    issues.push('low_quality_score');
  }

  if (!record.memoryUsed) {
    issues.push('memory_not_used');
  }

  return issues;
}

module.exports = {
  saveReplayRecord,
  getReplayRecords,
  detectReplayIssues,
};
