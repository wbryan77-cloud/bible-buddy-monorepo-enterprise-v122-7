const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FAMILY_FILE = path.join(DATA_DIR, 'runtime-family-discipleship.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const FAMILY_SCRIPTURES = {
  marriage: ['Ephesians 5:22-33', 'Colossians 3:18-19'],
  parenting: ['Proverbs 22:6', 'Ephesians 6:4'],
  leadership: ['1 Corinthians 11:3', 'Joshua 24:15'],
  encouragement: ['1 Thessalonians 5:11', 'Romans 12:10'],
  unity: ['Psalm 133:1', 'Colossians 3:13-14'],
  stewardship: ['Deuteronomy 6:6-7', 'Proverbs 3:9'],
};

function readStore() {
  try {
    if (!fs.existsSync(FAMILY_FILE)) return {};
    return JSON.parse(fs.readFileSync(FAMILY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(FAMILY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Family discipleship write failed:', error.message);
  }
}

function saveFamilyDiscipleship({
  userId,
  category,
  topic,
  notes = '',
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    topic,
    notes,
    scriptures: FAMILY_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-400);
  writeStore(store);
}

function getFamilyDiscipleship(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildFamilyDiscipleshipContext(userId) {
  const continuity = getFamilyDiscipleship(userId, 50);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    familyDiscipleshipEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalEntries: continuity.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveFamilyDiscipleship,
  getFamilyDiscipleship,
  buildFamilyDiscipleshipContext,
};
