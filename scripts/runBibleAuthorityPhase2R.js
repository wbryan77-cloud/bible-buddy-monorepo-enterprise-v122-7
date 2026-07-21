#!/usr/bin/env node
/**
 * Phase 2R — Implementation Value + Batch 4 preparation reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase2rAnalysis, FACTOR_WEIGHTS } = require('../services/phase2rImplementationValue');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  value: path.join(ROOT, 'ImplementationValueReport.md'),
  prioritization: path.join(ROOT, 'TopicPackPrioritizationReport.md'),
  batch4: path.join(ROOT, 'Batch4CandidatePacket.md'),
  trend: path.join(ROOT, 'ImplementationTrendReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2RReport.md'),
};

function writeImplementationValueReport(data) {
  const lines = [
    '# Implementation Value Report',
    '',
    '**Phase:** 2R Part A',
    `**Date:** ${data.ranAt}`,
    '',
    '## Formula',
    '',
    'Implementation Value Score (0–100) = weighted sum of six factors:',
    '',
  ];
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    lines.push(`- **${key}** — ${Math.round(weight * 100)}%`);
  }
  lines.push('', '## Top candidates by Implementation Value', '');
  lines.push('| ID | Topic | Support | Impl Value | Retrieval | Graph | Degradation Δ |', '|----|-------|---------|------------|-----------|-------|---------------|');
  for (const c of data.candidateImplementationValues.slice(0, 25)) {
    if (c.alreadyImplemented) continue;
    lines.push(`| ${c.candidateId} | ${c.topic} | ${c.supportScore} | ${c.implementationValueScore} | ${c.factors.retrievalImprovement} | ${c.factors.graphParticipation} | ${c.factors.degradationReduction} |`);
  }
  lines.push('', '## Dimension leaders', '');
  const dl = data.dimensionLeaders;
  lines.push('**Degradation reduction potential:** ' + dl.degradationReductionLeaders.slice(0, 5).map((c) => c.candidateId).join(', '));
  lines.push('**Retrieval improvement potential:** ' + dl.retrievalLeaders.slice(0, 5).map((c) => c.candidateId).join(', '));
  lines.push('**Graph participation potential:** ' + dl.graphParticipationLeaders.slice(0, 5).map((c) => c.candidateId).join(', '));
  fs.writeFileSync(REPORTS.value, `${lines.join('\n')}\n`);
}

function writeTopicPackPrioritization(data) {
  const packs = [...data.enrichedTopicPacks]
    .filter((p) => Number.isFinite(p.implementationValueScore))
    .sort((a, b) => b.implementationValueScore - a.implementationValueScore);
  const cov = data.scriptureAuthorityCoverage;
  const lines = [
    '# Topic Pack Prioritization Report',
    '',
    '**Phase:** 2R Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Scripture Authority Coverage Score:** ${cov?.currentCoverageScore ?? 'n/a'}`,
    '',
    '| Topic | Coverage | Support | Impl Value | Pending Scriptures | Pending Edges | Retrieval % | Graph Edges |',
    '|-------|----------|---------|------------|--------------------|---------------|-------------|-------------|',
  ];
  for (const p of packs) {
    const iv = p.implementationValue || {};
    lines.push(`| ${p.displayName} | ${iv.coverageScore ?? '—'} | ${p.supportScoreAverage} | ${p.implementationValueScore} | ${(p.pendingScriptures || []).length} | ${iv.pendingSupportEdges ?? p.pendingSupportEdges ?? 0} | ${p.retrievalCoverage}% | ${iv.graphCoverage?.edgeCount ?? p.supportGraphCoverage?.edgeCount ?? 0} |`);
  }
  lines.push('', '## Ranked by Implementation Value', '');
  for (const p of packs.slice(0, 12)) {
    lines.push(`### ${p.displayName} — ${p.implementationValueScore}`);
    lines.push(`- Support avg: ${p.supportScoreAverage} | Retrieval: ${p.retrievalCoverage}% | G2R: ${p.genesisToRevelationCoverage?.pct ?? '—'}%`);
    lines.push(`- Pending scriptures: ${(p.pendingScriptures || []).slice(0, 6).join('; ') || 'none'}`);
    lines.push(`- Pending support edges (est.): ${p.implementationValue?.pendingSupportEdges ?? 0}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.prioritization, `${lines.join('\n')}\n`);
}

function writeBatch4Packet(data) {
  const pool = data.batch4CandidatePool;
  const nearMiss = data.batch4NearMissPool || [];
  const lines = [
    '# Batch 4 Candidate Packet',
    '',
    '**Phase:** 2R Part C',
    `**Date:** ${data.ranAt}`,
    '',
    '**Criteria:** support score ≥ 90 · no unresolved contradictions · regression eligible · not already implemented',
    '',
    `**Qualified pool size:** ${pool.length}`,
    '',
  ];
  if (pool.length === 0) {
    lines.push(
      '**No candidates currently qualify.** All remaining high-score candidates (≥90) carry unresolved contradiction scriptures. Resolve contradictions in Scripture Authority Review before Batch 4 approval.',
      '',
    );
  }
  lines.push('| Rank | ID | Topic | Support | Impl Value | Pending Refs |', '|------|-----|-------|---------|------------|--------------|');
  pool.forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.candidateId} | ${c.topic} | ${c.supportScore} | ${c.implementationValueScore} | ${(c.pendingScriptures || []).length} |`);
  });
  if (nearMiss.length) {
    lines.push('', '## Near-miss (blocked by contradictions)', '', `**Count:** ${nearMiss.length} — human contradiction review required`, '', '| ID | Topic | Support | Impl Value | Contradictions |', '|----|-------|---------|------------|----------------|');
    for (const c of nearMiss.slice(0, 14)) {
      lines.push(`| ${c.candidateId} | ${c.topic} | ${c.supportScore} | ${c.implementationValueScore} | ${c.contradictionCount} |`);
    }
  }
  lines.push('', '## Candidate detail', '');
  for (const c of pool.slice(0, 15)) {
    lines.push(`### ${c.candidateId} — ${c.lessonTitle}`);
    lines.push(`- **Question:** ${c.question}`);
    lines.push(`- **Support:** ${c.supportScore} | **Implementation Value:** ${c.implementationValueScore}`);
    lines.push(`- **Chain:** ${(c.originalScriptureChain || []).join('; ')}`);
    lines.push(`- **Pending:** ${(c.pendingScriptures || []).join('; ') || 'none'}`);
    lines.push(`- **Human review required** — no auto-approval`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.batch4, `${lines.join('\n')}\n`);
}

function writeTrendReport(data) {
  const trend = data.implementationTrend;
  const lines = [
    '# Implementation Trend Report',
    '',
    '**Phase:** 2R Part D',
    `**Date:** ${data.ranAt}`,
    '',
    '| Batch | Class C Eliminated | Graph Matches Added | Retrieval Δ | Test Claims A/B | Questions Affected |',
    '|-------|--------------------|-----------------------|-------------|-----------------|-------------------|',
  ];
  for (const t of trend) {
    lines.push(`| ${t.batch} | ${t.classCEliminated} | ${t.graphMatchesAdded} | ${t.retrievalImprovements} | ${t.testClaimsClassAB}/${t.testClaimSamples} | ${t.questionsAffected} |`);
  }
  lines.push('', '## Observations', '');
  const best = [...trend].sort((a, b) => b.retrievalImprovements - a.retrievalImprovements)[0];
  lines.push(`- Largest retrieval gains: **${best?.batch}** (${best?.retrievalImprovements} improvements)`);
  const bestC = [...trend].sort((a, b) => b.classCEliminated - a.classCEliminated)[0];
  lines.push(`- Largest Class C reduction: **${bestC?.batch}** (${bestC?.classCEliminated} eliminated)`);
  fs.writeFileSync(REPORTS.trend, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const topPacks = [...data.enrichedTopicPacks]
    .filter((p) => Number.isFinite(p.implementationValueScore))
    .sort((a, b) => b.implementationValueScore - a.implementationValueScore)
    .slice(0, 3);
  const batch4Top = data.batch4CandidatePool.slice(0, 5);
  const trend = data.implementationTrend;
  const largestBatch = [...trend].sort((a, b) => b.retrievalImprovements - a.retrievalImprovements)[0];

  const lines = [
    '# Bible Authority Phase 2R Report',
    '',
    '**Phase:** Implementation Value + Batch 4 Preparation',
    `**Date:** ${data.ranAt}`,
    '',
    '## Mission answers',
    '',
    `1. **Highest implementation value topic packs:** ${topPacks.map((p) => p.displayName + ' (' + p.implementationValueScore + ')').join(', ')}`,
    `2. **Batch 4 candidates:** ${batch4Top.length ? batch4Top.map((c) => c.candidateId).join(', ') : 'None qualified — resolve contradictions on near-miss pool first'}`,
    `3. **Largest historical gains:** ${largestBatch?.batch ?? 'Batch 1 (2K)'} — ${largestBatch?.retrievalImprovements ?? 0} retrieval improvements`,
    `4. **Degradation reduction leaders:** ${data.dimensionLeaders.degradationReductionLeaders.slice(0, 3).map((c) => c.candidateId).join(', ')}`,
    `5. **Retrieval leaders:** ${data.dimensionLeaders.retrievalLeaders.slice(0, 3).map((c) => c.candidateId).join(', ')}`,
    `6. **Graph participation leaders:** ${data.dimensionLeaders.graphParticipationLeaders.slice(0, 3).map((c) => c.candidateId).join(', ')}`,
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Doctrine / prompts | none |',
    '| Graph updates | none |',
    '| Automatic approvals | none |',
  ];
  lines.push('', '## Deliverables', '');
  for (const p of Object.values(REPORTS)) {
    lines.push(`- ${path.basename(p)}`);
  }
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2R — Implementation Value + Batch 4 Preparation');
  const data = runPhase2rAnalysis();
  writeImplementationValueReport(data);
  writeTopicPackPrioritization(data);
  writeBatch4Packet(data);
  writeTrendReport(data);
  writeMainReport(data);
  console.log(`Batch 4 pool: ${data.batch4CandidatePool.length} candidates`);
  const topPack = [...data.enrichedTopicPacks]
    .filter((p) => Number.isFinite(p.implementationValueScore))
    .sort((a, b) => b.implementationValueScore - a.implementationValueScore)[0];
  console.log(`Top pack value: ${topPack?.displayName ?? 'n/a'} (${topPack?.implementationValueScore ?? 'n/a'})`);
  console.log('Reports written.');
}

main();
