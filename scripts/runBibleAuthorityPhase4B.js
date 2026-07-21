#!/usr/bin/env node
/**
 * Phase 4B — Controlled engine validation.
 * Testing only — no corpus modification or production deployment.
 */
require('dotenv').config();

const { runPhase4B } = require('../services/phase4bControlledEngineValidation');

function main() {
  console.log('Phase 4B — Controlled engine validation starting...');

  const result = runPhase4B();

  console.log('Phase 4B — Complete');
  console.log(`Determination: ${result.determination}`);
  console.log(`Failures: ${result.results.sandbox.failures}`);
  console.log(`Traceability: ${result.results.category1.metrics.traceabilityRate}`);
  console.log(`Hallucination rate: ${result.results.category8.hallucinationRate}`);
  console.log(`Categories passed: ${[result.results.category1, result.results.category2, result.results.category3, result.results.category4, result.results.category5, result.results.category6, result.results.category7, result.results.category8].filter((c) => c.passed).length}/8`);
  console.log('Report: BibleAuthorityPhase4BReport.md');
}

main();
