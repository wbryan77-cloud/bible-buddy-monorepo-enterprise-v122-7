const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOOPS_FILE = path.join(DATA_DIR, 'open-loops-memory.json');

const LOOP_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
  STALE: 'stale',
});

const STALE_DAYS = 21;
const REVISIT_COOLDOWN_DAYS = 3;

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(LOOPS_FILE)) return {};
    return JSON.parse(fs.readFileSync(LOOPS_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(LOOPS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Open loops write failed:', error.message);
  }
}

function detectOpenLoop(message = '') {
  const lower = String(message).toLowerCase();
  const patterns = [
    { key: 'job_opportunity', pattern: /job opportunity|new job|interview|hiring/i, label: 'job opportunity' },
    { key: 'family_situation', pattern: /family situation|my family|marriage|parent/i, label: 'family situation' },
    { key: 'health_goal', pattern: /health goal|get healthier|feel better/i, label: 'health goal' },
    { key: 'blood_pressure', pattern: /blood pressure/i, label: 'blood pressure goal' },
    { key: 'cholesterol', pattern: /cholesterol/i, label: 'cholesterol goal' },
    { key: 'weight_goal', pattern: /weight|lose weight|gain weight/i, label: 'weight goal' },
    { key: 'prayer_request', pattern: /\b(pray|prayer)\b/i, label: 'prayer request' },
    { key: 'mothers_health', pattern: /my mother|my mom|mother'?s health/i, label: "mother's health" },
    { key: 'sons_education', pattern: /my son|son'?s education|school for my son/i, label: "son's education" },
    { key: 'house_rebuild', pattern: /house rebuild|rebuild.*house|home repair/i, label: 'house rebuild' },
    { key: 'bible_study', pattern: /study (the )?sabbath|study (the )?bible|bible study/i, label: 'Bible study' },
    { key: 'grief', pattern: /lost (a |my )?(friend|mother|father|child|spouse)/i, label: 'grief' },
    { key: 'knee_pain', pattern: /knee(s)?.*(hurt|pain|aching)/i, label: 'knee pain' },
  ];

  for (const entry of patterns) {
    if (entry.pattern.test(lower)) {
      return { key: entry.key, label: entry.label, detail: String(message).slice(0, 220) };
    }
  }
  return null;
}

function upsertOpenLoop({ userId, loopKey, label, detail, importance = 'medium' }) {
  const store = readStore();
  const loops = store[userId] || [];
  const existing = loops.find((l) => l.loopKey === loopKey && l.status === LOOP_STATUS.OPEN);

  if (existing) {
    existing.detail = detail || existing.detail;
    existing.updatedAt = new Date().toISOString();
    existing.revisitCount = (existing.revisitCount || 0) + 1;
    existing.importance = importance;
  } else {
    loops.push({
      loopKey,
      label,
      detail,
      importance,
      status: LOOP_STATUS.OPEN,
      revisitCount: 0,
      lastRevisitedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const now = Date.now();
  for (const loop of loops) {
    if (loop.status !== LOOP_STATUS.OPEN) continue;
    const ageDays = (now - new Date(loop.updatedAt || loop.createdAt).getTime()) / (86400000);
    if (ageDays > STALE_DAYS) loop.status = LOOP_STATUS.STALE;
  }

  store[userId] = loops.slice(-80);
  writeStore(store);
}

function resolveOpenLoop({ userId, loopKey }) {
  const store = readStore();
  const loops = store[userId] || [];
  store[userId] = loops.map((loop) => {
    if (loop.loopKey === loopKey) {
      return { ...loop, status: LOOP_STATUS.RESOLVED, resolvedAt: new Date().toISOString() };
    }
    return loop;
  });
  writeStore(store);
}

function getOpenLoops(userId, includeStale = false) {
  const loops = readStore()[userId] || [];
  return loops.filter((loop) => {
    if (loop.status === LOOP_STATUS.RESOLVED) return false;
    if (loop.status === LOOP_STATUS.STALE && !includeStale) return false;
    return true;
  });
}

function pickGentleLoopRevisit(userId) {
  const loops = getOpenLoops(userId).filter((l) => l.status === LOOP_STATUS.OPEN);
  if (!loops.length) return null;

  const now = Date.now();
  const eligible = loops.filter((loop) => {
    if ((loop.revisitCount || 0) >= 3) return false;
    if (!loop.lastRevisitedAt) return true;
    const daysSince = (now - new Date(loop.lastRevisitedAt).getTime()) / 86400000;
    return daysSince >= REVISIT_COOLDOWN_DAYS;
  });

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const rank = { high: 0, medium: 1, normal: 2, low: 3 };
    return (rank[a.importance] || 2) - (rank[b.importance] || 2);
  });

  const chosen = eligible[0];
  chosen.lastRevisitedAt = new Date().toISOString();
  chosen.revisitCount = (chosen.revisitCount || 0) + 1;

  const store = readStore();
  store[userId] = (store[userId] || []).map((l) => (l.loopKey === chosen.loopKey ? chosen : l));
  writeStore(store);

  return {
    label: chosen.label,
    phrase: `When you're ready, we can gently check in on ${chosen.label} — only if you want to.`,
    loopKey: chosen.loopKey,
  };
}

module.exports = {
  LOOP_STATUS,
  detectOpenLoop,
  upsertOpenLoop,
  resolveOpenLoop,
  getOpenLoops,
  pickGentleLoopRevisit,
};
