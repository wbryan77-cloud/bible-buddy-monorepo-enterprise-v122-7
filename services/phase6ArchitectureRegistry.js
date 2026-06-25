/**
 * Phase 6 — Architecture Registry
 * Documents the permanent BibleBuddy layers and prevents future route sprawl.
 */

const PHASE6_LAYERS = Object.freeze([
  'constitution_governance',
  'conversation_engine',
  'companion_intelligence',
  'bible_intelligence',
  'companion_composer',
  'platform_scale',
]);

function getPhase6ArchitectureRegistry() {
  return {
    layers: PHASE6_LAYERS,
    rule:
      'No new feature enters unless it strengthens the five-layer architecture, preserves Scripture authority, keeps one voice, follows enterprise standards, and learns from prior mistakes.',
  };
}

module.exports = {
  PHASE6_LAYERS,
  getPhase6ArchitectureRegistry,
};
