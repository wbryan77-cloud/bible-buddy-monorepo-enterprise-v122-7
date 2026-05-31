const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LEARNING_FILE = path.join(DATA_DIR, 'companion-learning-profiles.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(LEARNING_FILE)) return {};
    return JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(LEARNING_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Companion learning write failed:', error.message);
  }
}

function detectPrayerTopic(message = '') {
  const lower = String(message).toLowerCase();
  if (lower.includes('family')) return 'family';
  if (lower.includes('health') || lower.includes('healing')) return 'health';
  if (lower.includes('job') || lower.includes('work')) return 'work';
  if (lower.includes('anxiety') || lower.includes('peace')) return 'peace';
  if (lower.includes('grief') || lower.includes('loss')) return 'grief';
  return 'general';
}

function inferStudyDepth(structured = {}, runtimeContext = {}) {
  const refs = Array.isArray(structured.scripture) ? structured.scripture.length : 0;
  if (refs >= 5 || runtimeContext?.doctrinalMode) return 'deep';
  if (refs >= 2) return 'moderate';
  return 'light';
}

function extractBooksFromScripture(scripture = []) {
  const books = [];
  for (const item of scripture || []) {
    const ref = String(item?.reference || item || '');
    const match = ref.match(/^(\d?\s*[A-Za-z]+)/);
    if (match) books.push(match[1].trim());
  }
  return books;
}

function recordCompanionLearning({
  userId,
  message = '',
  structured = {},
  runtimeContext = {},
  doctrineTopic = null,
}) {
  const store = readStore();
  const current = store[userId] || {
    favoriteTopics: {},
    favoriteBooks: {},
    favoriteContinuityPaths: {},
    studyDepth: 'light',
    studyPacing: 'steady',
    studyFrequency: { sessions: 0, weeklyEstimate: 0 },
    prayerTopics: [],
    preferences: {},
    sessionTimestamps: [],
  };

  let topic =
    doctrineTopic ||
    structured?.runtime?.doctrineTopic ||
    structured?.runtime?.registryTopic ||
    null;

  if (!topic && (runtimeContext?.intent === 'study' || runtimeContext?.intent === 'doctrinal_study')) {
    topic = 'scripture_study';
  }

  const favoriteTopics = { ...(current.favoriteTopics || {}) };
  if (topic && topic !== 'companion') {
    favoriteTopics[topic] = (favoriteTopics[topic] || 0) + 1;
  }

  const favoriteBooks = { ...(current.favoriteBooks || {}) };
  for (const book of extractBooksFromScripture(structured.scripture)) {
    favoriteBooks[book] = (favoriteBooks[book] || 0) + 1;
  }

  const favoriteContinuityPaths = { ...(current.favoriteContinuityPaths || {}) };
  const pathKey = topic || structured?.runtime?.registryTopic;
  if (pathKey && pathKey !== 'companion') {
    favoriteContinuityPaths[pathKey] = (favoriteContinuityPaths[pathKey] || 0) + 1;
  }

  const sessionTimestamps = [...(current.sessionTimestamps || []), new Date().toISOString()].slice(-60);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyEstimate = sessionTimestamps.filter((ts) => new Date(ts).getTime() >= weekAgo).length;

  let studyPacing = current.studyPacing || 'steady';
  if (weeklyEstimate >= 5) studyPacing = 'frequent';
  else if (weeklyEstimate <= 1) studyPacing = 'occasional';

  const prayerTopics = [...(current.prayerTopics || [])];
  if (runtimeContext?.intent === 'prayer' || /\b(pray|prayer)\b/i.test(message)) {
    const prayerTopic = detectPrayerTopic(message);
    if (!prayerTopics.includes(prayerTopic)) prayerTopics.push(prayerTopic);
  }

  store[userId] = {
    ...current,
    favoriteTopics,
    favoriteBooks,
    favoriteContinuityPaths,
    studyDepth: inferStudyDepth(structured, runtimeContext),
    studyPacing,
    studyFrequency: {
      sessions: sessionTimestamps.length,
      weeklyEstimate,
    },
    prayerTopics: prayerTopics.slice(-12),
    preferences: {
      ...(current.preferences || {}),
      tone: structured?.mode === 'study' ? 'study-oriented' : current.preferences?.tone || 'warm',
    },
    sessionTimestamps,
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
  return store[userId];
}

function getCompanionLearningProfile(userId) {
  const store = readStore();
  return store[userId] || null;
}

function buildLearningContext(userId) {
  const profile = getCompanionLearningProfile(userId);
  if (!profile) {
    return {
      enabled: false,
      favoriteTopics: [],
      studyDepth: 'light',
      studyPacing: 'steady',
      studyFrequency: { sessions: 0, weeklyEstimate: 0 },
      prayerTopics: [],
    };
  }

  const favoriteTopics = Object.entries(profile.favoriteTopics || {})
    .filter(([key]) => key !== 'companion')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);

  const favoriteBooks = Object.entries(profile.favoriteBooks || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key]) => key);

  return {
    enabled: true,
    favoriteTopics,
    favoriteBooks,
    favoriteContinuityPaths: Object.keys(profile.favoriteContinuityPaths || {}).slice(0, 5),
    studyDepth: profile.studyDepth,
    studyPacing: profile.studyPacing,
    studyFrequency: profile.studyFrequency,
    prayerTopics: profile.prayerTopics || [],
    preferences: profile.preferences || {},
  };
}

module.exports = {
  recordCompanionLearning,
  getCompanionLearningProfile,
  buildLearningContext,
};
