const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REGRESSION_FILE = path.join(DATA_DIR, 'continuity-regression-runtime.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(REGRESSION_FILE)) return [];
    return JSON.parse(fs.readFileSync(REGRESSION_FILE, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(REGRESSION_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Continuity regression runtime write failed:', error.message);
  }
}

function saveRegressionRecord({ userId, topic, references = [], continuityUsed = false, score = 0 }) {
  const store = readStore();

  store.push({
    userId,
    topic,
    references,
    continuityUsed,
    score,
    createdAt: new Date().toISOString(),
  });

  writeStore(store.slice(-1000));
}

function calculateContinuityScore({ references = [], continuityUsed = false }) {
  let score = 40;

  if (references.length >= 3) score += 20;
  if (references.length >= 6) score += 15;
  if (continuityUsed) score += 25;

  return Math.min(score, 100);
}

function detectRegressionIssues(record = {}) {
  const issues = [];

  if (!record.continuityUsed) {
    issues.push('continuity_not_used');
  }

  if ((record.references || []).length < 2) {
    issues.push('weak_scripture_chain');
  }

  if ((record.score || 0) < 60) {
    issues.push('low_continuity_score');
  }

  return issues;
}

function getRegressionRecords(limit = 50) {
  const store = readStore();
  return store.slice(-limit);
}

module.exports = {
  saveRegressionRecord,
  calculateContinuityScore,
  detectRegressionIssues,
  getRegressionRecords,
};
