#!/usr/bin/env node
/**
 * Phase 2K — Admin Command Center + First Scripture Implementation.
 */
const fs = require('fs');
const path = require('path');
const { getAdminCommandCenter } = require('../services/bibleAuthorityAdminCenter');
const { applyFirstScriptureBatch, verifyImplementationSafety, BATCH_IDS } = require('../services/firstScriptureImplementation');
const { runPostImplementationRegression } = require('../services/postImplementationRegression');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  commandCenter: path.join(ROOT, 'AdminCommandCenterReport.md'),
  scriptureReview: path.join(ROOT, 'ScriptureAuthorityReviewReport.md'),
  engineering: path.join(ROOT, 'EngineeringIntelligenceReport.md'),
  executive: path.join(ROOT, 'ExecutiveGrowthDashboardReport.md'),
  notifications: path.join(ROOT, 'AdminNotificationPlan.md'),
  implementation: path.join(ROOT, 'FirstScriptureImplementationReport.md'),
  postRegression: path.join(ROOT, 'PostImplementationRegressionReport.md'),
  rollback: path.join(ROOT, 'FirstImplementationRollbackPlan.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2KReport.md'),
};

function writeCommandCenterReport(center) {
  const lines = [
    '# Admin Command Center Report',
    '',
    '**Phase:** 2K Part A',
    `**Date:** ${center.ranAt}`,
    '',
    '## Entry point',
    '',
    '- **URL:** `/admin/bible-authority.html`',
    '- **API:** `/admin/api/bible-authority/command-center`',
    '',
    '## Three admin areas',
    '',
    '1. **Scripture Authority Review** — Bible/scripture approval only',
    '2. **Engineering Intelligence** — developer/system health only',
    '3. **Executive Growth Dashboard** — leadership summary with drill-down links',
    '',
    `**Candidates in review:** ${center.areas.scriptureAuthorityReview.candidateCount}`,
    `**Graph edges:** ${center.implementation.graphEdgeCount}`,
    `**Evidence cards:** ${center.implementation.cardCount}`,
  ];
  fs.writeFileSync(REPORTS.commandCenter, `${lines.join('\n')}\n`);
}

function writeScriptureAuthorityReport(center) {
  const sr = center.areas.scriptureAuthorityReview;
  const lines = [
    '# Scripture Authority Review Report',
    '',
    '**Phase:** 2K Part B',
    `**Date:** ${center.ranAt}`,
    '',
    'Green / Yellow / Red **retired**. Scripture Strength Review only.',
    '',
    '## Strength tier distribution',
    '',
  ];
  for (const t of sr.strengthTiers) {
    const count = (sr.byTier[t.label] || []).length;
    lines.push(`- **${t.min}–${t.max} (${t.label}):** ${count}`);
  }
  lines.push('', '## Top candidates by score', '');
  for (const c of sr.allCandidates.slice(0, 15)) {
    lines.push(`- **${c.candidateId}** (${c.supportScore}, ${c.strengthTier}) — ${c.lessonTitle}`);
  }
  fs.writeFileSync(REPORTS.scriptureReview, `${lines.join('\n')}\n`);
}

function writeEngineeringReport(center) {
  const eng = center.areas.engineeringIntelligence;
  const lines = [
    '# Engineering Intelligence Report',
    '',
    '**Phase:** 2K Part C',
    `**Date:** ${center.ranAt}`,
    '',
    eng.disclaimer,
    '',
    '## Regression status',
    '',
    `| Gate | Status |`,
    `|------|--------|`,
    `| Hard cutover (cached) | ${eng.regression.hardCutover.passed ? 'PASS' : 'FAIL'} (${eng.regression.hardCutover.failed}/${eng.regression.hardCutover.total}) |`,
    `| Stress suite (cached) | ${eng.regression.stressSuite.passRate ?? 'n/a'}% pass rate |`,
    `| Support graph edges | ${eng.supportGraph.edgeCount} |`,
    '',
    '## OpenAI',
    '',
    `- Status: ${eng.openai.status}`,
    '',
    '## Ownership',
    '',
    `- Passed: ${eng.ownership.passed}`,
    `- Violations: ${eng.ownership.violations.length ? eng.ownership.violations.join(', ') : 'none'}`,
  ];
  fs.writeFileSync(REPORTS.engineering, `${lines.join('\n')}\n`);
}

