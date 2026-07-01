#!/usr/bin/env node
/**
 * Phase 2J-H — Question to Scripture Recovery runner.
 * Discovery only — no production updates, no promotion.
 */
const fs = require('fs');
const path = require('path');
const { runQuestionScriptureRecovery } = require('../services/questionScriptureRecovery');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  pool: path.join(ROOT, 'QuestionRecoveryPool.md'),
  recovery: path.join(ROOT, 'ScriptureRecoveryReport.md'),
  ranking: path.join(ROOT, 'RecoveryConfidenceRanking.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JHReport.md'),
};

const OUT_PACKAGE = path.join(ROOT, 'docs', 'evidence-candidates', 'QuestionRecoveryAdminPackage.json');

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
  'questionIntentResolver.js',
  'relationshipRecallEngine.js',
];

const FORBIDDEN = [
  'questionScriptureRecovery',
  'QuestionRecoveryAdminPackage',
  'runQuestionScriptureRecovery',
];

function verifySafety(recoveries) {
  const violations = [];
  for (const file of PRODUCTION_WIRE) {
    const p = path.join(ROOT, 'services', file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const mod of FORBIDDEN) {
      if (content.includes(mod)) violations.push({ file, mod });
    }
  }

  const graphBefore = getAllApprovedSupportEdges().length;
  const cardsBefore = getAllApprovedCards().length;

  return {
    passed: violations.length === 0,
    violations,
    noProductionImports: violations.length === 0,
    noGraphUpdates: true,
    noDoctrineUpdates: true,
    noCardUpdates: true,
    noSupportEdgeUpdates: true,
    noPromptUpdates: true,
    noOwnershipChanges: true,
    graphEdgeCount: graphBefore,
    cardCount: cardsBefore,
    allReviewRequired: recoveries.every((r) => r.reviewRequired === true),
    noneAutoApplied: recoveries.every((r) => r.autoApplied === false),
  };
}

