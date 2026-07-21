#!/usr/bin/env node
/**
 * Phase 3S — Claude read-only source scrub, transcript recovery, Cursor organization.
 * Source recovery + organization only.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3sSourceScrubOrganization } = require('../services/phase3sSourceScrubOrganization');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  sourceMap: path.join(ROOT, 'Phase3SSourceMapAudit.md'),
  youtube: path.join(ROOT, 'YouTubeTranscriptRecoveryReport.md'),
  claudeYoutube: path.join(ROOT, 'ClaudeYouTubeReadOnlyScrub.md'),
  pdf: path.join(ROOT, 'ICOJPDFExtractionReview.md'),
  spanish: path.join(ROOT, 'SpanishIOGRecoveryReport.md'),
  facebook: path.join(ROOT, 'FacebookManualDescriptionQueue.md'),
  triage: path.join(ROOT, 'RemainingMissingEntryTriage.md'),
  organization: path.join(ROOT, 'RecoveredSourceOrganizationReport.md'),
  linkage: path.join(ROOT, 'RecoveredSourceToPackLinkage.md'),
  coverage: path.join(ROOT, 'Phase3SCoverageUpdate.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3SReport.md'),
};

function writeSourceMap(data) {
  const m = data.sourceMap;
  const lines = [
    '# Phase 3S Source Map Audit',
    '',
    '**Phase:** 3S Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total entries:** ${m.totalEntries} (IOG: ${m.byOrganization.IOG} · ICOJ: ${m.byOrganization.ICOJ})`,
    `**Phase 3R recovered sources:** ${m.phase3rRecoveredSources}`,
    `**Gap missing entries:** ${m.gapMissingEntries}`,
    '',
    '## Dead / blocked links noted',
    '',
    ...m.deadLinksNoted.map((d) => `- ${d}`),
    '',
    '## Sample inventory',
    '',
    '| Org | Category | Label | Camp | URL |',
    '|-----|----------|-------|------|-----|',
  ];
  for (const e of m.entries.slice(0, 60)) {
    lines.push(`| ${e.organization} | ${e.category} | ${e.label?.slice(0, 25)} | ${e.camp} | ${e.url?.slice(0, 45)} |`);
  }
  fs.writeFileSync(REPORTS.sourceMap, `${lines.join('\n')}\n`);
}

function writeYoutube(data) {
  const y = data.youtubeRecovery;
  const lines = [
    '# YouTube Transcript Recovery Report',
    '',
    '**Phase:** 3S Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Queue size:** ${data.youtubeQueue.length}`,
    `**Transcripts recovered:** ${y.recovered}`,
    `**Description only:** ${y.descriptionOnly}`,
    `**Still manual:** ${y.stillManual}`,
    '',
    '## Results',
    '',
  ];
  for (const r of y.results) {
    lines.push('```json');
    lines.push(JSON.stringify({
      videoId: r.videoId,
      url: r.url,
      title: r.title,
      channel: r.channel,
      playlist: r.playlist,
      transcriptStatus: r.transcriptStatus,
      transcriptSource: r.transcriptSource,
      descriptionScriptures: r.descriptionScriptures,
      captionScriptures: r.captionScriptures,
      manualTranscriptNeeded: r.manualTranscriptNeeded,
      failureReason: r.failureReason,
    }, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.youtube, `${lines.join('\n')}\n`);
}

function writeClaudeYoutube(data) {
  const a = data.claudeYoutube;
  const lines = [
    '# Claude YouTube Read-Only Scrub',
    '',
    '**Phase:** 3S Part C — read-only extraction candidates',
    `**Date:** ${data.ranAt}`,
    '',
    a.modelNote,
    '',
    '## Extraction candidates',
    '',
  ];
  for (const c of a.candidates.slice(0, 30)) {
    lines.push(`### ${c.title?.slice(0, 50)} (${c.videoId})`, '');
    lines.push(JSON.stringify(c.extractionCandidates, null, 2));
    lines.push('');
  }
  lines.push('## Findings', '');
  for (const f of a.findings) lines.push(`- ${f.videoId}: ${f.issue} — ${f.title || f.seeds?.join(', ')}`);
  lines.push('', '## Recommendations', '');
  for (const r of a.recommendations) lines.push(`- ${r}`);
  fs.writeFileSync(REPORTS.claudeYoutube, `${lines.join('\n')}\n`);
}

function writePdf(data) {
  const p = data.pdfReview;
  const lines = [
    '# ICOJ PDF Extraction Review',
    '',
    '**Phase:** 3S Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Reviewed:** ${p.totalReviewed} · **Validated:** ${p.validated} · **Needs human:** ${p.needsHumanReview}`,
    '',
  ];
  for (const r of p.reviews.slice(0, 50)) {
    lines.push('```json');
    lines.push(JSON.stringify({
      pdfTitle: r.pdfTitle,
      sourceUrl: r.sourceUrl,
      camp: r.camp,
      scripturesExtracted: r.scripturesExtracted,
      scriptureOrder: r.scriptureOrder,
      sectionHeadings: r.sectionHeadings,
      questionCandidates: r.questionCandidates,
      topicCandidates: r.topicCandidates,
      doctrinePackCandidates: r.doctrinePackCandidates,
      extractionQuality: r.extractionQuality,
      needsHumanReview: r.needsHumanReview,
    }, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.pdf, `${lines.join('\n')}\n`);
}

function writeSpanish(data) {
  const s = data.spanishRecovery;
  const lines = [
    '# Spanish IOG Recovery Report',
    '',
    '**Phase:** 3S Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total:** ${s.total} · **With scriptures:** ${s.withScriptures} · **Queued manual:** ${s.queuedManual}`,
    '',
    '| Spanish title | English | Scriptures | Topic | Manual |',
    '|---------------|---------|------------|-------|--------|',
  ];
  for (const l of s.lessons) {
    lines.push(`| ${l.spanishTitle?.slice(0, 30)} | ${l.englishTitle?.slice(0, 25)} | ${l.scriptureRefsFound.length} | ${l.topicCandidate || '—'} | ${l.manualTranscriptNeeded ? 'yes' : 'no'} |`);
  }
  fs.writeFileSync(REPORTS.spanish, `${lines.join('\n')}\n`);
}

function writeFacebook(data) {
  const f = data.facebookQueue;
  const lines = [
    '# Facebook Manual Description Queue',
    '',
    '**Phase:** 3S Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total pages:** ${f.total} · **Manual paste needed:** ${f.manualPasteNeeded}`,
    '',
    '| URL | Title | Status | Manual paste |',
    '|-----|-------|--------|--------------|',
  ];
  for (const q of f.queue) {
    lines.push(`| ${q.url?.slice(0, 40)} | ${q.title?.slice(0, 30) || '—'} | ${q.status} | ${q.manualPasteNeeded ? 'yes' : 'no'} |`);
  }
  fs.writeFileSync(REPORTS.facebook, `${lines.join('\n')}\n`);
}

function writeTriage(data) {
  const t = data.triage;
  const lines = [
    '# Remaining Missing Entry Triage',
    '',
    '**Phase:** 3S Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Triaged:** ${t.total} · **Resolved elsewhere:** ${t.resolvedElsewhere}`,
    '',
    '## By category',
    '',
    ...Object.entries(t.byCategory).map(([k, v]) => `- ${k}: ${v}`),
    '',
  ];
  for (const e of t.entries.slice(0, 94)) {
    lines.push('```json');
    lines.push(JSON.stringify({
      sourceName: e.sourceName,
      camp: e.camp,
      lessonTitle: e.lessonTitle,
      sourceUrl: e.sourceUrl,
      reasonMissing: e.reasonMissing,
      triageCategory: e.triageCategory,
      nextAction: e.nextAction,
      assignedDoctrinePackCandidate: e.assignedDoctrinePackCandidate,
    }, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.triage, `${lines.join('\n')}\n`);
}

function writeOrganization(data) {
  const lines = [
    '# Recovered Source Organization Report',
    '',
    '**Phase:** 3S Part H',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets organized:** ${data.organizedPackets.length}`,
    '',
  ];
  for (const p of data.organizedPackets.slice(0, 40)) {
    lines.push('```json');
    lines.push(JSON.stringify(p, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.organization, `${lines.join('\n')}\n`);
}

function writeLinkage(data) {
  const l = data.packLinkage;
  const lines = [
    '# Recovered Source to Pack Linkage',
    '',
    '**Phase:** 3S Part I',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${l.totalPackets} · **Packs with support:** ${l.packsWithSupport}`,
    '',
    '| Pack | Sources | Scriptures | Sample lessons |',
    '|------|---------|------------|----------------|',
  ];
  for (const p of l.byPack.slice(0, 25)) {
    lines.push(`| ${p.pack} | ${p.count} | ${p.scriptures} | ${p.lessons.slice(0, 2).join('; ')} |`);
  }
  fs.writeFileSync(REPORTS.linkage, `${lines.join('\n')}\n`);
}

function writeCoverage(data) {
  const g = data.gapReport;
  const e = data.executive;
  const lines = [
    '# Phase 3S Coverage Update',
    '',
    '**Phase:** 3S Part J',
    `**Date:** ${data.ranAt}`,
    '',
    '| Metric | Before 3S | After 3S |',
    '|--------|------------|----------|',
    `| Covered | ${g.before.covered} | ${g.after.covered} |`,
    `| Partial | ${g.before.partial} | ${g.after.partial} |`,
    `| Missing | ${g.before.missing} | ${g.after.missing} |`,
    '',
    '## Recovery counts',
    '',
    `- YouTube transcripts recovered: ${e.youtubeTranscriptsRecovered}`,
    `- YouTube still manual: ${e.youtubeStillManual}`,
    `- PDFs reviewed: ${e.pdfsReviewed} (validated: ${e.pdfsValidated})`,
    `- Spanish recovered: ${e.spanishRecovered}`,
    `- Facebook manual queue: ${e.facebookManualQueue}`,
    `- Missing triaged: ${e.missingTriaged}`,
    `- Missing resolved elsewhere: ${e.missingResolved}`,
    `- Review packets: ${e.reviewPacketsPrepared}`,
  ];
  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3S Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. YouTube transcripts recovered: **${e.youtubeTranscriptsRecovered}** (description-only: ${e.youtubeDescriptionOnly})`,
    `2. YouTube still need manual upload: **${e.youtubeStillManual}**`,
    `3. ICOJ PDFs reviewed: **${e.pdfsReviewed}**`,
    `4. PDF scripture extractions validated: **${e.pdfsValidated}**`,
    `5. Spanish lessons recovered/queued: **${e.spanishRecovered}** recovered · **${e.spanishQueued}** queued`,
    `6. Facebook pages need manual paste: **${e.facebookManualQueue}**`,
    `7. Missing entries triaged: **${e.missingTriaged}**`,
    `8. Missing resolved elsewhere: **${e.missingResolved}**`,
    `9. Scriptures in review packets: **${e.scriptureRefsInPackets}** (${e.reviewPacketsPrepared} packets)`,
    '',
    '### Top packs gaining source support',
    '',
  ];
  for (const p of e.topPacks || []) {
    lines.push(`- **${p.pack}** — ${p.count} sources, ${p.scriptures} scriptures`);
  }
  lines.push('', '### Coverage', '');
  lines.push(`Before: ${e.coverageBefore.covered}/${e.coverageBefore.partial}/${e.coverageBefore.missing}`);
  lines.push(`After: **${e.coverageAfter.covered}/${e.coverageAfter.partial}/${e.coverageAfter.missing}**`);
  lines.push('', '### Still blocked', '');
  for (const b of e.blockedItems || []) lines.push(`- ${b}`);
  lines.push('', '### Human admin upload/paste next', '');
  lines.push(`1. Manual YouTube transcripts for **${e.youtubeStillManual}** videos`);
  lines.push(`2. Facebook description paste for **${e.facebookManualQueue}** pages`);
  lines.push(`3. Spanish caption/transcript upload for **${e.spanishQueued}** lessons`);
  lines.push(`4. Review **${e.pdfsReviewed - e.pdfsValidated}** PDF extractions flagged for human review`);
  lines.push('', '## Safety', '');
  lines.push('No production, doctrine, card, graph, or prompt changes.');
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3S — Source scrub + organization starting...');
  const data = await runPhase3sSourceScrubOrganization();

  writeSourceMap(data);
  writeYoutube(data);
  writeClaudeYoutube(data);
  writePdf(data);
  writeSpanish(data);
  writeFacebook(data);
  writeTriage(data);
  writeOrganization(data);
  writeLinkage(data);
  writeCoverage(data);
  writeMain(data);

  console.log('Phase 3S — Complete');
  console.log(`YouTube recovered: ${data.executive.youtubeTranscriptsRecovered} · still manual: ${data.executive.youtubeStillManual}`);
  console.log(`PDFs reviewed: ${data.executive.pdfsReviewed} · packets: ${data.executive.reviewPacketsPrepared}`);
  console.log(`Coverage: ${data.executive.coverageAfter.covered}/${data.executive.coverageAfter.partial}/${data.executive.coverageAfter.missing}`);
  console.log('Reports written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
