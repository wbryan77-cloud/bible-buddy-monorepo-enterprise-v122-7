const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FEAST_FILE = path.join(DATA_DIR, 'runtime-feast-day-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const FEAST_SCRIPTURES = {
  passover: [
    'Exodus 12:1-14',
    'Luke 22:15-20',
    '1 Corinthians 5:7-8'
  ],
  unleavened_bread: [
    'Exodus 12:15-20',
    '1 Corinthians 5:6-8'
  ],
  pentecost: [
    'Leviticus 23:15-21',
    'Acts 2:1-4'
  ],
  trumpets: [
    'Leviticus 23:23-25',
    '1 Thessalonians 4:16'
  ],
  atonement: [
    'Leviticus 23:26-32',
    'Hebrews 9:11-14'
  ],
  tabernacles: [
    'Leviticus 23:33-44',
    'Zechariah 14:16-19',
    'John 7:2-14'
  ],
  last_great_day: [
    'John 7:37-39',
    'Leviticus 23:36'
  ]
};

function readStore() {
  try {
    if (!fs.existsSync(FEAST_FILE)) return {};
    return JSON.parse(fs.readFileSync(FEAST_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(FEAST_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Feast day continuity write failed:', error.message);
  }
}

function saveFeastStudy({
  userId,
  feast,
  topic,
  notes = '',
  observanceNotes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    feast,
    topic,
    notes,
    observanceNotes,
    scriptures: FEAST_SCRIPTURES[feast] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-600);
  writeStore(store);
}

function getFeastContinuity(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildFeastDayContext(userId) {
  const continuity = getFeastContinuity(userId, 100);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.feast]) {
      acc[item.feast] = [];
    }

    acc[item.feast].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    feastDayContinuityEnabled: true,
    groupedContinuity: grouped,
    activeFeasts: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveLeviticus23Continuity: true,
      maintainGenesisToRevelationFlow: true,
      preserveScriptureFirstApproach: true,
      avoidCommercialHolidaySubstitution: true,
    },
  };
}

module.exports = {
  saveFeastStudy,
  getFeastContinuity,
  buildFeastDayContext,
};
