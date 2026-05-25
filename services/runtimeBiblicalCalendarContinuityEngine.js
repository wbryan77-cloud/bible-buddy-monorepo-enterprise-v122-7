const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CALENDAR_FILE = path.join(DATA_DIR, 'runtime-biblical-calendar.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const CALENDAR_SCRIPTURES = {
  new_moons: [
    'Numbers 10:10',
    'Psalm 81:3',
    'Isaiah 66:23'
  ],
  appointed_times: [
    'Genesis 1:14',
    'Leviticus 23:1-4',
    'Ecclesiastes 3:1'
  ],
  sabbath_cycle: [
    'Exodus 20:8-11',
    'Leviticus 23:3',
    'Hebrews 4:9'
  ],
  feast_cycle: [
    'Leviticus 23',
    'Deuteronomy 16:1-17',
    'Zechariah 14:16'
  ],
  seasonal_harvests: [
    'Exodus 34:22',
    'Leviticus 23:10-17',
    'James 5:7'
  ]
};

function readStore() {
  try {
    if (!fs.existsSync(CALENDAR_FILE)) return {};
    return JSON.parse(fs.readFileSync(CALENDAR_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Biblical calendar continuity write failed:', error.message);
  }
}

function saveCalendarStudy({
  userId,
  category,
  topic,
  notes = '',
  observance = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    topic,
    notes,
    observance,
    scriptures: CALENDAR_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-600);
  writeStore(store);
}

function getCalendarContinuity(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildBiblicalCalendarContext(userId) {
  const continuity = getCalendarContinuity(userId, 100);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    biblicalCalendarContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveGenesisToRevelationFlow: true,
      maintainLineUponLineContinuity: true,
      preserveScriptureFirstApproach: true,
      preserveAppointedTimesStructure: true,
    },
  };
}

module.exports = {
  saveCalendarStudy,
  getCalendarContinuity,
  buildBiblicalCalendarContext,
};
