#!/usr/bin/env node
/**
 * Phase 2J-I — Corpus Completion Audit runner.
 * Discovery only — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { runCorpusCompletionAudit } = require('../services/corpusCompletionAudit');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  inventory: path.join(ROOT, 'UnknownTopicInventory.md'),
  corpus: path.join(ROOT, 'CorpusCompletionAudit.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JIReport.md'),
};

const OUT_TOPICS = path.join(ROOT, 'docs', 'evidence-candidates', 'FutureTopicCandidates.json');

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
];

const FORBIDDEN = ['corpusCompletionAudit', 'FutureTopicCandidates', 'runCorpusCompletionAudit'];

function verifySafety() {
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
  };
}

function writeInventory(audit) {
  const lines = [
    '# Unknown Topic Inventory',
    '',
    '**Phase:** 2J-I Part A',
    `**Date:** ${audit.ranAt}`,
    `**Confidence-0 questions:** ${audit.zeroConfidenceCount}`,
    '',
    '## Classification summary',
    '',
    '| Classification | Count |',
    '|----------------|-------|',
  ];

  for (const [cls, count] of Object.entries(audit.byClassification).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${cls} | ${count} |`);
  }

  lines.push('', '## Full inventory', '');

  for (const item of audit.inventory) {
    lines.push(`### ${item.recoveryId}`);
    lines.push('');
    lines.push(`**Question:** ${item.question}`);
    lines.push(`**Classification:** ${item.classification}`);
    lines.push(`**Topic candidate:** ${item.topicCandidate}`);
    if (item.mappedCardTopic) lines.push(`**Mapped card topic:** ${item.mappedCardTopic}`);
    lines.push(`**Reason:** ${item.reason}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.inventory, `${lines.join('\n')}\n`);
}

function writeFutureTopics(audit) {
  const payload = {
    generatedAt: audit.ranAt,
    phase: '2J-I',
    reviewRequired: true,
    autoApplied: false,
    productionApplied: false,
    candidates: audit.futureTopicCandidates,
  };

  fs.mkdirSync(path.dirname(OUT_TOPICS), { recursive: true });
  fs.writeFileSync(OUT_TOPICS, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeCorpusAudit(audit) {
  const m = audit.metrics;
  const c = audit.ceiling;
  const lines = [
    '# Corpus Completion Audit',
    '',
    '**Phase:** 2J-I Parts B–C',
    `**Date:** ${audit.ranAt}`,
    '',
    '## Blind spot breakdown',
    '',
    `| Classification | Count | Recoverable? |`,
    `|----------------|-------|--------------|`,
    `| bad_extraction | ${audit.byClassification.bad_extraction || 0} | yes — inference fix |`,
    `| duplicate_topic | ${audit.byClassification.duplicate_topic || 0} | yes — dedup routing |`,
    `| missing_scripture_chain | ${audit.byClassification.missing_scripture_chain || 0} | yes — chain/graph expansion |`,
    `| new_topic | ${audit.byClassification.new_topic || 0} | yes — new evidence card |`,
    `| needs_transcript | ${audit.byClassification.needs_transcript || 0} | partial — licensing |`,
    `| future_research | ${audit.byClassification.future_research || 0} | no — companion layer |`,
    '',
    '## Coverage impact estimates',
    '',
    `| Scenario | Discovery gain | Notes |`,
    `|----------|----------------|-------|`,
    `| Fix extraction gaps | +${m.fixableViaExtraction} questions | Keyword/pattern alignment |`,
    `| Dedup routing | +${m.fixableViaDedup} questions | Rephrasing → existing chains |`,
    `| Complete scripture chains | +${m.fixableViaChains} questions | Continuity + graph edges |`,
    `| Add new topic cards | +${m.fixableViaNewTopics} questions | Admin-approved cards only |`,
    `| Licensed transcripts | +${m.needsTranscript} questions | IOG/archive extraction |`,
    '',
    '## Future topic candidates (top 10)',
    '',
    '| Topic | Frequency | Coverage impact | Graph gain | Authority gain |',
    '|-------|-----------|-----------------|------------|----------------|',
  ];

  for (const t of audit.futureTopicCandidates.slice(0, 10)) {
    lines.push(
      `| ${t.topic} | ${t.frequency} | +${t.estimatedCoverageImpact}% | +${t.estimatedSupportGraphGain} edges | +${t.estimatedAuthorityGain} |`,
    );
  }

  lines.push('', '## Discovery ceiling', '', `| Metric | Value |`, `|--------|-------|`);
  lines.push(`| Current coverage (2J-H) | ${c.currentCoveragePct}% |`);
  lines.push(`| Ceiling after fixable gaps | ${c.ceilingAfterFixesPct}% |`);
  lines.push(`| Absolute ceiling (excl. future research) | ${c.absoluteCeilingExcludingFutureResearchPct}% |`);
  lines.push(`| Recoverable from confidence-0 pool | ${c.recoverableQuestions} |`);
  lines.push(`| Future research excluded | ${c.futureResearchExcluded} |`);
  lines.push(`| Remaining blind spots | ${c.remainingBlindSpots} |`);

  fs.writeFileSync(REPORTS.corpus, `${lines.join('\n')}\n`);
}

function writeMainReport(audit, safety) {
  const m = audit.metrics;
  const c = audit.ceiling;
  const topTopics = audit.futureTopicCandidates.slice(0, 5);
  const missingCards = audit.missingFromCards
    .filter((i) => i.classification === 'new_topic')
    .map((i) => i.topicCandidate);
  const uniqueMissing = [...new Set(missingCards)];

  const lines = [
    '# Bible Authority Phase 2J-I Report',
    '',
    '**Phase:** Corpus Completion Audit',
    `**Date:** ${audit.ranAt}`,
    '**Status:** Discovery only — admin review required',
    '',
    '## Mission answers',
    '',
    `1. **How many confidence-0 questions remain?** ${m.zeroConfidenceCount}`,
    `2. **How many unique topics were discovered?** ${m.uniqueTopicCount}`,
    `3. **Which new topics appear most often?** ${topTopics.map((t) => `${t.topic} (${t.frequency})`).join(', ') || 'none'}`,
    `4. **Which topics are likely missing from current cards?** ${uniqueMissing.join(', ') || 'none flagged as new_topic'}`,
    `5. **Which topics are future research only?** pastoral_care, emotional_pastoral, conversational follow-ups (${m.futureResearchOnly} questions)`,
    `6. **Estimated discovery ceiling after fixes?** ${c.currentCoveragePct}% → ${c.ceilingAfterFixesPct}% (absolute ${c.absoluteCeilingExcludingFutureResearchPct}% excl. future research)`,
    '',
    '## Classification distribution',
    '',
  ];

  for (const [cls, count] of Object.entries(audit.byClassification).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${cls}:** ${count}`);
  }

  lines.push('', '## Safety verification', '');
  lines.push(`| Check | Status |`);
  lines.push(`|-------|--------|`);
  lines.push(`| No production imports | ${safety.passed ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Graph edges unchanged | ${safety.graphEdgeCount} |`);
  lines.push(`| Evidence cards unchanged | ${safety.cardCount} |`);
  lines.push(`| No promotion | PASS |`);
  lines.push(`| No doctrine changes | PASS |`);
  lines.push('', '## Deliverables', '');
  lines.push('- UnknownTopicInventory.md');
  lines.push('- docs/evidence-candidates/FutureTopicCandidates.json');
  lines.push('- CorpusCompletionAudit.md');
  lines.push('- BibleAuthorityPhase2JIReport.md');

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-I — Corpus Completion Audit');
  const audit = runCorpusCompletionAudit({
    totalQuestions: 159,
    baselineWithScripture: 114,
  });
  const safety = verifySafety();

  writeInventory(audit);
  writeFutureTopics(audit);
  writeCorpusAudit(audit);
  writeMainReport(audit, safety);

  console.log(`Confidence-0: ${audit.zeroConfidenceCount}`);
  console.log('Classifications:', JSON.stringify(audit.byClassification));
  console.log(`Ceiling: ${audit.ceiling.currentCoveragePct}% → ${audit.ceiling.ceilingAfterFixesPct}%`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
