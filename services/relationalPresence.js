const fs = require('fs');
const path = require('path');
const { buildOrchestration } = require('./emotionalOrchestrator');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRESENCE_FILE = path.join(DATA_DIR, 'relational-presence.json');
const PLAN_EVENTS_FILE = path.join(DATA_DIR, 'life-assistance-events.jsonl');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DEFAULT_PROFILE = {
  memoryConsent: false,
  proactiveConsent: false,
  communityConsent: false,
  preferredLanguage: 'en',
  companionDepth: 'gentle', // light | gentle | close | deep
  scriptureIntegration: 'natural', // light | natural | direct | study
  relationshipMode: 'solo', // solo | family | church | accountability | caregiver
  lifeDomains: {
    faith: true,
    prayer: true,
    wellness: false,
    work: false,
    family: false,
    study: true,
    habits: false,
  },
  seasonalRhythms: {
    morning: 'quiet_greeting',
    midday: 'minimal_presence',
    evening: 'reflection',
    weekly: 'gentle_review',
  },
  boundaries: {
    quietHours: { enabled: true, start: '21:30', end: '07:00' },
    maxProactiveNudgesPerDay: 2,
    requireConfirmationForSettings: true,
    avoidShameLanguage: true,
  },
  longHorizonGoals: [],
  trustedSupport: [],
};

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) || fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function appendEvent(entry) {
  try {
    fs.appendFileSync(PLAN_EVENTS_FILE, JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n');
  } catch (error) {
    console.warn('Unable to write life assistance event:', error.message);
  }
}

function getProfile(userId = 'anonymous') {
  const store = readJson(PRESENCE_FILE, {});
  return {
    ...DEFAULT_PROFILE,
    ...(store[userId] || {}),
    lifeDomains: { ...DEFAULT_PROFILE.lifeDomains, ...(store[userId]?.lifeDomains || {}) },
    seasonalRhythms: { ...DEFAULT_PROFILE.seasonalRhythms, ...(store[userId]?.seasonalRhythms || {}) },
    boundaries: { ...DEFAULT_PROFILE.boundaries, ...(store[userId]?.boundaries || {}) },
  };
}

function saveProfile(userId, patch) {
  const store = readJson(PRESENCE_FILE, {});
  const current = getProfile(userId);
  store[userId] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeJson(PRESENCE_FILE, store);
  return store[userId];
}

function getSeasonalContext(date = new Date()) {
  const hour = date.getHours();
  const day = date.getDay();

  let partOfDay = 'midday';
  if (hour < 11) partOfDay = 'morning';
  else if (hour >= 18) partOfDay = 'evening';

  return {
    partOfDay,
    dayOfWeek: day,
    isWeekend: day === 0 || day === 6,
    isWeeklyReviewWindow: day === 0 || day === 5,
  };
}

function inferLifePattern({ message = '', profile }) {
  const lower = String(message).toLowerCase();
  const patterns = [];

  if (/work|job|boss|coworker|meeting|career/.test(lower)) patterns.push('work');
  if (/wife|husband|son|daughter|mother|father|family|friend/.test(lower)) patterns.push('family');
  if (/tired|sleep|walk|exercise|workout|blood pressure|heart|food|weight/.test(lower)) patterns.push('wellness');
  if (/pray|prayer|faith|god|bible|scripture|study/.test(lower)) patterns.push('faith');
  if (/habit|routine|discipline|plan|schedule/.test(lower)) patterns.push('habits');

  return {
    detectedDomains: patterns,
    enabledDomains: Object.entries(profile.lifeDomains)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key),
  };
}

function chooseRelationalPacing({ profile, energy }) {
  if (energy === 'very_low') return 'slow_listening';
  if (energy === 'low') return 'soft_support';
  if (profile.companionDepth === 'deep') return 'thoughtful_depth';
  if (profile.companionDepth === 'light') return 'brief_presence';
  return 'balanced_presence';
}

