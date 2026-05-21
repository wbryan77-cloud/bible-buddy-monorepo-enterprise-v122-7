const fs = require('fs');
const path = require('path');
const { buildAutonomousPlan } = require('./autonomousCompanion');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ECOSYSTEM_EVENTS_FILE = path.join(DATA_DIR, 'ecosystem-events.jsonl');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

const DEFAULT_ECOSYSTEM_PERMISSIONS = {
  crossDeviceContinuity: false,
  mobileSync: false,
  watchSync: false,
  calendarAccess: false,
  remindersAccess: false,
  locationAccess: false,
  trafficEtaAccess: false,
  emailSendAccess: false,
  smsSendAccess: false,
  documentGeneration: true,
  householdMode: false,
  edgeProcessingPreferred: true,
};

function appendEvent(entry) {
  try {
    fs.appendFileSync(ECOSYSTEM_EVENTS_FILE, JSON.stringify({ ...entry, createdAt: new Date().toISOString() }) + '\n');
  } catch (error) {
    console.warn('Unable to write ecosystem event:', error.message);
  }
}

function normalizePermissions(permissions = {}) {
  return { ...DEFAULT_ECOSYSTEM_PERMISSIONS, ...permissions };
}

function buildCrossDeviceContinuity({ permissions, userId }) {
  return {
    enabled: !!permissions.crossDeviceContinuity,
    userId,
    surfaces: [
      { surface: 'phone_app', role: 'primary companion conversation' },
      { surface: 'home_screen_widget', role: 'orb launcher and gentle presence' },
      { surface: 'watch', role: 'haptics, quick check-ins, wellness summaries' },
      { surface: 'calendar', role: 'appointment awareness if permissioned' },
      { surface: 'notifications', role: 'respectful reminders and travel nudges' },
      { surface: 'desktop_web', role: 'admin, document creation, deeper study' },
    ],
    rules: [
      'Sync only permissioned summaries by default.',
      'Do not sync raw audio/video by default.',
      'Maintain one relational memory summary per user, not scattered device memories.',
      'Let user revoke each surface separately.',
    ],
  };
}

function buildCalendarTravelPlan({ permissions, calendarEvent = {}, traffic = {} }) {
  if (!permissions.calendarAccess) {
    return {
      enabled: false,
      reason: 'Calendar access is off until the user opts in.',
    };
  }

  const hasLocation = !!calendarEvent.location;
  const hasStart = !!calendarEvent.startTime;
  const etaMinutes = permissions.trafficEtaAccess ? traffic.etaMinutes || null : null;

  const suggestions = [];
  if (hasStart && hasLocation) {
    suggestions.push('Prepare a 30-minute appointment reminder when permissioned.');
  }
  if (etaMinutes) {
    suggestions.push(`If traffic ETA is ${etaMinutes} minutes, recommend leaving early with a calm tone.`);
  }
  if (permissions.locationAccess && permissions.trafficEtaAccess) {
    suggestions.push('Use current location and destination only for travel-time calculation, not hidden tracking.');
  }

  return {
    enabled: true,
    event: {
      title: calendarEvent.title || null,
      startTime: calendarEvent.startTime || null,
      location: calendarEvent.location || null,
    },
    etaMinutes,
    reminderExamples: [
      'John, you have an appointment in 30 minutes. Traffic looks heavier than usual, so you may want to start heading out soon.',
      'Your appointment is coming up. Want me to open directions or give you a quieter prep moment first?',
    ],
    suggestions,
    boundaries: [
      'Do not read calendars without permission.',
      'Do not use location without permission.',
      'Do not create or change events without confirmation.',
      'Respect quiet hours unless urgent travel timing is enabled.',
    ],
  };
}

function buildDocumentAssistantPlan({ permissions, request = {} }) {
  if (!permissions.documentGeneration) {
    return { enabled: false, reason: 'Document generation is disabled.' };
  }

  return {
    enabled: true,
    intent: request.intent || 'unknown_document_help',
    workflow: [
      'Listen to what the user is trying to accomplish.',
      'Ask only the missing questions needed to structure the document.',
      'Offer an outline before generating long content when appropriate.',
      'Generate the document in the requested format: text, email, Word, PDF, or message.',
      'Ask before sending through email or SMS.',
      'Save/share/export only with user confirmation.',
    ],
    examples: [
      'I can help structure that letter. Do you want it firm, warm, legal-style, or simple?',
      'I can make this into a PDF or email draft. Which one would help you most?',
      'I can think three steps ahead: document, supporting evidence list, and follow-up reminder.',
    ],
    outputTargets: {
      text: true,
      emailDraft: permissions.emailSendAccess || 'draft_only_until_connected',
      sms: permissions.smsSendAccess || 'draft_only_until_connected',
      pdf: true,
      docx: true,
    },
  };
}

