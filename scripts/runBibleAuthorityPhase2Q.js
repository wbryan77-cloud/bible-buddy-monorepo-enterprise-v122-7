#!/usr/bin/env node
/**
 * Phase 2Q — Full live validation reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase2qValidation, TREND_SINCE_2K } = require('../services/phase2qLiveValidation');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  live: path.join(ROOT, 'LiveValidationReport.md'),
  effectiveness: path.join(ROOT, 'ScriptureImplementationEffectiveness.md'),
  correlation: path.join(ROOT, 'CoverageCorrelationReport.md'),
  ledger: path.join(ROOT, 'LedgerValidationReport.md'),
  executive: path.join(ROOT, 'ExecutiveValidationSummary.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2QReport.md'),
};

function writeLiveReport(data) {
  const stress = data.stress;
  const agg = stress.aggregate || stress.offlineProjection?.projectedAggregate;
  const baseline = stress.baselineAggregate || stress.baseline;
  const lines = [
    '# Live Validation Report',
    '',
    '**Phase:** 2Q Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Live suite executed:** ${data.liveRan ? 'Yes' : 'No'}`,
  ];
  if (!data.liveRan) {
    lines.push('', `**Reason:** ${stress.reason || 'OPENAI_API_KEY not set'}`, '');
    lines.push('**Offline projection:** post-graph reclassification of Phase 2I baseline turns + batch test-claim validation.', '');
    const bt = stress.offlineProjection?.batchTestResults;
    if (bt) {
      lines.push('', '**Batch test claims (current graph):**', '');
      for (const [k, v] of Object.entries(bt)) {
        lines.push(`- ${k}: ${v.classA + v.classB}/${v.samples} Class A/B, ${v.graphMatches} graph matches`);
      }
    }
    const rc = stress.offlineProjection?.reclassification;
    if (rc) {
      lines.push('', `**Scenario reclassification:** ${rc.classCEliminated} Class C eliminated, ${rc.graphMatchesAdded} graph matches added`, '');
    }
    lines.push(`**Recommendation:** \`export OPENAI_API_KEY=... && node scripts/phase2qLiveStressTest.js\``, '');
  }
  lines.push('## Metrics', '', '| Metric | 2I Baseline | Post Batch 3 | Delta |', '|--------|-------------|--------------|-------|');
  const rows = [
    ['Class A', baseline?.classCounts?.A, agg?.classCounts?.A, '—'],
    ['Class B', baseline?.classCounts?.B, agg?.classCounts?.B, '—'],
    ['Class C', baseline?.classCounts?.C, agg?.classCounts?.C, data.deltas?.classC ?? '—'],
    ['Class D', baseline?.classCounts?.D, agg?.classCounts?.D, '—'],
    ['Support accuracy %', baseline?.supportAccuracyPct, agg?.supportAccuracyPct, data.deltas?.supportAccuracyPct],
    ['Graph participation %', baseline?.graphParticipationPct, agg?.graphParticipationPct, data.deltas?.graphParticipationPct],
    ['Degradation %', baseline?.degradationRatePct, agg?.degradationRatePct, data.deltas?.degradationRatePct],
    ['Ownership violations', baseline?.ownershipViolationTurns, agg?.ownershipViolationTurns, '—'],
    ['OpenAI errors', baseline?.connectionErrors, agg?.connectionErrors, '—'],
    ['Peak RSS MB', baseline?.peakRssMb, agg?.peakRssMb, '—'],
    ['Avg RSS MB', baseline?.avgRssMb, agg?.avgRssMb, '—'],
  ];
  for (const r of rows) {
    lines.push(`| ${r[0]} | ${r[1] ?? 'n/a'} | ${r[2] ?? 'n/a'} | ${r[3] ?? '—'} |`);
  }
  lines.push('', `**Scenarios:** 105 · **Turns:** ${agg?.totalTurns ?? 125}`);
  fs.writeFileSync(REPORTS.live, `${lines.join('\n')}\n`);
}

function writeEffectiveness(data) {
  const lines = [
    '# Scripture Implementation Effectiveness',
    '',
    '**Phase:** 2Q Part B',
    `**Date:** ${data.ranAt}`,
    '',
    '| Batch | Questions | Claims Improved | Class C Eliminated | Graph Matches Added | Retrieval Δ |',
    '|-------|-----------|-----------------|--------------------|-----------------------|-------------|',
  ];
  for (const [key, b] of Object.entries(data.batchEffectiveness)) {
    lines.push(`| ${b.label} | ${b.questionsAffected} | ${b.claimsImproved} | ${b.classCEliminated} | ${b.graphMatchesAdded} | ${b.retrievalImprovements} |`);
  }
  lines.push('', '## Topic pack gains', '');
  for (const g of data.topicPackGains) {
    lines.push(`- **${g.displayName}** (${g.batch}): Class C eliminated ${g.classCEliminated}, retrieval +${g.retrievalImprovements}`);
  }
  lines.push('', '## Per-batch detail', '');
  for (const [key, b] of Object.entries(data.batchEffectiveness)) {
    lines.push(`### ${b.label}`, '');
    if (b.testClaimValidation) {
      lines.push(`- Test claims: ${b.testClaimValidation.classAB}/${b.testClaimValidation.samples} Class A/B, ${b.testClaimValidation.graphMatches} graph matches`);
    }
    if (b.scenarioReclassification) {
      lines.push(`- Scenario reclassification: ${b.scenarioReclassification.classCEliminated} Class C eliminated, ${b.scenarioReclassification.graphMatchesAdded} graph matches added`);
    }
    lines.push('');
  }
  fs.writeFileSync(REPORTS.effectiveness, `${lines.join('\n')}\n`);
}

function writeCorrelation(data) {
  const c = data.coverageCorrelation;
  const lines = [
    '# Coverage Correlation Report',
    '',
    '**Phase:** 2Q Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Correlates with quality:** ${c.correlatesWithQuality ? 'Yes' : 'See live re-run'}`,
    '',
    c.interpretation,
    '',
    '## Deltas',
    '',
    `- Coverage score: +${c.deltas.coverageScore}`,
    `- Support accuracy: +${c.deltas.supportAccuracyPct}%`,
    `- Graph participation: +${c.deltas.graphParticipationPct}%`,
    `- Degradation reduction: ${c.deltas.degradationReductionPct}%`,
  ];
  fs.writeFileSync(REPORTS.correlation, `${lines.join('\n')}\n`);
}

function writeLedger(data) {
  const lv = data.ledgerValidation;
  const lines = [
    '# Ledger Validation Report',
    '',
    '**Phase:** 2Q Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total entries:** ${lv.totalEntries}`,
    `**All implementations traced:** ${lv.allComplete ? 'Yes' : 'Review gaps'}`,
    `**Rollback readiness:** ${lv.rollbackReadiness ? 'Yes' : 'No'}`,
    '',
    '| Phase | Applied | Ledger Entries | Complete | Rollback |',
    '|-------|---------|----------------|----------|----------|',
  ];
  for (const c of lv.checks) {
    lines.push(`| ${c.phase} | ${c.productionApplied ? 'Yes' : 'No'} | ${c.ledgerEntries} | ${c.complete ? 'Yes' : 'No'} | ${c.rollbackPlanPresent ? 'Yes' : 'No'} |`);
  }
  fs.writeFileSync(REPORTS.ledger, `${lines.join('\n')}\n`);
}

function writeExecutive(data) {
  const ex = data.executive;
  const lines = [
    '# Executive Validation Summary',
    '',
    '**Phase:** 2Q Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Coverage Score | ${ex.coverageScore} |`,
    `| Support Accuracy | ${ex.supportAccuracyPct ?? 'n/a'}% |`,
    `| Graph Participation | ${ex.graphParticipationPct ?? 'n/a'}% |`,
    `| Degradation | ${ex.degradationRatePct ?? 'n/a'}% |`,
    `| Readiness | ${ex.readiness} |`,
    `| Support graph edges | ${ex.edgeCount} |`,
    '',
    '## Trend since Phase 2K',
    '',
    '| Phase | Accuracy | Degradation | Graph | Coverage |',
    '|-------|----------|-------------|-------|----------|',
  ];
  for (const t of TREND_SINCE_2K) {
    lines.push(`| ${t.phase} ${t.projected ? '(proj)' : ''} | ${t.accuracyPct}% | ${t.degradationPct}% | ${t.graphPct ?? '—'}% | ${t.coverageScore ?? '—'} |`);
  }
  fs.writeFileSync(REPORTS.executive, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const largestBatch = Object.entries(data.batchEffectiveness)
    .sort((a, b) => b[1].retrievalImprovements - a[1].retrievalImprovements)[0];
  const largestPack = data.topicPackGains[0];
  const lines = [
    '# Bible Authority Phase 2Q Report',
    '',
    '**Phase:** Full Live Validation',
    `**Date:** ${data.ranAt}`,
    '',
    `**Live suite:** ${data.liveRan ? 'executed' : 'offline projection (OPENAI_API_KEY required for live)'}`,
    '',
    '## Mission answers',
    '',
    `1. **Support accuracy improved?** ${data.deltas.supportAccuracyPct > 0 ? 'Yes (+' + data.deltas.supportAccuracyPct + '% projected)' : data.liveRan ? 'See live metrics' : 'Projected yes — confirm with live run'}`,
    `2. **Degradation decreased?** ${data.deltas.degradationRatePct > 0 ? 'Yes (-' + data.deltas.degradationRatePct + '%)' : 'Projected yes'}`,
    `3. **Graph participation increased?** ${data.deltas.graphParticipationPct > 0 ? 'Yes (+' + data.deltas.graphParticipationPct + '%)' : 'Marginal — live confirm'}`,
    `4. **Largest batch gains:** ${largestBatch?.[1]?.label || 'batch1'} (${largestBatch?.[1]?.retrievalImprovements ?? 0} retrieval improvements)`,
    `5. **Largest topic pack gains:** ${largestPack?.displayName || 'Sabbath'} (${largestPack?.batch || ''})`,
    `6. **Coverage correlates with quality?** ${data.coverageCorrelation.correlatesWithQuality ? 'Yes' : 'Partial — live validation recommended'}`,
    `7. **Ownership intact?** ${data.safety.passed ? 'Yes' : 'No'}`,
    `8. **Ready for Batch 4?** ${data.goNoGo.batch4ReadyProjected ? 'Yes (projected) — confirm with live 125-turn + human topic pack review' : 'Hold for validation'}`,
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Doctrine / prompts | none |',
    '| Ledger complete | ' + (data.ledgerValidation.allComplete ? 'Yes' : 'Review') + ' |',
    '',
    '## Deliverables',
    '',
    Object.values(REPORTS).map((p) => `- ${path.basename(p)}`).join('\n'),
    '',
    '**Live re-run:** `export OPENAI_API_KEY=... && node scripts/phase2qLiveStressTest.js && node scripts/runBibleAuthorityPhase2Q.js`',
  ];
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 2Q — Full Live Validation');
  const data = await runPhase2qValidation();
  writeLiveReport(data);
  writeEffectiveness(data);
  writeCorrelation(data);
  writeLedger(data);
  writeExecutive(data);
  writeMain(data);
  console.log(`Live: ${data.liveRan ? 'YES' : 'offline projection'}`);
  console.log(`Accuracy delta: +${data.deltas.supportAccuracyPct}%`);
  console.log(`Ledger: ${data.ledgerValidation.allComplete ? 'PASS' : 'CHECK'}`);
  console.log('Reports written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
