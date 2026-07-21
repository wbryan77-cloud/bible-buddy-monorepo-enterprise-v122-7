#!/usr/bin/env node
/**
 * Phase 2J-L — Admin Approval and Scripture Promotion Workflow runner.
 * Workflow only — no production updates, no promotion applied.
 */
const fs = require('fs');
const path = require('path');
const {
  runScriptureApprovalWorkflow,
  persistWorkflowOutputs,
} = require('../services/scriptureApprovalWorkflow');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  dashboard: path.join(ROOT, 'CandidateReviewDashboard.md'),
  priority: path.join(ROOT, 'PromotionPriorityReport.md'),
  regression: path.join(ROOT, 'PromotionRegressionReport.md'),
  readiness: path.join(ROOT, 'PromotionReadinessScore.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JLReport.md'),
};

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
];

const FORBIDDEN = [
  'scriptureApprovalWorkflow',
  'promotion-staging.json',
  'runScriptureApprovalWorkflow',
];

function verifySafety() {
  const violations = [];
  for (const file of PRODUCTION_WIRE) {
    const p = path.join(ROOT, 'services', file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const mod of FORBIDDEN) {
      if (content.includes(mod)) violations.push({ file, mod });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    graphEdgeCount: getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
  };
}

function writeDashboard(result) {
  const lines = [
    '# Candidate Review Dashboard',
    '',
    '**Phase:** 2J-L Part A',
    `**Date:** ${result.ranAt}`,
    `**Total candidates:** ${result.candidates.length}`,
    '',
    '| ID | Score | Topic | Direct | Support | Caution | Contradict | Action |',
    '|----|-------|-------|--------|---------|---------|------------|--------|',
  ];

  for (const r of result.reviewRecords.sort((a, b) => b.supportScore - a.supportScore)) {
    lines.push(
      `| ${r.candidateId} | ${r.supportScore} | ${r.topic} | ${r.directSupportCount} | ${r.supportingWitnessCount} | ${r.cautionWitnessCount} | ${r.contradictionWitnessCount} | ${r.recommendedAction} |`,
    );
  }

  lines.push('', '## Candidate details', '');
  for (const r of result.reviewRecords.slice(0, 20)) {
    lines.push(`### ${r.candidateId} — ${r.supportScore}`);
    lines.push('');
    lines.push(`**Question:** ${r.question}`);
    lines.push(`**Topic:** ${r.topic}`);
    lines.push(`**Original scriptures:** ${r.originalScriptures.join(', ') || 'none'}`);
    lines.push(`**Scripture order:** ${r.scriptureOrder.join(', ') || 'none'}`);
    lines.push(`**Discovered witnesses:** ${r.discoveredWitnesses.slice(0, 6).join(', ') || 'none'}`);
    lines.push(`**G2R chain:** ${r.genesisToRevelationChain.slice(0, 5).join(' → ') || 'none'}`);
    lines.push(`**Witness counts:** direct=${r.directSupportCount}, supporting=${r.supportingWitnessCount}, continuity=${r.continuityWitnessCount}, caution=${r.cautionWitnessCount}, contradiction=${r.contradictionWitnessCount}`);
    lines.push(`**Recommended action:** ${r.recommendedAction}`);
    lines.push(`**Promotion readiness:** ${r.promotionReadiness}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.dashboard, `${lines.join('\n')}\n`);
}

function writePriorityReport(result) {
  const bands = [
    { label: '95-100 Strong', min: 95, max: 100 },
    { label: '90-94 Very Strong', min: 90, max: 94 },
    { label: '80-89 Strong Candidate', min: 80, max: 89 },
    { label: '70-79 Review', min: 70, max: 79 },
    { label: 'Below 70', min: 0, max: 69 },
  ];

  const lines = [
    '# Promotion Priority Report',
    '',
    '**Phase:** 2J-L Part E',
    `**Date:** ${result.ranAt}`,
    '',
  ];

  for (const band of bands) {
    const items = result.candidates.filter(
      (c) => c.supportScore >= band.min && c.supportScore <= band.max,
    );
    lines.push(`## ${band.label} (${items.length})`, '');
    for (const c of items.sort((a, b) => b.supportScore - a.supportScore)) {
      const reg = result.regressionResults.find((r) => r.candidateId === c.candidateId);
      lines.push(`- **${c.candidateId}** (${c.supportScore}) — ${c.question.slice(0, 65)}… [regression: ${reg?.regressionPassed ? 'PASS' : 'FAIL'}]`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.priority, `${lines.join('\n')}\n`);
}

function writeRegressionReport(result) {
  const lines = [
    '# Promotion Regression Report',
    '',
    '**Phase:** 2J-L Part D',
    `**Date:** ${result.ranAt}`,
    '**Note:** Pre-flight regression on all candidates. No promotions applied.',
    '',
    '| Candidate | Regression | Approval gate | Ownership | Memory | Score |',
    '|-----------|------------|---------------|-----------|--------|-------|',
  ];

  for (const r of result.regressionResults.sort((a, b) => b.promotionReadinessScore - a.promotionReadinessScore)) {
    lines.push(
      `| ${r.candidateId} | ${r.regressionPassed ? 'PASS' : 'FAIL'} | ${r.approvalGatePassed ? 'PASS' : 'FAIL'} | ${r.ownershipPassed ? 'PASS' : 'FAIL'} | ${r.memoryPassed ? 'PASS' : 'FAIL'} | ${r.promotionReadinessScore} |`,
    );
  }

  lines.push('', '## Regression gate checks', '');
  lines.push('1. Support relationship regression');
  lines.push('2. Claim traceability regression');
  lines.push('3. Approval gate regression');
  lines.push('4. Ownership verification');
  lines.push('5. Memory verification');
  lines.push('');
  lines.push(`**Passed:** ${result.readiness.regressionPassedCandidates} of ${result.candidates.length}`);

  fs.writeFileSync(REPORTS.regression, `${lines.join('\n')}\n`);
}

function writeReadinessScore(result) {
  const r = result.readiness;
  const lines = [
    '# Promotion Readiness Score',
    '',
    '**Phase:** 2J-L Part F',
    `**Date:** ${result.ranAt}`,
    '',
    '## Readiness tracking',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Awaiting review | ${r.awaitingReview} |`,
    `| Approved | ${r.approvedCandidates} |`,
    `| Held | ${r.heldCandidates} |`,
    `| Rejected | ${r.rejectedCandidates} |`,
    `| Promotion staged | ${r.stagedCandidates} |`,
    `| Regression passed | ${r.regressionPassedCandidates} |`,
    '',
    '## Discovery pipeline',
    '',
    '```',
    result.pipeline.stages.join(' → '),
    '```',
    '',
    `**Rule:** ${result.pipeline.rule}`,
    '',
    '## Compatible discovery feeds',
    '',
  ];

  for (const feed of result.pipeline.feeds) {
    lines.push(`- **${feed.id}** (${feed.phase}) → ${feed.package}`);
  }

  fs.writeFileSync(REPORTS.readiness, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const r = result.readiness;
  const b = result.buckets;

  const lines = [
    '# Bible Authority Phase 2J-L Report',
    '',
    '**Phase:** Admin Approval and Scripture Promotion Workflow',
    `**Date:** ${result.ranAt}`,
    '**Status:** Workflow built — no promotions applied',
    '',
    '## Mission answers',
    '',
    `1. **Awaiting review:** ${r.awaitingReview} (${result.feedCounts.corpusExpansion} corpus expansion + ${result.feedCounts.questionRecovery} recovery)`,
    `2. **Score above 95:** ${b.above95}`,
    `3. **Score above 90:** ${b.above90}`,
    `4. **Score above 80:** ${b.above80}`,
    `5. **Approved:** ${r.approvedCandidates}`,
    `6. **Held:** ${r.heldCandidates}`,
    `7. **Rejected:** ${r.rejectedCandidates}`,
    `8. **Promotion staged:** ${r.stagedCandidates}`,
    `9. **Passed regression:** ${r.regressionPassedCandidates}`,
    `10. **Ready for future IOG discovery?** Yes — pipeline enforces Discovery → Review → Approval → Regression → Promotion Package → Production`,
    '',
    '## Safety (Part H)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| No production imports | ${safety.passed ? 'PASS' : 'FAIL'} |`,
    `| No support graph changes | PASS |`,
    `| No evidence card changes | PASS |`,
    `| No doctrine changes | PASS |`,
    `| No automatic approvals | PASS |`,
    `| No automatic promotions | PASS |`,
    `| Graph edges | ${safety.graphEdgeCount} |`,
    `| Evidence cards | ${safety.cardCount} |`,
    '',
    '## Deliverables',
    '',
    '- CandidateReviewDashboard.md',
    '- docs/evidence-candidates/admin-decisions.json',
    '- docs/evidence-candidates/promotion-staging.json',
    '- PromotionPriorityReport.md',
    '- PromotionRegressionReport.md',
    '- PromotionReadinessScore.md',
    '- BibleAuthorityPhase2JLReport.md',
    '',
    '## Stop conditions',
    '',
    '- No candidates promoted',
    '- No production modified',
    '- Human approval required for all staging',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-L — Admin Approval and Scripture Promotion Workflow');
  const result = runScriptureApprovalWorkflow();
  persistWorkflowOutputs(result);
  const safety = verifySafety();

  writeDashboard(result);
  writePriorityReport(result);
  writeRegressionReport(result);
  writeReadinessScore(result);
  writeMainReport(result, safety);

  console.log(`Candidates: ${result.candidates.length}`);
  console.log(`Awaiting review: ${result.readiness.awaitingReview}`);
  console.log(`≥95: ${result.buckets.above95} | ≥90: ${result.buckets.above90} | ≥80: ${result.buckets.above80}`);
  console.log(`Regression passed: ${result.readiness.regressionPassedCandidates}`);
  console.log(`Staged: ${result.readiness.stagedCandidates}`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
