#!/usr/bin/env node
/**
 * Phase 3W.2 — Intelligence validation pass.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3w2IntelligenceValidation } = require('../services/phase3w2IntelligenceValidation');

const ROOT = path.join(__dirname, '..');

function writeReport(data) {
  const h = data.healthRecalibration;
  const chain = data.validations.chainAttachment.summary;
  const question = data.validations.questionCoverage;
  const trace = data.validations.traceabilityGap.summary;
  const pathway = data.validations.pathwayQuality.summary;
  const exec = h.executiveAnswers;

  const lines = [
    '# Bible Authority Phase 3W.2 Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Mission',
    '',
    'Determine whether remaining weak metrics are genuine corpus weaknesses or scoring/attachment limitations. Validation only.',
    '',
    '## Executive answers',
    '',
    `1. **Chain attachment weakness — bookkeeping share:** ${exec.chainAttachmentBookkeepingSharePct}% of unattached gaps show scripture overlap (bookkeeping/linkage, not missing evidence). Pack gaps: ${chain.packGapsMissingLinkage} missing linkage vs ${chain.packGapsInsufficientEvidence} insufficient evidence.`,
    `2. **Question coverage weakness — corpus scope:** True phase3f coverage (excluding internal audit prompts) is **${exec.questionCoverageCorpusScopePct}%** vs current scorecard formula **${question.coverageA.coveragePct}%** (double-counting denominator).`,
    `3. **Traceability weakness — metadata share:** ${exec.traceabilityMetadataSharePct}% of traceability gaps are metadata-only; ${trace.evidenceRelatedFailures} packs lack traceability entries (evidence-related).`,
    `4. **Adjusted corpus health score:** **${exec.adjustedCorpusHealthScorePct}%** (metadata-adjusted readiness). Current readiness: ${h.readiness.currentReadinessPct}%.`,
    `5. **Phase 4 implementation testing:** ${exec.phase4Ready ? '**Ready** with metadata-adjusted scoring' : '**Proceed with caution** — address evidence-related gaps first'}.`,
    '',
    '## Part 1 — Chain attachment validation',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total chains | ${chain.totalChains} |`,
    `| Attached chains | ${chain.attachedChains} |`,
    `| Unattached chains | ${chain.unattachedChains} |`,
    `| Major packs without chain attachment | ${chain.majorPacksWithoutChainAttachment} |`,
    `| Pack gaps — missing linkage | ${chain.packGapsMissingLinkage} |`,
    `| Pack gaps — insufficient evidence | ${chain.packGapsInsufficientEvidence} |`,
    '',
    '## Part 2 — Question coverage validation',
    '',
    '| Coverage | Pct | Note |',
    '|----------|-----|------|',
    `| A — current formula | ${question.coverageA.coveragePct}% | ${question.coverageA.note} |`,
    `| B — exclude internal audit | ${question.coverageB.coveragePct}% | phase3f: ${question.coverageB.phase3fCorpus.coveragePct}% |`,
    `| C — include audit prompts | ${question.coverageC.coveragePct}% | phase3f: ${question.coverageC.phase3fCorpus.coveragePct}% |`,
    '',
    '## Part 3 — Traceability gap analysis',
    '',
    `- Packs audited: **${trace.totalPacksAudited}**`,
    `- In traceability index: **${trace.packsInTraceabilityIndex}**`,
    `- Failures: **${trace.failureCount}** (${trace.metadataOnlyFailures} metadata-only, ${trace.evidenceRelatedFailures} evidence-related)`,
    '',
    '## Part 4 — Pathway quality validation',
    '',
    `| Quality | Count |`,
    `|---------|-------|`,
    `| Observed — supported (≥2 sources) | ${pathway.supportedCount} |`,
    `| Observed — weak (single source) | ${pathway.weakCount} |`,
    `| Candidate (reviewable) | ${pathway.candidateCount} |`,
    `| Adjusted weak pathway rate | ${pathway.adjustedWeakPathwayPct}% |`,
    '',
    '## Part 5 — Health score recalibration',
    '',
    '| Metric | Current | Adjusted | Metadata-adjusted |',
    '|--------|---------|----------|-------------------|',
  ];

  for (const m of h.adjustedMetrics) {
    lines.push(`| ${m.name} | ${m.current}% | ${m.adjusted}% | ${m.metadataAdjusted}% |`);
  }

  lines.push(
    '',
    `**Adjusted readiness:** ${h.readiness.adjustedReadinessPct}%`,
    `**Metadata-adjusted readiness:** ${h.readiness.metadataAdjustedReadinessPct}%`,
    '',
    '## Artifacts',
    '',
    '- `chain-attachment-validation.json`',
    '- `question-coverage-validation.json`',
    '- `traceability-gap-analysis.json`',
    '- `pathway-quality-validation.json`',
    '- `corpus-health-recalibration-report.json`',
    '',
    'No doctrine generation. Validation only.',
  );

  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase3W2Report.md'), `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3W.2 — Intelligence validation starting...');
  const data = runPhase3w2IntelligenceValidation();
  writeReport(data);
  const h = data.healthRecalibration;
  console.log('Phase 3W.2 — Complete');
  console.log(`Adjusted readiness: ${h.readiness.adjustedReadinessPct}% · Metadata-adjusted: ${h.readiness.metadataAdjustedReadinessPct}%`);
  console.log(`Phase 4 ready: ${h.readiness.readyForPhase4ImplementationTesting}`);
}

main();
