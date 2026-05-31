// DEPRECATED for live buddy path (Sprint 2.12A): proactive daily plans are not wired to runBuddy.
// Relational presence profiles are read via companionDeliveryLayer / companionRelationshipOrchestrator.
const fs = require('fs');
const path = require('path');
const { buildRelationalPresence, getProfile } = require('./relationalPresence');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DAILY_PLANS_FILE = path.join(DATA_DIR, 'daily-companion-plans.jsonl');
const LONG_MEMORY_FILE = path.join(DATA_DIR, 'long-memory-summaries.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8')) || fallback;
  } catch (_) {
    return fallback;
  }
}

function appendJsonl(file, entry) {
  try {
    fs.appendFileSync(file, JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n');
  } catch (error) {
    console.warn('Autonomous companion log failed:', error.message);
  }
}

function getLongMemorySummary(userId) {
  const store = readJson(LONG_MEMORY_FILE, {});
  return store[userId] || {
    themes: [],
    currentFocus: null,
    faithJourney: null,
    wellnessPatterns: [],
    relationshipPatterns: [],
    preferredSupportStyle: 'listen_first',
    lastReviewedAt: null,
    consentRequired: true,
  };
}

function chooseDailyFlow({ profile, longMemory, date = new Date() }) {
  const hour = date.getHours();
  const flow = [];

  if (profile.seasonalRhythms?.morning && hour < 11) {
    flow.push({
      slot: 'morning',
      type: 'gentle_greeting',
      message: 'Offer a simple check-in, not a forced devotional.',
      scripturePacing: profile.scriptureIntegration === 'light' ? 'optional' : 'gentle',
    });
  }

  flow.push({
    slot: 'daytime',
    type: 'ambient_presence',
    message: 'Remain available through orb/widget/shortcut. Do not interrupt unless user opted in.',
    scripturePacing: 'only_when_relevant',
  });

  if (profile.lifeDomains?.wellness) {
    flow.push({
      slot: 'wellness',
      type: 'stewardship_check',
      message: 'Use wearable summaries only if permissioned; offer gentle support, not diagnosis.',
      scripturePacing: 'light',
    });
  }

  if (profile.seasonalRhythms?.evening) {
    flow.push({
      slot: 'evening',
      type: 'reflection_or_prayer',
      message: 'Invite release, reflection, prayer, or silence.',
      scripturePacing: 'gentle',
    });
  }

  if (longMemory.currentFocus) {
    flow.push({
      slot: 'continuity',
      type: 'long_memory_followup',
      message: `If appropriate, gently continue the user’s current focus: ${longMemory.currentFocus}`,
      scripturePacing: 'natural',
    });
  }

  return flow;
}

function buildNotificationPlan({ profile, relationalPresence, longMemory }) {
  if (!profile.proactiveConsent) {
    return {
      enabled: false,
      reason: 'Proactive help is off until the user opts in.',
      notifications: [],
    };
  }

  const notifications = [];
  const max = profile.boundaries?.maxProactiveNudgesPerDay || 2;

  if (profile.seasonalRhythms?.morning) {
    notifications.push({
      key: 'morning_checkin',
      tone: 'gentle',
      text: 'Good morning. Want a quiet check-in, a short prayer, or space today?',
      requiresQuietHoursCheck: true,
    });
  }

  if (profile.lifeDomains?.prayer) {
    notifications.push({
      key: 'evening_prayer',
      tone: 'soft',
      text: 'Would you like to slow down and pray for a minute tonight?',
      requiresQuietHoursCheck: true,
    });
  }

  if (relationalPresence?.lifePattern?.detectedDomains?.includes('wellness')) {
    notifications.push({
      key: 'wellness_stewardship',
      tone: 'supportive',
      text: 'Want a gentle stewardship check-in today?',
      requiresQuietHoursCheck: true,
    });
  }

  if (longMemory.currentFocus) {
    notifications.push({
      key: 'continuity_focus',
      tone: 'relational',
      text: 'Want to continue what we were working through together?',
      requiresQuietHoursCheck: true,
    });
  }

  return {
    enabled: true,
    maxPerDay: max,
    notifications: notifications.slice(0, max),
  };
}

function buildScriptureSurfacing({ profile, relationalPresence, longMemory }) {
  const pacing = relationalPresence?.orchestration?.scripturePacing || profile.scriptureIntegration || 'natural';
  const energy = relationalPresence?.orchestration?.energy || 'balanced';

  if (pacing === 'light' || energy === 'very_low') {
    return {
      style: 'minimal',
      rule: 'Offer one reference or one short comfort verse only if it fits naturally.',
      avoid: 'Do not dump multiple verses when the user needs to be heard.',
    };
  }

  if (pacing === 'deep' || profile.scriptureIntegration === 'study') {
    return {
      style: 'study',
      rule: 'Use Scripture, context, cross references, and approved-source notes clearly labeled.',
      avoid: 'Do not present interpretation as Scripture.',
    };
  }

  return {
    style: 'natural',
    rule: 'Bring Scripture in gently when helpful, after listening first.',
    avoid: 'Do not force verses into every message.',
  };
}

function buildWearablePlan({ profile, signals = {} }) {
  if (!profile.lifeDomains?.wellness) {
    return { enabled: false, reason: 'Wellness/wearable support is off.' };
  }

  return {
    enabled: true,
    source: signals.source || 'future_healthkit_healthconnect',
    allowedSignals: ['steps', 'sleep', 'heart_rate', 'blood_pressure_if_available', 'workouts'],
    rules: [
      'Use summaries, not raw streams by default.',
      'Tell the truth about readings but do not diagnose.',
      'Escalate urgent readings to professional/emergency guidance when appropriate.',
      'Respect user permission and delete/export controls.',
    ],
  };
}

function buildEnvironmentPlan({ profile, context = {} }) {
  return {
    enabled: !!context.permissionedEnvironmentSignals,
    possibleSignals: ['time_of_day', 'location_category_if_allowed', 'calendar_context_if_allowed', 'weather_if_allowed'],
    use: 'Adjust tone, timing, and practical help only with permission.',
    boundaries: ['No hidden tracking', 'No location use without permission', 'No manipulative timing'],
  };
}

function buildAvatarEmbodiment({ relationalPresence }) {
  const realtime = relationalPresence?.realtimeState || {};
  return {
    futureReady: true,
    avatarState: {
      expression: realtime.avatarSync?.expression || 'gentle_presence',
      gaze: realtime.avatarSync?.gaze || 'calm_direct',
      mouthMotion: realtime.avatarSync?.mouthMotion || 'resting',
      orbState: realtime.orbState || 'idle',
      emotionalEnergy: realtime.emotionalEnergy || 'balanced',
      language: realtime.language || 'en',
    },
    syncTargets: ['orb', 'voice', 'future_avatar_face', 'future_waveform', 'future_haptics'],
  };
}

function buildAutonomousPlan(input = {}) {
  const userId = input.userId || 'anonymous';
  const profile = getProfile(userId);
  const longMemory = getLongMemorySummary(userId);
  const relationalPresence = buildRelationalPresence(input);
  const date = input.date ? new Date(input.date) : new Date();

  const plan = {
    userId,
    date: date.toISOString(),
    consent: {
      memory: !!profile.memoryConsent,
      proactive: !!profile.proactiveConsent,
      community: !!profile.communityConsent,
      wellness: !!profile.lifeDomains?.wellness,
    },
    dailyFlow: chooseDailyFlow({ profile, longMemory, date }),
    notificationPlan: buildNotificationPlan({ profile, relationalPresence, longMemory }),
    scriptureSurfacing: buildScriptureSurfacing({ profile, relationalPresence, longMemory }),
    wearablePlan: buildWearablePlan({ profile, signals: input.wearableSignals || {} }),
    environmentPlan: buildEnvironmentPlan({ profile, context: input.context || {} }),
    avatarEmbodiment: buildAvatarEmbodiment({ relationalPresence }),
    relationalPresence,
    longHorizon: {
      goals: profile.longHorizonGoals || [],
      memorySummary: profile.memoryConsent ? longMemory : { consentRequired: true },
      nextBestAction:
        relationalPresence.lifeAssistance?.steps?.[0] || 'Listen first and let the user lead.',
    },
    safety: {
      userControlled: true,
      optInRequiredForProactiveBehavior: true,
      noHiddenMonitoring: true,
      noDiagnosis: true,
      noShameBasedEngagement: true,
      adminReviewRecommended: true,
    },
  };

  appendJsonl(DAILY_PLANS_FILE, {
    type: 'autonomous_plan',
    userId,
    date: plan.date,
    proactive: plan.consent.proactive,
    nextBestAction: plan.longHorizon.nextBestAction,
  });

  return plan;
}

module.exports = {
  buildAutonomousPlan,
  getLongMemorySummary,
};
