const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRAYER_FILE = path.join(DATA_DIR, 'runtime-prayer-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(PRAYER_FILE)) return {};
    return JSON.parse(fs.readFileSync(PRAYER_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(PRAYER_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Prayer continuity write failed:', error.message);
  }
}

function savePrayerContinuity({
  userId,
  topic,
  prayerRequest = '',
  scriptures = [],
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    topic,
    prayerRequest,
    scriptures,
    resolved: false,
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-300);
  writeStore(store);
}

function resolvePrayerContinuity({ userId, topic }) {
  const store = readStore();
  const entries = store[userId] || [];

  store[userId] = entries.map((entry) => {
    if (entry.topic === topic) {
      return {
        ...entry,
        resolved: true,
        resolvedAt: new Date().toISOString(),
      };
    }

    return entry;
  });

  writeStore(store);
}

function getPrayerContinuity(userId, limit = 10) {
  const store = readStore();

  return (store[userId] || [])
    .filter((entry) => !entry.resolved)
    .slice(-limit);
}

function buildPrayerContinuityContext(userId) {
  const prayers = getPrayerContinuity(userId, 10);

  return {
    scriptureFirst: true,
    continuityEnabled: true,
    activePrayerTopics: prayers.map((item) => item.topic),
    activePrayerCount: prayers.length,
    prayerContinuity: prayers,
  };
}

module.exports = {
  savePrayerContinuity,
  resolvePrayerContinuity,
  getPrayerContinuity,
  buildPrayerContinuityContext,
};