function buildMultiAgentOrchestration({ permissions }) {
  return {
    enabled: true,
    agents: [
      {
        name: 'CompanionAgent',
        role: 'conversation, emotional pacing, prayer, relationship continuity',
      },
      {
        name: 'TruthLayerAgent',
        role: 'Scripture, approved-source retrieval, discernment, history/context labels',
      },
      {
        name: 'WellnessAgent',
        role: 'wearable summaries, stewardship nudges, non-diagnostic escalation',
      },
      {
        name: 'CalendarTravelAgent',
        role: 'calendar reminders, travel timing, location/traffic only when permissioned',
      },
      {
        name: 'DocumentAgent',
        role: 'letters, PDFs, Word docs, emails, structured next steps',
      },
      {
        name: 'AdminOversightAgent',
        role: 'safety logs, source review, API monitoring, model/provider performance',
      },
      {
        name: 'DeviceBridgeAgent',
        role: 'widgets, watch sync, haptics, shortcuts, app intents, notification actions',
      },
      {
        name: 'EdgePrivacyAgent',
        role: 'prefer local processing for audio/video/emotional signals where available',
      },
    ],
    routingRules: [
      'CompanionAgent is always the voice/front door.',
      'Specialist agents support silently behind the scenes.',
      'High-risk health/safety routes must include safety boundaries.',
      'Sending messages, changing calendars, or sharing documents requires confirmation.',
      'AdminOversightAgent reviews risky source/provider changes.',
    ],
    privacy: {
      edgeProcessingPreferred: permissions.edgeProcessingPreferred,
      noHiddenMonitoring: true,
      noAutonomousSendingWithoutConfirmation: true,
    },
  };
}

function buildHouseholdFamilyPlan({ permissions, household = {} }) {
  if (!permissions.householdMode) {
    return {
      enabled: false,
      reason: 'Household/family mode is off until the user opts in.',
    };
  }

  return {
    enabled: true,
    householdId: household.householdId || null,
    roles: household.roles || ['primary_user'],
    modes: ['family_prayer', 'caregiver_checkin', 'shared_reminders', 'accountability_support'],
    boundaries: [
      'Each person needs their own consent and privacy controls.',
      'Do not expose private prayers/messages to family without explicit sharing.',
      'Caregiver alerts require opt-in rules.',
      'Household mode must support easy pause/leave controls.',
    ],
  };
}

function buildEdgeOnDevicePlan({ permissions }) {
  return {
    preferred: !!permissions.edgeProcessingPreferred,
    candidates: [
      'wake word / shortcut trigger where platform allows',
      'audio amplitude and voice activity detection',
      'camera expression session summaries if opted in',
      'notification timing rules',
      'basic offline memory/preferences cache',
    ],
    rules: [
      'Keep raw audio/video local when possible.',
      'Upload summaries only with permission.',
      'Use cloud AI for complex reasoning until safe local models are available.',
      'Never hide processing from the user.',
    ],
  };
}

function buildDistributedEcosystem(input = {}) {
  const userId = input.userId || 'anonymous';
  const permissions = normalizePermissions(input.permissions || {});
  const autonomousPlan = buildAutonomousPlan(input);

  const ecosystem = {
    userId,
    generatedAt: new Date().toISOString(),
    permissions,
    autonomousPlan,
    crossDeviceContinuity: buildCrossDeviceContinuity({ permissions, userId }),
    calendarTravel: buildCalendarTravelPlan({
      permissions,
      calendarEvent: input.calendarEvent || {},
      traffic: input.traffic || {},
    }),
    documentAssistant: buildDocumentAssistantPlan({
      permissions,
      request: input.documentRequest || {},
    }),
    multiAgent: buildMultiAgentOrchestration({ permissions }),
    householdFamily: buildHouseholdFamilyPlan({
      permissions,
      household: input.household || {},
    }),
    edgeOnDevice: buildEdgeOnDevicePlan({ permissions }),
    companionToCompanion: {
      futureReady: true,
      purpose: 'Allow user-approved companions/devices/family modes to coordinate summaries without exposing private raw content.',
      rules: [
        'No companion-to-companion sharing without consent.',
        'Share summaries, not raw private conversation.',
        'Respect individual user boundaries.',
      ],
    },
    northStar: 'Serve the user with wisdom, truth, peace, practical help, and biblical grounding while preserving consent and privacy.',
  };

  appendEvent({
    type: 'distributed_ecosystem_plan',
    userId,
    enabledSurfaces: Object.entries(permissions).filter(([, v]) => v).map(([k]) => k),
  });

  return ecosystem;
}

module.exports = {
  buildDistributedEcosystem,
  DEFAULT_ECOSYSTEM_PERMISSIONS,
};
