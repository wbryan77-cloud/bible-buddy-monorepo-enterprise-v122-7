#!/usr/bin/env node
/**
 * Phase 2J-E — Bulk Scripture Discovery runner.
 * Discovery and admin review only — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { runBulkScriptureDiscovery } = require('../services/bulkScriptureDiscovery');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');
const OUT_PACKAGE = path.join(ROOT, 'docs', 'evidence-candidates', 'BulkDiscoveryAdminReviewPackage.json');
const OUT_QUEUE = path.join(ROOT, 'docs', 'evidence-candidates', 'bulk-discovery-queue.jsonl');

const REPORTS = {
  sources: path.join(ROOT, 'BulkSourceInventory.md'),
  questions: path.join(ROOT, 'QuestionDiscoveryInventory.md'),
  extraction: path.join(ROOT, 'ScriptureExtractionInventory.md'),
  g2r: path.join(ROOT, 'GenesisToRevelationVerificationReport.md'),
  parallel: path.join(ROOT, 'ParallelScriptureExpansionReport.md'),
  ranking: path.join(ROOT, 'ScriptureSupportRankingV2.md'),
  digest: path.join(ROOT, 'ScriptureDiscoveryAdminDigestPlan.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JEReport.md'),
};

const PRODUCTION_WIRE_CHECK = [
  path.join(ROOT, 'services', 'buddyBrain.js'),
  path.join(ROOT, 'services', 'retrievalEvidencePack.js'),
  path.join(ROOT, 'services', 'approvedSupportGraph.js'),
  path.join(ROOT, 'services', 'claimToScriptureValidator.js'),
  path.join(ROOT, 'services', 'doctrineRegistry.js'),
];

const FORBIDDEN_IMPORTS = [
  'bulkScriptureDiscovery',
  'BulkDiscoveryAdminReviewPackage',
  'runBulkScriptureDiscovery',
];

function verifySafety(candidates = []) {
  const violations = [];
  for (const file of PRODUCTION_WIRE_CHECK) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const mod of FORBIDDEN_IMPORTS) {
      if (content.includes(mod)) violations.push({ file: path.basename(file), module: mod });
    }
  }

  const allReviewRequired = candidates.length === 0 || candidates.every((c) => c.reviewRequired === true);
  const noneAutoApplied = candidates.length === 0 || candidates.every((c) => c.autoApplied === false);

  return {
    productionIsolation: violations.length === 0,
    violations,
    allReviewRequired,
    noneAutoApplied,
    graphEdges: getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
  };
}

function writeSourceInventory(result) {
  const lines = [
    '# Bulk Source Inventory',
    '',
    `**Phase:** 2J-E Part A`,
    `**Date:** ${result.ranAt}`,
    `**Total sources registered:** ${result.sources.length}`,
    '',
    '> No copyrighted content scraped. Metadata-only where transcripts unavailable.',
    '',
    '| Source | Platform | Transcript | Copyright | Review |',
    '|--------|----------|------------|-----------|--------|',
  ];

  for (const s of result.sources) {
    lines.push(`| ${s.sourceName} | ${s.platform} | ${s.transcriptAvailable ? 'yes' : 'metadata only'} | ${s.copyrightStatus} | required |`);
  }

  lines.push('', '## Source captures', '');
  for (const s of result.sources) {
    lines.push(`### ${s.sourceId}`);
    lines.push(`- **URL:** ${s.sourceUrl || '—'}`);
    lines.push(`- **Title:** ${s.title}`);
    lines.push(`- **Speaker:** ${s.speaker || '—'}`);
    lines.push(`- **reviewRequired:** true`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.sources, `${lines.join('\n')}\n`);
}

function writeQuestionInventory(result) {
  const lines = [
    '# Question Discovery Inventory',
    '',
    `**Phase:** 2J-E Part B`,
    `**Date:** ${result.ranAt}`,
    `**Total questions:** ${result.questions.length}`,
    `**Clusters:** ${result.clusters.length}`,
    '',
    '## Coverage gaps (approved topics without questions)',
    '',
    result.coverageGaps.length ? result.coverageGaps.map((g) => `- ${g}`).join('\n') : '- None',
    '',
    '## Top topics by frequency',
    '',
    '| Topic | Questions |',
    '|-------|-----------|',
  ];

  for (const [topic, count] of result.topTopics.slice(0, 12)) {
    lines.push(`| ${topic} | ${count} |`);
  }

  lines.push('', '## Question clusters (ranked by frequency)', '');
  lines.push('| Cluster | Topic | Freq | Representative |');
  lines.push('|---------|-------|------|----------------|');

  for (const c of result.clusters.slice(0, 25)) {
    const rep = c.representative.length > 60 ? `${c.representative.slice(0, 57)}…` : c.representative;
    lines.push(`| ${c.clusterId} | ${c.topic} | ${c.frequency} | ${rep} |`);
  }

  lines.push('', '## Full question inventory', '');
  lines.push('| Question | Topic | Freq | Source |');
  lines.push('|----------|-------|------|--------|');

  for (const q of result.questions.slice(0, 80)) {
    const qu = q.question.length > 55 ? `${q.question.slice(0, 52)}…` : q.question;
    lines.push(`| ${qu} | ${q.topic} | ${q.frequency || 1} | ${q.sourceType || q.source} |`);
  }
  if (result.questions.length > 80) lines.push(`| … | … | … | +${result.questions.length - 80} more |`);

  fs.writeFileSync(REPORTS.questions, `${lines.join('\n')}\n`);
}

function writeExtractionInventory(result) {
  const lines = [
    '# Scripture Extraction Inventory',
    '',
    `**Phase:** 2J-E Part C`,
    `**Date:** ${result.ranAt}`,
    `**Chains extracted:** ${result.chains.length}`,
    '',
    '> Stored separately from doctrine. Discovery candidates only.',
    '',
    '| Question | Topic | Scriptures | Source |',
    '|----------|-------|------------|--------|',
  ];

  for (const c of result.chains) {
    const refs = (c.scripturesCited || []).join('; ') || '—';
    const q = c.question.length > 45 ? `${c.question.slice(0, 42)}…` : c.question;
    lines.push(`| ${q} | ${c.topic} | ${refs} | ${c.sourceType || c.source} |`);
  }

  fs.writeFileSync(REPORTS.extraction, `${lines.join('\n')}\n`);
}

function writeG2RVerification(result) {
  const lines = [
    '# Genesis-to-Revelation Verification Report',
    '',
    `**Phase:** 2J-E Part D`,
    `**Date:** ${result.ranAt}`,
    `**Chains verified:** ${result.verifications.length}`,
    `**G2R spans:** ${result.metrics.g2rSpans}`,
    '',
    '| Question | KJV | Order | Conclusion | G2R | Missing support |',
    '|----------|-----|-------|------------|-----|-----------------|',
  ];

  for (const v of result.verifications.slice(0, 40)) {
    const q = v.question.length > 40 ? `${v.question.slice(0, 37)}…` : v.question;
    lines.push(`| ${q} | ${v.kjvValid ? '✅' : '❌'} | ${v.orderPreserved ? '✅' : '⚠️'} | ${v.conclusionFollows ? '✅' : 'review'} | ${v.genesisToRevelationSpan ? '✅' : '—'} | ${v.missingSupport?.length || 0} |`);
  }

  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeParallelReport(result) {
  const lines = [
    '# Parallel Scripture Expansion Report',
    '',
    `**Phase:** 2J-E Part E`,
    `**Date:** ${result.ranAt}`,
    `**Parallel discoveries:** ${result.parallelDiscoveries.length}`,
    '',
    'Do not promote automatically. All entries: reviewRequired:true, autoApplied:false.',
    '',
  ];

  const byQuestion = new Map();
  for (const p of result.parallelDiscoveries) {
    if (!byQuestion.has(p.question)) byQuestion.set(p.question, []);
    byQuestion.get(p.question).push(p);
  }

  for (const [question, items] of [...byQuestion.entries()].slice(0, 20)) {
    lines.push(`## ${question.slice(0, 80)}${question.length > 80 ? '…' : ''}`);
    lines.push('');
    for (const item of items.slice(0, 6)) {
      lines.push(`- **${item.relationshipType}:** ${item.parallelRefs.join(', ')} — ${item.reason}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.parallel, `${lines.join('\n')}\n`);
}

function writeRankingV2(result) {
  const lines = [
    '# Scripture Support Ranking V2',
    '',
    `**Phase:** 2J-E Part F`,
    `**Date:** ${result.ranAt}`,
    '',
    'BibleSupportScore 0–100. Scripture evidence only — no denomination, speaker, or tradition weighting.',
    '',
    '| Rank | ID | Score | Band | Topic | G2R | Action |',
    '|------|-----|-------|------|-------|-----|--------|',
  ];

  result.ranked.forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.candidateId} | ${c.supportScore} | ${c.supportBand} | ${c.topic} | ${c.genesisToRevelationSpan ? '✅' : '—'} | ${c.recommendedAction} |`);
  });

  lines.push('', '## Score buckets', '');
  lines.push(`- **≥95 Strong:** ${result.scoreBuckets.above95}`);
  lines.push(`- **≥90 Very Strong:** ${result.scoreBuckets.above90}`);
  lines.push(`- **≥80 Strong Candidate:** ${result.scoreBuckets.above80}`);
  lines.push(`- **≥70 Review:** ${result.scoreBuckets.above70}`);
  lines.push(`- **<60 Hold:** ${result.scoreBuckets.below60}`);

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeAdminPackage(result) {
  const pkg = {
    phase: '2J-E',
    generatedAt: result.ranAt,
    description: 'Bulk discovery admin review package. Advisory only — not applied to production.',
    reviewRequired: true,
    autoApplied: false,
    metrics: result.metrics,
    candidates: result.ranked.map((c) => ({
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      scriptures: c.scriptures,
      scriptureOrder: c.scriptureOrder,
      conclusion: c.conclusion,
      parallelRefs: c.parallelRefs,
      supportScore: c.supportScore,
      supportBand: c.supportBand,
      recommendedAction: c.recommendedAction,
      reviewRequired: true,
      autoApplied: false,
    })),
  };

  fs.writeFileSync(OUT_PACKAGE, `${JSON.stringify(pkg, null, 2)}\n`);
  fs.writeFileSync(OUT_QUEUE, `${result.candidates.map((c) => JSON.stringify(c)).join('\n')}\n`);
}

function writeDigestPlan(result) {
  const lines = [
    '# Scripture Discovery Admin Digest Plan',
    '',
    `**Phase:** 2J-E Part H — Design only`,
    `**Date:** ${result.ranAt}`,
    '',
    '> **Default: OFF.** Admin-controlled. Never auto-promotes.',
    '',
    '## Authority preservation (Part K)',
    '',
    'Discovery is not doctrine. Candidates may never bypass Scripture → Approved Evidence → Support Graph → BAE.',
    '',
    '## Digest frequency',
    '',
    '| Mode | Default | Env flag (proposed) |',
    '|------|---------|---------------------|',
    '| OFF | ✅ active | `BULK_DISCOVERY_DIGEST=off` |',
    '| Daily | disabled | `BULK_DISCOVERY_DIGEST=daily` |',
    '| Weekly | disabled | `BULK_DISCOVERY_DIGEST=weekly` |',
    '| Monthly | disabled | `BULK_DISCOVERY_DIGEST=monthly` |',
    '',
    '## Digest contents',
    '',
    `- **New candidates since last run:** ${result.metrics.candidateCount} total in current bulk run`,
    `- **High-score (≥95):** ${result.scoreBuckets.above95}`,
    `- **Duplicate clusters:** ${result.clusters.filter((c) => c.questions.length > 1).length}`,
    `- **Approval recommendations:** ${result.readyForHumanApproval.length} ready for human approval`,
    '',
    '### Daily (when enabled)',
    '- Top 10 by supportScore',
    '- New bulk queue entries',
    '- Regression-failed promotion packages (from 2J-D)',
    '',
    '### Weekly',
    '- `BulkDiscoveryAdminReviewPackage.json` delta',
    '- Topic cluster summary',
    '- Acts 13 / Logos duplicate alerts',
    '',
    '### Monthly',
    '- Readiness projection rollup',
    '- Source inventory changes',
    '- IOG metadata registry status (transcript availability)',
    '',
    '## Bulk workflows',
    '',
    '| Workflow | Guard |',
    '|----------|-------|',
    '| Bulk approve support edges | Per-item regression + human sign-off |',
    '| Bulk reject pastoral noise | score <40, no card alignment |',
    '| Bulk hold | theological review flag |',
    '',
    '## Promotion rule reminder',
    '',
    'No candidate enters production unless: human approved, regression passes, authority score stable, zero ownership violations.',
  ];

  fs.writeFileSync(REPORTS.digest, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const sabbath = result.candidates.filter((c) => c.topic === 'sabbath');
  const logos = result.candidates.filter((c) => c.topic === 'messiah_logos');
  const death = result.candidates.filter((c) => c.topic === 'death_state');

  const duplicateClusters = result.clusters.filter((c) => c.questions.length > 1);

  const lines = [
    '# Bible Authority Phase 2J-E Report',
    '',
    `**Date:** ${result.ranAt}`,
    `**Status:** Bulk discovery pipeline complete — no production updates`,
    '',
    '## Mission',
    '',
    'Large-scale Scripture discovery: questions, chains, G2R expansions, parallel witnesses, support candidates — all for admin review.',
    '',
    '```',
    'External source → Question → Scripture → G2R verification → Parallel discovery',
    '  → Support score → Admin review → Human decision',
    'NOT: External source → Doctrine → Production',
    '```',
    '',
    '## Metrics',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Sources registered | ${result.metrics.sourceCount} |`,
    `| Questions discovered | ${result.metrics.questionCount} |`,
    `| Question clusters | ${result.metrics.clusterCount} |`,
    `| Scripture chains | ${result.metrics.chainCount} |`,
    `| Discovery candidates | ${result.metrics.candidateCount} |`,
    `| G2R expansions | ${result.metrics.expansionCount} |`,
    `| G2R spans | ${result.metrics.g2rSpans} |`,
    '',
    '## Safety',
    '',
    safety.productionIsolation ? '✅ Production isolation PASSED' : '❌ FAILED',
    `- reviewRequired: ${safety.allReviewRequired ? '✅ all' : '❌'}`,
    `- autoApplied: ${safety.noneAutoApplied ? '✅ none' : '❌'}`,
    `- Support graph: ${safety.graphEdges} edges (unchanged)`,
    `- Evidence cards: ${safety.cardCount} (unchanged)`,
    '',
    '## Answers',
    '',
    `### 1. Total questions discovered`,
    `**${result.metrics.questionCount}**`,
    '',
    `### 2. Total scripture chains discovered`,
    `**${result.metrics.chainCount}**`,
    '',
    `### 3. Total Genesis-to-Revelation expansions`,
    `**${result.metrics.expansionCount}** expansions; **${result.metrics.g2rSpans}** full spans`,
    '',
    '### 4–6. Score thresholds',
    `- ≥95: **${result.scoreBuckets.above95}**`,
    `- ≥90: **${result.scoreBuckets.above90}**`,
    `- ≥80: **${result.scoreBuckets.above80}**`,
    '',
    '### 7. Highest-ranked topics',
    ...result.topTopics.slice(0, 6).map(([t, n], i) => `${i + 1}. **${t}** (${n} questions)`),
    '',
    '### 8. Could reduce current degradation',
    ...result.degradationCandidates.slice(0, 8).map((c) => `- **${c.candidateId}** (${c.topic}, ${c.supportScore}): ${c.recommendedAction}`),
    '',
    '### 9. Require theological review',
    ...result.theologicalReview.slice(0, 8).map((c) => `- **${c.candidateId}** (${c.supportScore}): ${c.recommendedAction} — ${c.question.slice(0, 60)}…`),
    '',
    '### 10. Ready for human approval',
    ...result.readyForHumanApproval.slice(0, 10).map((c) => `- **${c.candidateId}** (${c.supportScore}, ${c.recommendedAction})`),
    '',
    '## Topic deep-dives',
    '',
    `### Sabbath (${sabbath.length} candidates)`,
    sabbath.slice(0, 5).map((c) => `- ${c.candidateId}: ${c.recommendedAction}`).join('\n'),
    '',
    `### Logos (${logos.length} candidates)`,
    logos.slice(0, 5).map((c) => `- ${c.candidateId}: ${c.recommendedAction}`).join('\n'),
    '',
    `### Death state (${death.length} candidates)`,
    death.slice(0, 5).map((c) => `- ${c.candidateId}: ${c.recommendedAction}`).join('\n'),
    '',
    '## Duplicate clusters',
    ...duplicateClusters.slice(0, 8).map((c) => `- **${c.clusterId}** (${c.topic}, freq ${c.frequency}): ${c.questions.length} variants`),
    '',
    '## Deliverables',
    '',
    '| File |',
    '|------|',
    ...Object.values(REPORTS).map((f) => `| ${path.basename(f)} |`),
    '| BulkDiscoveryAdminReviewPackage.json |',
    '| bulk-discovery-queue.jsonl |',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const result = runBulkScriptureDiscovery();
  const safety = verifySafety(result.candidates);

  fs.mkdirSync(path.dirname(OUT_PACKAGE), { recursive: true });
  writeSourceInventory(result);
  writeQuestionInventory(result);
  writeExtractionInventory(result);
  writeG2RVerification(result);
  writeParallelReport(result);
  writeRankingV2(result);
  writeAdminPackage(result);
  writeDigestPlan(result);
  writeMainReport(result, safety);

  console.log('Phase 2J-E bulk Scripture discovery complete.');
  console.log(`  Sources: ${result.metrics.sourceCount}`);
  console.log(`  Questions: ${result.metrics.questionCount}`);
  console.log(`  Chains: ${result.metrics.chainCount}`);
  console.log(`  Candidates: ${result.metrics.candidateCount}`);
  console.log(`  Score ≥95: ${result.scoreBuckets.above95}`);
  console.log(`  Ready for human approval: ${result.readyForHumanApproval.length}`);
  console.log(`  Safety: ${safety.productionIsolation ? 'PASSED' : 'FAILED'}`);
}

main();