function chooseCommunityMode(profile) {
  if (!profile.communityConsent) {
    return {
      enabled: false,
      mode: 'private_only',
      message: 'Community/family support is off unless the user chooses it.',
    };
  }

  return {
    enabled: true,
    mode: profile.relationshipMode,
    trustedSupport: profile.trustedSupport || [],
    message: 'Community support enabled with user consent.',
  };
}

function buildLifeAssistancePlan({ profile, lifePattern, seasonal, orchestration }) {
  const steps = [];

  if (lifePattern.detectedDomains.includes('work') && profile.lifeDomains.work) {
    steps.push('Offer to help plan the next practical work step calmly.');
  }

  if (lifePattern.detectedDomains.includes('family') && profile.lifeDomains.family) {
    steps.push('Offer a gentle communication plan or prayerful reflection before responding to family tension.');
  }

  if (lifePattern.detectedDomains.includes('wellness') && profile.lifeDomains.wellness) {
    steps.push('Offer stewardship support and encourage professional care for concerning health signs.');
  }

  if (lifePattern.detectedDomains.includes('faith')) {
    steps.push('Offer Scripture naturally, with depth based on the user’s Scripture pacing preference.');
  }

  if (seasonal.partOfDay === 'morning') steps.push('Keep tone hopeful and simple; do not overwhelm the day.');
  if (seasonal.partOfDay === 'evening') steps.push('Invite reflection, prayer, or quiet release of the day.');
  if (seasonal.isWeeklyReviewWindow) steps.push('Offer a weekly reflection only if proactive help is enabled.');

  if (!steps.length) {
    steps.push('Listen first, ask one gentle question, and let the user lead.');
  }

  return {
    horizon: profile.longHorizonGoals?.length ? 'long_horizon' : 'present_moment',
    steps,
    suggestedNudge: profile.proactiveConsent ? orchestration.proactiveNudge : null,
    requireUserConfirmation: true,
  };
}

function buildRelationalPresence(input = {}) {
  const userId = input.userId || 'anonymous';
  const profile = getProfile(userId);
  const seasonal = getSeasonalContext(input.date ? new Date(input.date) : new Date());
  const lifePattern = inferLifePattern({ message: input.message, profile });
  const orchestration = buildOrchestration({
    userId,
    message: input.message,
    safetyLevel: input.safetyLevel,
    amplitude: input.amplitude,
    language: input.language || profile.preferredLanguage,
    mode: input.mode || 'companion',
    isIdle: input.isIdle,
    preferences: {
      preferredLanguage: input.language || profile.preferredLanguage,
      scripturePacing: profile.scriptureIntegration === 'study' ? 'deep' : profile.scriptureIntegration,
    },
  });

  const pacing = chooseRelationalPacing({ profile, energy: orchestration.energy });
  const community = chooseCommunityMode(profile);
  const lifeAssistance = buildLifeAssistancePlan({ profile, lifePattern, seasonal, orchestration });

  const presence = {
    userId,
    profile: {
      memoryConsent: profile.memoryConsent,
      proactiveConsent: profile.proactiveConsent,
      communityConsent: profile.communityConsent,
      preferredLanguage: profile.preferredLanguage,
      companionDepth: profile.companionDepth,
      scriptureIntegration: profile.scriptureIntegration,
      relationshipMode: profile.relationshipMode,
    },
    seasonal,
    lifePattern,
    pacing,
    community,
    orchestration,
    lifeAssistance,
    realtimeState: {
      orbState: orchestration.orbState,
      emotionalEnergy: orchestration.energy,
      responseDelayMs: orchestration.timing.responseDelayMs,
      pauseBetweenThoughtsMs: orchestration.timing.pauseBetweenThoughtsMs,
      language: orchestration.language,
      avatarSync: orchestration.avatarSync,
    },
    boundaries: profile.boundaries,
    safety: {
      userControlled: true,
      optInMemoryOnly: true,
      noHiddenMonitoring: true,
      noManipulativeNudges: true,
      noDiagnosis: true,
    },
  };

  appendEvent({ type: 'relational_presence', userId, pacing, energy: orchestration.energy, domains: lifePattern.detectedDomains });
  return presence;
}

module.exports = {
  buildRelationalPresence,
  getProfile,
  saveProfile,
};
