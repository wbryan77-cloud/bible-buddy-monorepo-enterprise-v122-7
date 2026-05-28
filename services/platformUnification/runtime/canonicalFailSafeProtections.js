// services/platformUnification/runtime/canonicalFailSafeProtections.js
// Platform Unification Phase — Canonical Fail-Safe Protections
//
// Goals:
// - support protected orchestration fallback execution
// - centralize fail-safe governance
// - improve graceful orchestration preservation
// - reduce unsafe runtime collapse conditions
// - prepare future adaptive fail-safe coordination
//
// This module does NOT replace recovery or stabilization systems.
// It provides canonical fail-safe infrastructure.

const CANONICAL_FAIL_SAFE_VERSION =
  'canonical-fail-safe-protections.v1';

const FAIL_SAFE_PROTECTION_TYPES = [
  'safe-runtime-containment',
  'graceful-orchestration-fallback',
  'continuity-preservation',
  'memory-preservation',
  'safe-companion-preservation',
  'bounded-failure-isolation',
  'safe-output-preservation',
  'canonical-runtime-preservation',
];

function createFailSafeProtection({
  type,
  enabled = true,
  protectionMode = 'preserve-safe-state',
  description,
} = {}) {
  return {
    id: `fail_safe_${Date.now()}`,
    type: FAIL_SAFE_PROTECTION_TYPES.includes(type)
      ? type
      : 'safe-runtime-containment',
    enabled,
    protectionMode,
    description:
      description ||
      'Canonical orchestration fail-safe protection.',
    createdAt: new Date().toISOString(),
  };
}

function createFailSafeRegistry() {
  return {
    version: CANONICAL_FAIL_SAFE_VERSION,
    createdAt: new Date().toISOString(),
    failSafeProtections: [],
  };
}

function registerFailSafeProtection(
  registry = createFailSafeRegistry(),
  protection = {}
) {
  return {
    ...registry,
    failSafeProtections: [
      ...registry.failSafeProtections,
      protection,
    ].slice(-100),
  };
}

function buildCanonicalFailSafeProtections() {
  let registry = createFailSafeRegistry();

  FAIL_SAFE_PROTECTION_TYPES.forEach((protectionType) => {
    registry = registerFailSafeProtection(
      registry,
      createFailSafeProtection({
        type: protectionType,
        enabled: true,
      })
    );
  });

  return registry;
}

module.exports = {
  CANONICAL_FAIL_SAFE_VERSION,
  FAIL_SAFE_PROTECTION_TYPES,
  createFailSafeProtection,
  createFailSafeRegistry,
  registerFailSafeProtection,
  buildCanonicalFailSafeProtections,
};