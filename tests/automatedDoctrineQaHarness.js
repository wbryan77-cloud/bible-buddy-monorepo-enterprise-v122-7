const { doctrineScenarios } = require('./doctrineReplay.test');

function runDoctrineHarness() {
  return doctrineScenarios.map((scenario) => ({
    topic: scenario.topic,
    prompt: scenario.prompt,
    expectedMode: 'scripture_first',
    continuityRequired: true,
    historicalReferencesSeparated: true,
    passed: null,
  }));
}

module.exports = {
  runDoctrineHarness,
};