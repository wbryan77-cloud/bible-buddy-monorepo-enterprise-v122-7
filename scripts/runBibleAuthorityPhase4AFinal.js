#!/usr/bin/env node
/**
 * Phase 4A Final — Project closeout and Phase 4B handoff.
 * Archive and handoff only — no corpus mutation or implementation.
 */
require('dotenv').config();

const { runPhase4AFinal } = require('../services/phase4aFinalHandoff');

function main() {
  console.log('Phase 4A Final — Project closeout & Phase 4B handoff starting...');

  const result = runPhase4AFinal();

  console.log('Phase 4A Final — Complete');
  console.log(`Sources: ${result.corpusStatus.totalSources}`);
  console.log(`Scriptures: ${result.corpusStatus.totalScriptures}`);
  console.log(`Review packets: ${result.corpusStatus.totalReviewPackets}`);
  console.log(`True review burden: ${result.reviewStatus.trueReviewBurden}`);
  console.log(`Implementation blockers: ${result.reviewStatus.implementationBlockers}`);
  console.log(`Approved candidates: ${result.governanceStatus.counts.approved}`);
  console.log(`Overall risk: ${result.riskRegister.overallRisk}`);
  console.log(`Determination: ${result.determination}`);
  console.log('Certificate: Phase4BAuthorizationCertificate.md');
}

main();
