const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MONTH_FILE = path.join(DATA_DIR, 'runtime-scriptural-months.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const SCRIPTURAL_MONTHS = {
  first_month_abib: {
    scriptures: [
      'Exodus 12:1-2',
      'Exodus 13:4',
      'Deuteronomy 16:1'
    ],
    themes: ['Passover', 'Unleavened Bread', 'Beginning of Months']
  },
  third_month_sivan: {
    scriptures: [
      'Exodus 19:1',
      'Leviticus 23:15-21'
    ],
    themes: ['Pentecost', 'Covenant']
  },
  seventh_month_ethanim: {
    scriptures: [
      'Leviticus 23:23-44',
      '1 Kings 8:2'
    ],
    themes: ['Trumpets', 'Atonement', 'Tabernacles']
  },
  ninth_month_chisleu: {
    scriptures: [
      'Zechariah 7:1',
      'Nehemiah 1:1'
    ],
    themes: ['Winter Season']
  }
};

function readStore() {
  try {
    if (!fs.existsSync(MONTH_FILE)) return {};
    return JSON.parse(fs.readFileSync(MONTH_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(MONTH_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Scriptural month continuity write failed:', error.message);
  }
}

function saveScripturalMonthStudy({
  userId,
  month,
  topic,
  notes = '',
  observanceNotes = ''
}) {
  const store = readStore();
  const entries = store[userId] || [];

  entries.push({
    month,
    topic,
    notes,
    observanceNotes,
    scriptures: SCRIPTURAL_MONTHS[month]?.scriptures || [],
    themes: SCRIPTURAL_MONTHS[month]?.themes || [],
    createdAt: new Date().toISOString(),
  });

  store[userId] = entries.slice(-600);
  writeStore(store);
}

function getScripturalMonthContinuity(userId, limit = 40) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function buildScripturalMonthContext(userId) {
  const continuity = getScripturalMonthContinuity(userId, 100);

  const grouped = continuity.reduce((acc, item) => {
    if (!acc[item.month]) {
      acc[item.month] = [];
    }

    acc[item.month].push(item);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    scripturalMonthContinuityEnabled: true,
    groupedContinuity: grouped,
    activeMonths: Object.keys(grouped),
    totalStudies: continuity.length,
    continuityEnabled: true,
    guidance: {
      preserveBiblicalMonthStructure: true,
      maintainScriptureOnlyMonthNaming: true,
      preserveGenesisToRevelationContinuity: true,
      avoidModernCalendarReplacement: true,
      maintainAppointedTimesAlignment: true,
    },
  };
}

module.exports = {
  saveScripturalMonthStudy,
  getScripturalMonthContinuity,
  buildScripturalMonthContext,
};
