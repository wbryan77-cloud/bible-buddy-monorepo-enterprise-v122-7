#!/usr/bin/env node
/**
 * Phase 4A.4 — Governance activation and pre-4B sandbox clearance.
 */
require('dotenv').config();

const { runPhase4A4 } = require('../services/phase4a4GovernanceActivation');

function main() {
  console.log('Phase 4A.4 — Governance activation & pre-4B clearance starting...');

  const result = runPhase4A4();

  console.log('Phase 4A.4 — Complete');
  console.log(`Activations: ${result.activationResults.filter((a) => a.activationStatus === 'activated').length}`);
  console.log(`Failures: ${result.beforeFailures} → ${result.afterFailures}`);
  console.log(`Kingdom→David navigable: ${result.validation.executiveAnswers.kingdomDavidMessiahNavigable}`);
  console.log(`Pre-flight: ${result.preFlight.determination}`);
  console.log('Reports: BibleAuthorityPhase4A4Report.md, Phase4BPreFlightReport.md');
}

main();
