const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCANNER_FILE = path.join(DATA_DIR, 'runtime-temple-stewardship-scanner.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const FLAGGED_INGREDIENTS = {
  artificial_colors: ['Red 40', 'Yellow 5', 'Blue 1'],
  preservatives: ['BHA', 'BHT', 'Sodium Nitrite'],
  sweeteners: ['Aspartame', 'Sucralose', 'High Fructose Corn Syrup'],
  seed_oils: ['Canola Oil', 'Soybean Oil', 'Cottonseed Oil'],
};

const STEWARDSHIP_SCRIPTURES = [
  '1 Corinthians 6:19-20',
  'Romans 12:1-2',
  'Genesis 1:29',
  'Daniel 1:8',
  '3 John 1:2'
];

function readStore() {
  try {
    if (!fs.existsSync(SCANNER_FILE)) return {};
    return JSON.parse(fs.readFileSync(SCANNER_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(SCANNER_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Temple stewardship scanner write failed:', error.message);
  }
}

function detectFlaggedIngredients(ingredients = []) {
  const flagged = [];

  ingredients.forEach((ingredient) => {
    Object.entries(FLAGGED_INGREDIENTS).forEach(([category, values]) => {
      values.forEach((value) => {
        if (
          String(ingredient).toLowerCase().includes(value.toLowerCase())
        ) {
          flagged.push({
            category,
            ingredient,
            matched: value,
          });
        }
      });
    });
  });

  return flagged;
}

function saveTempleScan({
  userId,
  productName,
  ingredients = [],
  notes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  const flagged = detectFlaggedIngredients(ingredients);

  entries.push({
    productName,
    ingredients,
    flagged,
    notes,
    scriptures: STEWARDSHIP_SCRIPTURES,
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-500);
  writeStore(store);

  return flagged;
}

function getTempleScans(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildTempleStewardshipContext(userId) {
  const continuity = getTempleScans(userId, 100);

  const flaggedCount = continuity.reduce(
    (sum, item) => sum + ((item.flagged || []).length),
    0
  );

  return {
    scriptureFirst: true,
    templeStewardshipEnabled: true,
    totalScans: continuity.length,
    totalFlaggedIngredients: flaggedCount,
    continuity,
    scriptures: STEWARDSHIP_SCRIPTURES,
    guidance: {
      stewardshipCentered: true,
      avoidMedicalClaims: true,
      maintainGentleTone: true,
      preserveScriptureFirstApproach: true,
    },
  };
}

module.exports = {
  saveTempleScan,
  getTempleScans,
  buildTempleStewardshipContext,
  detectFlaggedIngredients,
};
