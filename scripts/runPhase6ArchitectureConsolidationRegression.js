const { getPhase6ArchitectureRegistry } = require('../services/phase6ArchitectureRegistry');
const { evaluateArchitectureDecision } = require('../services/architectureDecisionGate');

const registry = getPhase6ArchitectureRegistry();

const requiredLayers = [
  'constitution_governance',
  'conversation_engine',
  'companion_intelligence',
  'bible_intelligence',
  'companion_composer',
  'platform_scale',
];

const missing = requiredLayers.filter((layer) => !registry.layers.includes(layer));

const gate = evaluateArchitectureDecision({
  simplifiesArchitecture: true,
  strengthensCompanionCore: true,
  preservesScriptureAuthority: true,
  keepsOneVoice: true,
  followsEnterpriseStandard: true,
  reviewsHistoricalLearning: true,
});

console.table([
  { check: 'all_layers_present', passed: missing.length === 0 },
  { check: 'enterprise_gate_passes', passed: gate.passed === true },
]);

if (missing.length || !gate.passed) {
  console.error('Phase 6 Architecture Consolidation failed.', { missing, gate });
  process.exit(1);
}

console.log('Phase 6 Architecture Consolidation regression PASS');
