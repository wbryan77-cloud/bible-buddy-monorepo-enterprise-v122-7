#!/usr/bin/env node
/**
 * Phase 3U — Normalization, linkage & gap closure.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3uNormalizationLinkageGapClosure } = require('../services/phase3uNormalizationLinkageGapClosure');

const ROOT = path.join(__dirname, '..');

function writeMainReport(data) {
  const e = data.executive;
  const g = data.gainReport;
  const lines = [
    '# Bible Authority Phase 3U Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Objectives',
    '',
    '1. Normalize caption-derived scripture references',
    '2. Semantic doctrine-pack matching (auto-link >= 0.85)',
    '3. Spanish transcript processing',
    '4. PDF confidence re-scoring',
    '5. Coverage rebuild + gap closure',
    '',
    '## Results',
    '',
    `| Metric | Before | After | Delta |`,
    `|--------|--------|-------|-------|`,
    `| Covered | ${e.coverageBefore.covered} | ${e.coverageAfter.covered} | ${g.delta.covered} |`,
    `| Partial | ${e.coverageBefore.partial} | ${e.coverageAfter.partial} | ${g.delta.partial} |`,
    `| Missing | ${e.coverageBefore.missing} | ${e.coverageAfter.missing} | ${g.delta.missing} |`,
  '',
    '### Normalization',
    '',
    `- Incomplete candidates (Pass A): **${e.normalizationCandidates}**`,
    `- Context-expanded refs (Pass B): **${e.normalizedReferences}**`,
    '',
    '### Semantic linkage',
    '',
    `- Auto-linked (confidence >= 0.85): **${e.semanticAutoLinked}**`,
    '',
    '### Spanish',
    '',
    `- Lessons processed: **${e.spanishLessonsProcessed}**`,
    `- With scriptures: **${e.spanishWithScriptures}**`,
    '',
    '### PDF confidence',
    '',
    `- Auto-approved (score >= 80): **${e.pdfAutoApproved}**`,
    '',
    '### Facebook',
    '',
    `- Scripture recoveries: **${e.facebookScriptureRecoveries}**`,
    '',
    '### Human review',
    '',
    `- Before: **${e.humanReviewBefore}** required`,
    `- After: **${e.humanReviewAfter}** required`,
    `- Reduction: **${e.humanReviewReductionPct}%**`,
    '',
    '### Targets',
    '',
    `- Missing < 15: ${g.targets.missingUnder15 ? '✅' : '❌'} (${e.remainingMissing} remaining)`,
    `- Covered > 340: ${g.targets.coverageCoveredGt340 ? '✅' : '❌'} (${e.coverageAfter.covered})`,
    `- Partial >= 219: ${g.targets.coveragePartialGt220 ? '✅' : '❌'} (${e.coverageAfter.partial})`,
    `- Missing < 15 (coverage): ${g.targets.coverageMissingLt15 ? '✅' : '❌'} (${e.coverageAfter.missing})`,
    `- Human review -50%: ${g.targets.humanReviewReduced50Pct ? '✅' : '❌'} (${e.humanReviewReductionPct}%)`,
    '',
    '## Safety',
    '',
    'No production, doctrine generation, evidence card, graph, or prompt changes.',
  ];
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase3UReport.md'), `${lines.join('\n')}\n`);

  const covLines = [
    '# Phase 3U Coverage Update',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '| Metric | Before 3U | After 3U |',
    '|--------|-----------|----------|',
    `| Covered | ${e.coverageBefore.covered} | ${e.coverageAfter.covered} |`,
    `| Partial | ${e.coverageBefore.partial} | ${e.coverageAfter.partial} |`,
    `| Missing | ${e.coverageBefore.missing} | ${e.coverageAfter.missing} |`,
    '',
    `Remaining missing entries: **${e.remainingMissing}**`,
  ];
  fs.writeFileSync(path.join(ROOT, 'Phase3UCoverageUpdate.md'), `${covLines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3U — Normalization, linkage & gap closure starting...');
  const data = await runPhase3uNormalizationLinkageGapClosure();
  writeMainReport(data);
  console.log('Phase 3U — Complete');
  console.log(`Coverage: ${data.executive.coverageAfter.covered}/${data.executive.coverageAfter.partial}/${data.executive.coverageAfter.missing}`);
  console.log(`Normalized refs: ${data.executive.normalizedReferences} · Auto-linked: ${data.executive.semanticAutoLinked}`);
  console.log(`Human review: ${data.executive.humanReviewBefore} → ${data.executive.humanReviewAfter} (${data.executive.humanReviewReductionPct}% reduction)`);
  console.log(`Missing remaining: ${data.executive.remainingMissing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
