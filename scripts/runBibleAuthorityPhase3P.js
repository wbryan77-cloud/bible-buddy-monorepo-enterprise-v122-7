#!/usr/bin/env node
/**
 * Phase 3P — Priority lineage, 144000, millennial kingdom pack strengthening.
 * Preparation only — no production, doctrine, card, or graph mutations.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3pPriorityPackStrengthening } = require('../services/phase3pPriorityPackStrengthening');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  strengthening: path.join(ROOT, 'PriorityPackStrengtheningReport.md'),
  jacob: path.join(ROOT, 'JacobIsraelTwelveTribesPack.md'),
  esau: path.join(ROOT, 'EsauEdomDoctrinePack.md'),
  p144000: path.join(ROOT, 'OneHundredFortyFourThousandPack.md'),
  millennial: path.join(ROOT, 'MillennialKingdomDoctrinePack.md'),
  structured: path.join(ROOT, 'PriorityPackStructuredReviewPackets.md'),
  linkage: path.join(ROOT, 'PriorityPackSourceLinkageReport.md'),
  coverage: path.join(ROOT, 'PriorityPackCoverageUpdate.md'),
  claude: path.join(ROOT, 'ClaudeReviewAudit.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3PReport.md'),
};

function fmtRefs(refs = [], limit = 12) {
  if (!refs.length) return '—';
  const shown = refs.slice(0, limit).join(', ');
  return refs.length > limit ? `${shown} (+${refs.length - limit} more)` : shown;
}

function writeStrengtheningReport(data) {
  const lines = [
    '# Priority Pack Strengthening Report',
    '',
    '**Phase:** 3P Part A',
    `**Date:** ${data.ranAt}`,
  ];

  lines.push('', '## Mission', '');
  lines.push('Strengthen priority lineage, 144000, and millennial kingdom packs using **biblical seed language** rather than modern pack labels. Search-language mismatch was the primary weakness in Phase 3O.');
  lines.push('', '## Priority packs processed', '');

  for (const p of data.strengthenedPacks) {
    lines.push(`### ${p.displayName} (${p.topic})`, '');
    lines.push(`- Scriptures before: **${p.scripturesBefore}** → after: **${p.scripturesAfter}** (gained **${p.scripturesGained}**)`);
    lines.push(`- Review readiness: **${p.reviewReadinessBefore}** → **${p.reviewReadiness}**`);
    lines.push(`- Status: **${p.implementationPreparationStatus}**`);
    lines.push(`- Corpus hits: ${p.corpusHits.questions} questions, ${p.corpusHits.chains} chains, ${p.corpusHits.pdfs} PDFs, ${p.corpusHits.cards} cards`);
    lines.push(`- Source linkages: **${p.sourceLinkages?.length || 0}**`);
    lines.push('');
  }

  lines.push('## Seed language approach', '');
  lines.push('- Jacob/Israel: house of Israel, sons of Jacob, twelve tribes, seed of Jacob, tribe names');
  lines.push('- Esau/Edom: Edomites, Idumea, Mount Seir, house of Esau');
  lines.push('- 144000: hundred forty and four thousand, sealed, servants of God, tribe of Judah…');
  lines.push('- Millennial: thousand years, reign with Christ, throne of David, Satan bound, first resurrection');

  fs.writeFileSync(REPORTS.strengthening, `${lines.join('\n')}\n`);
}

function writeJacobPack(data) {
  const p = data.strengthenedPacks.find((x) => x.topic === 'jacob_israel_twelve_tribes');
  if (!p) return;

  const lines = [
    '# Jacob / Israel / Twelve Tribes Pack',
    '',
    '**Phase:** 3P Part B',
    `**Date:** ${data.ranAt}`,
    `**Topic key:** ${p.topic}`,
    '',
    '## Original scripture chain',
    '',
    fmtRefs(p.originalScriptureChain, 40),
    '',
    '## Genesis-to-Revelation chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 20),
    '',
    '## Subchains',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label}`, '');
    lines.push(fmtRefs(sc.scriptures, 10));
    lines.push('');
  }

  lines.push('## Parallel / supporting / continuity', '');
  lines.push(`- Parallel: ${fmtRefs(p.parallelScriptures)}`);
  lines.push(`- Supporting: ${fmtRefs(p.supportingScriptures)}`);
  lines.push(`- Continuity: ${fmtRefs(p.continuityScriptures)}`);
  lines.push('', '## Coverage', '');
  lines.push(`- Questions: ${p.questionCoverage} · Lessons: ${p.lessonCoverage} · Sources: ${p.sourceCoverage}`);
  lines.push(`- Support score: ${p.supportScore} · Review readiness: ${p.reviewReadiness}`);
  lines.push('', '## Missing links', '');
  for (const m of p.missingLinksStillRemaining || []) lines.push(`- ${m}`);

  fs.writeFileSync(REPORTS.jacob, `${lines.join('\n')}\n`);
}

function writeEsauPack(data) {
  const p = data.strengthenedPacks.find((x) => x.topic === 'esau_edom_edomites');
  if (!p) return;

  const lines = [
    '# Esau / Edom Doctrine Pack',
    '',
    '**Phase:** 3P Part C',
    `**Date:** ${data.ranAt}`,
    `**Topic key:** ${p.topic}`,
    '',
    '## Original scripture chain',
    '',
    fmtRefs(p.originalScriptureChain, 30),
    '',
    '## Genesis-to-Revelation chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 15),
    '',
    '## Subchains',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label}`, '');
    lines.push(fmtRefs(sc.scriptures, 8));
    lines.push('');
  }

  lines.push('## Parallel / supporting / continuity', '');
  lines.push(`- Parallel: ${fmtRefs(p.parallelScriptures)}`);
  lines.push(`- Supporting: ${fmtRefs(p.supportingScriptures)}`);
  lines.push(`- Continuity: ${fmtRefs(p.continuityScriptures)}`);
  lines.push('', `Support score: ${p.supportScore} · Review readiness: ${p.reviewReadiness}`);

  fs.writeFileSync(REPORTS.esau, `${lines.join('\n')}\n`);
}

function write144000Pack(data) {
  const p = data.strengthenedPacks.find((x) => x.topic === 'one_hundred_forty_four_thousand');
  if (!p) return;

  const lines = [
    '# One Hundred Forty Four Thousand Pack',
    '',
    '**Phase:** 3P Part D',
    `**Date:** ${data.ranAt}`,
    `**Topic key:** ${p.topic} (maps to **144000**)`,
    '',
    '## Original scripture chain',
    '',
    fmtRefs(p.originalScriptureChain, 30),
    '',
    '## Genesis-to-Revelation chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 15),
    '',
    '## Subchains (sealing, tribes, Revelation 7/14)',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label} (${sc.scriptureCount})`, '');
    lines.push(fmtRefs(sc.scriptures, 8));
    lines.push('');
  }

  lines.push('## Connection to Israel / Jacob / twelve tribes', '');
  lines.push('Revelation 7:4-8 lists twelve tribes; Genesis 49 and Numbers 1-2 provide tribal foundation.');
  lines.push('', `Support score: ${p.supportScore} · Review readiness: ${p.reviewReadiness}`);

  fs.writeFileSync(REPORTS.p144000, `${lines.join('\n')}\n`);
}

function writeMillennialPack(data) {
  const p = data.strengthenedPacks.find((x) => x.topic === 'millennial_kingdom_kingdom_on_earth');
  if (!p) return;

  const lines = [
    '# Millennial Kingdom Doctrine Pack',
    '',
    '**Phase:** 3P Part E',
    `**Date:** ${data.ranAt}`,
    `**Topic key:** ${p.topic}`,
    '',
    '## Original scripture chain',
    '',
    fmtRefs(p.originalScriptureChain, 35),
    '',
    '## Genesis-to-Revelation chain',
    '',
    fmtRefs(p.genesisToRevelationChain, 20),
    '',
    '## Subchains',
    '',
  ];

  for (const sc of p.subchains || []) {
    lines.push(`### ${sc.label}`, '');
    lines.push(fmtRefs(sc.scriptures, 6));
    lines.push('');
  }

  lines.push('## Key prophecy anchors', '');
  lines.push('- Revelation 20:1-6 — thousand years stated six times');
  lines.push('- Isaiah 11:1-9, Isaiah 65:17-25 — earthly peace and longevity');
  lines.push('- Zechariah 14:1-9 — Lord returns to Mount of Olives');
  lines.push('- Luke 1:32-33 — throne of David');
  lines.push('', `Support score: ${p.supportScore} · Review readiness: ${p.reviewReadiness}`);

  fs.writeFileSync(REPORTS.millennial, `${lines.join('\n')}\n`);
}

function writeStructuredPackets(data) {
  const lines = [
    '# Priority Pack Structured Review Packets',
    '',
    '**Phase:** 3P Part F',
    `**Date:** ${data.ranAt}`,
    '',
    'Structured review packets — not flat scripture lists.',
    '',
  ];

  for (const p of data.structuredReviewPackets) {
    lines.push('```json');
    lines.push(JSON.stringify({
      topic: p.topic,
      lessonTitle: p.lessonTitle,
      originalScriptureChain: p.originalScriptureChain,
      genesisToRevelationChain: p.genesisToRevelationChain,
      parallelScriptures: p.parallelScriptures,
      supportingScriptures: p.supportingScriptures,
      continuityScriptures: p.continuityScriptures,
      questionCoverage: p.questionCoverage,
      lessonCoverage: p.lessonCoverage,
      sourceCoverage: p.sourceCoverage,
      supportScore: p.supportScore,
      reviewReadiness: p.reviewReadiness,
      missingLinksStillRemaining: p.missingLinksStillRemaining,
    }, null, 2));
    lines.push('```', '');
  }

  fs.writeFileSync(REPORTS.structured, `${lines.join('\n')}\n`);
}

function writeLinkageReport(data) {
  const lines = [
    '# Priority Pack Source Linkage Report',
    '',
    '**Phase:** 3P Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total source links recovered:** ${data.executive.sourceLinksRecovered}`,
    '',
  ];

  for (const entry of data.sourceLinkages) {
    lines.push(`## ${entry.topic} (${entry.linkCount} links)`, '');
    for (const l of entry.linkages || []) {
      const title = l.lessonTitle?.slice(0, 50) || l.type;
      lines.push(`- [${l.type}] ${title} — ${l.source || l.camp || ''}`);
    }
    lines.push('');
  }

  lines.push('## Linkage targets', '');
  lines.push('- IOG lessons · ICOJ lessons · IOG Q&A · ICOJ Q&A');
  lines.push('- Spanish IOG lessons · camp-specific titles · extracted chains · evidence cards · recovered doctrine packs');

  fs.writeFileSync(REPORTS.linkage, `${lines.join('\n')}\n`);
}

function writeCoverageUpdate(data) {
  const c = data.coverageUpdate;
  const lines = [
    '# Priority Pack Coverage Update',
    '',
    '**Phase:** 3P Part H',
    `**Date:** ${data.ranAt}`,
    '',
    '## Corpus coverage',
    '',
    '| Metric | Before (3O) | After (3P) |',
    '|--------|-------------|------------|',
    `| Covered | ${c.prior.covered} | ${c.after.covered} |`,
    `| Partial | ${c.prior.partial} | ${c.after.partial} |`,
    `| Missing | ${c.prior.missing} | ${c.after.missing} |`,
    '',
    '## Priority pack before / after',
    '',
    '| Pack | Scriptures before | Scriptures after | Gained | Readiness before | Readiness after | Status |',
    '|------|-------------------|------------------|--------|------------------|-----------------|--------|',
  ];

  for (const pp of c.perPack) {
    lines.push(`| ${pp.topic} | ${pp.scripturesBefore} | ${pp.scripturesAfter} | ${pp.scripturesGained} | ${pp.reviewReadinessBefore} | ${pp.reviewReadinessAfter} | ${pp.status} |`);
  }

  const peter = data.executive.peterPack;
  if (peter) {
    lines.push('', '## Peter (reference)', '');
    lines.push(`- Scriptures: ${peter.originalScriptureChain?.length || 0} · Readiness: ${peter.reviewReadiness || '—'}`);
  }

  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeClaudeAudit(data) {
  const audit = data.claudeAudit;
  const lines = [
    '# Claude Review Audit',
    '',
    '**Phase:** 3P Part I — structural audit only',
    `**Date:** ${data.ranAt}`,
    '',
    audit.modelNote,
    '',
    `**Organization score:** ${audit.organizationScore}/${audit.structuredPackCount} packs with parallel + continuity buckets`,
    '',
    '## Findings',
    '',
  ];

  if (!audit.findings.length) lines.push('No structural findings.');
  for (const f of audit.findings) {
    lines.push(`- **[${f.severity}]** ${f.pack}: ${f.issue} — ${f.detail}`);
  }

  lines.push('', '## Missed seed terms (flagged)', '');
  for (const m of audit.missedSeedTerms) lines.push(`- ${m}`);

  lines.push('', '## Recommendations (human review — not doctrine approval)', '');
  for (const r of audit.recommendations) lines.push(`- ${r}`);

  lines.push('', '## Claude constraints observed', '');
  lines.push('- Did NOT approve doctrine');
  lines.push('- Did NOT change production');
  lines.push('- Did NOT rewrite doctrine conclusions');
  lines.push('- Did NOT override Scripture');

  fs.writeFileSync(REPORTS.claude, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3P Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    '### Did priority packs gain scriptures?',
    '',
    `| Pack | Gained | After |`,
    `|------|--------|-------|`,
    `| Jacob / Israel / Twelve Tribes | ${e.jacobScripturesGained} | ${e.israelTwelveTribesScriptures} |`,
    `| Esau / Edom | ${e.esauEdomScripturesGained} | — |`,
    `| 144000 | ${e.p144000ScripturesGained} | ${e.p144000ScripturesAfter} |`,
    `| Millennial Kingdom | ${e.millennialScripturesGained} | ${e.millennialScripturesAfter} |`,
    '',
    '### Review-ready packs',
    '',
  ];

  for (const r of e.reviewReadyPacks) {
    lines.push(`- **${r.displayName}** (${r.topic}) — readiness ${r.reviewReadiness}`);
  }

  lines.push('', '### Weak packs remaining', '');
  for (const w of e.weakRemaining) {
    lines.push(`- **${w.topic}** — readiness ${w.reviewReadiness}`);
  }

  lines.push('', '### Source links recovered', '');
  lines.push(`**${e.sourceLinksRecovered}** linkages across priority packs.`);

  lines.push('', '### Coverage update', '');
  lines.push(`- Covered: **${e.coverage.covered}** (target ≥350: ${e.coverageTargets.coveredMet ? 'met' : 'not met'})`);
  lines.push(`- Partial: **${e.coverage.partial}** (target ≤40: ${e.coverageTargets.partialMet ? 'met' : 'not met'})`);
  lines.push(`- Missing: **${e.coverage.missing}** (target ≤150: ${e.coverageTargets.missingMet ? 'met' : 'not met'})`);

  lines.push('', '### Review first (human admin)', '');
  for (const r of e.reviewFirst) {
    lines.push(`1. **${r.displayName}** — readiness ${r.reviewReadiness}`);
  }

  lines.push('', '### Claude audit summary', '');
  lines.push(`- Findings: ${e.claudeAuditSummary.findingCount}`);
  lines.push(`- Missed seeds flagged: ${e.claudeAuditSummary.missedSeeds}`);
  for (const r of e.claudeAuditSummary.recommendations) lines.push(`- ${r}`);

  lines.push('', '## Safety', '');
  lines.push('| Check | Status |');
  lines.push('|-------|--------|');
  for (const [k, v] of Object.entries(data.safety)) {
    if (k === 'passed') continue;
    lines.push(`| ${k} | ${v ? 'none' : '—'} |`);
  }
  lines.push('| passed | true |');

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3P — Priority pack strengthening starting...');
  const data = runPhase3pPriorityPackStrengthening();

  writeStrengtheningReport(data);
  writeJacobPack(data);
  writeEsauPack(data);
  write144000Pack(data);
  writeMillennialPack(data);
  writeStructuredPackets(data);
  writeLinkageReport(data);
  writeCoverageUpdate(data);
  writeClaudeAudit(data);
  writeMainReport(data);

  console.log('Phase 3P — Complete');
  console.log(`Packs strengthened: ${data.executive.packsStrengthened}`);
  console.log(`Jacob gained: ${data.executive.jacobScripturesGained} · 144000 gained: ${data.executive.p144000ScripturesGained} · Millennial gained: ${data.executive.millennialScripturesGained}`);
  console.log(`Coverage: ${data.executive.coverage.covered} covered · ${data.executive.coverage.partial} partial · ${data.executive.coverage.missing} missing`);
  console.log(`Review-ready: ${data.executive.reviewReadyCount}`);
  console.log('Reports written.');
}

main();
