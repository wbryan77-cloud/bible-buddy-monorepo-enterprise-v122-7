const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'scripture-history-provenance.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return [];
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) || [];
  } catch (_) {
    return [];
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Provenance runtime write failed:', error.message);
  }
}

function separateSources({ scripture = [], history = [] }) {
  return {
    scripture: [...new Set(scripture)],
    history: [...new Set(history)],
  };
}

function saveRuntimeProvenance({ userId, topic, scripture = [], history = [], mode = 'study', continuityUsed = false }) {
  const store = readStore();

  store.push({
    userId,
    topic,
    sources: separateSources({ scripture, history }),
    mode,
    continuityUsed,
    createdAt: new Date().toISOString(),
  });

  writeStore(store.slice(-1000));
}

function getRuntimeProvenance(limit = 50) {
  const store = readStore();
  return store.slice(-limit);
}

module.exports = {
  saveRuntimeProvenance,
  getRuntimeProvenance,
  separateSources,
};