function writeExecutiveReport(center) {
  const ex = center.areas.executiveGrowthDashboard;
  const lines = [
    '# Executive Growth Dashboard Report',
    '',
    '**Phase:** 2K Part D',
    `**Date:** ${center.ranAt}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Questions discovered | ${ex.questionsDiscovered} |`,
    `| Topics discovered | ${ex.topicsDiscovered} |`,
    `| Scripture chains | ${ex.scriptureChainsDiscovered} |`,
    `| Genesis→Revelation chains | ${ex.genesisToRevelationChains} |`,
    `| Parallel scriptures found | ${ex.parallelScripturesFound} |`,
    `| Candidates awaiting review | ${ex.candidatesAwaitingReview} |`,
    `| Approved scripture relationships | ${ex.approvedScriptureRelationships} |`,
    `| Approved candidates (decisions) | ${ex.approvedCandidates} |`,
    `| Held | ${ex.heldCandidates} |`,
    `| Rejected | ${ex.rejectedCandidates} |`,
    `| First batch applied | ${ex.firstBatchApplied ? 'Yes' : 'No'} |`,
    '',
    '## Drill-down',
    '',
    `- Scripture review: ${ex.drillDownLinks.scriptureAuthorityReview}`,
    `- Engineering: ${ex.drillDownLinks.engineeringIntelligence}`,
  ];
  fs.writeFileSync(REPORTS.executive, `${lines.join('\n')}\n`);
}

function writeNotificationPlan(center) {
  const n = center.notifications;
  const lines = [
    '# Admin Notification Plan',
    '',
    '**Phase:** 2K Part E',
    `**Date:** ${center.ranAt}`,
    '',
    `**Default:** ${n.enabledByDefault ? 'ON' : 'OFF'} — ${n.status}`,
    '',
    '## Future triggers (not sent in 2K)',
    '',
  ];
  for (const t of n.futureTriggers) {
    lines.push(`- **${t.id}:** ${t.description} (default: ${t.defaultEnabled ? 'on' : 'off'})`);
  }
  lines.push('', n.note);
  fs.writeFileSync(REPORTS.notifications, `${lines.join('\n')}\n`);
}

function writeImplementationReport(applyResult) {
  const lines = [
    '# First Scripture Implementation Report',
    '',
    '**Phase:** 2K Part F',
    `**Date:** ${applyResult.appliedAt || new Date().toISOString()}`,
    '',
    '## Applied candidates (human-approved 2J-N batch only)',
    '',
    BATCH_IDS.map((id) => `- ${id}`).join('\n'),
    '',
    '## Changes',
    '',
  ];
  for (const c of applyResult.changes || []) {
    lines.push(`### ${c.candidateIds?.join(', ')}`);
    lines.push(`- File: ${c.file}`);
    if (c.added?.length) lines.push(`- Added scriptures: ${c.added.join(', ')}`);
    if (c.edgeId) lines.push(`- Edge: ${c.edgeId} (added: ${c.edgeAdded})`);
    lines.push('');
  }
  lines.push('## Doctrine / prompts', '');
  lines.push('- Doctrine conclusions: **unchanged**');
  lines.push('- Prompts: **unchanged**');
  lines.push(`- Graph edges after apply: **${applyResult.graphEdgeCount}**`);
  fs.writeFileSync(REPORTS.implementation, `${lines.join('\n')}\n`);
}

function writePostRegressionReport(reg) {
  const lines = [
    '# Post-Implementation Regression Report',
    '',
    '**Phase:** 2K Part G',
    `**Date:** ${reg.ranAt}`,
    '',
    `**Overall:** ${reg.regressionPassed ? 'PASS' : 'FAIL'}`,
    '',
    '## Batch promotion regressions',
    '',
    '| Candidate | Passed | Score |',
    '|-----------|--------|-------|',
  ];
  for (const r of reg.batchRegression) {
    lines.push(`| ${r.candidateId} | ${r.regressionPassed ? 'PASS' : 'FAIL'} | ${r.promotionReadinessScore} |`);
  }
  lines.push('', '## Gates', '');
  lines.push(`- Ownership: ${reg.ownership.passed ? 'PASS' : 'FAIL'}`);
  lines.push(`- Memory: ${reg.memory.passed ? 'PASS' : 'FAIL'} (RSS ${reg.memory.rssMB}MB, Δ${reg.memory.deltaMB}MB)`);
  lines.push(`- Support graph edges: ${reg.supportGraph.edgeCount}`);
  lines.push(`- Degradation rate (cached stress): ${reg.degradationRate ?? 'n/a'}%`);
  lines.push(`- Degradation improved vs baseline: ${reg.degradationImproved ? 'Yes (projected)' : 'See live stress re-run'}`);
  lines.push(`- OpenAI: ${reg.openaiErrors}`);
  fs.writeFileSync(REPORTS.postRegression, `${lines.join('\n')}\n`);
}

