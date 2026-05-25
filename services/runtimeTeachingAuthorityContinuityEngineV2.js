const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TEACHING_FILE = path.join(DATA_DIR, 'runtime-teaching-authority-v2.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const TEACHING_SCRIPTURES = {
  teachers: [
    'Malachi 2:7',
    'Ephesians 4:11-12',
    '2 Timothy 2:2',
    'Titus 1:7-9'
  ],
  shepherds: [
    'Acts 20:28',
    '1 Peter 5:2-3',
    'Hebrews 13:17'
  ],
  prophecy: [
    'Acts 2:17-18',
    '1 Corinthians 14:1',
    'Revelation 19:10'
  ],
  prophetesses: [
    'Judges 4:4',
    '2 Kings 22:14',
    'Luke 2:36'
  ],
  assembly_order: [
    '1 Corinthians 14:33-40',
    '1 Timothy 2:11-12',
    'Titus 2:1-5'
  ],
  doctrine: [
    '2 Timothy 3:16-17',
    'Isaiah 28:9-10',
    'Matthew 4:4'
  ]
};

function readStore() {
  try {
    if (!fs.existsSync(TEACHING_FILE)) return {};
    return JSON.parse(fs.readFileSync(TEACHING_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(TEACHING_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Teaching authority continuity write failed:', error.message);
  }
}

function saveTeachingAuthorityStudy({ userId, category, topic, notes = '' }) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    topic,
    notes,
    scriptures: TEACHING_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-500);
  writeStore(store);
}

function buildTeachingAuthorityContinuity(userId) {
  const store = readStore();
  const continuity = store[userId] || [];

  return {
    scriptureFirst: true,
    teachingAuthorityContinuityEnabled: true,
    continuity,
    categories: [...new Set(continuity.map((item) => item.category))],
    totalStudies: continuity.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveTeachingAuthorityStudy,
  buildTeachingAuthorityContinuity,
};
