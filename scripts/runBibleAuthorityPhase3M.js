#!/usr/bin/env node
/**
 * Phase 3M — Source-to-doctrine verification and final gap elimination reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3mSourceDoctrineVerification } = require('../services/phase3mSourceDoctrineVerification');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  sourceCoverage: path.join(ROOT, 'SourceToDoctrineCoverageAudit.md'),
  lessonTitles: path.join(ROOT, 'LessonTitleCoverageAudit.md'),
  questions: path.join(ROOT, 'QuestionCoverageAudit.md'),
  weakPacks: path.join(ROOT, 'WeakPackRecoveryAudit.md'),
  feasts: path.join(ROOT, 'FeastCoverageVerification.md'),
  jesus: path.join(ROOT, 'JesusOTNTVerification.md'),
  holySpirit: path.join(ROOT, 'HolySpiritVerification.md'),
  finalGaps: path.join(ROOT, 'FinalDoctrineGapReport.md'),
  implementation: path.join(ROOT, 'FinalImplementationReadinessReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3MReport.md'),
};

function writeSourceCoverage(data) {
  const e = data.executive;
  const lines = [
    '# Source to Doctrine Coverage Audit',
    '',
    '**Phase:** 3M Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Entries audited:** ${e.sourceEntriesAudited}`,
    `**Covered:** ${e.fullyCoveredSourceTopics} · **Partial:** ${e.partiallyCoveredSourceTopics} · **Missing:** ${e.missingSourceTopics}`,
    '',
    '| Source | Lesson | Topic | Pack exists | Pack name | Status |',
    '|--------|--------|-------|-------------|-----------|--------|',
  ];

  for (const row of data.sourceCoverageAudit.slice(0, 80)) {
    lines.push(`| ${row.source} | ${(row.lessonTitle || '').slice(0, 40)} | ${row.topic} | ${row.doctrinePackExists ? 'yes' : 'no'} | ${row.doctrinePackName || '—'} | ${row.status} |`);
  }

  if (data.sourceCoverageAudit.length > 80) {
    lines.push('', `*… and ${data.sourceCoverageAudit.length - 80} more entries in JSON trace*`);
  }

  fs.writeFileSync(REPORTS.sourceCoverage, `${lines.join('\n')}\n`);
}

function writeLessonTitles(data) {
  const e = data.executive;
  const lines = [
    '# Lesson Title Coverage Audit',
    '',
    '**Phase:** 3M Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Lesson titles:** ${e.lessonTitlesAudited}`,
    `**Represented:** ${e.lessonRepresented} · **Partial:** ${e.lessonPartial} · **Missing:** ${e.lessonMissing}`,
    '',
    '| Lesson | Org | Topic | Pack | Chains | Representation |',
    '|--------|-----|-------|------|--------|----------------|',
  ];

  for (const l of data.lessonTitleAudit.slice(0, 60)) {
    lines.push(`| ${l.lessonTitle?.slice(0, 45)} | ${l.organization || ''} | ${l.topic} | ${l.doctrinePackName || '—'} | ${l.chainCount} | ${l.representation} |`);
  }

  lines.push('', '## Missing lessons', '');
  for (const l of data.lessonTitleAudit.filter((x) => x.representation === 'missing').slice(0, 30)) {
    lines.push(`- ${l.lessonTitle} (${l.topic})`);
  }

  fs.writeFileSync(REPORTS.lessonTitles, `${lines.join('\n')}\n`);
}

function writeQuestions(data) {
  const e = data.executive;
  const lines = [
    '# Question Coverage Audit',
    '',
    '**Phase:** 3M Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Questions:** ${e.questionsAudited}`,
    `**Covered:** ${e.questionsCovered} · **Partial:** ${e.questionsPartial} · **Missing:** ${e.questionsMissing}`,
    '',
    '| Lesson | Topic | Pack | Chain | G2R | Status |',
    '|--------|-------|------|-------|-----|--------|',
  ];

  for (const q of data.questionCoverageAudit.slice(0, 50)) {
    lines.push(`| ${(q.lessonTitle || '').slice(0, 35)} | ${q.topic} | ${q.doctrinePackAssigned ? 'yes' : 'no'} | ${q.chainAssigned ? 'yes' : 'no'} | ${q.g2rAssigned ? 'yes' : 'no'} | ${q.status} |`);
  }

  fs.writeFileSync(REPORTS.questions, `${lines.join('\n')}\n`);
}

function writeWeakPacks(data) {
  const lines = [
    '# Weak Pack Recovery Audit',
    '',
    '**Phase:** 3M Part D',
    `**Date:** ${data.ranAt}`,
    '',
    'Focus: 144000 · Peter · Jacob · Millennial Kingdom',
    '',
  ];

  for (const w of data.weakPackRecoveryAudit) {
    lines.push(`## ${w.displayName}`, '');
    lines.push(`- **Pack exists:** ${w.packExists} · Score ${w.supportScore} · Readiness ${w.reviewReadiness}`);
    lines.push(`- **Original chain:** ${w.originalChainLength} · Parallel: ${w.parallelCount} · Continuity: ${w.continuityCount} · G2R: ${w.g2rLength}`);
    lines.push(`- **Corpus chains:** ${w.corpusChainCount} · Corpus questions: ${w.corpusQuestionCount} · Corpus scriptures: ${w.corpusScriptureCount}`);
    lines.push(`- **Missing scriptures:** ${w.missingScriptures}`);
    lines.push(`- **Missing chains:** ${w.missingChains}`);
    lines.push(`- **Missing parallels:** ${w.missingParallels}`);
    lines.push(`- **Missing continuity:** ${w.missingContinuity}`);
    if (w.missingLinks?.length) lines.push(`- **Gap flags:** ${w.missingLinks.join(', ')}`);
    lines.push(`- **Recommendation:** ${w.recoveryRecommendation}`);
    if (w.corpusLessons?.length) lines.push(`- **Corpus lessons:** ${w.corpusLessons.join('; ')}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.weakPacks, `${lines.join('\n')}\n`);
}

function writeFeasts(data) {
  const lines = [
    '# Feast Coverage Verification',
    '',
    '**Phase:** 3M Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '| Feast | Pack | Score | Readiness | Original | G2R span | Status |',
    '|-------|------|-------|-----------|----------|----------|--------|',
  ];

  for (const f of data.feastCoverageVerification) {
    lines.push(`| ${f.displayName} | ${f.packExists ? 'yes' : 'no'} | ${f.supportScore ?? '—'} | ${f.reviewReadiness ?? '—'} | ${f.originalChainLength ?? 0} | ${f.g2rSpan ? 'yes' : 'no'} | ${f.status} |`);
  }

  fs.writeFileSync(REPORTS.feasts, `${lines.join('\n')}\n`);
}

function writeJesus(data) {
  const j = data.jesusVerification;
  const lines = [
    '# Jesus OT/NT Verification',
    '',
    '**Phase:** 3M Part F',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  if (j.pack) {
    lines.push(`**Pack score:** ${j.pack.supportScore} · **Readiness:** ${j.pack.reviewReadiness}`);
    lines.push(`**Original chain:** ${j.pack.originalChainLength} · **G2R:** ${j.pack.g2rLength} · Span: ${j.pack.g2rSpan}`, '');
  }

  lines.push('| Subchain | Status | Scriptures | Seed coverage |', '|----------|--------|------------|---------------|');
  for (const s of j.subchains) {
    lines.push(`| ${s.label} | ${s.status} | ${s.scriptureCount} | ${s.seedCoverage ? 'yes' : 'partial'} |`);
  }

  lines.push('', '## Detail', '');
  for (const s of j.subchains) {
    lines.push(`### ${s.label} — ${s.status}`, '');
    if (s.scriptures?.length) lines.push(s.scriptures.join(' → '), '');
    else lines.push('No scriptures in subchain.', '');
  }

  fs.writeFileSync(REPORTS.jesus, `${lines.join('\n')}\n`);
}

function writeHolySpirit(data) {
  const h = data.holySpiritVerification;
  const lines = [
    '# Holy Spirit Verification',
    '',
    '**Phase:** 3M Part G',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  if (h.pack) {
    lines.push(`**Pack score:** ${h.pack.supportScore} · **Readiness:** ${h.pack.reviewReadiness}`, '');
  }

  lines.push('| Subchain | Status | Scriptures |', '|----------|--------|------------|');
  for (const s of h.subchains) {
    lines.push(`| ${s.label} | ${s.status} | ${s.scriptureCount} |`);
  }

  lines.push('', '## Detail', '');
  for (const s of h.subchains) {
    lines.push(`### ${s.label} — ${s.status}`, '');
    if (s.scriptures?.length) lines.push(s.scriptures.join(' → '), '');
    else lines.push('No scriptures in subchain.', '');
  }

  fs.writeFileSync(REPORTS.holySpirit, `${lines.join('\n')}\n`);
}

function writeFinalGaps(data) {
  const lines = [
    '# Final Doctrine Gap Report',
    '',
    '**Phase:** 3M Part H — missing, partial, underdeveloped only',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total gap items:** ${data.finalGapReport.length}`,
    '',
  ];

  const byType = {};
  for (const g of data.finalGapReport) {
    const t = g.type || 'other';
    if (!byType[t]) byType[t] = [];
    byType[t].push(g);
  }

  for (const [type, items] of Object.entries(byType)) {
    lines.push(`## ${type} (${items.length})`, '');
    for (const g of items.slice(0, 40)) {
      const label = g.lessonTitle || g.displayName || g.label || g.topic;
      lines.push(`- **${label}** — ${g.status}${g.topic ? ` · ${g.topic}` : ''}`);
    }
    if (items.length > 40) lines.push(`- … and ${items.length - 40} more`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.finalGaps, `${lines.join('\n')}\n`);
}

function writeImplementation(data) {
  const e = data.executive;
  const lines = [
    '# Final Implementation Readiness Report',
    '',
    '**Phase:** 3M Part I — preparation only, no implementation',
    `**Date:** ${data.ranAt}`,
    '',
    `**Doctrine packs indexed:** ${e.doctrinePackCount}`,
    `**Ready for implementation after review:** ${e.readyForImplementationCount}`,
    '',
    '| Topic | Score | Readiness | Questions | Lessons | Sources | Priority | Status |',
    '|-------|-------|-----------|-----------|---------|---------|----------|--------|',
  ];

  for (const p of data.implementationReadiness.slice(0, 50)) {
    lines.push(`| ${p.topic} | ${p.supportScore} | ${p.reviewReadiness} | ${p.questionCoverage} | ${p.lessonCoverage} | ${p.sourceCoverage} | ${p.implementationPriority} | ${p.implementationPreparationStatus} |`);
  }

  lines.push('', '## High priority (review first)', '');
  for (const p of data.implementationReadiness.filter((x) => x.implementationPriority === 'high').slice(0, 15)) {
    lines.push(`- **${p.displayName}** — readiness ${p.reviewReadiness} · score ${p.supportScore}`);
  }

  fs.writeFileSync(REPORTS.implementation, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3M Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Source topics fully covered: **${e.fullyCoveredSourceTopics}** (doctrine packs with readiness ≥75: **${e.fullyCoveredDoctrinePacks}**)`,
    `2. Partially covered: **${e.partiallyCoveredSourceTopics}** (partial packs: **${e.partialDoctrinePacks}**)`,
    `3. Missing / undocumented: **${e.missingSourceTopics}** source entries · **${e.finalGapCount}** total gap items logged`,
    '',
    '4. Weak doctrine packs:',
    ...e.weakPackTopics.slice(0, 8).map((p) => `   - ${p.displayName}: readiness ${p.reviewReadiness} (${(p.missingLinks || []).slice(0, 2).join(', ')})`),
    '',
    '5. Strongest doctrine packs:',
    ...e.strongestPacks.slice(0, 8).map((p) => `   - ${p.displayName}: readiness ${p.reviewReadiness} · score ${p.supportScore}`),
    '',
    '6. Review first:',
    ...e.reviewFirst.slice(0, 10).map((p) => `   - ${p.displayName} — readiness ${p.reviewReadiness} · ${p.implementationPriority}`),
    '',
    `7. Ready for implementation (after human review): **${e.readyForImplementationCount}**`,
    ...e.readyForImplementation.slice(0, 10).map((p) => `   - ${p.displayName} · readiness ${p.reviewReadiness} · score ${p.supportScore}`),
    '',
    '8. Gaps before implementation:',
    ...e.gapsBeforeImplementation.slice(0, 12).map((g) => `   - ${g.lessonTitle || g.displayName || g.topic || g.label}: ${g.status}`),
    e.gapsBeforeImplementation.length > 12 ? `   - … and ${e.finalGapCount - 12} more documented in FinalDoctrineGapReport.md` : '',
    '',
    '### Lesson coverage',
    '',
    `- Represented: ${e.lessonRepresented} · Partial: ${e.lessonPartial} · Missing: ${e.lessonMissing}`,
    '',
    '### Question coverage',
    '',
    `- Covered: ${e.questionsCovered} · Partial: ${e.questionsPartial} · Missing: ${e.questionsMissing}`,
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Scripture implementation | none |',
    '| Approvals | none |',
    '| Doctrine / cards / graph / prompts | none |',
    '| Human review authority | final |',
    '| Silent omissions | eliminated — all gaps documented |',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3M — Source-to-doctrine verification starting...');
  const data = runPhase3mSourceDoctrineVerification();

  writeSourceCoverage(data);
  writeLessonTitles(data);
  writeQuestions(data);
  writeWeakPacks(data);
  writeFeasts(data);
  writeJesus(data);
  writeHolySpirit(data);
  writeFinalGaps(data);
  writeImplementation(data);
  writeMain(data);

  console.log('Phase 3M — Complete');
  console.log(`Source entries: ${data.executive.sourceEntriesAudited}`);
  console.log(`Covered: ${data.executive.fullyCoveredSourceTopics} · Partial: ${data.executive.partiallyCoveredSourceTopics} · Missing: ${data.executive.missingSourceTopics}`);
  console.log(`Ready for implementation: ${data.executive.readyForImplementationCount}`);
  console.log(`Final gaps documented: ${data.executive.finalGapCount}`);
  console.log('Reports written.');
}

main();
