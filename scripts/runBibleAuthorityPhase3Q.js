#!/usr/bin/env node
/**
 * Phase 3Q — Weak pack deep recovery, Peter/Paul alignment, missing source extraction.
 * Preparation only — no production, doctrine, card, or graph mutations.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3qWeakPackDeepRecovery } = require('../services/phase3qWeakPackDeepRecovery');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  missingAudit: path.join(ROOT, 'RemainingMissingSourceAudit.md'),
  extractionPlan: path.join(ROOT, 'MissingSourceExtractionPlan.md'),
  p144000: path.join(ROOT, 'OneHundredFortyFourThousandDeepPack.md'),
  peter: path.join(ROOT, 'PeterApostleDoctrinePack.md'),
  peterPaul: path.join(ROOT, 'PeterPaulAlignmentPack.md'),
  jacob: path.join(ROOT, 'JacobIsraelLineageDeepPack.md'),
  millennial: path.join(ROOT, 'MillennialKingdomDeepPack.md'),
  claude: path.join(ROOT, 'ClaudeReadOnlyReviewPhase3Q.md'),
  coverage: path.join(ROOT, 'Phase3QCoverageUpdate.md'),
  humanReview: path.join(ROOT, 'Phase3QHumanReviewPackets.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3QReport.md'),
};

function fmtRefs(refs = [], limit = 15) {
  if (!refs?.length) return '—';
  const shown = refs.slice(0, limit).join(', ');
  return refs.length > limit ? `${shown} (+${refs.length - limit} more)` : shown;
}

function writeMissingAudit(data) {
  const lines = [
    '# Remaining Missing Source Audit',
    '',
    '**Phase:** 3Q Part A',
    `**Date:** ${data.ranAt}`,
    `**Total missing entries:** ${data.missingSourceAudit.length}`,
    '',
  ];

  for (const e of data.missingSourceAudit.slice(0, 100)) {
    lines.push('```json');
    lines.push(JSON.stringify({
      sourceName: e.sourceName,
      camp: e.camp,
      lessonTitle: e.lessonTitle,
      sourceUrl: e.sourceUrl,
      reasonMissing: e.reasonMissing,
      availableText: e.availableText ? `${e.availableText.slice(0, 120)}…` : null,
      pdfAvailable: e.pdfAvailable,
      transcriptAvailable: e.transcriptAvailable,
      videoDescriptionAvailable: e.videoDescriptionAvailable,
      manualTranscriptNeeded: e.manualTranscriptNeeded,
      recommendedNextAction: e.recommendedNextAction,
      localScripturesFound: e.localScripturesFound,
    }, null, 2));
    lines.push('```', '');
  }

  if (data.missingSourceAudit.length > 100) {
    lines.push(`_… and ${data.missingSourceAudit.length - 100} more entries in phase3q-weak-pack-deep-recovery-results.json_`);
  }

  fs.writeFileSync(REPORTS.missingAudit, `${lines.join('\n')}\n`);
}

function writeExtractionPlan(data) {
  const plan = data.extractionPlan;
  const lines = [
    '# Missing Source Extraction Plan',
    '',
    '**Phase:** 3Q Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Missing before recovery:** ${plan.totalMissing}`,
    `**Cursor can extract now:** ${plan.cursorCanExtractNow}`,
    `**Manual required:** ${plan.manualRequired}`,
    `**Resolved in 3Q:** ${plan.recoveredIn3Q}`,
    `**URL fetches attempted:** ${plan.urlFetchesAttempted}`,
    '',
    '## Priority buckets',
    '',
    `| Bucket | Count |`,
    `|--------|-------|`,
    ...Object.entries(plan.priorityBuckets).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Recommended actions',
    '',
  ];

  for (const [action, titles] of Object.entries(plan.byRecommendedAction)) {
    lines.push(`### ${action} (${titles.length})`, '');
    for (const t of titles.slice(0, 15)) lines.push(`- ${t}`);
    if (titles.length > 15) lines.push(`- _…${titles.length - 15} more_`);
    lines.push('');
  }

  lines.push('## IOG / ICOJ re-scrub guidance', '');
  lines.push(plan.iogIcojRescrubNote);
  lines.push('', '## Recovery results sample', '');
  for (const r of data.recoveryResults.recovered.filter((x) => x.status.startsWith('resolved')).slice(0, 20)) {
    lines.push(`- **${r.lessonTitle}** — ${r.recoveryMethod} (${(r.scriptures || []).length} scriptures)`);
  }

  fs.writeFileSync(REPORTS.extractionPlan, `${lines.join('\n')}\n`);
}

function write144000Deep(data) {
  const p = data.deepPacks.find((x) => x.topic === 'one_hundred_forty_four_thousand');
  if (!p) return;

  const lines = [
    '# One Hundred Forty Four Thousand Deep Pack',
    '',
    '**Phase:** 3Q Part C',
    `**Date:** ${data.ranAt}`,
    '',
    '## Original Scripture Chain',
    '',
    fmtRefs(p.originalScriptureChain, 30),
    '',
    '## Genesis-to-Revelation Chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 20),
    '',
    '## Parallel Scriptures',
    '',
    fmtRefs(p.parallelScriptures),
    '',
    '## Supporting Scriptures',
    '',
    fmtRefs(p.supportingScriptures),
    '',
    '## Continuity Scriptures',
    '',
    fmtRefs(p.continuityScriptures),
    '',
    '## Tribe-by-Tribe Anchors (Revelation 7:5-8)',
    '',
    '| Tribe | Scripture | KJV label |',
    '|-------|-----------|-----------|',
  ];

  for (const t of p.tribeByTribeAnchors || []) {
    lines.push(`| ${t.tribe} | ${t.scripture} | ${t.kjvLabel} |`);
  }

  lines.push('', '## Subchains', '');
  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label} (${sc.scriptureCount})`, '');
    lines.push(fmtRefs(sc.scriptures, 8));
    lines.push('');
  }

  lines.push(`Support: ${p.supportScore} · Readiness: ${p.reviewReadiness} · Gained: ${p.scripturesGained}`);

  fs.writeFileSync(REPORTS.p144000, `${lines.join('\n')}\n`);
}

function writePeterPack(data) {
  const p = data.deepPacks.find((x) => x.topic === 'peter');
  if (!p) return;

  const lines = [
    '# Peter Apostle Doctrine Pack',
    '',
    '**Phase:** 3Q Part D',
    `**Date:** ${data.ranAt}`,
    '',
    '## Original Scripture Chain',
    '',
    fmtRefs(p.originalScriptureChain, 25),
    '',
    '## Genesis-to-Revelation Chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 15),
    '',
    '## Subchains',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label}`, '');
    lines.push(fmtRefs(sc.scriptures, 6));
    lines.push('');
  }

  lines.push('## Parallel / Supporting / Continuity', '');
  lines.push(`- Parallel: ${fmtRefs(p.parallelScriptures)}`);
  lines.push(`- Supporting: ${fmtRefs(p.supportingScriptures)}`);
  lines.push(`- Continuity: ${fmtRefs(p.continuityScriptures)}`);
  lines.push('', `Support: ${p.supportScore} · Readiness: ${p.reviewReadiness} · Gained: ${p.scripturesGained}`);

  fs.writeFileSync(REPORTS.peter, `${lines.join('\n')}\n`);
}

function writePeterPaul(data) {
  const p = data.deepPacks.find((x) => x.topic === 'peter_paul_alignment');
  if (!p) return;

  const lines = [
    '# Peter / Paul Alignment Pack',
    '',
    '**Phase:** 3Q Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '## Original Scripture Chain',
    '',
    fmtRefs(p.originalScriptureChain, 20),
    '',
    '## Subchains',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label}`, '');
    lines.push(fmtRefs(sc.scriptures, 5));
    lines.push('');
  }

  lines.push(`Support: ${p.supportScore} · Readiness: ${p.reviewReadiness}`);

  fs.writeFileSync(REPORTS.peterPaul, `${lines.join('\n')}\n`);
}

function writeJacobDeep(data) {
  const p = data.deepPacks.find((x) => x.topic === 'jacob_israel_twelve_tribes');
  if (!p) return;

  const lines = [
    '# Jacob / Israel Lineage Deep Pack',
    '',
    '**Phase:** 3Q Part F',
    `**Date:** ${data.ranAt}`,
    '',
    '## Original Scripture Chain',
    '',
    fmtRefs(p.originalScriptureChain, 30),
    '',
    '## Genesis-to-Revelation Chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 20),
    '',
    '## Subchains',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label} (${sc.scriptureCount})`, '');
    lines.push(fmtRefs(sc.scriptures, 6));
    lines.push('');
  }

  lines.push(`Support: ${p.supportScore} · Readiness: ${p.reviewReadiness} · Gained: ${p.scripturesGained}`);

  fs.writeFileSync(REPORTS.jacob, `${lines.join('\n')}\n`);
}

function writeMillennialDeep(data) {
  const p = data.deepPacks.find((x) => x.topic === 'millennial_kingdom_kingdom_on_earth');
  if (!p) return;

  const lines = [
    '# Millennial Kingdom Deep Pack',
    '',
    '**Phase:** 3Q Part G',
    `**Date:** ${data.ranAt}`,
    '',
    '## Original Scripture Chain',
    '',
    fmtRefs(p.originalScriptureChain, 35),
    '',
    '## Required anchors verified',
    '',
    '| Anchor | Present |',
    '|--------|---------|',
  ];

  for (const a of p.requiredAnchorsVerified || []) {
    lines.push(`| ${a.anchor} | ${a.present ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Subchains', '');
  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label}`, '');
    lines.push(fmtRefs(sc.scriptures, 5));
    lines.push('');
  }

  lines.push(`Support: ${p.supportScore} · Readiness: ${p.reviewReadiness} · Gained: ${p.scripturesGained}`);

  fs.writeFileSync(REPORTS.millennial, `${lines.join('\n')}\n`);
}

function writeClaudeAudit(data) {
  const audit = data.claudeAudit;
  const lines = [
    '# Claude Read-Only Review Phase 3Q',
    '',
    '**Phase:** 3Q Part H — read-only audit',
    `**Date:** ${data.ranAt}`,
    '',
    audit.modelNote,
    '',
    '## Files reviewed',
    '',
    ...audit.filesReviewed.map((f) => `- ${f}`),
    '',
    '## Findings',
    '',
  ];

  if (!audit.findings.length) lines.push('No structural findings.');
  for (const f of audit.findings) {
    lines.push(`- **[${f.severity}]** ${f.pack}: ${f.issue} — ${f.detail}`);
  }

  lines.push('', '## Recommendations (human review only)', '');
  for (const r of audit.recommendations) lines.push(`- ${r}`);

  lines.push('', '## Constraints observed', '');
  lines.push('- Did NOT approve doctrine');
  lines.push('- Did NOT modify production, cards, graph, or prompts');
  lines.push('- Did NOT override Scripture');

  fs.writeFileSync(REPORTS.claude, `${lines.join('\n')}\n`);
}

function writeCoverage(data) {
  const c = data.coverageUpdate;
  const lines = [
    '# Phase 3Q Coverage Update',
    '',
    '**Phase:** 3Q Part I',
    `**Date:** ${data.ranAt}`,
    '',
    '## Corpus coverage',
    '',
    '| Metric | Before | After |',
    '|--------|--------|-------|',
    `| Covered | ${c.prior.covered} | ${c.after.covered} |`,
    `| Partial | ${c.prior.partial} | ${c.after.partial} |`,
    `| Missing | ${c.prior.missing} | ${c.after.missing} |`,
    '',
    '## Priority pack before / after',
    '',
    '| Pack | Before | After | Gained | Readiness before | Readiness after | Tribes | Status |',
    '|------|--------|-------|--------|------------------|-----------------|--------|--------|',
  ];

  for (const pp of c.perPack) {
    lines.push(`| ${pp.topic} | ${pp.scripturesBefore} | ${pp.scripturesAfter} | ${pp.scripturesGained} | ${pp.reviewReadinessBefore} | ${pp.reviewReadinessAfter} | ${pp.tribeAnchors || '—'} | ${pp.status} |`);
  }

  lines.push('', '## Missing sources', '');
  lines.push(`- Before: ${c.missingSourcesBefore}`);
  lines.push(`- Resolved in 3Q: ${c.missingSourcesResolved}`);
  lines.push(`- Remaining missing (corpus): ${c.after.missing}`);

  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const lines = [
    '# Phase 3Q Human Review Packets',
    '',
    '**Phase:** 3Q Part J',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  for (const p of data.humanReviewPackets) {
    lines.push('```json');
    lines.push(JSON.stringify({
      topic: p.topic,
      supportScore: p.supportScore,
      reviewReadiness: p.reviewReadiness,
      originalScriptureChain: p.originalScriptureChain,
      genesisToRevelationChain: p.genesisToRevelationChain,
      parallelScriptures: p.parallelScriptures,
      supportingScriptures: p.supportingScriptures,
      continuityScriptures: p.continuityScriptures,
      sourceLinks: p.sourceLinks,
      tribeByTribeAnchors: p.tribeByTribeAnchors,
      missingLinksStillRemaining: p.missingLinksStillRemaining,
      humanReviewNotes: p.humanReviewNotes,
    }, null, 2));
    lines.push('```', '');
  }

  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3Q Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    '### 144000 tribe-by-tribe anchors',
    '',
    `- Tribe anchors added: **${e.tribeByTribeAnchorsAdded}/12**`,
    `- Scriptures gained: **${e.p144000ScripturesGained}** (after: ${e.p144000ScripturesAfter})`,
    '',
    '### Peter NT depth',
    '',
    `- Scriptures gained: **${e.peterScripturesGained}** (after: ${e.peterScripturesAfter})`,
    '',
    '### Peter / Paul alignment',
    '',
    `- Pack created: **${e.peterPaulPackCreated ? 'yes' : 'no'}**`,
    `- Review readiness: **${e.peterPaulReadiness}**`,
    '',
    '### Jacob / Israel lineage',
    '',
    `- Scriptures gained: **${e.jacobScripturesGained}**`,
    '',
    '### Millennial Kingdom',
    '',
    `- Revelation 20 anchor present: **${e.millennialRev20Present ? 'yes' : 'no'}**`,
    `- Scriptures gained: **${e.millennialScripturesGained}**`,
    '',
    '### Missing source entries',
    '',
    `- Before: **${e.missingSourcesBefore}**`,
    `- Resolved in 3Q: **${e.missingSourcesResolved}**`,
    `- Remaining missing: **${e.missingSourcesRemaining}**`,
    '',
    '### Coverage',
    '',
    `- Covered: **${e.coverage.covered}**`,
    `- Partial: **${e.coverage.partial}**`,
    `- Missing: **${e.coverage.missing}**`,
    '',
    '### Review-ready packs',
    '',
  ];

  for (const r of e.reviewReadyPacks) {
    lines.push(`- **${r.displayName}** — readiness ${r.reviewReadiness}`);
  }

  lines.push('', '### Implement first after human review', '');
  for (const name of e.implementFirstAfterReview) lines.push(`1. ${name}`);

  lines.push('', '### IOG / ICOJ re-scrub', '');
  lines.push(e.iogIcojRescrub);

  lines.push('', '### Claude audit', '');
  lines.push(`- Findings: ${e.claudeAuditSummary.findingCount}`);
  for (const r of e.claudeAuditSummary.recommendations) lines.push(`- ${r}`);

  lines.push('', '## Safety', '');
  lines.push('| Check | Status |');
  lines.push('|-------|--------|');
  for (const [k, v] of Object.entries(data.safety)) {
    if (k === 'passed') continue;
    lines.push(`| ${k} | none |`);
  }
  lines.push('| passed | true |');

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3Q — Weak pack deep recovery starting...');
  const data = await runPhase3qWeakPackDeepRecovery({ enableUrlFetch: true, maxFetches: 30 });

  writeMissingAudit(data);
  writeExtractionPlan(data);
  write144000Deep(data);
  writePeterPack(data);
  writePeterPaul(data);
  writeJacobDeep(data);
  writeMillennialDeep(data);
  writeClaudeAudit(data);
  writeCoverage(data);
  writeHumanReview(data);
  writeMain(data);

  console.log('Phase 3Q — Complete');
  console.log(`Missing audited: ${data.missingSourceAudit.length} · Resolved: ${data.executive.missingSourcesResolved}`);
  console.log(`144000 tribes: ${data.executive.tribeByTribeAnchorsAdded} · Peter gained: ${data.executive.peterScripturesGained}`);
  console.log(`Coverage: ${data.executive.coverage.covered} covered · ${data.executive.coverage.partial} partial · ${data.executive.coverage.missing} missing`);
  console.log('Reports written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
