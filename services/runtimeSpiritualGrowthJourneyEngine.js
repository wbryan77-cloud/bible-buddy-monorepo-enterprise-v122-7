const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GROWTH_FILE = path.join(DATA_DIR, 'runtime-spiritual-growth-journey.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const GROWTH_CATEGORIES = {
  prayer: ['Luke 11:1', '1 Thessalonians 5:17'],
  faith: ['Hebrews 11:1', 'Romans 10:17'],
  obedience: ['John 14:15', 'Ecclesiastes 12:13'],
  wisdom: ['Proverbs 4:7', 'James 1:5'],
  endurance: ['James 1:12', 'Romans 5:3-4'],
  stewardship: ['1 Corinthians 6:19-20', 'Genesis 1:29'],
};

function readStore() {
  try {
    if (!fs.existsSync(GROWTH_FILE)) return {};
    return JSON.parse(fs.readFileSync(GROWTH_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(GROWTH_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Spiritual growth journey write failed:', error.message);
  }
}

function saveGrowthMilestone({
  userId,
  category,
  title,
  notes = '',
}) {
  const store = readStore();
  const milestones = store[userId] || [];

  milestones.push({
    category,
    title,
    notes,
    scriptures: GROWTH_CATEGORIES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = milestones.slice(-500);
  writeStore(store);
}

function getGrowthJourney(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildGrowthJourneyContext(userId) {
  const journey = getGrowthJourney(userId, 50);

  const grouped = journey.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    growthJourneyEnabled: true,
    groupedJourney: grouped,
    totalMilestones: journey.length,
    continuityEnabled: true,
  };
}

module.exports = {
  saveGrowthMilestone,
  getGrowthJourney,
  buildGrowthJourneyContext,
};
