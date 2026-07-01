#!/usr/bin/env node
/**
 * Phase 3C — Corpus discovery depth audit reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3cDiscoveryDepthAudit } = require('../services/phase3cDiscoveryDepthAudit');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  questionDepth: path.join(ROOT, 'QuestionDepthAudit.md'),
  topicCollapse: path.join(ROOT, 'TopicCollapseAudit.md'),
  missingTopic: path.join(ROOT, 'MissingTopicAudit.md'),
  sourceCoverage: path.join(ROOT, 'SourceCoverageAudit.md'),
  expansion: path.join(ROOT, 'DiscoveryExpansionReadiness.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3CReport.md'),
};

function writeQuestionDepth(data) {
  const t = data.depthAudit.totals;
  const lines = [
    '# Question Depth Audit',
    '',
    '**Phase:** 3C Part A',
    `**Date:** ${data.ranAt}`,
    '',
    '## Totals',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Total raw questions (all sources, pre-merge) | ${t.totalRawQuestions} |`,
    `| Deduplicated within sources (unique text) | ${t.totalDeduplicatedWithinSource} |`,
    `| Phase 3A final questions | ${t.totalPhase3aQuestions} |`,
    `| Discarded from raw (not in Phase 3A) | ${t.totalDiscardedFromRaw} |`,
    `| Percentage retained (raw → Phase 3A) | ${t.percentageRetainedFromRaw}% |`,
    `| Percentage retained (unique → Phase 3A) | ${t.percentageRetainedFromUnique}% |`,
    '',
    '## Per source',
    '',
    '| Source | Lessons | Q&A | Raw | Deduped | Retained | Discarded | Retention % | Est. corpus |',
    '|--------|---------|-----|-----|---------|----------|-----------|-------------|-------------|',
  ];

  for (const s of data.depthAudit.perSource) {
    lines.push(
      `| ${s.sourceName?.slice(0, 40) || s.sourceId} | ${s.lessonsProcessed} | ${s.qaSessionsProcessed} | ${s.rawQuestionsFound} | ${s.deduplicatedWithinSource} | ${s.retainedInPhase3a} | ${s.discardedQuestions} | ${s.retentionPct}% | ${s.estimatedCorpusQuestions} |`,
    );
  }

  lines.push('', '## Notes', '');
  for (const s of data.depthAudit.perSource.filter((x) => x.volumeNote).slice(0, 8)) {
    lines.push(`- **${s.sourceName}:** ${s.volumeNote}`);
  }

  fs.writeFileSync(REPORTS.questionDepth, `${lines.join('\n')}\n`);
}

function writeTopicCollapse(data) {
  const c = data.collapseAudit;
  const lines = [
    '# Topic Collapse Audit',
    '',
    '**Phase:** 3C Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Topics in Phase 3A:** ${c.topicKeywordMapSize}`,
    `**Open/mixed questions:** ${c.openOrMixedCount}`,
    '',
    '## Topic distribution',
    '',
    '| Topic | Questions | Sources | Sample |',
    '|-------|-----------|---------|--------|',
  ];

  for (const t of c.topicSummaries) {
    const sample = t.sampleQuestions[0]?.slice(0, 55) || '';
    lines.push(`| ${t.displayName} | ${t.questionCount} | ${t.sourceCount} | ${sample}… |`);
  }

  lines.push('', '## Collapse watchlist (subtopics vs assignment)', '');
  for (const item of c.collapseCandidates) {
    lines.push(`### ${item.subtopic}`);
    lines.push(`- Matches: ${item.matchCount}`);
    lines.push(`- Assigned topics: ${item.assignedTopics.join(', ')}`);
    lines.push(`- Possibly collapsed: ${item.possiblyCollapsed ? 'yes' : 'no'}`);
    for (const q of item.sampleQuestions) {
      lines.push(`  - [${q.topic}] ${q.question?.slice(0, 70)}`);
    }
    lines.push('');
  }

  if (data.clustering) {
    lines.push('## Similarity clustering (Phase 3A questions)', '');
    lines.push(`Clusters: ${data.clustering.clusters} · Merged by similarity: ${data.clustering.questionsMergedBySimilarity}`);
    lines.push('');
    for (const cl of data.clustering.largestClusters) {
      lines.push(`- **${cl.clusterId}** (${cl.topic}, freq ${cl.frequency}, ${cl.variantCount} variants): ${cl.representative}…`);
    }
  }

  fs.writeFileSync(REPORTS.topicCollapse, `${lines.join('\n')}\n`);
}

function writeMissingTopic(data) {
  const m = data.missingAudit;
  const lines = [
    '# Missing Topic Audit',
    '',
    '**Phase:** 3C Part C',
    `**Date:** ${data.ranAt}`,
    '',
    '## Summary',
    '',
    '| Category | Discovered | Partial | Missing |',
    '|----------|------------|---------|---------|',
    `| People | ${m.summary.people.discovered} | ${m.summary.people.partial} | ${m.summary.people.missing} |`,
    `| Prophecy | ${m.summary.prophecy.discovered} | ${m.summary.prophecy.partial} | ${m.summary.prophecy.missing} |`,
    `| Doctrine | ${m.summary.doctrine.discovered} | ${m.summary.doctrine.partial} | ${m.summary.doctrine.missing} |`,
    '',
  ];

  for (const category of ['people', 'prophecy', 'doctrine']) {
    lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)}`, '');
    lines.push('| Topic | Raw matches | Phase 3A | With scripture | Status |');
    lines.push('|-------|-------------|----------|----------------|--------|');
    for (const item of m[category]) {
      lines.push(`| ${item.key} | ${item.rawMatches} | ${item.phase3aMatches} | ${item.withScripture} | ${item.status} |`);
    }
    lines.push('');
    const partialOrMissing = m[category].filter((x) => x.status !== 'discovered');
    if (partialOrMissing.length) {
      lines.push('**Samples (partial/missing):**');
      for (const item of partialOrMissing.slice(0, 6)) {
        if (item.sampleQuestions[0]) {
          lines.push(`- ${item.key}: ${item.sampleQuestions[0].question?.slice(0, 80)}`);
        } else {
          lines.push(`- ${item.key}: no matches in loaded corpus`);
        }
      }
      lines.push('');
    }
  }

  fs.writeFileSync(REPORTS.missingTopic, `${lines.join('\n')}\n`);
}

function writeSourceCoverage(data) {
  const c = data.coverageAudit;
  const lines = [
    '# Source Coverage Audit',
    '',
    '**Phase:** 3C Part D',
    `**Date:** ${data.ranAt}`,
    '',
    '## Verdict',
    '',
    `**${c.verdict === 'B_registry_loaded_material_only' ? 'B) Registry-loaded material only' : 'Partial corpus'}** — ${c.verdictDetail}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Registered sources | ${c.totals.registeredSources} |`,
    `| Estimated corpus volume | ${c.totals.totalEstimatedVolume} questions |`,
    `| Processed volume | ${c.totals.totalProcessedVolume} |`,
    `| Overall processed % | ${c.totals.overallProcessedPct}% |`,
    `| Registry-only sources | ${c.totals.registryOnlySources} |`,
    `| Not processed sources | ${c.totals.notProcessedSources} |`,
    '',
    '## Per source',
    '',
    '| Source | Registry entries | Processed | Est. volume | % processed | Mode |',
    '|--------|------------------|-----------|-------------|-------------|------|',
  ];

  for (const s of c.perSource) {
    lines.push(
      `| ${s.sourceName?.slice(0, 36) || s.sourceId} | ${s.registryEntryCount} | ${s.processedVolume} | ${s.estimatedContentVolume} | ${s.percentageProcessed}% | ${s.discoveryMode} |`,
    );
  }

  fs.writeFileSync(REPORTS.sourceCoverage, `${lines.join('\n')}\n`);
}

function writeExpansionReadiness(data) {
  const e = data.expansionReadiness;
  const lines = [
    '# Discovery Expansion Readiness',
    '',
    '**Phase:** 3C Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '**Projection only — assumes registry/transcript loading, not new engine code.**',
    '',
    '| Metric | Current (3A) | Projected (full corpus load) | Uplift |',
    '|--------|--------------|------------------------------|--------|',
    `| Questions | ${e.current.questions} | ${e.projected.questions} | +${e.uplift.questions} |`,
    `| Topics | ${e.current.topics} | ${e.projected.topics} | +${e.uplift.topics} |`,
    `| Scripture chains | ${e.current.chains} | ${e.projected.chains} | +${e.uplift.chains} |`,
    `| G2R expansions | ${e.current.g2rExpansions} | ${e.projected.g2rExpansions} | +${e.uplift.g2rExpansions} |`,
    '',
    '## Assumptions',
    '',
    ...e.assumptions.map((a) => `- ${a}`),
    '',
    '## Bottlenecks',
    '',
  ];

  for (const b of e.bottlenecks || []) {
    lines.push(`- **${b.id}** (${b.severity}): ${b.note}`);
  }

  lines.push('', `**Hidden candidates estimate:** ${e.hiddenCandidatesEstimate}`, '');

  fs.writeFileSync(REPORTS.expansion, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const ex = data.executive;
  const lines = [
    '# Bible Authority Phase 3C Report',
    '',
    `**Date:** ${data.ranAt}`,
    `**Phase 3A audited:** ${data.phase3aRanAt || 'n/a'}`,
    '',
    '## Executive answers',
    '',
    '### 1. Are we discovering the full corpus?',
    `**No** — ${ex.discoveringFullCorpusDetail}`,
    '',
    '### 2. Are topics collapsing?',
    `${ex.topicsCollapsing ? 'Yes' : 'Partially'} — ${ex.topicsCollapsingDetail}`,
    '',
    '### 3. Are questions being over-deduplicated?',
    `${ex.overDeduplicated ? 'Yes' : 'Moderate'} — ${ex.overDeduplicatedDetail}`,
    '',
    '### 4. Are major doctrine topics missing?',
    `${ex.majorDoctrineMissing ? 'Yes' : 'Partially'} — see MissingTopicAudit.md`,
    '',
    '### 5. Are major prophecy topics missing?',
    `${ex.majorProphecyMissing ? 'Yes' : 'Partially'} — most prophecy subtopics absent or single-match only`,
    '',
    '### 6. Are major people studies missing?',
    `${ex.majorPeopleMissing ? 'Yes' : 'Partially'} — ${ex.majorPeopleMissing ? '10+ people topics missing from loaded corpus' : 'some people appear in stress tests only'}`,
    '',
    '### 7. Is discovery breadth sufficient for implementation?',
    `**No** — ${ex.discoveryBreadthDetail}`,
    '',
    '### 8. Implementation now or expand discovery first?',
    `**${ex.implementationTiming === 'expand_discovery_first' ? 'Expand discovery breadth first' : 'Continue implementation'}** — ${ex.implementationTimingDetail}`,
    '',
    '## Key metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Raw questions (all sources) | ${ex.totals.totalRawQuestions} |`,
    `| Phase 3A questions | ${ex.totals.totalPhase3aQuestions} |`,
    `| Retention rate | ${ex.totals.percentageRetainedFromRaw}% |`,
    `| Projected questions (full load) | ${ex.expansionReadiness.questions} |`,
    `| Projected topics (full load) | ${ex.expansionReadiness.topics} |`,
  ];

  lines.push(
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| New discovery run | none |',
    '| Implementation | none |',
    '',
    '## Deliverables',
    '',
    '- QuestionDepthAudit.md',
    '- TopicCollapseAudit.md',
    '- MissingTopicAudit.md',
    '- SourceCoverageAudit.md',
    '- DiscoveryExpansionReadiness.md',
    '- BibleAuthorityPhase3CReport.md',
  );

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const data = runPhase3cDiscoveryDepthAudit();
  writeQuestionDepth(data);
  writeTopicCollapse(data);
  writeMissingTopic(data);
  writeSourceCoverage(data);
  writeExpansionReadiness(data);
  writeMainReport(data);

  console.log('Phase 3C — Corpus Discovery Depth Audit');
  console.log(`Raw: ${data.depthAudit.totals.totalRawQuestions} → Phase 3A: ${data.depthAudit.totals.totalPhase3aQuestions}`);
  console.log(`Coverage: ${data.coverageAudit.totals.overallProcessedPct}% of estimated corpus`);
  console.log(`Projected questions: ${data.expansionReadiness.projected.questions}`);
  console.log('Reports written.');
}

main();
