const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHURCH_FILE = path.join(DATA_DIR, 'runtime-church-study-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const CHURCH_STUDY_SCRIPTURES = {
  sabbath: ['Exodus 20:8-11', 'Isaiah 58:13-14', 'Hebrews 4:9'],
  passover: ['Exodus 12:14', 'Luke 22:15-20', '1 Corinthians 5:7-8'],
  holy_days: ['Leviticus 23', 'Zechariah 14:16'],
  law: ['Matthew 5:17-19', 'Romans 3:31', 'Ecclesiastes 12:13'],
  prophecy: ['Daniel 2:44', 'Matthew 24', 'Revelation 1:1'],
  kingdom: ['Isaiah 9:6-7', 'Matthew 6:10', 'Revelation 11:15'],
};

function readStore() {
  try {
    if (!fs.existsSync(CHURCH_FILE)) return {};
    return JSON.parse(fs.readFileSync(CHURCH_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(CHURCH_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Church study continuity write failed:', error.message);
  }
}

function saveChurchStudy({
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
    scriptures: CHURCH_STUDY_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-500);
  writeStore(store);
}

function getChurchStudyContinuity(userId, limit = 30) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildChurchStudyContext(userId) {
  const continuity = getChurchStudyContinuity(userId, 75);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    churchStudyContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveChurchStudy,
  getChurchStudyContinuity,
  buildChurchStudyContext,
};
