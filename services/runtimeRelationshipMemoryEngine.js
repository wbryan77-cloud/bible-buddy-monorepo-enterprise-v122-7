const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RELATIONSHIP_FILE = path.join(DATA_DIR, 'runtime-relationship-memory.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(RELATIONSHIP_FILE)) return {};
    return JSON.parse(fs.readFileSync(RELATIONSHIP_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(RELATIONSHIP_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Relationship memory write failed:', error.message);
  }
}

function saveRelationshipMemory({
  userId,
  category,
  detail,
  importance = 'normal',
}) {
  const store = readStore();
  const memories = store[userId] || [];

  memories.push({
    category,
    detail,
    importance,
    createdAt: new Date().toISOString(),
  });

  store[userId] = memories.slice(-500);
  writeStore(store);
}

function getRelationshipMemory(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildRelationshipContext(userId) {
  const memories = getRelationshipMemory(userId, 50);

  const grouped = memories.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item.detail);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    relationshipContinuityEnabled: true,
    groupedMemory: grouped,
    importantThemes: memories
      .filter((item) => item.importance === 'high')
      .map((item) => item.detail),
    continuityEnabled: true,
  };
}

module.exports = {
  saveRelationshipMemory,
  getRelationshipMemory,
  buildRelationshipContext,
};
