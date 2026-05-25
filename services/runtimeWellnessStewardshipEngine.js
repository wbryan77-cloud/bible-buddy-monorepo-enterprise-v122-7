const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WELLNESS_FILE = path.join(DATA_DIR, 'runtime-wellness-stewardship.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const STEWARDSHIP_SCRIPTURES = [
  '1 Corinthians 6:19-20',
  'Romans 12:1-2',
  'Daniel 1:8',
  '3 John 1:2',
  'Genesis 1:29',
];

function readStore() {
  try {
    if (!fs.existsSync(WELLNESS_FILE)) return {};
    return JSON.parse(fs.readFileSync(WELLNESS_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(WELLNESS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Wellness stewardship write failed:', error.message);
  }
}

function saveWellnessContinuity({
  userId,
  topic,
  habits = [],
  notes = '',
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    topic,
    habits,
    notes,
    scriptures: STEWARDSHIP_SCRIPTURES,
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-300);
  writeStore(store);
}

function getWellnessContinuity(userId, limit = 10) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildWellnessStewardshipContext(userId) {
  const continuity = getWellnessContinuity(userId, 10);

  return {
    scriptureFirst: true,
    continuityEnabled: true,
    stewardshipMode: true,
    scriptures: STEWARDSHIP_SCRIPTURES,
    continuity,
    guidance: {
      avoidMedicalClaims: true,
      focusOnStewardship: true,
      encourageSmallConsistentHabits: true,
      maintainGentleTone: true,
    },
  };
}

module.exports = {
  saveWellnessContinuity,
  getWellnessContinuity,
  buildWellnessStewardshipContext,
};
