const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ARC_FILE = path.join(DATA_DIR, 'emotional-arc-memory.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(ARC_FILE)) return {};
    return JSON.parse(fs.readFileSync(ARC_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(ARC_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Emotional arc write failed:', error.message);
  }
}

function detectEmotionalSignal(message = '', runtimeContext = {}) {
  const lower = String(message).toLowerCase();
  if (/griev(ing|ed|e)?|lost|mourning|passed away|funeral/.test(lower)) {
    return { arc: 'grief', intensity: 'high' };
  }
  if (/hope|encouraged|grateful|thankful|peace/.test(lower)) return { arc: 'hope', intensity: 'medium' };
  if (/stress|overwhelmed|anxious|worried/.test(lower)) return { arc: 'stress', intensity: 'medium' };
  if (/tired|fatigue|weary|exhausted|worn down/.test(lower)) return { arc: 'fatigue', intensity: 'medium' };
  if (runtimeContext?.emotion?.primary === 'grief') return { arc: 'grief', intensity: 'medium' };
  return null;
}

function recordEmotionalSnapshot({ userId, message, runtimeContext = {} }) {
  const signal = detectEmotionalSignal(message, runtimeContext);
  if (!signal) return null;

  const store = readStore();
  const snapshots = store[userId] || [];
  snapshots.push({
    arc: signal.arc,
    intensity: signal.intensity,
    excerpt: String(message).slice(0, 120),
    createdAt: new Date().toISOString(),
  });

  store[userId] = snapshots.slice(-40);
  writeStore(store);
  return signal;
}

function analyzeEmotionalArc(userId) {
  const snapshots = readStore()[userId] || [];
  if (snapshots.length < 2) return { patterns: [], summary: null };

  const recent = snapshots.slice(-6);
  const counts = recent.reduce((acc, s) => {
    acc[s.arc] = (acc[s.arc] || 0) + 1;
    return acc;
  }, {});

  const patterns = [];
  if ((counts.grief || 0) >= 2) patterns.push('grief recurring');
  if ((counts.fatigue || 0) >= 2) patterns.push('fatigue recurring');
  if ((counts.stress || 0) >= 2) patterns.push('stress recurring');
  if ((counts.grief || 0) >= 1 && (counts.fatigue || 0) >= 1) {
    patterns.push('grief with weariness');
  }
  if ((counts.hope || 0) >= 1 && (counts.grief || 0) >= 1) patterns.push('grief with moments of hope');
  if ((counts.hope || 0) >= 2 && !(counts.grief >= 2)) patterns.push('encouragement improving');

  const latest = recent[recent.length - 1]?.arc;
  const earlier = recent[0]?.arc;
  if (latest === 'hope' && earlier === 'grief') patterns.push('grief may be easing somewhat');

  let summary = null;
  if (patterns.includes('grief recurring') && patterns.includes('fatigue recurring')) {
    summary = 'grief and weariness have both come up recently';
  } else if (patterns.includes('grief with weariness')) {
    summary = 'grief and weariness have both come up recently';
  } else if (patterns.includes('grief recurring')) {
    summary = 'grief has come up more than once recently';
  } else if (patterns.includes('fatigue recurring')) {
    summary = 'fatigue has been recurring';
  } else if (patterns.includes('encouragement improving')) {
    summary = 'there have been signs of hope alongside what you carry';
  }

  return { patterns, summary };
}

module.exports = {
  recordEmotionalSnapshot,
  analyzeEmotionalArc,
  detectEmotionalSignal,
};
