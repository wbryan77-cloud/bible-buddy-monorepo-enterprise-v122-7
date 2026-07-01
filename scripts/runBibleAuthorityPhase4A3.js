#!/usr/bin/env node
/**
 * Phase 4A.3 — Corpus certification and governance resolution.
 * Classification, governance, certification, and authorization only.
 */
require('dotenv').config();

const { runPhase4A3 } = require('../services/phase4a3CorpusCertification');

function main() {
  console.log('Phase 4A.3 — Corpus certification & governance resolution starting...');

  const result = runPhase4A3();

  console.log('Phase 4A.3 — Complete');
  console.log(`Review queue classified: ${result.classification.totalPackets}`);
  console.log(`Category counts: metadata=${result.classification.categoryCounts.metadata_only}, classification=${result.classification.categoryCounts.classification_only}, traceability=${result.classification.categoryCounts.traceability_only}, evidence=${result.classification.categoryCounts.evidence_related}, doctrinal=${result.classification.categoryCounts.human_doctrinal_review}`);
  console.log(`True review burden: ${result.classification.executiveSummary.trueReviewBurden}`);
  console.log(`Governance registered: ${result.registry.registeredCount}`);
  console.log(`Corpus certified: ${result.certification.certified}`);
  console.log(`Relationships preserved: ${result.relAudit.preserved}`);
  console.log(`Phase 4B authorization: ${result.auth.determination}`);
  console.log('Reports: Phase4BAuthorizationReport.md, BibleAuthorityPhase4A3Report.md');
}

main();
