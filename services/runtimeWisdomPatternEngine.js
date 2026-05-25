const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WISDOM_FILE = path.join(DATA_DIR, 'runtime-wisdom-patterns.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const WISDOM_SCRIPTURES = {
  discernment: ['Proverbs 3:5-6', 'James 1:5'],
  patience: ['Ecclesiastes 7:8', 'Romans 8:25'],
  humility: ['Philippians 2:3', 'Proverbs 11:2'],
  leadership: ['Proverbs 29:2', '1 Timothy 3:1-7'],
  stewardship: ['Luke 16:10', 'Colossians 3:23'],
  relationships: ['Ephesians 4:2-3', 'Proverbs 15:1'],
};

function readStore() {
  try {
    if (!fs.existsSync(WISDOM_FILE)) return {};
    return JSON.parse(fs.readFileSync(WISDOM_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(WISDOM_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Wisdom pattern write failed:', error.message);
  }
}

function saveWisdomPattern({
  userId,
  category,
  lesson,
  application = '',
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    lesson,
    application,
    scriptures: WISDOM_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-400);
  writeStore(store);
}

function getWisdomPatterns(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildWisdomPatternContext(userId) {
  const patterns = getWisdomPatterns(userId, 50);

  const grouped = patterns.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    wisdomPatternContinuityEnabled: true,
    groupedPatterns: grouped,
    recurringWisdomThemes: Object.keys(grouped),
    totalWisdomPatterns: patterns.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveWisdomPattern,
  getWisdomPatterns,
  buildWisdomPatternContext,
};