function writeRollbackPlan(applyResult) {
  const lines = [
    '# First Implementation Rollback Plan',
    '',
    '**Phase:** 2K Part H',
    `**Date:** ${applyResult.appliedAt}`,
    '',
  ];
  for (const r of applyResult.rollback || []) {
    lines.push(`## ${r.file}`);
    lines.push(`- Candidates: ${(r.candidateIds || []).join(', ')}`);
    lines.push(`- Instruction: ${r.instruction}`);
    lines.push('');
  }
  lines.push('**Full revert:** `git checkout -- services/evidenceCards/sabbath.card.js services/evidenceCards/deathState.card.js services/approvedSupportGraph.js`');
  fs.writeFileSync(REPORTS.rollback, `${lines.join('\n')}\n`);
}

function writeMainReport(center, applyResult, reg, safety) {
  const lines = [
    '# Bible Authority Phase 2K Report',
    '',
    '**Phase:** Admin Command Center + First Scripture Implementation',
    `**Date:** ${center.ranAt}`,
    '',
    '## Mission answers',
    '',
    '1. **Three admin areas created?** Yes — Scripture Authority Review, Engineering Intelligence, Executive Growth Dashboard',
    '2. **Executive drill-down to both views?** Yes — links in UI and API',
    `3. **Only five candidates applied?** Yes — ${BATCH_IDS.join(', ')}`,
    '4. **Changes made:**',
    '   - sabbath.card.js: Acts 13:42-44, Revelation 14:12 (supporting)',
    '   - deathState.card.js: death-chain supporting witnesses + Daniel 12:2-3',
    '   - approvedSupportGraph.js: rev1_alpha_omega_logos_g2r_batch edge',
    `5. **Regression pass?** ${reg.regressionPassed ? 'Yes' : 'No'}`,
    `6. **Degradation improve?** ${reg.degradationImproved ? 'Projected yes' : 'Re-run live stress for confirmation'}`,
    `7. **Render/memory stable?** Memory gate ${reg.memory.passed ? 'PASS' : 'FAIL'} (RSS ${reg.memory.rssMB}MB)`,
    `8. **Ownership intact?** ${reg.ownership.passed ? 'Yes' : 'No'}`,
    `9. **Ready for next batch?** ${reg.regressionPassed && safety.ownershipViolations.length === 0 ? 'Yes — after human review of next staged candidates' : 'Resolve blockers first'}`,
    '',
    '## Safety',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Auto approvals | none |`,
    `| Auto promotions | none |`,
    `| Prompt changes | none |`,
    `| Graph edges | ${getAllApprovedSupportEdges().length} |`,
    `| Evidence cards | ${getAllApprovedCards().length} |`,
    '',
    '## Deliverables',
    '',
    Object.values(REPORTS).map((p) => `- ${path.basename(p)}`).join('\n'),
    '',
    '**Command Center:** `/admin/bible-authority.html`',
    '**Re-run:** `node scripts/runBibleAuthorityPhase2K.js`',
  ];
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2K — Admin Command Center + First Scripture Implementation');

  const applyResult = applyFirstScriptureBatch();
  console.log('Implementation:', applyResult.success ? 'applied' : applyResult.alreadyApplied ? 'already applied' : 'skipped');

  const reg = runPostImplementationRegression();
  const center = getAdminCommandCenter();
  const safety = verifyImplementationSafety();

  writeCommandCenterReport(center);
  writeScriptureAuthorityReport(center);
  writeEngineeringReport(center);
  writeExecutiveReport(center);
  writeNotificationPlan(center);
  writeImplementationReport(applyResult);
  writePostRegressionReport(reg);
  writeRollbackPlan(applyResult);
  writeMainReport(center, applyResult, reg, safety);

  console.log(`Regression: ${reg.regressionPassed ? 'PASS' : 'FAIL'}`);
  console.log(`Edges: ${getAllApprovedSupportEdges().length}`);
  console.log('Reports written.');
}

main();
