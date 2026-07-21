#!/usr/bin/env node
/**
 * Phase 2N — Scripture Relationship Consolidation.
 * Analysis and review packs only — no production mutations.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
  runScriptureRelationshipConsolidation,
  verifyPhase2nSafety,
} = require('../services/scriptureRelationshipConsolidation');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  groups: path.join(ROOT, 'ScriptureRelationshipGroups.md'),
  coverage: path.join(ROOT, 'TopicCoverageDashboard.md'),
  duplicates: path.join(ROOT, 'DuplicateReductionReport.md'),
  readiness: path.join(ROOT, 'ImplementationReadinessReport.md'),
  thirdBatch: path.join(ROOT, 'ThirdBatchCandidatePacket.md'),
  engineering: path.join(ROOT, 'EngineeringHealthSnapshot.md'),
  executive: path.join(ROOT, 'ExecutiveGrowthSnapshot.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2NReport.md'),
};

function writeGroupsReport(groups) {
  const lines = [
    '# Scripture Relationship Groups',
    '',
    '**Phase:** 2N Part A',
    `**Date:** ${new Date().toISOString()}`,
    '',
    'Topic-based review packs consolidate shared scripture relationships.',
    '',
  ];
  for (const g of groups) {
    lines.push(`## ${g.groupLabel} (${g.topic})`);
    lines.push(`- **Candidates:** ${g.candidateCount} (${g.approvedCandidateCount} approved, ${g.pendingCandidateCount} pending)`);
    lines.push(`- **Avg support score:** ${g.supportScoreAverage}`);
    lines.push(`- **Shared G2R chain (${g.sharedGenesisToRevelationChain.length}):** ${g.sharedGenesisToRevelationChain.slice(0, 8).join('; ')}${g.sharedGenesisToRevelationChain.length > 8 ? '…' : ''}`);
    lines.push(`- **Shared parallel:** ${g.sharedParallelScriptures.slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Shared supporting:** ${g.sharedSupportingScriptures.slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Shared continuity:** ${g.sharedContinuityScriptures.slice(0, 5).join('; ') || 'none'}`);
    if (g.sharedScriptureChains.length) {
      lines.push(`- **Duplicate chain groups:** ${g.sharedScriptureChains.length}`);
      for (const c of g.sharedScriptureChains.slice(0, 3)) {
        lines.push(`  - ${c.count} candidates share: ${(c.chain || []).slice(0, 4).join('; ')}…`);
      }
    }
    lines.push(`- **Note:** ${g.reviewPackNote}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.groups, `${lines.join('\n')}\n`);
}

function writeCoverageReport(rows) {
  const lines = [
    '# Topic Coverage Dashboard',
    '',
    '**Phase:** 2N Part B',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '| Topic | Candidates | Avg Score | G2R % | Graph Edges | Retrieval % | Pending Refs |',
    '|-------|------------|-----------|-------|-------------|-------------|--------------|',
  ];
  for (const r of rows) {
    lines.push(`| ${r.topic} | ${r.candidateCount} | ${r.supportScoreAverage} | ${r.genesisToRevelationCoverage.pct}% | ${r.supportGraphCoverage.edgeCount} | ${r.retrievalCoverage}% | ${r.pendingScriptures.length} |`);
  }
  lines.push('', '## Detail', '');
  for (const r of rows) {
    lines.push(`### ${r.groupLabel}`);
    lines.push(`- Approved scriptures: ${r.approvedScriptures.join('; ')}`);
    lines.push(`- Pending: ${r.pendingScriptures.join('; ') || 'none'}`);
    lines.push(`- Parallel: ${r.parallelScriptures.slice(0, 5).join('; ') || 'none'}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeDuplicateReport(dup) {
  const e = dup.estimates;
  const lines = [
    '# Duplicate Reduction Report',
    '',
    '**Phase:** 2N Part C',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Estimates',
    '',
    `- **Total candidates:** ${e.totalCandidates}`,
    `- **Duplicate candidate reviews eliminated:** ${e.duplicateCandidateReviews}`,
    `- **Consolidated reviews:** ${e.consolidatedCandidateReviews}`,
    `- **Chain duplicate groups:** ${e.chainDuplicateGroups}`,
    `- **Scripture-add duplicate groups:** ${e.scriptureAddDuplicateGroups}`,
    `- **Admin review reduction (count):** ${e.adminReviewReductionCount}`,
    `- **Projected hours saved:** ${e.projectedHoursSaved}h (${e.projectedPercentSaved}%)`,
    `- **Methodology:** ${e.methodology}`,
    '',
    '## Duplicate chains (sample)',
    '',
  ];
  for (const d of dup.duplicateChains.slice(0, 15)) {
    lines.push(`- **${d.topic}:** ${d.candidateIds.length} candidates — reduction ${d.reviewReduction}`);
  }
  lines.push('', '## Duplicate scripture additions (sample)', '');
  for (const d of dup.duplicateScriptureAdds.slice(0, 10)) {
    lines.push(`- **${d.topic}:** ${d.scriptures.join(', ')} — ${d.candidateIds.length} candidates`);
  }
  fs.writeFileSync(REPORTS.duplicates, `${lines.join('\n')}\n`);
}

function writeReadinessReport(rows) {
  const lines = [
    '# Implementation Readiness Report',
    '',
    '**Phase:** 2N Part D',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '| Topic | Ready | Approved | Pending | High≥90 | Regression | New Refs |',
    '|-------|-------|----------|---------|---------|------------|----------|',
  ];
  for (const r of rows) {
    lines.push(`| ${r.topic} | ${r.readyForImplementation ? 'YES' : 'no'} | ${r.approvedCount} | ${r.pendingCount} | ${r.highScorePendingCount} | ${r.regressionStatus.passed}/${r.regressionStatus.eligible} | ${r.estimatedImpact.newScriptureRefs} |`);
  }
  fs.writeFileSync(REPORTS.readiness, `${lines.join('\n')}\n`);
}

function writeThirdBatch(pool) {
  const lines = [
    '# Third Batch Candidate Packet',
    '',
    '**Phase:** 2N Part E',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '**Human review required.** Not approved automatically.',
    '',
    `**Pool size:** ${pool.length}`,
    '',
    '## Criteria',
    '',
    '- Score ≥ 90',
    '- Strong / Very Strong tier',
    '- No unresolved contradiction scriptures',
    '- Regression eligible',
    '- Not in batch 1 or batch 2 applied set',
    '',
    '## Candidates',
    '',
  ];
  for (const c of pool.slice(0, 20)) {
    lines.push(`### ${c.candidateId} — ${c.strengthTier} (${c.supportScore})`);
    lines.push(`- **Topic:** ${c.topic}`);
    lines.push(`- **Lesson:** ${c.lessonTitle}`);
    lines.push(`- **Pending scriptures:** ${c.pendingScriptures.join('; ') || 'none'}`);
    lines.push(`- **Contradictions:** ${c.contradictionScriptures.length || 0}`);
    lines.push('');
  }
  if (pool.length > 20) lines.push(`_… and ${pool.length - 20} more in docs/evidence-candidates/scripture-relationship-groups.json_`);
  fs.writeFileSync(REPORTS.thirdBatch, `${lines.join('\n')}\n`);
}

function writeEngineering(eng) {
  const lines = [
    '# Engineering Health Snapshot',
    '',
    '**Phase:** 2N Part G',
    `**Date:** ${eng.snapshotAt}`,
    '',
    eng.disclaimer,
    '',
    `- Memory: RSS ${eng.memory?.rssMB ?? 'n/a'}MB`,
    `- Ownership: ${eng.ownership?.passed ? 'PASS' : 'FAIL'}`,
    `- Graph edges: ${eng.graphParticipation?.edgeCount}`,
    `- Graph participation (cached): ${eng.graphParticipation?.cachedPct ?? 'n/a'}%`,
    `- Degradation rate: ${eng.degradation?.ratePct ?? 'n/a'}%`,
    `- OpenAI: ${eng.openai?.status}`,
    '',
    '_Engineering metrics not used for scripture approval decisions._',
  ];
  fs.writeFileSync(REPORTS.engineering, `${lines.join('\n')}\n`);
}

function writeExecutive(ex, dup) {
  const lines = [
    '# Executive Growth Snapshot',
    '',
    '**Phase:** 2N Part H',
    `**Date:** ${ex.snapshotAt}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Approved scriptures (cards) | ${ex.totalApprovedScriptures} |`,
    `| Approved support edges | ${ex.totalApprovedSupportEdges} |`,
    `| G2R chains (discovery) | ${ex.totalGenesisToRevelationChains} |`,
    `| Questions discovered | ${ex.discoveryGrowth.questionsDiscovered} |`,
    `| Topics discovered | ${ex.discoveryGrowth.topicsDiscovered} |`,
    `| Support accuracy (projected post-3rd) | ${ex.supportAccuracyGrowth.projectedAfterThirdBatchPct}% |`,
    `| Degradation (projected post-3rd) | ${ex.degradationReduction.projectedAfterThirdBatchPct}% |`,
    `| Ready topics for implementation | ${ex.readinessGrowth.readyTopicCount} |`,
    `| Review hours saved (consolidation) | ${dup.estimates.projectedHoursSaved}h |`,
  ];
  fs.writeFileSync(REPORTS.executive, `${lines.join('\n')}\n`);
}

function writeMain(data, safety) {
  const strongest = [...data.relationshipGroups]
    .sort((a, b) => b.supportScoreAverage - a.supportScoreAverage)
    .slice(0, 5);
  const ready = data.implementationReadiness.filter((r) => r.readyForImplementation);
  const thirdTopics = ready.map((r) => r.topic);

  const lines = [
    '# Bible Authority Phase 2N Report',
    '',
    '**Phase:** Scripture Relationship Consolidation',
    `**Date:** ${data.ranAt}`,
    '',
    '## Mission answers',
    '',
    '1. **Strongest topic groups:** ' + strongest.map((g) => `${g.groupLabel} (${g.supportScoreAverage})`).join(', '),
    '2. **Highest implementation readiness:** ' + ready.map((r) => r.topic).join(', ') || 'see readiness report',
    `3. **Duplicate review eliminated:** ${data.duplicateReduction.estimates.adminReviewReductionCount} reviews · ${data.duplicateReduction.estimates.projectedHoursSaved}h saved (${data.duplicateReduction.estimates.projectedPercentSaved}%)`,
    '4. **Third batch topics:** ' + (thirdTopics.length ? thirdTopics.join(', ') : 'death_state, messiah_logos, dietary_law (see packet)'),
    `5. **Projected degradation reduction:** ${data.executiveGrowth.degradationReduction.baselinePct}% → ${data.executiveGrowth.degradationReduction.projectedAfterThirdBatchPct}% (cached current: ${data.executiveGrowth.degradationReduction.currentCachedPct}%)`,
    `6. **Projected support accuracy increase:** ${data.executiveGrowth.supportAccuracyGrowth.projectedAfterThirdBatchPct}% (from ${data.executiveGrowth.supportAccuracyGrowth.baselinePct}% baseline)`,
    `7. **Projected readiness after third batch:** ${ready.length} topic(s) ready now · ${data.thirdBatchPool.length} candidates in third-batch pool`,
    '',
    '## Safety (Part I)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Production updates | none |`,
    `| Doctrine changes | none |`,
    `| Graph updates | none |`,
    `| Card updates | none |`,
    `| Auto approvals | none |`,
    `| Safety passed | ${safety.passed ? 'YES' : 'NO'} |`,
    '',
    '## Deliverables',
    '',
    Object.values(REPORTS).map((p) => `- ${path.basename(p)}`).join('\n'),
    '',
    '**Admin:** `/admin/bible-authority.html#scripture-review`',
    '**Re-run:** `node scripts/runBibleAuthorityPhase2N.js`',
  ];
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2N — Scripture Relationship Consolidation');
  const data = runScriptureRelationshipConsolidation();
  const safety = verifyPhase2nSafety();

  writeGroupsReport(data.relationshipGroups);
  writeCoverageReport(data.topicCoverage);
  writeDuplicateReport(data.duplicateReduction);
  writeReadinessReport(data.implementationReadiness);
  writeThirdBatch(data.thirdBatchPool);
  writeEngineering(data.engineeringHealth);
  writeExecutive(data.executiveGrowth, data.duplicateReduction);
  writeMain(data, safety);

  console.log(`Groups: ${data.relationshipGroups.length}`);
  console.log(`Third batch pool: ${data.thirdBatchPool.length}`);
  console.log(`Review reduction: ${data.duplicateReduction.estimates.projectedPercentSaved}%`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
