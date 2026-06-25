const { evaluateArchitectureDecision } = require('../services/architectureDecisionGate');

const approved = evaluateArchitectureDecision({
  simplifiesArchitecture: true,
  strengthensCompanionCore: true,
  preservesScriptureAuthority: true,
  keepsOneVoice: true,
  followsEnterpriseStandard: true,
  reviewsHistoricalLearning: true,
});

const rejectedNoHistory = evaluateArchitectureDecision({
  simplifiesArchitecture: true,
  strengthensCompanionCore: true,
  preservesScriptureAuthority: true,
  keepsOneVoice: true,
  followsEnterpriseStandard: true,
  reviewsHistoricalLearning: false,
});

const rejectedSprawl = evaluateArchitectureDecision({
  simplifiesArchitecture: false,
  strengthensCompanionCore: true,
  preservesScriptureAuthority: true,
  keepsOneVoice: false,
  followsEnterpriseStandard: false,
  reviewsHistoricalLearning: true,
});

console.table([
  { case: 'approved', passed: approved.passed === true },
  { case: 'rejectedNoHistory', passed: rejectedNoHistory.passed === false },
  { case: 'rejectedSprawl', passed: rejectedSprawl.passed === false },
]);

if (!approved.passed || rejectedNoHistory.passed !== false || rejectedSprawl.passed !== false) {
  console.error('Enterprise Architecture Decision Gate failed.');
  process.exit(1);
}

console.log('Enterprise Architecture Decision Gate PASS');
