#!/usr/bin/env node
/**
 * Phase 4A.1 — Primary chain gap analysis and David vine node audit.
 * Classification and traceability only — no production deployment.
 */
require('dotenv').config();

const { runPhase4A1 } = require('../services/phase4a1PrimaryChainVineCompletion');

function main() {
  console.log('Phase 4A.1 — Primary chain & vine completion pass starting...');

  const result = runPhase4A1();

  console.log('Phase 4A.1 — Complete');
  console.log(`Gap topics analyzed: ${result.gapAnalysis.length}`);
  console.log(`Promotion candidates: ${result.promotionCandidates.length}`);
  console.log(`David exists elsewhere: ${result.davidAudit.existsElsewhere}`);
  console.log(`David candidate node: ${result.davidAudit.candidateNode}`);
  console.log(`Outputs: ${result.outputDir}`);
  console.log('Impact report: Phase4A1ImpactReport.md');
}

main();
