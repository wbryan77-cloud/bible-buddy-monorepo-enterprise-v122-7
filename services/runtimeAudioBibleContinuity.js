const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const AUDIO_FILE = path.join(DATA_DIR, 'runtime-audio-bible-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(AUDIO_FILE)) return {};
    return JSON.parse(fs.readFileSync(AUDIO_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(AUDIO_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Audio Bible continuity write failed:', error.message);
  }
}

function saveAudioProgress({
  userId,
  currentBook,
  currentChapter,
  listeningMinutes = 0,
  completed = false,
}) {
  const store = readStore();
  const sessions = store[userId] || [];

  sessions.push({
    currentBook,
    currentChapter,
    listeningMinutes,
    completed,
    createdAt: new Date().toISOString(),
  });

  store[userId] = sessions.slice(-500);
  writeStore(store);
}

function getAudioProgress(userId, limit = 20) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildAudioBibleContext(userId) {
  const progress = getAudioProgress(userId, 50);

  const totalMinutes = progress.reduce(
    (sum, item) => sum + (item.listeningMinutes || 0),
    0
  );

  const completedSessions = progress.filter((item) => item.completed).length;

  return {
    scriptureFirst: true,
    listeningMode: true,
    continuityEnabled: true,
    totalMinutes,
    completedSessions,
    progress,
  };
}

module.exports = {
  saveAudioProgress,
  getAudioProgress,
  buildAudioBibleContext,
};
