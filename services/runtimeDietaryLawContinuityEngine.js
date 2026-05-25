const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DIETARY_FILE = path.join(DATA_DIR, 'runtime-dietary-law-continuity.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DIETARY_SCRIPTURES = {
  clean_unclean: [
    'Leviticus 11',
    'Deuteronomy 14',
    'Isaiah 66:15-17'
  ],
  stewardship: [
    '1 Corinthians 6:19-20',
    'Romans 12:1-2',
    'Genesis 1:29'
  ],
  obedience: [
    'Ecclesiastes 12:13',
    'John 14:15',
    'Matthew 5:17-19'
  ],
  holiness: [
    'Leviticus 20:24-26',
    '1 Peter 1:15-16',
    '2 Corinthians 6:17'
  ],
  wisdom: [
    'Proverbs 4:7',
    'Daniel 1:8',
    'Hosea 4:6'
  ],
};

function readStore() {
  try {
    if (!fs.existsSync(DIETARY_FILE)) return {};
    return JSON.parse(fs.readFileSync(DIETARY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(DIETARY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Dietary law continuity write failed:', error.message);
  }
}

function saveDietaryStudy({
  userId,
  category,
  topic,
  notes = '',
  foods = [],
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    category,
    topic,
    notes,
    foods,
    scriptures: DIETARY_SCRIPTURES[category] || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-500);
  writeStore(store);
}

function getDietaryContinuity(userId, limit = 30) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildDietaryLawContext(userId) {
  const continuity = getDietaryContinuity(userId, 75);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }

    acc[item.category].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    dietaryLawContinuityEnabled: true,
    groupedContinuity: grouped,
    activeCategories: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      maintainScriptureFirstApproach: true,
      preserveLineUponLineStudy: true,
      avoidMedicalClaims: true,
      stewardshipCentered: true,
    },
  };
}

module.exports = {
  saveDietaryStudy,
  getDietaryContinuity,
  buildDietaryLawContext,
};
