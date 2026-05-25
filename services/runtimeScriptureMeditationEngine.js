const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEDITATION_FILE = path.join(DATA_DIR, 'runtime-scripture-meditation.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(MEDITATION_FILE)) return {};
    return JSON.parse(fs.readFileSync(MEDITATION_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(MEDITATION_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Scripture meditation write failed:', error.message);
  }
}

function saveMeditationSession({
  userId,
  scripture,
  reflection = '',
  prayer = '',
  themes = [],
}) {
  const store = readStore();
  const sessions = store[userId] || [];

  sessions.push({
    scripture,
    reflection,
    prayer,
    themes,
    createdAt: new Date().toISOString(),
  });

  store[userId] = sessions.slice(-400);
  writeStore(store);
}

function getMeditationSessions(userId, limit = 20) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildMeditationContinuity(userId) {
  const sessions = getMeditationSessions(userId, 50);

  const themes = [...new Set(
    sessions.flatMap((session) => session.themes || [])
  )];

  const scriptures = [...new Set(
    sessions.map((session) => session.scripture).filter(Boolean)
  )];

  return {
    scriptureFirst: true,
    meditationContinuityEnabled: true,
    recurringThemes: themes,
    meditationScriptures: scriptures,
    totalMeditations: sessions.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveMeditationSession,
  getMeditationSessions,
  buildMeditationContinuity,
};
