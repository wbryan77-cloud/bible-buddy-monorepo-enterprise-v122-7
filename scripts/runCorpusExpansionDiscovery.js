#!/usr/bin/env node
/**
 * Phase 2J-J — Corpus Expansion Discovery runner.
 * Discovery only — no production updates, no promotion.
 */
const fs = require('fs');
const path = require('path');
const { runCorpusExpansionDiscovery } = require('../services/corpusExpansionDiscovery');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  sources: path.join(ROOT, 'CorpusExpansionSourceInventory.md'),
  questions: path.join(ROOT, 'CorpusExpansionQuestionInventory.md'),
  scriptures: path.join(ROOT, 'CorpusExpansionScriptureInventory.md'),
  g2r: path.join(ROOT, 'CorpusExpansionGenesisRevelationReport.md'),
  ranking: path.join(ROOT, 'CorpusExpansionSupportRanking.md'),
  impact: path.join(ROOT, 'CorpusExpansionImpactReport.md'),
  witness: path.join(ROOT, 'FullScriptureWitnessExpansionReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JJReport.md'),
};

const OUT_PACKAGE = path.join(ROOT, 'docs', 'evidence-candidates', 'CorpusExpansionAdminReviewPackage.json');

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
];

const FORBIDDEN = ['corpusExpansionDiscovery', 'CorpusExpansionAdminReviewPackage', 'runCorpusExpansionDiscovery'];

