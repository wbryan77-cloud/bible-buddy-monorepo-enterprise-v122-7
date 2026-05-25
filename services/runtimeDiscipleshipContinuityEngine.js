const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DISCIPLESHIP_FILE = path.join(DATA_DIR, 'runtime-discipleship-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DISCIPLESHIP_PATHS = {
  beginner: ['Hebrews 6:1-2', 'Matthew 4:4', 'Psalm 119:105'],
  prayer: ['Luke 11:1', 'Philippians 4:6-7', 'James 5:16'],
  obedience: ['John 14:15', 'Ecclesiastes 12:13'],
  endurance: ['Matthew 24:13', 'James 1:12'],
  leadership: ['1 Timothy 3:1-7', 'Titus 1:5-9'],
  stewardship: ['1 Corinthians 6:19-20', 'Colossians 3:23'],
};

function readStore() {
  try {
    if (!fs.existsSync(DISCIPLESHIP_FILE)) return {};
    return JSON.parse(fs.readFileSync(DISCIPLESHIP_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(DISCIPLESHIP_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Discipleship continuity write failed:', error.message);
  }
}

function saveDiscipleshipProgress({
  userId,
  pathway,
  milestone,
  notes = '',
}) {
  const store = readStore();
  const progress = store[userId] || [];

  progress.push({
    pathway,
    milestone,
    notes,
    scriptures: DISCIPLESHIP_PATHS[pathway] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = progress.slice(-500);
  writeStore(store);
}

function getDiscipleshipProgress(userId, limit = 30) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildDiscipleshipContext(userId) {
  const progress = getDiscipleshipProgress(userId, 50);

  const grouped = progress.reduce((acc, item) => {
    if (!acc[item.pathway]) {
      acc[item.pathway] = [];
    }

    acc[item.pathway].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    discipleshipContinuityEnabled: true,
    groupedProgress: grouped,
    pathways: Object.keys(grouped),
    totalMilestones: progress.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveDiscipleshipProgress,
  getDiscipleshipProgress,
  buildDiscipleshipContext,
};
