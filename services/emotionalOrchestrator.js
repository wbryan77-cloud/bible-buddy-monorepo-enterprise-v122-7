const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'emotional-memory.json');
const EVENTS_FILE = path.join(DATA_DIR, 'companion-events.jsonl');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DEFAULT_RHYTHM = {
  energy: 'balanced', // low | balanced | high
  scripturePacing: 'gentle', // light | gentle | direct | deep
  nudgeFrequency: 'low', // off | low | medium
  prayerStyle: 'short', // short | guided | quiet
  preferredLanguage: 'en',
  quietHours: { enabled: true, start: '21:30', end: '07:00' },
  ambientPresence: true,
  avatarSyncEnabled: false,
};

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) || fallback;
  } catch (_) {
    return fallback;
  }
}

function writeEvent(entry) {
  try {
    fs.appendFileSync(EVENTS_FILE, JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n');
  } catch (error) {
    console.warn('Unable to write companion event:', error.message);
  }
}

function classifyEmotionalEnergy({ message = '', safetyLevel = 'standard', amplitude = 0 }) {
  const text = String(message).toLowerCase();
  const heavy = ['tired', 'sad', 'overwhelmed', 'depressed', 'lonely', 'anxious', 'stressed', 'heavy'];
  const urgent = ['panic', 'can’t breathe', 'cannot breathe', 'hopeless', 'crisis'];

  if (safetyLevel === 'crisis' || urgent.some((word) => text.includes(word))) return 'very_low';
  if (heavy.some((word) => text.includes(word))) return 'low';
  if (amplitude > 0.18) return 'high';
  return 'balanced';
}

function chooseOrbState({ energy, mode = 'companion', isIdle = false }) {
  if (mode === 'prayer') return 'praying';
  if (isIdle) return energy === 'low' || energy === 'very_low' ? 'idle' : 'notification';
  if (energy === 'very_low') return 'listening';
  if (energy === 'low') return 'praying';
  if (energy === 'high') return 'speaking';
  return 'thinking';
}

function chooseScripturePacing({ rhythm, energy, requestedStudy = false }) {
  if (requestedStudy) return 'deep';
  if (energy === 'very_low' || energy === 'low') return 'light';
  return rhythm.scripturePacing || 'gentle';
}

function buildPrayerPlan({ energy, rhythm }) {
  if (energy === 'very_low' || energy === 'low') {
    return {
      style: 'quiet',
      opening: 'Let’s slow down. I can pray softly with you, or just stay with you for a quiet moment.',
      length: 'short',
      pauseMs: 1200,
    };
  }

  return {
    style: rhythm.prayerStyle || 'short',
    opening: 'Would you like a short prayer, a guided prayer, or quiet reflection?',
    length: rhythm.prayerStyle || 'short',
    pauseMs: 800,
  };
}

function buildAvatarSync({ energy, orbState, language }) {
  return {
    enabled: false,
    futureReady: true,
    expression: energy === 'low' || energy === 'very_low' ? 'soft_concern' : 'gentle_presence',
    mouthMotion: orbState === 'speaking' ? 'voice_synced' : 'resting',
    gaze: 'calm_direct',
    language,
  };
}

function getUserMemory(userId) {
  const store = readJson(MEMORY_FILE, {});
  return store[userId] || { rhythm: DEFAULT_RHYTHM, summary: '' };
}

function buildOrchestration(input = {}) {
  const userId = input.userId || 'anonymous';
  const memory = getUserMemory(userId);
  const rhythm = { ...DEFAULT_RHYTHM, ...(memory.rhythm || {}), ...(input.preferences || {}) };
  const language = input.language || rhythm.preferredLanguage || 'en';
  const mode = input.mode || 'companion';
  const energy = classifyEmotionalEnergy({
    message: input.message,
    safetyLevel: input.safetyLevel,
    amplitude: Number(input.amplitude || 0),
  });
  const isIdle = !!input.isIdle;
  const requestedStudy = /study|explain|scripture|verse|bible/i.test(String(input.message || ''));
  const orbState = chooseOrbState({ energy, mode, isIdle });
  const scripturePacing = chooseScripturePacing({ rhythm, energy, requestedStudy });
  const prayerPlan = buildPrayerPlan({ energy, rhythm });
  const avatarSync = buildAvatarSync({ energy, orbState, language });

  const proactiveNudge = (() => {
    if (rhythm.nudgeFrequency === 'off') return null;
    if (isIdle && energy === 'low') return 'Would you like a quiet check-in, or should I stay silent?';
    if (isIdle && mode === 'reading') return 'Want to continue your reading plan, or save it for later?';
    return null;
  })();

  const result = {
    userId,
    language,
    mode,
    energy,
    rhythm,
    memorySummary: memory.summary || '',
    orbState,
    scripturePacing,
    prayerPlan,
    proactiveNudge,
    avatarSync,
    timing: {
      responseDelayMs: energy === 'very_low' ? 1100 : energy === 'low' ? 800 : 350,
      pauseBetweenThoughtsMs: energy === 'high' ? 450 : 900,
      ambientIdlePulseMs: energy === 'low' ? 6200 : 4800,
    },
    safety: {
      nonManipulative: true,
      userControlled: true,
      quietHoursRespected: true,
      noDiagnosis: true,
    },
  };

  writeEvent({ type: 'orchestration', result: { userId, language, mode, energy, orbState, scripturePacing } });
  return result;
}

module.exports = {
  buildOrchestration,
  DEFAULT_RHYTHM,
};
