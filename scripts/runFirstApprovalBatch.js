#!/usr/bin/env node
/**
 * Phase 2J-N — First Admin Approval Batch Test runner.
 * Staging + regression only. No production apply.
 */
const fs = require('fs');
const path = require('path');
const { runFirstApprovalBatch, BATCH_IDS } = require('../services/firstApprovalBatch');
const { runScriptureApprovalWorkflow } = require('../services/scriptureApprovalWorkflow');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  selection: path.join(ROOT, 'FirstApprovalBatchSelection.md'),
  staging: path.join(ROOT, 'FirstApprovalBatchStagingReport.md'),
  regression: path.join(ROOT, 'FirstApprovalBatchRegressionReport.md'),
  promotionPlan: path.join(ROOT, 'FirstApprovalBatchPromotionPlan.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JNReport.md'),
};

function writeSelection(result) {
  const lines = [
    '# First Approval Batch Selection',
    '',
    '**Phase:** 2J-N Part A',
    `**Date:** ${result.ranAt}`,
    `**Batch size:** ${result.selected.length} candidates`,
    '',
    '## Selection criteria',
    '',
    '- Priority topics: Sabbath, death state, Messiah/Logos',
    '- Support score ≥ 80',
    '- No unresolved contradiction witnesses',
    '- Clear Genesis→Revelation chain',
    '- Strong witness classification',
    '- Degradation reduction potential',
    '',
    '## Selected candidates',
    '',
    '| ID | Topic | Score | G2R | Contradictions | Rationale |',
    '|----|-------|-------|-----|----------------|-----------|',
  ];

  for (const c of result.selected) {
    lines.push(
      `| ${c.candidateId} | ${c.topic} | ${c.supportScore} | yes | ${c.witnessMeta.contradiction} | ${c.selectionRationale.slice(0, 60)}… |`,
    );
  }

  if (result.rejected.length) {
    lines.push('', '## Rejected from batch', '');
    for (const r of result.rejected) {
      lines.push(`- **${r.candidateId}:** ${r.reason}`);
    }
  }

  lines.push('', '## Batch IDs', '', BATCH_IDS.map((id) => `- ${id}`).join('\n'));

  fs.writeFileSync(REPORTS.selection, `${lines.join('\n')}\n`);
}

function writeStaging(result, workflowVerify) {
  const lines = [
    '# First Approval Batch Staging Report',
    '',
    '**Phase:** 2J-N Part C',
    `**Date:** ${result.ranAt}`,
    `**Reviewer:** William Bryan`,
    '',
    '## Staged candidates',
    '',
    `| ID | Topic | Score | Promotion type | Regression |`,
    `|----|-------|-------|----------------|------------|`,
  ];

  for (const s of result.staged) {
    lines.push(
      `| ${s.candidateId} | ${s.topic} | ${s.supportScore} | ${s.promotionType} | ${s.regressionPassed ? 'PASS' : 'FAIL'} |`,
    );
  }

  lines.push('', '## Workflow verification', '');
  if (workflowVerify) {
    lines.push(`- Staged via batch runner: **${result.staged.length}**`);
    lines.push(`- Staged via approval workflow: **${workflowVerify.readiness.stagedCandidates}**`);
    lines.push(`- Match: **${result.staged.length === workflowVerify.readiness.stagedCandidates ? 'YES' : 'NO'}**`);
  }
  lines.push(`- productionApplied: **false**`);
  lines.push(`- autoApplied: **false**`);

  fs.writeFileSync(REPORTS.staging, `${lines.join('\n')}\n`);
}

function writeRegression(result) {
  const lines = [
    '# First Approval Batch Regression Report',
    '',
    '**Phase:** 2J-N Part D',
    `**Date:** ${result.ranAt}`,
    '',
    '## Per-candidate regression',
    '',
    '| Candidate | Support | Traceability | Approval gate | Ownership | Memory | Overall |',
    '|-----------|---------|--------------|---------------|-----------|--------|---------|',
  ];

  for (const r of result.regressionResults) {
    lines.push(
      `| ${r.candidateId} | ${r.supportPassed ? 'PASS' : 'FAIL'} | ${r.traceabilityPassed ? 'PASS' : 'FAIL'} | ${r.approvalGatePassed ? 'PASS' : 'FAIL'} | ${r.ownershipPassed ? 'PASS' : 'FAIL'} | ${r.memoryPassed ? 'PASS' : 'FAIL'} | ${r.regressionPassed ? 'PASS' : 'FAIL'} |`,
    );
  }

  lines.push('', '## Stress subset (Phase 2I)', '');
  const s = result.stress;
  if (s.available) {
    lines.push(`- Scenarios: ${s.scenarioIds.join(', ')}`);
    lines.push(`- Turns matched: ${s.turnsMatched}`);
    lines.push(`- Degraded: ${s.degradedCount}`);
    lines.push(`- Status: **${s.passed ? 'PASS' : 'FAIL'}**`);
  } else {
    lines.push(`- ${s.reason}`);
  }

  lines.push('', '## Hard cutover ownership', '');
  const o = result.ownership;
  lines.push(`- Tests: ${o.totalTests}`);
  lines.push(`- Failed: ${o.failed}`);
  lines.push(`- Status: **${o.passed ? 'PASS' : 'FAIL'}**`);

  fs.writeFileSync(REPORTS.regression, `${lines.join('\n')}\n`);
}

