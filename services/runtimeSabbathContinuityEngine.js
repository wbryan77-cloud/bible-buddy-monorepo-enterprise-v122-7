const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SABBATH_FILE = path.join(DATA_DIR, 'runtime-sabbath-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const SABBATH_SCRIPTURES = {
  creation: [
    'Genesis 2:1-3',
    'Exodus 20:8-11'
  ],
  covenant: [
    'Exodus 31:13-17',
    'Ezekiel 20:12'
  ],
  worship: [
    'Isaiah 58:13-14',
    'Luke 4:16'
  ],
  prophecy: [
    'Isaiah 66:22-23',
    'Hebrews 4:9'
  ],
  rest: [
    'Mark 2:27-28',
    'Matthew 11:28-30'
  ]
};

function readStore() {
  try {
    if (!fs.existsSync(SABBATH_FILE)) return {};
    return JSON.parse(fs.readFileSync(SABBATH_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(SABBATH_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Sabbath continuity write failed:', error.message);
  }
}

function saveSabbathStudy({
  userId,
  category,
  topic,
  notes = '',
  preparationNotes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    topic,
    notes,
    preparationNotes,
    scriptures: SABBATH_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-600);
  writeStore(store);
}

function getSabbathContinuity(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildSabbathContext(userId) {
  const continuity = getSabbathContinuity(userId, 100);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    sabbathContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveCreationToRevelationFlow: true,
      maintainLineUponLineContinuity: true,
      preserveScriptureFirstApproach: true,
      maintainRestAndWorshipFocus: true,
    },
  };
}

module.exports = {
  saveSabbathStudy,
  getSabbathContinuity,
  buildSabbathContext,
};
