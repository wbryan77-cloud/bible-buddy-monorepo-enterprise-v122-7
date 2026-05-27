// services/platformUnification/metrics/orchestrationHealthMetrics.js
// Platform Unification Phase — Orchestration Health Metrics
//
// Goals:
// - improve orchestration observability
// - improve runtime health visibility
// - support continuity-aware metrics
// - centralize orchestration scoring
// - support Render-safe lightweight monitoring
//
// This module does NOT replace analytics systems.
// It provides orchestration runtime health metrics.

const ORCHESTRATION_HEALTH_METRICS_VERSION = 'orchestration-health-metrics.v1';

function calculateAdapterCoverage(adapters = []) {
  if (!adapters.length) {
    return 0;
  }

  const connected = adapters.filter(
    (adapter) => adapter.status !== 'disconnected'
  ).length;

  return Math.round((connected / adapters.length) * 100);
}

function calculatePipelineCoverage(pipeline = []) {
  if (!pipeline.length) {
    return 0;
  }

  const connected = pipeline.filter((stage) =>
    String(stage.status || '').includes('connected') ||
    String(stage.status || '').includes('ready')
  ).length;

  return Math.round((connected / pipeline.length) * 100);
}

function calculateContinuityHealth(continuityState = {}) {
  const score = continuityState.continuityScore || 0;

  if (score >= 75) {
    return 'strong';
  }

  if (score >= 40) {
    return 'stable';
  }

  return 'developing';
}

function calculateDoctrineHealth(doctrineIntegrity = {}) {
  if (doctrineIntegrity.requiresReview) {
    return 'review-required';
  }

  if (doctrineIntegrity.status === 'ready') {
    return 'healthy';
  }

  return 'developing';
}

function generateOrchestrationHealthMetrics({
  adapters = [],
  pipeline = [],
  continuityState = {},
  doctrineIntegrity = {},
  knowledgeGraph = {},
} = {}) {
  return {
    version: ORCHESTRATION_HEALTH_METRICS_VERSION,
    generatedAt: new Date().toISOString(),

    orchestrationHealth: {
      adapterCoverage:
        calculateAdapterCoverage(adapters),

      pipelineCoverage:
        calculatePipelineCoverage(pipeline),

      continuityHealth:
        calculateContinuityHealth(continuityState),

      doctrineHealth:
        calculateDoctrineHealth(doctrineIntegrity),
    },

    graphMetrics: {
      nodeCount:
        Array.isArray(knowledgeGraph.nodes)
          ? knowledgeGraph.nodes.length
          : 0,

      edgeCount:
        Array.isArray(knowledgeGraph.edges)
          ? knowledgeGraph.edges.length
          : 0,

      continuityAnchorCount:
        Array.isArray(knowledgeGraph.continuityAnchors)
          ? knowledgeGraph.continuityAnchors.length
          : 0,
    },

    runtimeSummary: {
      continuityStage:
        continuityState.activeStage || 'unknown',

      continuityScore:
        continuityState.continuityScore || 0,

      doctrineStatus:
        doctrineIntegrity.status || 'unknown',
    },
  };
}

module.exports = {
  ORCHESTRATION_HEALTH_METRICS_VERSION,
  calculateAdapterCoverage,
  calculatePipelineCoverage,
  calculateContinuityHealth,
  calculateDoctrineHealth,
  generateOrchestrationHealthMetrics,
};