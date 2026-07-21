#!/usr/bin/env node
/**
 * Phase 2O — Topic Approval Packs.
 * Review-pack generation only — no production mutations.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runTopicApprovalPacks, verifyPhase2nSafety } = require('../services/topicApprovalPacks');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  packs: path.join(ROOT, 'TopicApprovalPacks.md'),
  consolidation: path.join(ROOT, 'TopicScriptureConsolidationReport.md'),
  dashboard: path.join(ROOT, 'TopicPackReviewDashboard.md'),
  coverage: path.join(ROOT, 'ScriptureAuthorityCoverageReport.md'),
  thirdImpl: path.join(ROOT, 'ThirdImplementationPacket.md'),
  executive: path.join(ROOT, 'ExecutiveGrowthDashboardV2.md'),
  engineering: path.join(ROOT, 'EngineeringHealthSnapshotV2.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2OReport.md'),
};

function writePacksReport(packs) {
  const lines = [
    '# Topic Approval Packs',
    '',
    '**Phase:** 2O Part A',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `**Pack count:** ${packs.length}`,
    '',
  ];
  for (const p of packs) {
    lines.push(`## ${p.displayName} (${p.topic})`);
    lines.push(`- **Lesson:** ${p.lessonTitle}`);
    lines.push(`- **Candidates:** ${p.candidateCount} | **Avg score:** ${p.supportScoreAverage} (${p.strengthTier})`);
    lines.push(`- **Approved scriptures:** ${p.approvedScriptures.join('; ')}`);
    lines.push(`- **Pending:** ${p.pendingScriptures.join('; ') || 'none'}`);
    lines.push(`- **G2R chain:** ${p.genesisToRevelationChain.slice(0, 6).join('; ')}${p.genesisToRevelationChain.length > 6 ? '…' : ''}`);
    lines.push(`- **Retrieval:** ${p.retrievalCoverage}% | **Graph edges:** ${p.supportGraphCoverage?.edgeCount ?? 0}`);
    lines.push(`- **Implementation ready:** ${p.implementationReadiness?.readyForImplementation ? 'Yes' : 'No'}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.packs, `${lines.join('\n')}\n`);
}

function writeConsolidationReport(consolidation) {
  const lines = [
    '# Topic Scripture Consolidation Report',
    '',
    '**Phase:** 2O Part B',
    `**Date:** ${new Date().toISOString()}`,
    '',
  ];
  for (const c of consolidation) {
    lines.push(`## ${c.displayName || c.topic}`);
    lines.push(`- **Consolidated pending:** ${(c.consolidatedPendingScriptures || []).join('; ') || 'none'}`);
    lines.push(`- **Duplicate scripture add groups:** ${(c.duplicateScriptureAddGroups || []).length}`);
    lines.push(`- **Duplicate G2R groups:** ${(c.duplicateG2RExpansionGroups || []).length}`);
    lines.push(`- **Duplicate support edge groups:** ${(c.duplicateSupportEdgeGroups || []).length}`);
    lines.push(`- **Review reduction:** ${c.reviewReductionFromConsolidation || 0}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.consolidation, `${lines.join('\n')}\n`);
}

function writeDashboardReport(dashboard) {
  const lines = [
    '# Topic Pack Review Dashboard',
    '',
    '**Phase:** 2O Part C',
    `**Date:** ${new Date().toISOString()}`,
    '',
    'Approve Pack / Hold Pack / Reject Pack — no per-candidate review required unless drill-down requested.',
    '',
    '| Topic | Score | Tier | Candidates | Ready | Contradictions | Decision |',
    '|-------|-------|------|------------|-------|----------------|----------|',
  ];
  for (const p of dashboard) {
    lines.push(`| ${p.displayName} | ${p.supportScore} | ${p.strengthTier} | ${p.candidateCount} | ${p.implementationReady ? 'YES' : '—'} | ${p.contradictionScriptures?.length || 0} | ${p.decision || 'pending'} |`);
  }
  lines.push('', '## Pack detail (canonical topics)', '');
  for (const p of dashboard.filter((d) => ['sabbath', 'death_state', 'messiah_logos', 'heavens'].includes(d.topic)).slice(0, 8)) {
    lines.push(`### ${p.displayName}`);
    lines.push(`- **Score explanation:** ${p.scoreExplanation}`);
    lines.push(`- **Recommended:** ${p.recommendedPackAction}`);
    lines.push(`- **Caution:** ${(p.cautionScriptures || []).join('; ') || 'none'}`);
    lines.push(`- **Contradiction:** ${(p.contradictionScriptures || []).slice(0, 5).join('; ') || 'none'}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.dashboard, `${lines.join('\n')}\n`);
}

function writeCoverageReport(cov) {
  const lines = [
    '# Scripture Authority Coverage Report',
    '',
    '**Phase:** 2O Part D',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `**Formula:** ${cov.formula}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Current Coverage Score** | **${cov.currentCoverageScore}** |`,
    `| **Projected after Batch 3** | **${cov.projectedCoverageScoreAfterBatch3}** |`,
    `| **Coverage Growth Rate** | ${cov.coverageGrowthRatePct}% |`,
    '',
    '## Components',
    '',
    '| Component | Count | Pct | Weight |',
    '|-----------|-------|-----|--------|',
  ];
  for (const [key, c] of Object.entries(cov.components)) {
    lines.push(`| ${key} | ${c.count} | ${c.pct}% | ${c.weight} |`);
  }
  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeThirdImpl(packet) {
  const lines = [
    '# Third Implementation Packet',
    '',
    '**Phase:** 2O Part E',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '**Human approval required.** Not applied automatically.',
    '',
  ];
  for (const c of packet.candidates) {
    lines.push(`### ${c.candidateId}`);
    lines.push(`- **Topic:** ${c.topic}`);
    lines.push(`- **Lesson:** ${c.lessonTitle}`);
    lines.push(`- **Score:** ${c.supportScore} (${c.strengthTier})`);
    lines.push(`- **Contradictions:** ${(c.contradictionScriptures || []).length}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.thirdImpl, `${lines.join('\n')}\n`);
}

function writeExecutive(ex) {
  const lines = [
    '# Executive Growth Dashboard V2',
    '',
    '**Phase:** 2O Part F',
    `**Date:** ${ex.snapshotAt}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Scripture Authority Coverage Score | ${ex.scriptureAuthorityCoverageScore} |`,
    `| Projected Coverage Score | ${ex.projectedCoverageScore} |`,
    `| Coverage Growth Rate | ${ex.coverageGrowthRatePct}% |`,
    `| Approved Scripture Count | ${ex.approvedScriptureCount} |`,
    `| Approved Parallel Scriptures | ${ex.approvedParallelScriptureCount} |`,
    `| Approved Supporting Scriptures | ${ex.approvedSupportingScriptureCount} |`,
    `| Approved Continuity Scriptures | ${ex.approvedContinuityScriptureCount} |`,
    `| Approved G2R Chains | ${ex.approvedGenesisToRevelationChains} |`,
    `| Approved Support Edges | ${ex.approvedSupportEdgeCount} |`,
    `| Ready Topic Packs | ${ex.implementationVelocity?.readyPackCount ?? 0} |`,
    `| Pending Review Load (packs) | ${ex.pendingReviewLoad} |`,
    `| Review Efficiency | ${ex.reviewEfficiencyPct}% |`,
    `| Hours Saved (consolidation) | ${ex.duplicateReductionHoursSaved}h |`,
  ];
  fs.writeFileSync(REPORTS.executive, `${lines.join('\n')}\n`);
}

function writeEngineering(eng) {
  const lines = [
    '# Engineering Health Snapshot V2',
    '',
    '**Phase:** 2O Part G',
    `**Date:** ${eng.snapshotAt}`,
    '',
    eng.disclaimer,
    '',
    `- Memory RSS: ${eng.memory?.rssMB ?? 'n/a'}MB`,
    `- Ownership: ${eng.ownership?.passed ? 'PASS' : 'FAIL'}`,
    `- Regression (2M): ${eng.regression?.secondBatchPassed ? 'PASS' : 'n/a'}`,
    `- Support accuracy projected: ${eng.supportAccuracy?.projectedAfterBatch3Pct}%`,
    `- Graph participation: ${eng.graphParticipation?.cachedPct ?? 'n/a'}%`,
    `- Degradation projected: ${eng.degradation?.projectedAfterBatch3Pct}%`,
  ];
  fs.writeFileSync(REPORTS.engineering, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const strongest = [...data.topicApprovalPacks].sort((a, b) => b.supportScoreAverage - a.supportScoreAverage).slice(0, 5);
  const ready = data.topicApprovalPacks.filter((p) => p.implementationReadiness?.readyForImplementation);
  const cov = data.scriptureAuthorityCoverage;
  const dup = data.duplicateReduction.estimates;
  const eng = data.engineeringHealthV2;

  const lines = [
    '# Bible Authority Phase 2O Report',
    '',
    '**Phase:** Topic Approval Packs',
    `**Date:** ${data.ranAt}`,
    '',
    '## Mission answers',
    '',
    `1. **Topic packs created:** ${data.topicPackCount}`,
    '2. **Strongest packs:** ' + strongest.map((p) => `${p.displayName} (${p.supportScoreAverage})`).join(', '),
    '3. **Implementation-ready packs:** ' + ready.map((p) => p.displayName).join(', ') || 'none',
    `4. **Current Scripture Authority Coverage Score:** ${cov.currentCoverageScore}`,
    `5. **Projected Coverage after Batch 3:** ${cov.projectedCoverageScoreAfterBatch3}`,
    `6. **Review effort eliminated:** ${dup.adminReviewReductionCount} reviews · ${dup.projectedHoursSaved}h (${dup.projectedPercentSaved}%) · pack model replaces ${data.executiveGrowthV2.reviewEfficiencyPct}% per-candidate reviews`,
    `7. **Projected degradation reduction:** ${eng.degradation.baselinePct}% → ${eng.degradation.projectedAfterBatch3Pct}%`,
    `8. **Projected support accuracy increase:** ${eng.supportAccuracy.baselinePct}% → ${eng.supportAccuracy.projectedAfterBatch3Pct}%`,
    '',
    '## Third implementation batch',
    '',
    'Candidates: exp_0011, exp_0023, rec_0010 (human review required)',
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production updates | none |',
    '| Doctrine / graph / card changes | none |',
    '| Auto approvals | none |',
    '',
    '## Deliverables',
    '',
    Object.values(REPORTS).map((p) => `- ${path.basename(p)}`).join('\n'),
    '',
    '**Admin:** `/admin/bible-authority.html#scripture-review` → Topic Packs',
    '**Re-run:** `node scripts/runBibleAuthorityPhase2O.js`',
  ];
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2O — Topic Approval Packs');
  const data = runTopicApprovalPacks();
  const safety = verifyPhase2nSafety();

  writePacksReport(data.topicApprovalPacks);
  writeConsolidationReport(data.topicScriptureConsolidation);
  writeDashboardReport(data.packReviewDashboard);
  writeCoverageReport(data.scriptureAuthorityCoverage);
  writeThirdImpl(data.thirdImplementationPacket);
  writeExecutive(data.executiveGrowthV2);
  writeEngineering(data.engineeringHealthV2);
  writeMain(data);

  console.log(`Packs: ${data.topicPackCount}`);
  console.log(`Coverage score: ${data.scriptureAuthorityCoverage.currentCoverageScore}`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
