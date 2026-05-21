// Living OS Aggregator
// Combines Bible Buddy companion layers into one safe orchestration object.
// All sensitive actions remain permission-based and confirmation-required.

function optionalRequire(path, exportName, fallback) {
  try {
    const mod = require(path);
    return mod[exportName] || fallback;
  } catch (error) {
    return fallback;
  }
}

const noopLayer = (name) => () => ({ enabled: false, layer: name, status: 'optional_module_unavailable' });

const buildOrchestration = optionalRequire('./emotionalOrchestrator', 'buildOrchestration', noopLayer('emotional'));
const buildRelationalPresence = optionalRequire('./relationalPresence', 'buildRelationalPresence', noopLayer('relational'));
const buildAutonomousPlan = optionalRequire('./autonomousCompanion', 'buildAutonomousPlan', noopLayer('autonomous'));
const buildDistributedEcosystem = optionalRequire('./distributedEcosystem', 'buildDistributedEcosystem', noopLayer('ecosystem'));
const buildCalendarTravelAssist = optionalRequire('./osCalendarTravel', 'buildCalendarTravelAssist', noopLayer('calendar'));
const buildWorkspaceDocumentAssist = optionalRequire('./osWorkspaceDocs', 'buildWorkspaceDocumentAssist', noopLayer('documents'));
const buildEmailMeetingAssist = optionalRequire('./osEmailMeeting', 'buildEmailMeetingAssist', noopLayer('email_meetings'));
const buildAmbientOSState = optionalRequire('./osAmbientState', 'buildAmbientOSState', noopLayer('ambient_os'));
const buildLongMemoryGraph = optionalRequire('./osLongMemoryGraph', 'buildLongMemoryGraph', noopLayer('long_memory_graph'));
const buildRealtimeTranslation = optionalRequire('./osRealtimeTranslation', 'buildRealtimeTranslation', noopLayer('realtime_translation'));
const buildAvatarEmbodiment = optionalRequire('./osAvatarEmbodiment', 'buildAvatarEmbodiment', noopLayer('avatar_embodiment'));
const buildWearableOrchestration = optionalRequire('./osWearableOrchestration', 'buildWearableOrchestration', noopLayer('wearable_orchestration'));
const buildEdgeProcessing = optionalRequire('./osEdgeProcessing', 'buildEdgeProcessing', noopLayer('edge_processing'));
const buildRelationalEvolution = optionalRequire('./osRelationalEvolution', 'buildRelationalEvolution', noopLayer('relational_evolution'));
const buildResilienceOps = optionalRequire('./osResilienceOps', 'buildResilienceOps', noopLayer('resilience_ops'));

function safePermissions(input = {}) {
  return input.permissions || {};
}

function buildRealtimeLayer(input = {}) {
  const permissions = safePermissions(input);
  return {
    enabled: !!permissions.realtimeVoice,
    language: input.language || 'en',
    mode: input.voiceMode || 'companion',
    features: ['voice_session', 'live_transcript', 'orb_sync', 'interruption_control'],
    rules: ['mic_requires_user_action', 'session_can_stop_anytime', 'no_always_on_listening'],
  };
}

function buildWellnessLayer(input = {}) {
  const permissions = safePermissions(input);
  return {
    enabled: !!permissions.wellness,
    features: ['health_signal_summary', 'watch_sync_future', 'stewardship_nudges'],
    rules: ['truthful_readings', 'no_diagnosis', 'professional_care_for_concerning_readings'],
  };
}

function buildMemoryLayer(input = {}) {
  const permissions = safePermissions(input);
  return {
    enabled: !!permissions.memory,
    mode: 'summary_first',
    features: ['long_summary', 'preference_memory', 'life_context_summary'],
    rules: ['view', 'correct', 'export', 'delete', 'no_manipulative_memory_use'],
  };
}

function buildLanguageLayer(input = {}) {
  const permissions = safePermissions(input);
  return {
    enabled: !!permissions.languageAssist,
    preferredLanguage: input.language || 'en',
    supportedUseCases: ['drafting', 'meeting_notes', 'conversation_notes', 'letters', 'summaries'],
    rules: ['preserve_meaning', 'ask_before_sending', 'flag_uncertainty_for_sensitive_language'],
  };
}

function buildOpportunityLayer(input = {}) {
  const permissions = safePermissions(input);
  return {
    enabled: !!permissions.opportunityAssist,
    supportedUseCases: ['goal_reflection', 'post_summary', 'profile_materials', 'interview_prep', 'followup_planning'],
    rules: ['truthful_history_only', 'no_fabrication', 'confirm_before_external_action'],
  };
}

function buildRelationshipLayer(input = {}) {
  const permissions = safePermissions(input);
  return {
    enabled: !!permissions.relationshipSupport,
    supportedUseCases: ['communication_help', 'values_reflection', 'conversation_preparation', 'boundary_reflection'],
    rules: ['no_manipulation', 'no_unapproved_messages', 'encourage_truth_patience_kindness_and_wisdom'],
  };
}

function buildLivingOS(input = {}) {
  const permissions = safePermissions(input);

  return {
    userId: input.userId || 'anonymous',
    generatedAt: new Date().toISOString(),
    northStar: 'Truth, wisdom, peace, practical service, and the God of the Bible.',
    layers: {
      emotional: buildOrchestration(input),
      relational: buildRelationalPresence(input),
      autonomous: buildAutonomousPlan(input),
      ecosystem: buildDistributedEcosystem(input),
      ambientOS: buildAmbientOSState(input),
      longMemoryGraph: buildLongMemoryGraph(input),
      realtime: buildRealtimeLayer(input),
      realtimeTranslation: buildRealtimeTranslation(input),
      wellness: buildWellnessLayer(input),
      memory: buildMemoryLayer(input),
      language: buildLanguageLayer(input),
      opportunity: buildOpportunityLayer(input),
      relationship: buildRelationshipLayer(input),
      avatarEmbodiment: buildAvatarEmbodiment(input),
      wearableOrchestration: buildWearableOrchestration(input),
      edgeProcessing: buildEdgeProcessing(input),
      relationalEvolution: buildRelationalEvolution(input),
      resilienceOps: buildResilienceOps(input),
      calendar: buildCalendarTravelAssist({
        permissions: permissions.calendar || {},
        event: input.calendarEvent,
        traffic: input.traffic,
        minutesUntilEvent: input.minutesUntilEvent,
      }),
      documents: buildWorkspaceDocumentAssist({
        permissions: permissions.documents || {},
        request: input.documentRequest,
      }),
      emailMeetings: buildEmailMeetingAssist({
        permissions: permissions.emailMeetings || {},
      }),
    },
    routing: {
      frontDoor: 'BuddyCompanion',
      principle: 'Buddy remains the warm front door; specialist layers assist quietly behind the scenes.',
    },
    governance: {
      userControlled: true,
      optInSensitiveData: true,
      confirmBeforeExternalAction: true,
      noHiddenMonitoring: true,
      noDiagnosis: true,
      noFabrication: true,
      scriptureGrounded: true,
      adminOversightForNewIntegrations: true,
      failSoftArchitecture: true,
    },
  };
}

module.exports = {
  buildLivingOS,
};
