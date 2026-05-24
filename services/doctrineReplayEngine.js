const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPLAY_FILE = path.join(DATA_DIR, 'doctrine-replay-engine.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(REPLAY_FILE)) return [];
    return JSON.parse(fs.readFileSync(REPLAY_FILE, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(REPLAY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Doctrine replay engine write failed:', error.message);
  }
}

function saveDoctrineReplay({
  userId,
  topic,
  references = [],
  rendered = '',
  continuityScore = 0,
}) {
  const store = readStore();

  store.push({
    userId,
    topic,
    references,
    rendered,
    continuityScore,
    createdAt: new Date().toISOString(),
  });

  writeStore(store.slice(-1500));
}

function getDoctrineReplay(topic = '', limit = 25) {
  const store = readStore();

  return store
    .filter((item) => item.topic === topic)
    .slice(-limit);
}

function detectDoctrineDrift({ previous = [], current = [] }) {
  const removed = previous.filter((item) => !current.includes(item));
  const added = current.filter((item) => !previous.includes(item));

  return {
    driftDetected: removed.length > 0,
    removed,
    added,
  };
}

function buildReplayContinuity({ topic = '', references = [] }) {
  const replay = getDoctrineReplay(topic, 5);

  return {
    topic,
    references,
    priorReplayCount: replay.length,
    continuityReplayEnabled: true,
    scriptureFirst: true,
  };
}

module.exports = {
  saveDoctrineReplay,
  getDoctrineReplay,
  detectDoctrineDrift,
  buildReplayContinuity,
};
