const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const THREAD_FILE = path.join(DATA_DIR, 'runtime-unresolved-threads.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(THREAD_FILE)) return {};
    return JSON.parse(fs.readFileSync(THREAD_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(THREAD_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Unresolved thread write failed:', error.message);
  }
}

function saveUnresolvedThread({ userId, topic, note = '', references = [] }) {
  const store = readStore();
  const threads = store[userId] || [];

  threads.push({
    topic,
    note,
    references,
    resolved: false,
    createdAt: new Date().toISOString(),
  });

  store[userId] = threads.slice(-250);
  writeStore(store);
}

function resolveThread({ userId, topic }) {
  const store = readStore();
  const threads = store[userId] || [];

  store[userId] = threads.map((thread) => {
    if (thread.topic === topic) {
      return {
        ...thread,
        resolved: true,
        resolvedAt: new Date().toISOString(),
      };
    }

    return thread;
  });

  writeStore(store);
}

function getUnresolvedThreads(userId) {
  const store = readStore();

  return (store[userId] || []).filter((thread) => !thread.resolved);
}

function buildThreadContinuityContext(userId) {
  const unresolved = getUnresolvedThreads(userId);

  return {
    scriptureFirst: true,
    unresolvedThreadCount: unresolved.length,
    unresolvedTopics: unresolved.map((item) => item.topic),
    unresolved,
    continuityEnabled: true,
  };
}

module.exports = {
  saveUnresolvedThread,
  resolveThread,
  getUnresolvedThreads,
  buildThreadContinuityContext,
};
