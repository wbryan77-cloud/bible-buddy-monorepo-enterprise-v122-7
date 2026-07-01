#!/usr/bin/env node
/**
 * Phase 3O — Source gap completion, title normalization, weak pack strengthening.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3oSourceGapCompletion } = require('../services/phase3oSourceGapCompletion');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  priorityGaps: path.join(ROOT, 'PriorityGapTargetReport.md'),
  sourceChains: path.join(ROOT, 'PrioritySourceChainExtraction.md'),
  spanish: path.join(ROOT, 'SpanishLessonLinkageReport.md'),
  campNorm: path.join(ROOT, 'CampLessonTitleNormalization.md'),
  icoj: path.join(ROOT, 'ICOJDocumentationOrganization.md'),
  weakPacks: path.join(ROOT, 'WeakPackStrengtheningReport.md'),
  feasts: path.join(ROOT, 'FeastGapStrengtheningReport.md'),
  coverage: path.join(ROOT, 'PostGapCompletionCoverageReport.md'),
  humanReview: path.join(ROOT, 'UpdatedHumanReviewPackets.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3OReport.md'),
};

function writePriorityGaps(data) {
  const t = data.priorityGapTargets;
  const lines = [
    '# Priority Gap Target Report',
    '',
    '**Phase:** 3O Part A',
    `**Date:** ${data.ranAt}`,
    '',
    '## Explicit priority lessons',
    '',
    ...t.explicit.map((l) => `- ${l}`),
    '',
    '## Weak pack focus',
    '',
    ...t.weakPacks.map((l) => `- ${l}`),
    '',
    `**Remaining missing (3N):** ${t.remainingMissing}`,
    `**Priority targets processed:** ${t.totalPriorityProcessed}`,
    '',
    '## Remaining 208 missing — processing strategy',
    '',
    '- Camp title normalization → chain linkage',
    '- Spanish IOG inventory → topic + pack assignment',
    '- ICOJ handout scripture extraction',
    '- Manual transcript for video-only lessons',
  ];

  fs.writeFileSync(REPORTS.priorityGaps, `${lines.join('\n')}\n`);
}

function writeSourceChains(data) {
  const lines = [
    '# Priority Source Chain Extraction',
    '',
    '**Phase:** 3O Part B',
    `**Date:** ${data.ranAt}`,
    '',
    '| Lesson | Camp | Scriptures | Chain | Topic | Pack | Status |',
    '|--------|------|------------|-------|-------|------|--------|',
  ];

  for (const e of data.priorityExtractions.slice(0, 60)) {
    lines.push(`| ${e.lessonTitle?.slice(0, 35)} | ${e.camp} | ${e.scriptureRefsFound.length} | ${e.chainFound ? 'yes' : 'no'} | ${e.topicCandidate} | ${e.doctrinePackAssignment || '—'} | ${e.extractionStatus} |`);
  }

  lines.push('', '## Needs manual source text', '');
  for (const e of data.priorityExtractions.filter((x) =>
    x.extractionStatus === 'needs_manual_transcript_or_source_text' || x.extractionStatus === 'no_scripture_refs_found',
  ).slice(0, 20)) {
    lines.push(`- **${e.lessonTitle}** — ${e.extractionStatus} (${e.reasonMissing || ''})`);
  }

  fs.writeFileSync(REPORTS.sourceChains, `${lines.join('\n')}\n`);
}

function writeSpanish(data) {
  const lines = [
    '# Spanish Lesson Linkage Report',
    '',
    '**Phase:** 3O Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Spanish titles processed:** ${data.spanishLinkages.length}`,
  ];

  lines.push('', '| Spanish title | English | Topic | Pack | Chain | Status |', '|---------------|---------|-------|------|-------|--------|');
  for (const s of data.spanishLinkages) {
    lines.push(`| ${s.spanishTitle?.slice(0, 40)} | ${s.englishEquivalent?.slice(0, 30)} | ${s.topicCandidate} | ${s.doctrinePackAssignment || '—'} | ${s.chainFound ? 'yes' : 'no'} | ${s.status} |`);
  }

  fs.writeFileSync(REPORTS.spanish, `${lines.join('\n')}\n`);
}

function writeCampNorm(data) {
  const withChains = data.campMappings.filter((m) => m.chainStatus.includes('chain_found'));
  const lines = [
    '# Camp Lesson Title Normalization',
    '',
    '**Phase:** 3O Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Titles mapped:** ${data.campMappings.length}`,
    `**With chain linkage:** ${withChains.length}`,
    '',
    '| Raw title | Canonical | Camp | Topic | Pack | Chain |',
    '|-----------|-----------|------|-------|------|-------|',
  ];

  for (const m of data.campMappings.filter((x) => x.camp !== 'HQ' || x.chainCount > 0).slice(0, 50)) {
    lines.push(`| ${m.rawTitle?.slice(0, 30)} | ${m.canonicalTitle?.slice(0, 25)} | ${m.camp} | ${m.assignedTopic} | ${m.assignedDoctrinePack || '—'} | ${m.chainStatus} |`);
  }

  fs.writeFileSync(REPORTS.campNorm, `${lines.join('\n')}\n`);
}

function writeICOJ(data) {
  const lines = [
    '# ICOJ Documentation Organization',
    '',
    '**Phase:** 3O Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '| Group | Found | Processed | Scriptures | Chains | Topics | Gaps |',
    '|-------|-------|-----------|------------|--------|--------|------|',
  ];

  for (const g of Object.values(data.icojOrganization)) {
    lines.push(`| ${g.label} | ${g.documentsFound} | ${g.documentsProcessed} | ${g.scripturesExtracted} | ${g.chainsBuilt} | ${g.topicsAssigned} | ${g.gapsRemaining} |`);
  }

  fs.writeFileSync(REPORTS.icoj, `${lines.join('\n')}\n`);
}

function writeWeakPacks(data) {
  const lines = [
    '# Weak Pack Strengthening Report',
    '',
    '**Phase:** 3O Part F',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  for (const w of data.weakStrengthening) {
    lines.push(`## ${w.displayName}`, '');
    lines.push(`- **Prior original chain:** ${w.priorOriginalCount}`);
    lines.push(`- **New scriptures from source:** ${w.newScriptureCount}`);
    lines.push(`- **Corpus questions:** ${w.corpusQuestions} · **Chains:** ${w.corpusChains} · **PDFs:** ${w.corpusPdfs}`);
    if (w.newScripturesFromSource?.length) {
      lines.push(`- **Candidates:** ${w.newScripturesFromSource.join(', ')}`);
    }
    if (w.sourceLessons?.length) {
      lines.push(`- **Source lessons:** ${w.sourceLessons.join('; ')}`);
    }
    lines.push(`- **Improved:** ${w.improved ? 'yes' : 'no'}`, '');
  }

  fs.writeFileSync(REPORTS.weakPacks, `${lines.join('\n')}\n`);
}

function writeFeasts(data) {
  const lines = [
    '# Feast Gap Strengthening Report',
    '',
    '**Phase:** 3O Part G',
    `**Date:** ${data.ranAt}`,
    '',
    '| Feast | Readiness | Original | New source refs | Weak areas |',
    '|-------|-----------|----------|-----------------|------------|',
  ];

  for (const f of data.feastStrengthening.filter((x) => x.topic)) {
    lines.push(`| ${f.displayName} | ${f.reviewReadiness ?? '—'} | ${f.originalChainLength ?? '—'} | ${f.newSourceScriptures ?? 0} | ${(f.weakAreas || []).join(', ')} |`);
  }

  fs.writeFileSync(REPORTS.feasts, `${lines.join('\n')}\n`);
}

function writeCoverage(data) {
  const c = data.coverageRecalculation;
  const t = c.targets;
  const lines = [
    '# Post Gap Completion Coverage Report',
    '',
    '**Phase:** 3O Part H',
    `**Date:** ${data.ranAt}`,
    '',
    '| Metric | 3M | 3N | 3O | Target | Met |',
    '|--------|-----|-----|-----|--------|-----|',
    `| Covered | ${c.prior3M.covered} | ${c.prior3N.covered} | **${c.after.covered}** | ≥350 | ${t.coveredMet ? 'yes' : 'no'} |`,
    `| Partial | ${c.prior3M.partial} | ${c.prior3N.partial} | **${c.after.partial}** | ≤40 | ${t.partialMet ? 'yes' : 'no'} |`,
    `| Missing | ${c.prior3M.missing} | ${c.prior3N.missing} | **${c.after.missing}** | ≤150 | ${t.missingMet ? 'yes' : 'no'} |`,
    '',
    `**Delta from 3N:** covered +${c.deltaFrom3N.covered} · partial ${c.deltaFrom3N.partial} · missing ${c.deltaFrom3N.missing}`,
  ];

  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const lines = [
    '# Updated Human Review Packets',
    '',
    '**Phase:** 3O Part I — review only, no implementation',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${data.humanReviewPackets.length}`,
    '',
  ];

  for (const p of data.humanReviewPackets.slice(0, 40)) {
    lines.push(`## ${p.displayName || p.spanishTitle || p.category}`, '');
    lines.push(`- **Category:** ${p.category}`);
    if (p.topic) lines.push(`- **Topic:** ${p.topic}`);
    if (p.reviewReadiness) lines.push(`- **Readiness:** ${p.reviewReadiness}`);
    if (p.newScripturesFromSource) lines.push(`- **New source scriptures:** ${p.newScripturesFromSource}`);
    if (p.englishEquivalent) lines.push(`- **English:** ${p.englishEquivalent}`);
    lines.push(`- ${p.reviewNotes}`, '');
  }

  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const c = e.coverage;
  const lines = [
    '# Bible Authority Phase 3O Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Priority gaps processed: **${e.priorityGapsProcessed}**`,
    `2. Missing entries recovered (3N → 3O): **${e.missingEntriesRecovered}**`,
    `3. Spanish lesson titles linked: **${e.spanishTitlesLinked}**`,
    `4. Camp-specific titles normalized: **${e.campTitlesNormalized}** (${e.campTitlesWithChains} with chains)`,
    `5. ICOJ documents organized: **${e.icojDocumentsOrganized}**`,
    '',
    `6. Millennial Kingdom scriptures gained from source: **${e.millennialKingdomScriptures}**`,
    `7. 144000 scriptures gained: **${e.p144000Scriptures}**`,
    `8. Jacob scriptures gained: **${e.jacobScriptures}**`,
    `9. Peter scriptures gained: **${e.peterScriptures}**`,
    `10. Feast packs improved: **${e.feastPacksImproved}**`,
    '',
    '### Coverage',
    '',
    `- Covered: ${c.covered} (target ≥350: ${e.targetsMet.coveredMet ? 'met' : 'not met'})`,
    `- Partial: ${c.partial} (target ≤40: ${e.targetsMet.partialMet ? 'met' : 'not met'})`,
    `- Missing: ${c.missing} (target ≤150: ${e.targetsMet.missingMet ? 'met' : 'not met'})`,
    '',
    `11. Ready for human review: **${e.reviewReadyCount}** packets`,
    '',
    '12. Unresolved (why):',
    ...e.unresolved.slice(0, 8).map((u) => `   - ${u.lessonTitle?.slice(0, 50)}: ${u.extractionStatus}`),
    '',
    '### Data notes',
    '',
    `- Corpus registry available: ${e.dataNotes.corpusRegistryAvailable}`,
    `- Scrubbed corpus available: ${e.dataNotes.scrubbedCorpusAvailable}`,
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Scripture implementation | none |',
    '| Approvals | none |',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3O — Source gap completion starting...');
  const data = runPhase3oSourceGapCompletion();

  writePriorityGaps(data);
  writeSourceChains(data);
  writeSpanish(data);
  writeCampNorm(data);
  writeICOJ(data);
  writeWeakPacks(data);
  writeFeasts(data);
  writeCoverage(data);
  writeHumanReview(data);
  writeMain(data);

  console.log('Phase 3O — Complete');
  console.log(`Coverage: ${data.executive.coverage.covered} covered · ${data.executive.coverage.partial} partial · ${data.executive.coverage.missing} missing`);
  console.log(`Spanish linked: ${data.executive.spanishTitlesLinked}`);
  console.log(`Missing below 150: ${data.executive.targetsMet.missingMet}`);
  console.log('Reports written.');
}

main();
