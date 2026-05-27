// services/platformUnification/diagnostics/orchestrationDiagnostics.js
// Platform Unification Phase — Orchestration Diagnostics
//
// Goals:
// - improve runtime observability
// - improve orchestration visibility
// - reduce hidden runtime drift
// - support Render-safe diagnostics
// - centralize orchestration health reporting
//
// This module does NOT replace analytics systems.
// It provides lightweight orchestration diagnostics.

const ORCHESTRATION_DIAGNOSTICS_VERSION = 'orchestration-diagnostics.v1';

function buildPipelineHealth(pipeline = []) {
  return pipeline.map((stage) => ({
    key: stage.key,
    label: stage.label,
    status: stage.status || 'unknown',
    healthy: !String(stage.status || '').includes('error'),
  }));
}

function buildAdapterHealth(adapters = []) {
  return adapters.map((adapter) => ({
    key: adapter.key,
    label: adapter.label,
    family: adapter.family,
    mode: adapter.mode,
    status: adapter.status || 'unknown',
    connected: adapter.status !== 'disconnected',
  }));
}

function buildRuntimeMetrics({
  adapters = [],
  pipeline = [],
  continuityState = {},
  doctrineIntegrity = {},
} = {}) {
  return {
    adapterCount: adapters.length,
    connectedAdapterCount: adapters.filter(
      (adapter) => adapter.status !== 'disconnected'
    ).length,

    pipelineStageCount: pipeline.length,

    continuityStage:
      continuityState.activeStage || 'unknown',

    continuityScore:
      continuityState.continuityScore || 0,

    doctrineStatus:
      doctrineIntegrity.status || 'unknown',

    doctrineReviewRequired:
      doctrineIntegrity.requiresReview || false,
  };
}

function generateOrchestrationDiagnostics({
  version,
  adapters = [],
  pipeline = [],
  continuityState = {},
  doctrineIntegrity = {},
} = {}) {
  return {
    ok: true,
    diagnosticsVersion: ORCHESTRATION_DIAGNOSTICS_VERSION,
    generatedAt: new Date().toISOString(),
    platformVersion: version || 'unknown',

    runtimeMetrics: buildRuntimeMetrics({
      adapters,
      pipeline,
      continuityState,
      doctrineIntegrity,
    }),

    adapterHealth: buildAdapterHealth(adapters),

    pipelineHealth: buildPipelineHealth(pipeline),

    continuity: {
      activeStage: continuityState.activeStage || 'unknown',
      continuityPriority:
        continuityState.continuityPriority || 'unknown',
      orchestrationCount:
        continuityState.orchestration?.orchestrationCount || 0,
    },

    doctrine: {
      status: doctrineIntegrity.status || 'unknown',
      requiresReview:
        doctrineIntegrity.requiresReview || false,
      activeFlags: doctrineIntegrity.flags || [],
    },
  };
}

module.exports = {
  ORCHESTRATION_DIAGNOSTICS_VERSION,
  buildPipelineHealth,
  buildAdapterHealth,
  buildRuntimeMetrics,
  generateOrchestrationDiagnostics,
};