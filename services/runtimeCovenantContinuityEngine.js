const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const COVENANT_FILE = path.join(DATA_DIR, 'runtime-covenant-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const COVENANT_SCRIPTURES = {
  abrahamic: [
    'Genesis 12:1-3',
    'Genesis 17:1-14',
    'Galatians 3:16-29'
  ],
  mosaic: [
    'Exodus 19:5-6',
    'Exodus 24:7-8',
    'Deuteronomy 28:1-14'
  ],
  davidic: [
    '2 Samuel 7:12-16',
    'Psalm 89:3-4',
    'Luke 1:32-33'
  ],
  new_covenant: [
    'Jeremiah 31:31-34',
    'Hebrews 8:6-13',
    'Luke 22:20'
  ],
  everlasting_covenant: [
    'Isaiah 55:3',
    'Hebrews 13:20',
    'Ezekiel 37:26'
  ]
};

function readStore() {
  try {
    if (!fs.existsSync(COVENANT_FILE)) return {};
    return JSON.parse(fs.readFileSync(COVENANT_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(COVENANT_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Covenant continuity write failed:', error.message);
  }
}

function saveCovenantStudy({
  userId,
  covenant,
  topic,
  notes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    covenant,
    topic,
    notes,
    scriptures: COVENANT_SCRIPTURES[covenant] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-700);
  writeStore(store);
}

function getCovenantContinuity(userId, limit = 50) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildCovenantContext(userId) {
  const continuity = getCovenantContinuity(userId, 120);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.covenant]) {
      acc[item.covenant] = [];
    }

    acc[item.covenant].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    covenantContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCovenants: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveGenesisToRevelationFlow: true,
      maintainLineUponLineContinuity: true,
      preserveScriptureFirstApproach: true,
      preserveCovenantInterconnection: true,
    },
  };
}

module.exports = {
  saveCovenantStudy,
  getCovenantContinuity,
  buildCovenantContext,
};
