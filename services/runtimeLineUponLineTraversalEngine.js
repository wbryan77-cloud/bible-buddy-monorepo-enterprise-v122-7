const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TRAVERSAL_FILE = path.join(DATA_DIR, 'runtime-line-upon-line-traversal.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const { getScriptureChain } = require('./scriptureChainExpansion');

const SCRIPTURE_CONNECTIONS = {
  sabbath: getScriptureChain('sabbath'),
  dietaryLaw: getScriptureChain('dietaryLaw'),
  dietary_law: getScriptureChain('dietaryLaw'),
  feast_days: getScriptureChain('feastDays'),
  traditions: getScriptureChain('traditions'),
  resurrection_timeline: getScriptureChain('resurrection'),
  kingdom: [
    'Daniel 2:44',
    'Isaiah 9:6-7',
    'Matthew 6:10',
    'Revelation 11:15',
  ],
  law: [
    'Ecclesiastes 12:13',
    'Matthew 5:17-19',
    'Romans 3:31',
    '1 John 2:3-4',
  ],
};

function readStore() {
  try {
    if (!fs.existsSync(TRAVERSAL_FILE)) return {};
    return JSON.parse(fs.readFileSync(TRAVERSAL_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(TRAVERSAL_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Line upon line traversal write failed:', error.message);
  }
}

function buildLineUponLineTraversal(topic = '') {
  const normalized = String(topic || '').toLowerCase().replace(/_/g, '');

  const traversal = Object.entries(SCRIPTURE_CONNECTIONS)
    .filter(([key]) => {
      const keyNorm = key.replace(/_/g, '');
      return normalized.includes(keyNorm) || keyNorm.includes(normalized);
    })
    .flatMap(([, verses]) => verses);

  return [...new Set(traversal)];
}

function saveTraversalStudy({
  userId,
  topic,
  traversal = [],
  notes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    topic,
    traversal,
    notes,
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-600);
  writeStore(store);
}

function getTraversalContinuity(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildTraversalContext(userId, topic = '') {
  const continuity = getTraversalContinuity(userId, 100);

  return {
    scriptureFirst: true,
    lineUponLineTraversalEnabled: true,
    topic,
    traversal: buildLineUponLineTraversal(topic),
    continuity,
    guidance: {
      preserveIsaiah2810Structure: true,
      maintainGenesisToRevelationFlow: true,
      preserveScriptureInterconnection: true,
      avoidIsolatedProofTexting: true,
    },
  };
}

module.exports = {
  buildLineUponLineTraversal,
  saveTraversalStudy,
  getTraversalContinuity,
  buildTraversalContext,
};
