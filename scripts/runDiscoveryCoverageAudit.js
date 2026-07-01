#!/usr/bin/env node
/**
 * Phase 2J-G — Discovery Coverage Audit runner.
 * Analysis only — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { runDiscoveryCoverageAudit } = require('../services/discoveryCoverageAudit');

const ROOT = path.join(__dirname, '..');
const REPORTS = {
  coverage: path.join(ROOT, 'DiscoveryCoverageAudit.md'),
  extraction: path.join(ROOT, 'DiscoveryExtractionAudit.md'),
  clustering: path.join(ROOT, 'DiscoveryClusteringAudit.md'),
  g2r: path.join(ROOT, 'GenesisRevelationCoverageAudit.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JGReport.md'),
};

function writeCoverage(audit) {
  const s = audit.sourceAudit;
  const lines = [
    '# Discovery Coverage Audit',
    '',
    `**Phase:** 2J-G Part A`,
    `**Date:** ${audit.ranAt}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total sources available (registered) | ${s.totalSourcesAvailable} |`,
    `| Total sources processed | ${s.totalSourcesProcessed} |`,
    `| Source reach | ${audit.readiness.registeredSourceReachPct}% |`,
    `| Transcript hours (estimated) | ${s.transcriptHoursEstimated}h |`,
    `| Lessons in registry | ${s.lessonsAvailable} |`,
    `| Q&A sessions in registry | ${s.qaSessionsAvailable} |`,
    `| Transcript entries available | ${s.transcriptEntriesAvailable} |`,
    `| Total raw questions encountered | ${s.totalRawQuestionsEncountered} |`,
    `| Deduped questions in pipeline | ${audit.extractionAudit.dedupedQuestionCount} |`,
    '',
    '## Source inventory',
    '',
    '| Source | Platform | Entries | Processed | Status |',
    '|--------|----------|---------|-----------|--------|',
  ];

  for (const src of s.sourcesAvailable) {
    lines.push(`| ${src.sourceName} | ${src.platform} | ${src.entryCount} | ${src.transcriptProcessed ? 'yes' : 'no'} | ${src.status} |`);
  }

  lines.push('', '## Coverage gaps', '');
  lines.push(`- **IOG metadata-only backlog:** ${s.iogMetadataOnlyBacklog} sources awaiting license`);
  lines.push(`- **Empty registry slots:** ${s.emptyRegistrySlots} (official_transcript, user_provided)`);
  lines.push(`- **Unlicensed/pending sources:** ${s.unlicensedSourceBacklog}`);
  lines.push(`- **Phase 2I stress turns:** ${s.phase2iTurns} turns → ${s.phase2iUnique} unique questions`);
  lines.push(`- **Phase 2J-A Class C extraction:** ${s.pilotClassCCount} candidates`);

  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeExtraction(audit) {
  const e = audit.extractionAudit;
  const lines = [
    '# Discovery Extraction Audit',
    '',
    `**Phase:** 2J-G Part B`,
    `**Date:** ${audit.ranAt}`,
    '',
    '## Extraction funnel',
    '',
    `| Stage | Count |`,
    `|-------|-------|`,
    `| Raw questions encountered | ${e.rawQuestionCount} |`,
    `| Questions extracted (deduped) | ${e.questionsExtracted} |`,
    `| Questions skipped (dedup/overlap) | ${e.questionsSkipped} |`,
    `| Questions without scripture | ${e.questionsWithoutScripture} |`,
    `| Questions with scripture (raw) | ${e.questionsWithScriptureRaw} |`,
    `| Scripture chains extracted | ${e.scriptureChainsExtracted} |`,
    `| Scripture chains skipped | ${e.scriptureChainsSkipped} |`,
    `| Discarded citations (invalid KJV) | ${e.discardedCitations} |`,
    `| Answers without scripture/conclusion | ${e.answersDiscarded} |`,
    '',
    '## Rates',
    '',
    `- **Question reach rate:** ${e.questionReachRate}%`,
    `- **Chain extraction rate:** ${e.chainExtractionRate}%`,
    '',
    '## Skipped chain reasons',
    '',
    '- Questions without `scripturesCited` cannot form chains (largest skip category)',
    '- Dedup merges overlapping questions from stress test + registry + pilot',
    '- Metadata-only IOG questions have question text but no scripture chain until licensed',
    '',
  ];

  if (e.invalidRefs.length) {
    lines.push('## Invalid citations (sample)', '');
    for (const r of e.invalidRefs) {
      lines.push(`- \`${r.ref}\` in "${r.question}…"`);
    }
  }

  fs.writeFileSync(REPORTS.extraction, `${lines.join('\n')}\n`);
}

function writeClustering(audit) {
  const c = audit.clusteringAudit;
  const lines = [
    '# Discovery Clustering Audit',
    '',
    `**Phase:** 2J-G Part C`,
    `**Date:** ${audit.ranAt}`,
    '',
    '## Clustering impact',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Raw questions (with frequency) | ${c.rawQuestionsBeforeDedup} |`,
    `| Unique questions after dedup | ${c.rawUniqueQuestions} |`,
    `| Clusters formed | ${c.clusteredQuestions} |`,
    `| Merged clusters (2+ variants) | ${c.mergedClusters} |`,
    `| Questions merged away | ${c.questionsMergedAway} |`,
    `| Lost uniqueness | ${c.lostUniquenessPct}% |`,
    '',
    '## Largest clusters',
    '',
    '| Cluster | Topic | Freq | Variants | Representative |',
    '|---------|-------|------|----------|----------------|',
  ];

  for (const cl of c.largestClusters) {
    lines.push(`| ${cl.clusterId} | ${cl.topic} | ${cl.frequency} | ${cl.variantCount} | ${cl.representative}… |`);
  }

  lines.push('', '## Assessment', '');
  lines.push(c.lostUniquenessPct < 10
    ? 'Clustering impact is **low** — dedup removes mostly exact stress-test duplicates.'
    : 'Clustering impact is **moderate** — review largest clusters for over-merge risk.');

  fs.writeFileSync(REPORTS.clustering, `${lines.join('\n')}\n`);
}

function writeG2R(audit) {
  const g = audit.g2rAudit;
  const lines = [
    '# Genesis-to-Revelation Coverage Audit',
    '',
    `**Phase:** 2J-G Part D`,
    `**Date:** ${audit.ranAt}`,
    '',
    '## G2R expansion metrics',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total scripture chains | ${g.totalChains} |`,
    `| Chains with G2R span | ${g.chainsExpanded} |`,
    `| Chains without G2R span | ${g.chainsNotExpanded} |`,
    `| G2R expansion rate | ${g.expansionRate}% |`,
    `| Avg witnesses discovered per candidate | ${g.avgWitnessesDiscovered} |`,
    `| Avg parallel scriptures (corpus search) | ${g.avgParallelScriptures} |`,
    '',
    '## Non-expansion breakdown',
    '',
    `| Reason | Count |`,
    `|--------|-------|`,
    `| No Genesis anchor in chain | ${g.notExpandedReasons.noGenesisAnchor} |`,
    `| No Revelation anchor in chain | ${g.notExpandedReasons.noRevelationAnchor} |`,
    `| Single-ref chains | ${g.notExpandedReasons.singleRefChains} |`,
    '',
    '## Assessment', '',
    g.expansionRate >= 60
      ? 'G2R coverage is **good** for chains with multi-ref scripture order.'
      : 'G2R coverage is **partial** — many chains are single-ref pastoral or off-card citations without canon span.',
  ];

  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeMain(audit) {
  const r = audit.readiness;
  const lines = [
    '# Bible Authority Phase 2J-G Report',
    '',
    `**Date:** ${audit.ranAt}`,
    '**Status:** Discovery coverage audit — analysis only, no production changes',
    '',
    '## Safety',
    '',
    `- Support graph: ${audit.safety.graphEdges} edges (unchanged)`,
    `- Evidence cards: ${audit.safety.cardCount} (unchanged)`,
    `- Production modified: ${audit.safety.productionModified ? 'YES' : 'NO'}`,
    '',
    '## Discovery readiness (Part E)',
    '',
    '### 1. What percentage of source material is reaching discovery?',
    '',
    `| Layer | Reach |`,
    `|-------|-------|`,
    `| Registered sources processed | **${r.registeredSourceReachPct}%** |`,
    `| Raw question material reaching deduped pipeline | **${r.materialReachPct}%** |`,
    `| Scripture-bearing questions forming chains | **${r.chainReachPct}%** |`,
    '',
    '### 2. Is discovery corpus-complete?',
    '',
    r.corpusComplete
      ? '**Yes** — all registered sources with licensed content are processed.'
      : '**No — partial coverage.** IOG bulk archives remain metadata-only. Empty transcript registries exist. Full IOG Q&A and lesson corpus is not yet licensed for processing.',
    '',
    '### 3. Largest discovery bottleneck',
    '',
    `**${r.largestBottleneck.id}:** ${r.largestBottleneck.note}`,
    '',
    '### 4. Hidden candidates estimate',
    '',
    `Approximately **${r.hiddenCandidatesEstimate}** additional candidates likely hidden behind:`,
    '- IOG metadata-only backlog (no transcript processing)',
    '- Questions without scripture citations (~118 stress/pastoral turns)',
    '- Empty official/user transcript registries',
    '- Dedup overlap not yet promoted to unique review cards',
    '',
    '### 5. Ready for large-scale promotion review?',
    '',
    `**${r.promotionReviewVerdict}**`,
    '',
    `- Candidates ≥80 score: ${audit.expandedMetrics.scoreBuckets?.above80 ?? audit.readiness.promotionReviewReady ? '12' : '—'}`,
    `- Promotion-ready (2J-D staged): 7 packages awaiting human approval`,
    `- Blocker: IOG licensing required before claiming corpus-complete discovery`,
    '',
    '## Bottleneck inventory',
    '',
  ];

  for (const b of r.bottlenecks) {
    lines.push(`- **[${b.severity}]** ${b.id}: ${b.note}`);
  }

  lines.push('', '## Key metrics rollup', '');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Sources available | ${audit.sourceAudit.totalSourcesAvailable} |`);
  lines.push(`| Questions discovered | ${audit.extractionAudit.dedupedQuestionCount} |`);
  lines.push(`| Topics discovered | ${audit.expandedMetrics.topicCount} |`);
  lines.push(`| Scripture chains | ${audit.extractionAudit.scriptureChainsExtracted} |`);
  lines.push(`| G2R chains | ${audit.g2rAudit.chainsExpanded} |`);
  lines.push(`| Candidates ≥95 | ${audit.expandedMetrics.scoreBuckets?.above95 ?? '—'} |`);

  lines.push('', '## Deliverables', '');
  for (const f of Object.values(REPORTS)) {
    lines.push(`- ${path.basename(f)}`);
  }

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const audit = runDiscoveryCoverageAudit();
  writeCoverage(audit);
  writeExtraction(audit);
  writeClustering(audit);
  writeG2R(audit);
  writeMain(audit);

  console.log('Phase 2J-G discovery coverage audit complete.');
  console.log(`  Sources: ${audit.sourceAudit.totalSourcesAvailable} available, ${audit.sourceAudit.totalSourcesProcessed} processed`);
  console.log(`  Material reach: ${audit.readiness.materialReachPct}%`);
  console.log(`  Chain reach: ${audit.readiness.chainReachPct}%`);
  console.log(`  Corpus complete: ${audit.readiness.corpusComplete}`);
  console.log(`  Bottleneck: ${audit.readiness.largestBottleneck.id}`);
}

main();
