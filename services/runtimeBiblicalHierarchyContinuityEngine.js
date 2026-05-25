const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HIERARCHY_FILE = path.join(DATA_DIR, 'runtime-biblical-hierarchy.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const HIERARCHY_SCRIPTURES = {
  god_christ_man_woman: [
    '1 Corinthians 11:3',
    'Ephesians 5:22-25',
    'Genesis 2:18-24'
  ],
  covering: [
    '1 Corinthians 11:4-15',
    'Numbers 5:18',
    'Genesis 24:64-65'
  ],
  leadership: [
    'Joshua 24:15',
    '1 Timothy 3:1-7',
    'Titus 1:5-9'
  ],
  obedience_order: [
    'Romans 13:1',
    'Hebrews 13:17',
    'Colossians 3:18-20'
  ],
  household: [
    'Deuteronomy 6:6-7',
    'Ephesians 6:1-4',
    'Psalm 128:1-4'
  ],
};

function readStore() {
  try {
    if (!fs.existsSync(HIERARCHY_FILE)) return {};
    return JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(HIERARCHY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Biblical hierarchy continuity write failed:', error.message);
  }
}

function saveHierarchyStudy({
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
    scriptures: HIERARCHY_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-500);
  writeStore(store);
}

function getHierarchyContinuity(userId, limit = 30) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildHierarchyContext(userId) {
  const continuity = getHierarchyContinuity(userId, 75);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    biblicalHierarchyContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveScriptureFirstApproach: true,
      maintainLineUponLineContinuity: true,
      preserveGenesisToRevelationFlow: true,
      avoidModernDoctrinalSynthesis: true,
    },
  };
}

module.exports = {
  saveHierarchyStudy,
  getHierarchyContinuity,
  buildHierarchyContext,
};
