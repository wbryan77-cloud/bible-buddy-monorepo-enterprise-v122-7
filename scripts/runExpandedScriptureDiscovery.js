#!/usr/bin/env node
/**
 * Phase 2J-F — Full Discovery Source Expansion runner.
 * Discovery only — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { runExpandedScriptureDiscovery } = require('../services/expandedScriptureDiscovery');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');
const OUT_PACKAGE = path.join(ROOT, 'docs', 'evidence-candidates', 'BulkDiscoveryAdminReviewPackageV2.json');
const OUT_QUEUE = path.join(ROOT, 'docs', 'evidence-candidates', 'expanded-discovery-queue.jsonl');

const REPORTS = {
  sources: path.join(ROOT, 'ExpandedDiscoverySourceInventory.md'),
  topics: path.join(ROOT, 'OpenTopicDiscoveryReport.md'),
  g2r: path.join(ROOT, 'GenesisToRevelationExpansionV2.md'),
  ranking: path.join(ROOT, 'DiscoverySupportRanking.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JFReport.md'),
};

const PRODUCTION_WIRE = [
  'buddyBrain.js', 'retrievalEvidencePack.js', 'approvedSupportGraph.js',
  'claimToScriptureValidator.js', 'doctrineRegistry.js',
];
const FORBIDDEN = ['expandedScriptureDiscovery', 'BulkDiscoveryAdminReviewPackageV2'];

function verifySafety(candidates) {
  const violations = [];
  for (const file of PRODUCTION_WIRE) {
    const p = path.join(ROOT, 'services', file);
    if (!fs.existsSync(p)) continue;
    const c = fs.readFileSync(p, 'utf8');
    for (const f of FORBIDDEN) if (c.includes(f)) violations.push({ file, mod: f });
  }
  return {
    passed: violations.length === 0,
    violations,
    allReviewRequired: candidates.every((c) => c.reviewRequired === true),
    noneAutoApplied: candidates.every((c) => c.autoApplied === false),
    graphEdges: getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
  };
}

function writeSourceInventory(result) {
  const lines = [
    '# Expanded Discovery Source Inventory',
    '',
    `**Phase:** 2J-F Part A`,
    `**Date:** ${result.ranAt}`,
    `**Sources processed:** ${result.metrics.sourcesProcessed}`,
    `**Transcript sources processed:** ${result.metrics.transcriptSourcesProcessed}`,
    '',
    '| Source | Platform | Transcript | Processed | Copyright |',
    '|--------|----------|------------|-----------|-----------|',
  ];

  for (const s of result.sourceInventory) {
    lines.push(`| ${s.sourceName} | ${s.platform} | ${s.transcriptAvailable ? 'yes' : 'metadata'} | ${s.transcriptProcessed ? 'yes' : 'no'} | ${s.copyrightStatus} |`);
  }

  lines.push('', '## Transcript extractions (licensed)', '');
  for (const r of result.transcriptRecords.slice(0, 15)) {
    lines.push(`- **${r.source}:** ${r.question.slice(0, 70)}… (${(r.scripturesCited || []).length} refs)`);
  }

  fs.writeFileSync(REPORTS.sources, `${lines.join('\n')}\n`);
}

function writeOpenTopics(result) {
  const lines = [
    '# Open Topic Discovery Report',
    '',
    `**Phase:** 2J-F Part B`,
    `**Date:** ${result.ranAt}`,
    `**Topics discovered:** ${result.metrics.topicCount}`,
    `**New topics (not on approved cards):** ${result.metrics.newTopicCount}`,
    '',
    '> New topics do not enter production. Admin review only.',
    '',
    '| Topic | Freq | New? | Mapped | Cluster | Keywords |',
    '|-------|------|------|--------|---------|----------|',
  ];

  for (const t of result.openTopics.slice(0, 40)) {
    lines.push(`| ${t.topicName} | ${t.questionFrequency} | ${t.isNewTopic ? 'yes' : 'no'} | ${t.mappedTopic || '—'} | ${t.questionCluster || '—'} | ${t.keywords.slice(0, 4).join(', ')} |`);
  }

  lines.push('', '## New topic candidates (admin review)', '');
  for (const t of result.openTopics.filter((x) => x.isNewTopic).slice(0, 15)) {
    lines.push(`- **${t.topicName}** (${t.questionFrequency} questions): ${t.relatedQuestions[0]?.slice(0, 60)}…`);
  }

  fs.writeFileSync(REPORTS.topics, `${lines.join('\n')}\n`);
}

function writeG2RV2(result) {
  const lines = [
    '# Genesis-to-Revelation Expansion V2',
    '',
    `**Phase:** 2J-F Part C`,
    `**Date:** ${result.ranAt}`,
    `**G2R chain candidates:** ${result.metrics.g2rChainCount}`,
    '',
    '## Strongest G2R candidates',
    '',
  ];

  const top = result.ranked.filter((c) => c.genesisToRevelationSpan).slice(0, 15);
  for (const c of top) {
    lines.push(`### ${c.candidateId} — ${c.discoveredTopic} (score ${c.supportScore})`);
    lines.push('');
    lines.push(`**Question:** ${c.question}`);
    lines.push(`**Chain:** ${(c.g2rChainCandidate || []).join(' → ')}`);
    lines.push(`**Genesis anchors:** ${(c.genesisAnchors || []).join(', ') || '—'}`);
    lines.push(`**Revelation anchors:** ${(c.revelationAnchors || []).join(', ') || '—'}`);
    lines.push(`**Parallel witnesses:** ${(c.parallelRefs || []).slice(0, 6).join(', ')}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeRanking(result) {
  const lines = [
    '# Discovery Support Ranking',
    '',
    `**Phase:** 2J-F Part D`,
    `**Date:** ${result.ranAt}`,
    `**Candidates:** ${result.metrics.candidateCount}`,
    '',
    '| Rank | ID | Score | Topic | Discovered Topic | G2R | New Topic | Action |',
    '|------|-----|-------|-------|------------------|-----|-----------|--------|',
  ];

  result.ranked.forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.candidateId} | ${c.supportScore} | ${c.topic || '—'} | ${c.discoveredTopic} | ${c.genesisToRevelationSpan ? '✅' : '—'} | ${c.isNewTopic ? 'yes' : 'no'} | ${c.recommendedAction} |`);
  });

  lines.push('', '## Score buckets', '');
  lines.push(`- ≥95: ${result.scoreBuckets.above95}`);
  lines.push(`- ≥90: ${result.scoreBuckets.above90}`);
  lines.push(`- ≥80: ${result.scoreBuckets.above80}`);

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writePackage(result) {
  const pkg = {
    phase: '2J-F',
    generatedAt: result.ranAt,
    description: 'Expanded bulk discovery admin review package V2. Not applied to production.',
    reviewRequired: true,
    autoApplied: false,
    humanApprovalRequired: true,
    metrics: result.metrics,
    candidates: result.ranked.map((c) => ({
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      discoveredTopic: c.discoveredTopic,
      isNewTopic: c.isNewTopic,
      scriptures: c.scriptures,
      scriptureOrder: c.scriptureOrder,
      conclusion: c.conclusion,
      parallelRefs: c.parallelRefs,
      g2rChainCandidate: c.g2rChainCandidate,
      supportScore: c.supportScore,
      recommendedAction: c.recommendedAction,
      reviewRequired: true,
      autoApplied: false,
      humanApprovalRequired: true,
    })),
  };

  fs.mkdirSync(path.dirname(OUT_PACKAGE), { recursive: true });
  fs.writeFileSync(OUT_PACKAGE, `${JSON.stringify(pkg, null, 2)}\n`);
  fs.writeFileSync(OUT_QUEUE, `${result.candidates.map((c) => JSON.stringify(c)).join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const topTopics = result.openTopics.slice(0, 10);
  const ready = result.ranked.filter(
    (c) => c.supportScore >= 80
      && ['approve_card_ref', 'approve_support_edge', 'approve_chain'].includes(c.recommendedAction),
  );

  const lines = [
    '# Bible Authority Phase 2J-F Report',
    '',
    `**Date:** ${result.ranAt}`,
    '**Status:** Full discovery expansion complete — no production updates',
    '',
    '## Mission',
    '',
    'Expand discovery coverage across all approved sources. Open topics. No limits on questions or scripture chains.',
    'Scripture remains authority. External teachings are discovery sources only.',
    '',
    '## Metrics',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Sources processed | ${result.metrics.sourcesProcessed} |`,
    `| Transcript sources processed | ${result.metrics.transcriptSourcesProcessed} |`,
    `| Questions discovered | ${result.metrics.questionCount} |`,
    `| Topics discovered | ${result.metrics.topicCount} |`,
    `| New topics | ${result.metrics.newTopicCount} |`,
    `| Scripture chains | ${result.metrics.chainCount} |`,
    `| G2R chains | ${result.metrics.g2rChainCount} |`,
    `| Candidates | ${result.metrics.candidateCount} |`,
    '',
    '## Safety',
    '',
    safety.passed ? '✅ Production isolation PASSED' : '❌ FAILED',
    `- reviewRequired: ${safety.allReviewRequired ? '✅ all' : '❌'}`,
    `- autoApplied: ${safety.noneAutoApplied ? '✅ none' : '❌'}`,
    `- Graph edges: ${safety.graphEdges} (unchanged)`,
    `- Cards: ${safety.cardCount} (unchanged)`,
    '',
    '## Answers',
    '',
    `### 1. Total sources processed`,
    `**${result.metrics.sourcesProcessed}** (${result.metrics.transcriptSourcesProcessed} with transcript processing)`,
    '',
    `### 2. Total questions discovered`,
    `**${result.metrics.questionCount}**`,
    '',
    `### 3. Total topics discovered`,
    `**${result.metrics.topicCount}** (${result.metrics.newTopicCount} new, not on approved cards)`,
    '',
    `### 4. Total scripture chains discovered`,
    `**${result.metrics.chainCount}**`,
    '',
    `### 5. Total Genesis-to-Revelation chains`,
    `**${result.metrics.g2rChainCount}**`,
    '',
    '### 6–8. Score thresholds',
    `- ≥95: **${result.scoreBuckets.above95}**`,
    `- ≥90: **${result.scoreBuckets.above90}**`,
    `- ≥80: **${result.scoreBuckets.above80}**`,
    '',
    '### 9. Highest-frequency topics',
    ...topTopics.map((t, i) => `${i + 1}. **${t.topicName}** (${t.questionFrequency} questions)${t.isNewTopic ? ' — NEW' : ''}`),
    '',
    '### 10. Most likely to reduce degradation',
    ...result.degradationCandidates.slice(0, 10).map((c) => `- **${c.candidateId}** (${c.topic}, ${c.supportScore}): ${c.recommendedAction}`),
    '',
    '### Ready for human approval',
    ...ready.slice(0, 8).map((c) => `- **${c.candidateId}** (${c.supportScore}, ${c.recommendedAction})`),
    '',
    '## Deliverables',
    '',
    '| File |',
    '|------|',
    ...Object.values(REPORTS).map((f) => `| ${path.basename(f)} |`),
    '| BulkDiscoveryAdminReviewPackageV2.json |',
    '| expanded-discovery-queue.jsonl |',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const result = runExpandedScriptureDiscovery();
  const safety = verifySafety(result.candidates);

  writeSourceInventory(result);
  writeOpenTopics(result);
  writeG2RV2(result);
  writeRanking(result);
  writePackage(result);
  writeMainReport(result, safety);

  console.log('Phase 2J-F expanded discovery complete.');
  console.log(`  Sources: ${result.metrics.sourcesProcessed}`);
  console.log(`  Questions: ${result.metrics.questionCount}`);
  console.log(`  Topics: ${result.metrics.topicCount} (${result.metrics.newTopicCount} new)`);
  console.log(`  Chains: ${result.metrics.chainCount}`);
  console.log(`  G2R: ${result.metrics.g2rChainCount}`);
  console.log(`  Score ≥95: ${result.scoreBuckets.above95}`);
  console.log(`  Safety: ${safety.passed ? 'PASSED' : 'FAILED'}`);
}

main();
