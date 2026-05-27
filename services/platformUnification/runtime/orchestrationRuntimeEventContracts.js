// services/platformUnification/runtime/orchestrationRuntimeEventContracts.js
// Platform Unification Phase — Orchestration Runtime Event Contracts
//
// Goals:
// - standardize orchestration runtime events
// - centralize lifecycle-safe runtime communication
// - improve orchestration coordination
// - reduce disconnected runtime signaling
// - support future orchestration lifecycle hooks
//
// This module does NOT replace analytics or diagnostics systems.
// It provides runtime orchestration event contracts.

const ORCHESTRATION_RUNTIME_EVENT_CONTRACTS_VERSION =
  'orchestration-runtime-event-contracts.v1';

const RUNTIME_EVENT_TYPES = [
  'signal-received',
  'continuity-updated',
  'doctrine-reviewed',
  'graph-updated',
  'runtime-health-generated',
  'discipleship-plan-generated',
  'memory-compressed',
  'runtime-registry-built',
];

function createRuntimeEvent({
  type,
  source,
  detail,
  metadata = {},
} = {}) {
  return {
    id: `runtime_event_${Date.now()}`,
    type: RUNTIME_EVENT_TYPES.includes(type)
      ? type
      : 'signal-received',
    source: source || 'canonical-orchestrator',
    detail: detail || 'No runtime detail supplied.',
    metadata,
    createdAt: new Date().toISOString(),
  };
}

function createRuntimeEventBatch() {
  return {
    version: ORCHESTRATION_RUNTIME_EVENT_CONTRACTS_VERSION,
    createdAt: new Date().toISOString(),
    events: [],
  };
}

function appendRuntimeEvent(
  runtimeBatch = createRuntimeEventBatch(),
  runtimeEvent = {}
) {
  return {
    ...runtimeBatch,
    events: [
      ...runtimeBatch.events,
      runtimeEvent,
    ].slice(-250),
  };
}

function buildCanonicalRuntimeEvents({
  signal = {},
  continuityState = {},
  doctrineIntegrity = {},
  knowledgeGraph = {},
} = {}) {
  let runtimeBatch = createRuntimeEventBatch();

  runtimeBatch = appendRuntimeEvent(
    runtimeBatch,
    createRuntimeEvent({
      type: 'signal-received',
      detail: `Signal received from ${signal.sourceSystem || 'unknown'} system.`,
      metadata: {
        signalType: signal.type || 'general',
      },
    })
  );

  runtimeBatch = appendRuntimeEvent(
    runtimeBatch,
    createRuntimeEvent({
      type: 'continuity-updated',
      detail: 'Continuity state updated successfully.',
      metadata: {
        continuityStage:
          continuityState.activeStage || 'unknown',
      },
    })
  );

  runtimeBatch = appendRuntimeEvent(
    runtimeBatch,
    createRuntimeEvent({
      type: 'doctrine-reviewed',
      detail: 'Doctrine integrity evaluation completed.',
      metadata: {
        doctrineStatus:
          doctrineIntegrity.status || 'unknown',
      },
    })
  );

  runtimeBatch = appendRuntimeEvent(
    runtimeBatch,
    createRuntimeEvent({
      type: 'graph-updated',
      detail: 'Knowledge graph updated successfully.',
      metadata: {
        nodeCount:
          Array.isArray(knowledgeGraph.nodes)
            ? knowledgeGraph.nodes.length
            : 0,
      },
    })
  );

  return runtimeBatch;
}

module.exports = {
  ORCHESTRATION_RUNTIME_EVENT_CONTRACTS_VERSION,
  RUNTIME_EVENT_TYPES,
  createRuntimeEvent,
  createRuntimeEventBatch,
  appendRuntimeEvent,
  buildCanonicalRuntimeEvents,
};