const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JOURNEY_FILE = path.join(DATA_DIR, 'daily-bible-journey.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const READING_PLAN = [
  { day: 1, ot: 'Genesis 1-2', nt: 'Matthew 1', psalm: 'Psalm 1', proverb: 'Proverbs 1:1-7' },
  { day: 2, ot: 'Genesis 3-5', nt: 'Matthew 2', psalm: 'Psalm 2', proverb: 'Proverbs 1:8-19' },
  { day: 3, ot: 'Genesis 6-8', nt: 'Matthew 3', psalm: 'Psalm 3', proverb: 'Proverbs 1:20-33' },
  { day: 4, ot: 'Genesis 9-11', nt: 'Matthew 4', psalm: 'Psalm 4', proverb: 'Proverbs 2:1-5' },
  { day: 5, ot: 'Genesis 12-14', nt: 'Matthew 5:1-26', psalm: 'Psalm 5', proverb: 'Proverbs 2:6-15' },
  { day: 6, ot: 'Genesis 15-17', nt: 'Matthew 5:27-48', psalm: 'Psalm 6', proverb: 'Proverbs 2:16-22' },
  { day: 7, ot: 'Genesis 18-19', nt: 'Matthew 6', psalm: 'Psalm 7', proverb: 'Proverbs 3:1-6' }
];

function readStore() {
  try {
    if (!fs.existsSync(JOURNEY_FILE)) return {};
    return JSON.parse(fs.readFileSync(JOURNEY_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(JOURNEY_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Daily Bible Journey write failed:', error.message);
  }
}

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function getPlanDay(dayNumber) {
  const normalized = ((dayNumber - 1) % READING_PLAN.length) + 1;
  return READING_PLAN.find((item) => item.day === normalized) || READING_PLAN[0];
}

function getJourneyContext(userId, date = new Date()) {
  const store = readStore();
  const user = store[userId] || { completed: [], listened: [], mode: 'standard', startedAt: new Date().toISOString() };
  const day = dayOfYear(date);
  const today = getPlanDay(day);
  const completed = Array.isArray(user.completed) ? user.completed : [];
  const listened = Array.isArray(user.listened) ? user.listened : [];

  return {
    enabled: true,
    name: 'Daily Bible Journey',
    mode: user.mode || 'standard',
    day,
    today,
    completedDays: completed.length,
    listenedDays: listened.length,
    completedToday: completed.includes(day),
    listenedToday: listened.includes(day),
    missedDays: Math.max(0, day - completed.length - 1),
  };
}

function markJourneyProgress({ userId, day, type = 'read' }) {
  const store = readStore();
  const user = store[userId] || { completed: [], listened: [], mode: 'standard', startedAt: new Date().toISOString() };
  const key = type === 'listen' ? 'listened' : 'completed';
  const current = Array.isArray(user[key]) ? user[key] : [];
  if (!current.includes(day)) current.push(day);
  store[userId] = { ...user, [key]: current, updatedAt: new Date().toISOString() };
  writeStore(store);
  return getJourneyContext(userId);
}

function buildJourneyResponse(context) {
  const r = context.today;
  return {
    reply: [
      'Daily Bible Journey',
      `Day ${context.day}`,
      `Old Testament: ${r.ot}`,
      `New Testament: ${r.nt}`,
      `Psalm: ${r.psalm}`,
      `Proverb: ${r.proverb}`,
      `Progress: ${context.completedDays} day(s) completed.`,
      context.missedDays ? `Catch-up note: ${context.missedDays} day(s) may need review. Keep going without pressure.` : 'You are current for this journey.'
    ].join('\n'),
    scripture: [r.ot, r.nt, r.psalm, r.proverb].map((reference) => ({ reference, text: '', reason: 'Daily Bible Journey reading' })),
    mode: 'study',
    confidence: 'high',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: ['Read today’s four sections.', 'Mark the day complete when finished.'],
    admin_flags: [],
  };
}

module.exports = {
  getJourneyContext,
  markJourneyProgress,
  buildJourneyResponse,
};
