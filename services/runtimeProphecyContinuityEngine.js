const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROPHECY_FILE = path.join(DATA_DIR, 'runtime-prophecy-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const PROPHECY_SCRIPTURES = {
  kingdoms: [
    'Daniel 2:31-45',
    'Daniel 7:1-28',
    'Revelation 17:1-18'
  ],
  return_of_christ: [
    'Matthew 24:29-31',
    'Acts 1:9-11',
    'Revelation 19:11-16'
  ],
  tribulation: [
    'Matthew 24',
    'Daniel 12:1',
    'Revelation 13'
  ],
  resurrection: [
    '1 Corinthians 15:51-54',
    '1 Thessalonians 4:16-17',
    'John 5:28-29'
  ],
  kingdom_of_god: [
    'Isaiah 9:6-7',
    'Daniel 2:44',
    'Revelation 11:15'
  ],
  israel_prophecy: [
    'Ezekiel 37',
    'Jeremiah 31:31-34',
    'Romans 11:25-27'
  ]
};

function readStore() {
  try {
    if (!fs.existsSync(PROPHECY_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROPHECY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(PROPHECY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Prophecy continuity write failed:', error.message);
  }
}

function saveProphecyStudy({
  userId,
  category,
  topic,
  notes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    topic,
    notes,
    scriptures: PROPHECY_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-600);
  writeStore(store);
}

function getProphecyContinuity(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildProphecyContinuityContext(userId) {
  const continuity = getProphecyContinuity(userId, 100);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    prophecyContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveGenesisToRevelationFlow: true,
      maintainLineUponLineContinuity: true,
      preserveScriptureFirstApproach: true,
      avoidSpeculativeDateSetting: true,
    },
  };
}

module.exports = {
  saveProphecyStudy,
  getProphecyContinuity,
  buildProphecyContinuityContext,
};
