const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ACCOUNTABILITY_FILE = path.join(DATA_DIR, 'runtime-community-accountability.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const ACCOUNTABILITY_SCRIPTURES = {
  encouragement: ['Hebrews 10:24-25', 'Ecclesiastes 4:9-10'],
  correction: ['Galatians 6:1', 'Proverbs 27:5-6'],
  prayer: ['James 5:16', 'Matthew 18:20'],
  fellowship: ['Acts 2:42', 'Romans 12:10'],
  service: ['Mark 10:45', 'Galatians 5:13'],
};

function readStore() {
  try {
    if (!fs.existsSync(ACCOUNTABILITY_FILE)) return {};
    return JSON.parse(fs.readFileSync(ACCOUNTABILITY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(ACCOUNTABILITY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Community accountability write failed:', error.message);
  }
}

function saveAccountabilityInteraction({
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
    scriptures: ACCOUNTABILITY_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-400);
  writeStore(store);
}

function getAccountabilityContinuity(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildAccountabilityContext(userId) {
  const continuity = getAccountabilityContinuity(userId, 50);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    accountabilityContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalInteractions: continuity.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveAccountabilityInteraction,
  getAccountabilityContinuity,
  buildAccountabilityContext,
};
