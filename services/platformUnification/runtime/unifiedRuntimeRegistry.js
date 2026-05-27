// services/platformUnification/runtime/unifiedRuntimeRegistry.js
// Platform Unification Phase — Unified Runtime Registry
//
// Goals:
// - centralize orchestration runtime visibility
// - unify runtime infrastructure registration
// - reduce disconnected orchestration state
// - support safe orchestration lifecycle expansion
// - provide lightweight runtime governance
//
// This module does NOT replace adapters or orchestration systems.
// It provides centralized runtime registration contracts.

const UNIFIED_RUNTIME_REGISTRY_VERSION = 'unified-runtime-registry.v1';

function createRuntimeRegistryState() {
  return {
    version: UNIFIED_RUNTIME_REGISTRY_VERSION,
    createdAt: new Date().toISOString(),
    systems: [],
    adapters: [],
    pipelines: [],
    runtimeEvents: [],
  };
}

function registerRuntimeSystem(
  registry = createRuntimeRegistryState(),
  system = {}
) {
  return {
    ...registry,
    systems: [
      ...registry.systems,
      {
        key: system.key || 'unknown-system',
        label: system.label || 'Unknown System',
        domain: system.domain || 'general',
        registeredAt: new Date().toISOString(),
      },
    ].slice(-100),
  };
}

function registerRuntimeAdapter(
  registry = createRuntimeRegistryState(),
  adapter = {}
) {
  return {
    ...registry,
    adapters: [
      ...registry.adapters,
      {
        key: adapter.key || 'unknown-adapter',
        label: adapter.label || 'Unknown Adapter',
        family: adapter.family || 'general',
        mode: adapter.mode || 'read-only',
        registeredAt: new Date().toISOString(),
      },
    ].slice(-100),
  };
}

function registerRuntimePipeline(
  registry = createRuntimeRegistryState(),
  pipelineStage = {}
) {
  return {
    ...registry,
    pipelines: [
      ...registry.pipelines,
      {
        key: pipelineStage.key || 'unknown-pipeline',
        label: pipelineStage.label || 'Unknown Pipeline',
        status: pipelineStage.status || 'unknown',
        registeredAt: new Date().toISOString(),
      },
    ].slice(-100),
  };
}

function registerRuntimeEvent(
  registry = createRuntimeRegistryState(),
  runtimeEvent = {}
) {
  return {
    ...registry,
    runtimeEvents: [
      ...registry.runtimeEvents,
      {
        type: runtimeEvent.type || 'runtime-event',
        source: runtimeEvent.source || 'unknown',
        detail: runtimeEvent.detail || 'No detail supplied.',
        createdAt: new Date().toISOString(),
      },
    ].slice(-250),
  };
}

function buildUnifiedRuntimeRegistry({
  systems = [],
  adapters = [],
  pipeline = [],
} = {}) {
  let registry = createRuntimeRegistryState();

  systems.forEach((system) => {
    registry = registerRuntimeSystem(registry, system);
  });

  adapters.forEach((adapter) => {
    registry = registerRuntimeAdapter(registry, adapter);
  });

  pipeline.forEach((pipelineStage) => {
    registry = registerRuntimePipeline(registry, pipelineStage);
  });

  registry = registerRuntimeEvent(registry, {
    type: 'runtime-registry-build',
    source: 'canonical-orchestrator',
    detail: 'Unified runtime registry generated successfully.',
  });

  return registry;
}

module.exports = {
  UNIFIED_RUNTIME_REGISTRY_VERSION,
  createRuntimeRegistryState,
  registerRuntimeSystem,
  registerRuntimeAdapter,
  registerRuntimePipeline,
  registerRuntimeEvent,
  buildUnifiedRuntimeRegistry,
};