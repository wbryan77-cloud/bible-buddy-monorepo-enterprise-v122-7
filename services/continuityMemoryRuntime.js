const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONTINUITY_FILE = path.join(DATA_DIR, 'continuity-memory.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(CONTINUITY_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONTINUITY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(CONTINUITY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Continuity memory write failed:', error.message);
  }
}

function detectContinuityTags(message = '') {
  const lower = String(message || '').toLowerCase();
  const tags = [];

  if (lower.includes('job') || lower.includes('resume') || lower.includes('fired')) tags.push('career');
  if (lower.includes('pray') || lower.includes('prayer')) tags.push('prayer');
  if (lower.includes('study') || lower.includes('scripture') || lower.includes('verse')) tags.push('study');
  if (lower.includes('sad') || lower.includes('hurt') || lower.includes('overwhelmed')) tags.push('emotional');
  if (lower.includes('health') || lower.includes('wellness')) tags.push('wellness');
  if (lower.includes('family') || lower.includes('marriage')) tags.push('family');

  return [...new Set(tags)];
}

function saveContinuityMemory({ userId, message, response }) {
  const store = readStore();
  const current = store[userId] || { threads: [] };
  const threads = Array.isArray(current.threads) ? current.threads : [];

  threads.push({
    tags: detectContinuityTags(message),
    message: String(message || '').slice(0, 600),
    reply: String(response?.reply || '').slice(0, 600),
    createdAt: new Date().toISOString(),
  });

  store[userId] = {
    ...current,
    threads: threads.slice(-100),
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
}

function getContinuityMemory(userId) {
  const store = readStore();
  const current = store[userId] || { threads: [] };
  const threads = Array.isArray(current.threads) ? current.threads : [];

  return {
    enabled: true,
    recentThreads: threads.slice(-12),
    unresolvedThemes: [...new Set(threads.flatMap((item) => item.tags || []))],
    totalThreads: threads.length,
  };
}

module.exports = {
  saveContinuityMemory,
  getContinuityMemory,
  detectContinuityTags,
};
