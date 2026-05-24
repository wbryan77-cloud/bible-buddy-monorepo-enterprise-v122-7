const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PERSONALITY_FILE = path.join(DATA_DIR, 'runtime-personality-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(PERSONALITY_FILE)) return {};
    return JSON.parse(fs.readFileSync(PERSONALITY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(PERSONALITY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Runtime personality continuity write failed:', error.message);
  }
}

function detectCommunicationStyle(message = '') {
  const text = String(message || '').toLowerCase();

  return {
    reflective: text.includes('reflect') || text.includes('thinking'),
    studyFocused: text.includes('scripture') || text.includes('study') || text.includes('verse'),
    practical: text.includes('resume') || text.includes('job') || text.includes('help me'),
    prayerFocused: text.includes('pray') || text.includes('prayer'),
    emotional: text.includes('hurt') || text.includes('sad') || text.includes('overwhelmed'),
  };
}

function savePersonalityContinuity({ userId, message }) {
  const store = readStore();

  store[userId] = {
    ...(store[userId] || {}),
    communicationStyle: detectCommunicationStyle(message),
    lastMessage: String(message || '').slice(0, 500),
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
}

function getPersonalityContinuity(userId) {
  const store = readStore();

  return store[userId] || {
    communicationStyle: {},
    lastMessage: null,
  };
}

function buildRelationalPromptContext({ userId }) {
  const continuity = getPersonalityContinuity(userId);

  return {
    continuityEnabled: true,
    reflectiveTone: !!continuity.communicationStyle?.reflective,
    studyFocused: !!continuity.communicationStyle?.studyFocused,
    practicalTone: !!continuity.communicationStyle?.practical,
    prayerFocused: !!continuity.communicationStyle?.prayerFocused,
    emotionalSupportTone: !!continuity.communicationStyle?.emotional,
    avoidGenericLoops: true,
    scriptureFirst: true,
  };
}

module.exports = {
  savePersonalityContinuity,
  getPersonalityContinuity,
  buildRelationalPromptContext,
};