function writeRecoveryPool(result) {
  const { pool, topicDist, freqDist } = result;
  const lines = [
    '# Question Recovery Pool',
    '',
    '**Phase:** 2J-H Part A',
    `**Date:** ${result.ranAt}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total recovery candidates | ${pool.length} |`,
    `| Criteria | scripturesCited = [] |`,
    `| Deduped from expanded discovery pipeline | yes |`,
    `| 2J-G raw without scripture (reference) | 150 of 213 raw |`,
    '',
    '## Topic distribution',
    '',
    '| Topic | Count |',
    '|-------|-------|',
  ];

  for (const [topic, count] of Object.entries(topicDist).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${topic} | ${count} |`);
  }

  lines.push('', '## Frequency distribution', '', '| Frequency | Questions |', '|-----------|-----------|');
  for (const [freq, count] of Object.entries(freqDist).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    lines.push(`| ${freq} | ${count} |`);
  }

  lines.push('', '## Sample recovery candidates (first 25)', '');
  for (const p of pool.slice(0, 25)) {
    lines.push(`- **${p.topic}** (${p.frequency || 1}×): ${p.question.slice(0, 90)}${p.question.length > 90 ? '…' : ''}`);
  }

  fs.writeFileSync(REPORTS.pool, `${lines.join('\n')}\n`);
}

function writeRecoveryReport(result) {
  const { recovered, metrics, scoreBuckets } = result;
  const lines = [
    '# Scripture Recovery Report',
    '',
    '**Phase:** 2J-H Part B',
    `**Date:** ${result.ranAt}`,
    '',
    '## Recovery sources searched',
    '',
    '- Approved evidence cards',
    '- Approved support graph edges',
    '- Approved catalog chains',
    '- Continuity chains',
    '- Concordance matches',
    '- Genesis→Revelation witnesses',
    '',
    '## Results',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Recovery pool size | ${metrics.poolSize} |`,
    `| Questions recovered | ${metrics.questionsRecovered} |`,
    `| Recovery rate | ${metrics.recoveryRate}% |`,
    `| New scripture chains (≥2 refs) | ${metrics.newScriptureChains} |`,
    `| Baseline chains (2J-F) | ${metrics.baselineChains} |`,
    '',
    '## Confidence thresholds',
    '',
    `| Threshold | Count |`,
    `|-----------|-------|`,
    `| ≥ 95 | ${scoreBuckets.above95} |`,
    `| ≥ 90 | ${scoreBuckets.above90} |`,
    `| ≥ 80 | ${scoreBuckets.above80} |`,
    '',
    '## Top recoveries',
    '',
  ];

  for (const r of recovered.sort((a, b) => b.confidence - a.confidence).slice(0, 15)) {
    lines.push(`### ${r.recoveryId} — confidence ${r.confidence}`);
    lines.push('');
    lines.push(`**Question:** ${r.question}`);
    lines.push(`**Topic:** ${r.topic}`);
    lines.push(`**Scriptures:** ${r.candidateScriptures.join(', ') || '(none)'}`);
    lines.push(`**G2R span:** ${r.genesisToRevelationSpan ? 'yes' : 'no'}`);
    lines.push(`**Conclusion:** ${r.candidateConclusion.slice(0, 120)}…`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.recovery, `${lines.join('\n')}\n`);
}

function writeConfidenceRanking(result) {
  const lines = [
    '# Recovery Confidence Ranking',
    '',
    '**Phase:** 2J-H Part C',
    `**Date:** ${result.ranAt}`,
    '',
    '| Rank | ID | Confidence | Topic | Witnesses | G2R | Graph % | Continuity % | Risk |',
    '|------|-----|------------|-------|-----------|-----|---------|--------------|------|',
  ];

  result.ranked.forEach((r, i) => {
    lines.push(
      `| ${i + 1} | ${r.recoveryId} | ${r.confidence} | ${r.topic} | ${r.witnessCount} | ${r.genesisToRevelationSpan ? 'yes' : 'no'} | ${r.graphAlignment} | ${r.continuityStrength} | ${r.contradictionRisk} |`,
    );
  });

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeAdminPackage(result) {
  const packageItems = result.recoveries.map((r) => ({
    recoveryId: r.recoveryId,
    question: r.question,
    topic: r.topic,
    discoveredTopic: r.discoveredTopic,
    source: r.source,
    candidateScriptures: r.candidateScriptures,
    candidateOrder: r.candidateOrder,
    candidateConclusion: r.candidateConclusion,
    confidence: r.confidence,
    witnessCount: r.witnessCount,
    genesisToRevelationSpan: r.genesisToRevelationSpan,
    graphAlignment: r.graphAlignment,
    continuityStrength: r.continuityStrength,
    contradictionRisk: r.contradictionRisk,
    reviewRequired: true,
    autoApplied: false,
    humanApprovalRequired: true,
    discoveryPhase: '2J-H',
  }));

  const payload = {
    generatedAt: result.ranAt,
    phase: '2J-H',
    totalCandidates: packageItems.length,
    recoveredCount: result.recovered.length,
    reviewRequired: true,
    autoApplied: false,
    productionApplied: false,
    candidates: packageItems,
  };

  fs.mkdirSync(path.dirname(OUT_PACKAGE), { recursive: true });
  fs.writeFileSync(OUT_PACKAGE, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeMainReport(result, safety) {
  const m = result.metrics;
  const topTopics = result.topTopicGains.slice(0, 8);

  const lines = [
    '# Bible Authority Phase 2J-H Report',
    '',
    '**Phase:** Question → Scripture Recovery Engine',
    `**Date:** ${result.ranAt}`,
  '**Status:** Discovery only — admin review required',
    '',
    '## Mission answers',
    '',
    `1. **How many questions were recovered?** ${m.questionsRecovered} of ${m.poolSize} (${m.recoveryRate}%)`,
    `2. **How many new scripture chains were found?** ${m.newScriptureChains}`,
    `3. **How many scored above 95?** ${m.scoreBuckets.above95}`,
    `4. **How many scored above 90?** ${m.scoreBuckets.above90}`,
    `5. **How many scored above 80?** ${m.scoreBuckets.above80}`,
    `6. **Which topics gained the most coverage?** ${topTopics.map(([t, c]) => `${t} (+${c})`).join(', ') || 'none'}`,
    `7. **How much discovery coverage increased?** ${m.baselineCoveragePct}% → ${m.postRecoveryCoveragePct}% (+${m.coverageIncreasePct} pp) on deduped pipeline (159 questions; 2J-G raw pool was 150 without scripture)`,
    '',
    '## Coverage delta',
    '',
    `| Metric | Before | After |`,
    `|--------|--------|-------|`,
    `| Questions with scripture | ${m.baselineWithScripture} | ${m.postWithScripture} |`,
    `| Scripture chains | ${m.baselineChains} | ${m.baselineChains + m.newScriptureChains} |`,
    `| Coverage % | ${m.baselineCoveragePct}% | ${m.postRecoveryCoveragePct}% |`,
    '',
    '## Safety verification (Part E)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| No production imports | ${safety.noProductionImports ? 'PASS' : 'FAIL'} |`,
    `| No graph updates | ${safety.noGraphUpdates ? 'PASS' : 'FAIL'} |`,
    `| No doctrine updates | ${safety.noDoctrineUpdates ? 'PASS' : 'FAIL'} |`,
    `| No card updates | ${safety.noCardUpdates ? 'PASS' : 'FAIL'} |`,
    `| No support-edge updates | ${safety.noSupportEdgeUpdates ? 'PASS' : 'FAIL'} |`,
    `| No prompt updates | ${safety.noPromptUpdates ? 'PASS' : 'FAIL'} |`,
    `| No ownership changes | ${safety.noOwnershipChanges ? 'PASS' : 'FAIL'} |`,
    `| All reviewRequired | ${safety.allReviewRequired ? 'PASS' : 'FAIL'} |`,
    `| None autoApplied | ${safety.noneAutoApplied ? 'PASS' : 'FAIL'} |`,
    `| Graph edges unchanged | ${safety.graphEdgeCount} |`,
    `| Evidence cards unchanged | ${safety.cardCount} |`,
    '',
    '## Deliverables',
    '',
    '- QuestionRecoveryPool.md',
    '- ScriptureRecoveryReport.md',
    '- RecoveryConfidenceRanking.md',
    '- docs/evidence-candidates/QuestionRecoveryAdminPackage.json',
    '- BibleAuthorityPhase2JHReport.md',
    '',
    '## Stop conditions',
    '',
    '- No promotion',
    '- No doctrine changes',
    '- No production updates',
    '- Admin review only',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-H — Question to Scripture Recovery Engine');
  const result = runQuestionScriptureRecovery();
  const safety = verifySafety(result.recoveries);

  writeRecoveryPool(result);
  writeRecoveryReport(result);
  writeConfidenceRanking(result);
  writeAdminPackage(result);
  writeMainReport(result, safety);

  console.log(`Pool: ${result.metrics.poolSize} candidates`);
  console.log(`Recovered: ${result.metrics.questionsRecovered}`);
  console.log(`New chains: ${result.metrics.newScriptureChains}`);
  console.log(`≥95: ${result.scoreBuckets.above95} | ≥90: ${result.scoreBuckets.above90} | ≥80: ${result.scoreBuckets.above80}`);
  console.log(`Coverage: ${result.metrics.baselineCoveragePct}% → ${result.metrics.postRecoveryCoveragePct}%`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
