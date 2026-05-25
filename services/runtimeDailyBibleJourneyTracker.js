const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JOURNEY_FILE = path.join(DATA_DIR, 'daily-bible-journey-tracker.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(JOURNEY_FILE)) return {};
    return JSON.parse(fs.readFileSync(JOURNEY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(JOURNEY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Daily Bible Journey write failed:', error.message);
  }
}

function saveJourneyProgress({
  userId,
  day,
  oldTestament = [],
  newTestament = [],
  psalms = [],
  proverbs = [],
  listened = false,
  completed = false,
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    day,
    oldTestament,
    newTestament,
    psalms,
    proverbs,
    listened,
    completed,
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-400);
  writeStore(store);
}

function getJourneyProgress(userId, limit = 30) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildJourneyTrackingContext(userId) {
  const progress = getJourneyProgress(userId, 365);

  const completedDays = progress.filter((item) => item.completed).length;
  const listenedDays = progress.filter((item) => item.listened).length;

  return {
    scriptureFirst: true,
    journeyMode: true,
    completedDays,
    listenedDays,
    missedDays: Math.max(0, 365 - completedDays),
    progress,
    continuityEnabled: true,
  };
}

module.exports = {
  saveJourneyProgress,
  getJourneyProgress,
  buildJourneyTrackingContext,
};