function writePromotionPlan(result) {
  const lines = [
    '# First Approval Batch Promotion Plan',
    '',
    '**Phase:** 2J-N Part E',
    `**Date:** ${result.ranAt}`,
    '**Status:** PLAN ONLY — not applied to production',
    '',
  ];

  for (const p of result.promotionPlans) {
    lines.push(`## ${p.candidateId} — ${p.topic}`);
    lines.push('');
    lines.push(`**Question:** ${p.question}`);
    lines.push(`**Promotion type:** ${p.promotionType}`);
    lines.push(`**Target file:** ${p.targetFile}`);
    lines.push(`**Target change:** ${p.targetChange}`);
    lines.push(`**Doctrine impact:** ${p.doctrineImpact}`);
    lines.push(`**Support graph impact:** ${p.supportGraphImpact}`);
    lines.push(`**Evidence card impact:** ${p.evidenceCardImpact}`);
    lines.push(`**Rollback plan:** ${p.rollbackPlan}`);
    lines.push(`**Regression passed:** ${p.regressionPassed}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.promotionPlan, `${lines.join('\n')}\n`);
}

function writeMainReport(result) {
  const g = result.goNoGo;
  const lines = [
    '# Bible Authority Phase 2J-N Report',
    '',
    '**Phase:** First Admin Approval Batch Test',
    `**Date:** ${result.ranAt}`,
    `**Reviewer:** William Bryan`,
    '',
    '## Final GO / NO-GO',
    '',
    `**Decision:** ${g.goForNextPhase ? 'GO — safe for promotion in next phase' : 'NO-GO — resolve stop conditions first'}`,
    '',
    g.stopReasons.length
      ? `**Stop reasons:** ${g.stopReasons.join('; ')}`
      : '**Stop reasons:** none',
    '',
    '## Mission answers',
    '',
    `1. **Which candidates were approved?** ${g.approved.join(', ')}`,
    `2. **Which were staged?** ${g.staged.join(', ') || 'none'}`,
    `3. **Did regression pass?** ${g.regressionPassed ? 'Yes — all batch candidates' : `No — failed: ${g.regressionFailedIds.join(', ')}`}`,
    `4. **Did support accuracy improve?** ${g.supportAccuracyImproved ? 'Yes — projected improvement with staged promotions' : 'No'}`,
    `5. **Did degradation decrease?** ${g.degradationDecreased ? `Yes — projected −${g.projectedDegradationReduction}% degradation` : 'No measurable decrease yet (plan only)'}`,
    `6. **Did ownership remain intact?** ${g.ownershipIntact ? 'Yes' : 'No'}`,
    `7. **Promote in next phase?** ${g.goForNextPhase ? 'Yes — after explicit production apply phase with rollback ready' : 'No — resolve blockers first'}`,
    '',
    '## Safety',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Production applied | false |`,
    `| Graph edges unchanged | ${result.safety.graphEdgeCount} |`,
    `| Evidence cards unchanged | ${result.safety.cardCount} |`,
    `| Auto-promotion | none |`,
    '',
    '## Deliverables',
    '',
    '- FirstApprovalBatchSelection.md',
    '- docs/evidence-candidates/admin-decisions.json (updated)',
    '- docs/evidence-candidates/promotion-staging.json',
    '- FirstApprovalBatchStagingReport.md',
    '- FirstApprovalBatchRegressionReport.md',
    '- FirstApprovalBatchPromotionPlan.md',
    '- BibleAuthorityPhase2JNReport.md',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-N — First Admin Approval Batch Test');
  const result = runFirstApprovalBatch();

  const workflowVerify = runScriptureApprovalWorkflow();

  writeSelection(result);
  writeStaging(result, workflowVerify);
  writeRegression(result);
  writePromotionPlan(result);
  writeMainReport(result);

  console.log(`Approved: ${result.goNoGo.approved.join(', ')}`);
  console.log(`Staged: ${result.staged.length}`);
  console.log(`Regression: ${result.goNoGo.regressionPassed ? 'PASS' : 'FAIL'}`);
  console.log(`GO/NO-GO: ${result.goNoGo.goForNextPhase ? 'GO' : 'NO-GO'}`);
  console.log('Reports written.');
}

main();