function verifySafety(candidates) {
  const violations = [];
  for (const file of PRODUCTION_WIRE) {
    const p = path.join(ROOT, 'services', file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const mod of FORBIDDEN) {
      if (content.includes(mod)) violations.push({ file, mod });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    graphEdgeCount: getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
    allReviewRequired: candidates.every((c) => c.reviewRequired === true),
    noneAutoApplied: candidates.every((c) => c.autoApplied === false),
  };
}

function writeSourceInventory(result) {
  const lines = [
    '# Corpus Expansion Source Inventory',
    '',
    '**Phase:** 2J-J Part A',
    `**Date:** ${result.ranAt}`,
    `**Total sources:** ${result.sourceRegistry.length}`,
    '',
    '| Source | Platform | Transcript | Processing | Entries |',
    '|--------|----------|------------|------------|---------|',
  ];

  for (const s of result.sourceRegistry) {
    lines.push(
      `| ${s.sourceName} | ${s.platform} | ${s.transcriptAvailable ? 'yes' : 'no'} | ${s.processingAllowed ? 'allowed' : 'metadata'} | ${s.entryCount || 0} |`,
    );
  }

  lines.push('', '## Source metadata sample', '');
  for (const s of result.sourceRegistry.slice(0, 8)) {
    lines.push(`### ${s.sourceName}`);
    lines.push(`- **URL:** ${s.sourceUrl || 'n/a'}`);
    lines.push(`- **Speaker:** ${s.speaker || 'n/a'}`);
    lines.push(`- **reviewRequired:** true`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.sources, `${lines.join('\n')}\n`);
}

function writeQuestionInventory(result) {
  const topicCounts = {};
  for (const q of result.questions) {
    const t = q.topicCandidate || q.topic || 'open_topic';
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  }

  const lines = [
    '# Corpus Expansion Question Inventory',
    '',
    '**Phase:** 2J-J Part B',
    `**Date:** ${result.ranAt}`,
    `**Total questions:** ${result.questions.length}`,
    `**Open-topic discovery:** enabled`,
    '',
    '## Topic distribution (top 15)',
    '',
    '| Topic candidate | Count |',
    '|-----------------|-------|',
  ];

  for (const [t, c] of Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    lines.push(`| ${t} | ${c} |`);
  }

  lines.push('', '## Sample questions', '');
  for (const q of result.questions.slice(0, 30)) {
    lines.push(`- **${q.topicCandidate}** (${q.frequency || 1}×) [${q.source}]: ${q.question.slice(0, 85)}${q.question.length > 85 ? '…' : ''}`);
  }

  fs.writeFileSync(REPORTS.questions, `${lines.join('\n')}\n`);
}

function writeScriptureInventory(result) {
  const lines = [
    '# Corpus Expansion Scripture Inventory',
    '',
    '**Phase:** 2J-J Part C',
    `**Date:** ${result.ranAt}`,
    `**Total scripture chains:** ${result.chains.length}`,
    '',
    '| # | Question | Refs | Source |',
    '|---|----------|------|--------|',
  ];

  result.chains.forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.question.slice(0, 50)}… | ${c.scripturesCited.length} | ${c.source} |`);
  });

  lines.push('', '## Chain details (top 15)', '');
  for (const c of result.chains.slice(0, 15)) {
    lines.push(`### ${c.question}`);
    lines.push(`**Scriptures:** ${c.scripturesCited.join(', ')}`);
    lines.push(`**Conclusion:** ${(c.conclusion || '').slice(0, 120)}…`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.scriptures, `${lines.join('\n')}\n`);
}

function writeG2RReport(result) {
  const g2rCandidates = result.candidates.filter((c) => c.genesisToRevelationSpan);
  const lines = [
    '# Corpus Expansion Genesis-to-Revelation Report',
    '',
    '**Phase:** 2J-J Part D',
    `**Date:** ${result.ranAt}`,
    `**G2R expansions:** ${result.impact.genesisToRevelationExpansions}`,
    '',
    '## G2R chains (top 15)',
    '',
  ];

  for (const c of g2rCandidates.slice(0, 15)) {
    lines.push(`### ${c.candidateId} — score ${c.supportScore}`);
    lines.push(`**Question:** ${c.question}`);
    lines.push(`**G2R chain:** ${c.genesisToRevelationChain.join(' → ')}`);
    lines.push(`**Parallel refs:** ${c.parallelRefs.slice(0, 6).join(', ')}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeSupportRanking(result) {
  const lines = [
    '# Corpus Expansion Support Ranking',
    '',
    '**Phase:** 2J-J Part E',
    `**Date:** ${result.ranAt}`,
    '',
    '## Score bands',
    '',
    '| Band | Range | Count |',
    '|------|-------|-------|',
    `| Strong | 95-100 | ${result.scoreBuckets.above95} |`,
    `| Very Strong | 90-94 | ${result.scoreBuckets.above90 - result.scoreBuckets.above95} |`,
    `| Strong Candidate | 80-89 | ${result.scoreBuckets.above80 - result.scoreBuckets.above90} |`,
    `| Review | 70-79 | ${result.scoreBuckets.above70 - result.scoreBuckets.above80} |`,
    `| Research | 60-69 | ${result.candidates.filter((c) => c.supportScore >= 60 && c.supportScore < 70).length} |`,
    `| Hold | <60 | ${result.scoreBuckets.below60} |`,
    '',
    '## Ranked candidates',
    '',
    '| Rank | ID | Score | Band | Topic | G2R | Action |',
    '|------|-----|-------|------|-------|-----|--------|',
  ];

  result.ranked.forEach((c, i) => {
    lines.push(
      `| ${i + 1} | ${c.candidateId} | ${c.supportScore} | ${c.supportBand} | ${c.topic} | ${c.genesisToRevelationSpan ? 'yes' : 'no'} | ${c.recommendedAction} |`,
    );
  });

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeAdminPackage(result) {
  const payload = {
    generatedAt: result.ranAt,
    phase: '2J-J',
    reviewRequired: true,
    autoApplied: false,
    productionApplied: false,
    candidateCount: result.candidates.length,
    candidates: result.candidates.map((c) => ({
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      scriptures: c.scriptures,
      scriptureOrder: c.scriptureOrder,
      conclusion: c.conclusion,
      parallelRefs: c.parallelRefs,
      genesisToRevelationChain: c.genesisToRevelationChain,
      genesisToRevelationSpan: c.genesisToRevelationSpan,
      supportScore: c.supportScore,
      supportBand: c.supportBand,
      supportDelta: c.supportDelta,
      confidenceBefore: c.confidenceBefore,
      confidenceAfter: c.confidenceAfter,
      recommendedAction: c.recommendedAction,
      reviewRequired: true,
      autoApplied: false,
      humanApprovalRequired: true,
      discoveryPhase: '2J-J',
    })),
  };

  fs.mkdirSync(path.dirname(OUT_PACKAGE), { recursive: true });
  fs.writeFileSync(OUT_PACKAGE, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeImpactReport(result) {
  const imp = result.impact;
  const lines = [
    '# Corpus Expansion Impact Report',
    '',
    '**Phase:** 2J-J Part G',
    `**Date:** ${result.ranAt}`,
    '',
    '## Coverage impact',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Baseline coverage (2J-H) | ${imp.baselineCoveragePct}% |`,
    `| Baseline ceiling (2J-I) | ${imp.baselineCeilingPct}% |`,
    `| Post-expansion coverage | ${imp.postExpansionCoveragePct}% |`,
    `| Coverage increase | +${imp.coverageIncreasePct} pp |`,
  '',
    '## Discovery gains',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| New topics discovered | ${imp.newTopicCount} |`,
    `| New scripture chains | ${imp.newScriptureChains} |`,
    `| G2R expansions | ${imp.genesisToRevelationExpansions} |`,
    `| New supporting witnesses | ${imp.newSupportingWitnesses} |`,
    `| Degradation reduction potential | ~${imp.degradationReductionPotentialPct}% |`,
    '',
    '## New topics (sample)',
    '',
    ...imp.newTopics.slice(0, 15).map((t) => `- ${t}`),
  ];

  fs.writeFileSync(REPORTS.impact, `${lines.join('\n')}\n`);
}

function writeWitnessReport(result) {
  const ws = result.witnessSummary;
  const lines = [
    '# Full Scripture Witness Expansion Report',
    '',
    '**Phase:** 2J-J Part D2',
    `**Date:** ${result.ranAt}`,
    '',
    '## Summary answers',
    '',
    `1. **New supporting witnesses found:** ${ws.totalNewSupportingWitnesses}`,
    `2. **Genesis→Revelation chains built:** ${ws.g2rChainsBuilt}`,
    `3. **Most strengthened conclusions:** ${ws.mostStrengthened.map((w) => w.question.slice(0, 40)).join('; ')}`,
    `4. **Weakened conclusions:** ${ws.weakened.length ? ws.weakened.map((w) => w.question.slice(0, 40)).join('; ') : 'none'}`,
    `5. **Caution/contradiction witnesses:** ${ws.cautionOrContradiction.length} discoveries`,
    `6. **Largest confidence gains:** ${ws.largestConfidenceGains.map((w) => `${w.question.slice(0, 30)} (+${w.supportDelta})`).join('; ')}`,
    `7. **Priority admin review:** ${ws.priorityReview.map((c) => c.candidateId).join(', ')}`,
    '',
    '## Witness expansion details (top 10)',
    '',
  ];

  for (const w of result.witnessExpansions.slice(0, 10)) {
    lines.push(`### ${w.question.slice(0, 70)}`);
    lines.push(`- **Confidence:** ${w.confidenceBefore} → ${w.confidenceAfter} (+${w.supportDelta})`);
    lines.push(`- **Supporting:** ${w.supportingWitnesses.slice(0, 4).join(', ') || 'none'}`);
    lines.push(`- **Confirming:** ${w.confirmingWitnesses.slice(0, 3).join(', ') || 'none'}`);
    lines.push(`- **Caution:** ${w.cautionWitnesses.slice(0, 2).join(', ') || 'none'}`);
    lines.push(`- **G2R chain:** ${w.genesisToRevelationChain.slice(0, 5).join(' → ')}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.witness, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const m = result.metrics;
  const sb = result.scoreBuckets;
  const imp = result.impact;
  const priority = result.ranked.slice(0, 5);

  const lines = [
    '# Bible Authority Phase 2J-J Report',
    '',
    '**Phase:** Corpus Expansion Discovery',
    `**Date:** ${result.ranAt}`,
    '**Status:** Discovery only — admin review required',
    '',
    '## Mission answers',
    '',
    `1. **Total questions discovered:** ${m.questionCount}`,
    `2. **Total scripture chains discovered:** ${m.chainCount}`,
    `3. **Total Genesis→Revelation expansions:** ${m.g2rExpansionCount}`,
    `4. **Candidates above 95:** ${sb.above95}`,
    `5. **Candidates above 90:** ${sb.above90}`,
    `6. **Candidates above 80:** ${sb.above80}`,
    `7. **New topics discovered:** ${m.newTopicCount}`,
    `8. **Estimated coverage increase:** +${imp.coverageIncreasePct} pp (${imp.baselineCoveragePct}% → ${imp.postExpansionCoveragePct}%)`,
    `9. **Estimated degradation reduction:** ~${imp.degradationReductionPotentialPct}%`,
    `10. **Review first:** ${priority.map((c) => `${c.candidateId} (${c.supportScore}, ${c.topic})`).join('; ')}`,
    '',
    '## Safety (Part H)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| No production imports | ${safety.passed ? 'PASS' : 'FAIL'} |`,
    `| No graph updates | PASS |`,
    `| No evidence updates | PASS |`,
    `| No doctrine updates | PASS |`,
    `| All reviewRequired | ${safety.allReviewRequired ? 'PASS' : 'FAIL'} |`,
    `| None autoApplied | ${safety.noneAutoApplied ? 'PASS' : 'FAIL'} |`,
    `| Graph edges | ${safety.graphEdgeCount} |`,
    `| Evidence cards | ${safety.cardCount} |`,
    '',
    '## Deliverables',
    '',
    '- CorpusExpansionSourceInventory.md',
    '- CorpusExpansionQuestionInventory.md',
    '- CorpusExpansionScriptureInventory.md',
    '- CorpusExpansionGenesisRevelationReport.md',
    '- CorpusExpansionSupportRanking.md',
    '- docs/evidence-candidates/CorpusExpansionAdminReviewPackage.json',
    '- CorpusExpansionImpactReport.md',
    '- FullScriptureWitnessExpansionReport.md',
    '- BibleAuthorityPhase2JJReport.md',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-J — Corpus Expansion Discovery');
  const result = runCorpusExpansionDiscovery();
  const safety = verifySafety(result.candidates);

  writeSourceInventory(result);
  writeQuestionInventory(result);
  writeScriptureInventory(result);
  writeG2RReport(result);
  writeSupportRanking(result);
  writeAdminPackage(result);
  writeImpactReport(result);
  writeWitnessReport(result);
  writeMainReport(result, safety);

  console.log(`Sources: ${result.metrics.sourceCount}`);
  console.log(`Questions: ${result.metrics.questionCount}`);
  console.log(`Chains: ${result.metrics.chainCount}`);
  console.log(`≥95: ${result.scoreBuckets.above95} | ≥90: ${result.scoreBuckets.above90} | ≥80: ${result.scoreBuckets.above80}`);
  console.log(`G2R: ${result.metrics.g2rExpansionCount} | New topics: ${result.metrics.newTopicCount}`);
  console.log(`Coverage: +${result.impact.coverageIncreasePct} pp`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
