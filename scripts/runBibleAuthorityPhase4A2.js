#!/usr/bin/env node
/**
 * Phase 4A.2 — Classification governance review.
 * Review-only — no doctrine generation, promotion, or production deployment.
 */
require('dotenv').config();

const { runPhase4A2 } = require('../services/phase4a2ClassificationGovernanceReview');

function main() {
  console.log('Phase 4A.2 — Classification governance review starting...');

  const result = runPhase4A2();

  console.log('Phase 4A.2 — Complete');
  console.log(`Chain reviews: ${result.chainReviews.length}`);
  for (const r of result.chainReviews) {
    console.log(`  ${r.topic} → ${r.reviewRecommendation} (${r.confidence})`);
  }
  console.log(`David node → ${result.davidReview.reviewRecommendation} (${result.davidReview.confidence})`);
  console.log(`Approved candidates (pending human): ${result.impact.approvedCandidateCount}`);
  console.log(`Outputs: ${result.outputDir}`);
  console.log('Entry readiness: Phase4BEntryReadiness.md');
}

main();
