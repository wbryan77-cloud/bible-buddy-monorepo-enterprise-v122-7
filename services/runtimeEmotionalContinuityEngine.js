const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EMOTIONAL_FILE = path.join(DATA_DIR, 'runtime-emotional-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(EMOTIONAL_FILE)) return {};
    return JSON.parse(fs.readFileSync(EMOTIONAL_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(EMOTIONAL_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Emotional continuity write failed:', error.message);
  }
}

function detectEmotionalSignals(message = '') {
  const text = String(message || '').toLowerCase();

  return {
    discouraged: text.includes('tired') || text.includes('overwhelmed') || text.includes('discouraged'),
    grieving: text.includes('loss') || text.includes('hurt') || text.includes('grief'),
    hopeful: text.includes('hope') || text.includes('better') || text.includes('thankful'),
    anxious: text.includes('anxious') || text.includes('worried') || text.includes('fear'),
    peaceful: text.includes('peace') || text.includes('calm'),
  };
}

function saveEmotionalContinuity({ userId, message }) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    message: String(message || '').slice(0, 500),
    signals: detectEmotionalSignals(message),
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-200);
  writeStore(store);
}

function getEmotionalContinuity(userId, limit = 10) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildEmotionalContinuityContext(userId) {
  const entries = getEmotionalContinuity(userId, 10);

  return {
    scriptureFirst: true,
    emotionalContinuityEnabled: true,
    recentEmotionalPatterns: entries,
    guidance: {
      avoidGenericTherapyLanguage: true,
      maintainGentleSupportiveTone: true,
      prioritizeScriptureCenteredEncouragement: true,
      preserveRelationalContinuity: true,
    },
  };
}

module.exports = {
  saveEmotionalContinuity,
  getEmotionalContinuity,
  buildEmotionalContinuityContext,
};
