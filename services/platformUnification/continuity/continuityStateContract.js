// services/platformUnification/continuity/continuityStateContract.js
// Platform Unification Phase — Continuity State Contract
//
// This module defines the canonical continuity runtime shape.
//
// Goals:
// - reduce fragmented runtime state
// - reduce memory drift
// - reduce disconnected feature outputs
// - preserve gentle discipleship continuity
// - centralize runtime continuity contracts
//
// This layer does NOT replace existing systems.
// It provides a shared continuity structure for orchestration.

const CONTINUITY_STATE_VERSION = 'continuity-state.v1';

const CONTINUITY_STAGES = [
  'introduction',
  'seeking',
  'learning',
  'formation',
  'consistency',
  'service',
  'mentorship',
  'renewal',
];

function createEmptyContinuityState() {
  return {
    version: CONTINUITY_STATE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Current orchestration state
    activeStage: 'learning',

    // Runtime continuity
    continuityScore: 0,
    continuityPriority: 'medium',

    // Current runtime anchors
    anchors: {
      scriptureThemes: [],
      discipleshipThemes: [],
      worshipThemes: [],
      prayerThemes: [],
      stewardshipThemes: [],
    },

    // Runtime memory compression
    compressedMemory: {
      summaries: [],
      latestSummary: null,
    },

    // Gentle next-step guidance
    guidance: {
      currentFocus: null,
      nextGentleStep: null,
      avoidOverload: true,
    },

    // Doctrine runtime flags
    doctrine: {
      requiresReview: false,
      scriptureAttached: false,
      pastoralSensitivity: true,
    },

    // Runtime orchestration metadata
    orchestration: {
      lastSourceSystem: null,
      lastSignalType: null,
      orchestrationCount: 0,
    },
  };
}

function normalizeContinuityStage(stage) {
  if (!stage) return 'learning';

  return CONTINUITY_STAGES.includes(stage)
    ? stage
    : 'learning';
}

function updateContinuityState(currentState = {}, signal = {}) {
  const state = {
    ...createEmptyContinuityState(),
    ...currentState,
  };

  const nextStage = normalizeContinuityStage(
    signal.metadata?.formationStage ||
    signal.metadata?.stage ||
    state.activeStage
  );

  const summary = signal.text
    ? signal.text.slice(0, 220)
    : 'Continuity signal processed.';

  const updatedSummaries = [
    ...(state.compressedMemory?.summaries || []),
    {
      createdAt: new Date().toISOString(),
      sourceSystem: signal.sourceSystem || 'unknown',
      summary,
    },
  ].slice(-10);

  return {
    ...state,
    updatedAt: new Date().toISOString(),
    activeStage: nextStage,
    continuityScore: Math.min((state.continuityScore || 0) + 1, 100),

    compressedMemory: {
      summaries: updatedSummaries,
      latestSummary: updatedSummaries[updatedSummaries.length - 1] || null,
    },

    guidance: {
      currentFocus:
        signal.metadata?.goal ||
        signal.metadata?.worshipTheme ||
        signal.metadata?.prayerType ||
        state.guidance?.currentFocus ||
        null,

      nextGentleStep:
        signal.metadata?.goal ||
        'Continue with one gentle next step rooted in continuity.',

      avoidOverload: true,
    },

    doctrine: {
      requiresReview: false,
      scriptureAttached: Array.isArray(signal.scriptureRefs)
        ? signal.scriptureRefs.length > 0
        : false,
      pastoralSensitivity: true,
    },

    orchestration: {
      lastSourceSystem: signal.sourceSystem || 'unknown',
      lastSignalType: signal.type || 'general',
      orchestrationCount:
        (state.orchestration?.orchestrationCount || 0) + 1,
    },
  };
}

module.exports = {
  CONTINUITY_STATE_VERSION,
  CONTINUITY_STAGES,
  createEmptyContinuityState,
  normalizeContinuityStage,
  updateContinuityState,
};