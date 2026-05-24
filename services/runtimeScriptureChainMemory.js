const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'runtime-scripture-chain-memory.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return {};
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Scripture chain memory write failed:', error.message);
  }
}

function saveScriptureChain({ userId, topic, references = [], mode = 'study' }) {
  const store = readStore();
  const chains = store[userId] || [];

  chains.push({
    topic,
    references,
    mode,
    createdAt: new Date().toISOString(),
  });

  store[userId] = chains.slice(-500);
  writeStore(store);
}

function getRecentScriptureChains(userId, limit = 15) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildScriptureChainContext({ userId, topic = '' }) {
  const chains = getRecentScriptureChains(userId, 25);

  const related = chains.filter((item) =>
    String(item.topic || '').toLowerCase().includes(String(topic || '').toLowerCase())
  );

  const references = [...new Set(
    related.flatMap((item) => item.references || [])
  )];

  return {
    scriptureFirst: true,
    continuityEnabled: true,
    topic,
    relatedChainCount: related.length,
    priorReferences: references,
    relatedChains: related,
  };
}

module.exports = {
  saveScriptureChain,
  getRecentScriptureChains,
  buildScriptureChainContext,
};
