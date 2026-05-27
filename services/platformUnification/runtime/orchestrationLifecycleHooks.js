// services/platformUnification/runtime/orchestrationLifecycleHooks.js
// Platform Unification Phase — Orchestration Lifecycle Hooks
//
// Goals:
// - support lifecycle-safe orchestration coordination
// - centralize orchestration hook contracts
// - support future orchestration extensibility
// - reduce disconnected runtime lifecycle logic
// - support safe execution boundaries
//
// This module does NOT replace orchestrators or runtime systems.
// It provides orchestration lifecycle hook infrastructure.

const ORCHESTRATION_LIFECYCLE_HOOKS_VERSION =
  'orchestration-lifecycle-hooks.v1';

const LIFECYCLE_HOOK_TYPES = [
  'before-orchestration',
  'after-orchestration',
  'before-continuity-update',
  'after-continuity-update',
  'before-doctrine-review',
  'after-doctrine-review',
  'before-graph-update',
  'after-graph-update',
  'before-memory-compression',
  'after-memory-compression',
];

function createLifecycleHook({
  type,
  source,
  enabled = true,
  priority = 'normal',
} = {}) {
  return {
    id: `lifecycle_hook_${Date.now()}`,
    type: LIFECYCLE_HOOK_TYPES.includes(type)
      ? type
      : 'before-orchestration',
    source: source || 'canonical-orchestrator',
    enabled,
    priority,
    createdAt: new Date().toISOString(),
  };
}

function createLifecycleHookRegistry() {
  return {
    version: ORCHESTRATION_LIFECYCLE_HOOKS_VERSION,
    createdAt: new Date().toISOString(),
    hooks: [],
  };
}

function registerLifecycleHook(
  registry = createLifecycleHookRegistry(),
  hook = {}
) {
  return {
    ...registry,
    hooks: [
      ...registry.hooks,
      hook,
    ].slice(-100),
  };
}

function buildCanonicalLifecycleHooks() {
  let registry = createLifecycleHookRegistry();

  LIFECYCLE_HOOK_TYPES.forEach((hookType) => {
    registry = registerLifecycleHook(
      registry,
      createLifecycleHook({
        type: hookType,
      })
    );
  });

  return registry;
}

module.exports = {
  ORCHESTRATION_LIFECYCLE_HOOKS_VERSION,
  LIFECYCLE_HOOK_TYPES,
  createLifecycleHook,
  createLifecycleHookRegistry,
  registerLifecycleHook,
  buildCanonicalLifecycleHooks,
};