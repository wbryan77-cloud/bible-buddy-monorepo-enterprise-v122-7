#!/usr/bin/env node
/**
 * Phase 3R — Full IOG / ICOJ source recovery and corpus completion.
 * Source recovery only — no production, doctrine, card, or graph mutations.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3rSourceRecovery } = require('../services/phase3rSourceRecovery');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  inventory: path.join(ROOT, 'MasterSourceInventory.md'),
  urlFetch: path.join(ROOT, 'ExpandedSourceFetchReport.md'),
  youtube: path.join(ROOT, 'YouTubeSourceRecovery.md'),
  facebook: path.join(ROOT, 'FacebookSourceRecovery.md'),
  pdf: path.join(ROOT, 'PDFSourceRecovery.md'),
  camp: path.join(ROOT, 'CampChurchRecovery.md'),
  spanish: path.join(ROOT, 'SpanishLessonRecovery.md'),
  linkage: path.join(ROOT, 'SourceToPackLinkageRecovery.md'),
  claude: path.join(ROOT, 'ClaudeSourceRecoveryAudit.md'),
  gap: path.join(ROOT, 'SourceGapEliminationReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3RReport.md'),
};

function writeInventory(data) {
  const inv = data.masterInventory;
  const lines = [
    '# Master Source Inventory',
    '',
    '**Phase:** 3R Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total entries:** ${inv.totalEntries}`,
    `**IOG:** ${inv.byOrganization.IOG} · **ICOJ:** ${inv.byOrganization.ICOJ}`,
    '',
    '## By category',
    '',
    ...Object.entries(inv.byCategory).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Inventory sample',
    '',
    '| Org | Category | Label | Camp | URL |',
    '|-----|----------|-------|------|-----|',
  ];

  for (const e of inv.entries.slice(0, 80)) {
    lines.push(`| ${e.organization} | ${e.category} | ${e.label?.slice(0, 30)} | ${e.camp} | ${e.url?.slice(0, 50)} |`);
  }

  if (inv.entries.length > 80) lines.push(`| … | | | | _${inv.entries.length - 80} more_ |`);

  fs.writeFileSync(REPORTS.inventory, `${lines.join('\n')}\n`);
}

function writeUrlFetch(data) {
  const u = data.urlFetch;
  const lines = [
    '# Expanded Source Fetch Report',
    '',
    '**Phase:** 3R Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**URL catalog:** ${data.urlCatalogCount}`,
    `**Fetched:** ${u.fetched}`,
    `**With scriptures:** ${u.withScriptures}`,
    `**Scripture refs recovered:** ${u.scripturesRecovered}`,
    `**WordPress posts:** ${data.wordpressPostItems}`,
    `**Website lessons re-extracted:** ${data.websiteLessonsCount}`,
    '',
    '## Successful fetches (sample)',
    '',
  ];

  for (const r of u.results.filter((x) => x.scriptureCount > 0).slice(0, 40)) {
    lines.push(`- **${r.lessonTitle?.slice(0, 50)}** — ${r.scriptureCount} refs — ${r.url?.slice(0, 60)}`);
  }

  lines.push('', '## Fetch failures (sample)', '');
  for (const r of u.results.filter((x) => x.status === 'fetch_failed').slice(0, 15)) {
    lines.push(`- ${r.url?.slice(0, 60)} — ${r.error}`);
  }

  fs.writeFileSync(REPORTS.urlFetch, `${lines.join('\n')}\n`);
}

function writeYouTube(data) {
  const y = data.youtube;
  const lines = [
    '# YouTube Source Recovery',
    '',
    '**Phase:** 3R Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Videos processed:** ${y.totalVideos}`,
    `**Videos with scriptures:** ${y.videosWithScriptures}`,
    `**Transcripts recovered:** ${y.transcriptRecovered}`,
    `**Transcript unavailable:** ${y.transcriptUnavailable}`,
    `**Manual transcript needed:** ${y.manualTranscriptNeeded}`,
    '',
    '## Channels',
    '',
    '| Channel | Videos | Scriptures | Transcripts |',
    '|---------|--------|------------|-------------|',
  ];

  for (const ch of y.channelResults) {
    lines.push(`| ${ch.sourceName} | ${ch.videosFound} | ${ch.scripturesExtracted} | ${ch.transcriptsFound} |`);
  }

  lines.push('', '## Video sample', '');
  for (const v of y.videoEntries.filter((x) => (x.scripturesCited || []).length).slice(0, 30)) {
    lines.push(`- **${v.title?.slice(0, 45)}** — ${(v.scripturesCited || []).length} refs — transcript: ${v.transcript_available ? 'yes' : 'no'}`);
  }

  fs.writeFileSync(REPORTS.youtube, `${lines.join('\n')}\n`);
}

function writeFacebook(data) {
  const f = data.facebook;
  const lines = [
    '# Facebook Source Recovery',
    '',
    '**Phase:** 3R Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Attempted:** ${f.totalAttempted}`,
    `**With scriptures:** ${f.withScriptures}`,
    `**Fetch failed:** ${f.fetchFailed}`,
    '',
    '## Results sample',
    '',
  ];

  for (const r of f.results.slice(0, 30)) {
    lines.push(`- **${r.title?.slice(0, 40) || r.url?.slice(0, 40)}** — ${r.status} — ${r.scriptureCount || 0} refs`);
  }

  fs.writeFileSync(REPORTS.facebook, `${lines.join('\n')}\n`);
}

function writePdf(data) {
  const p = data.pdfRecovery;
  const lines = [
    '# PDF Source Recovery',
    '',
    '**Phase:** 3R Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**PDFs processed:** ${p.totalProcessed}`,
    `**With scriptures:** ${p.withScriptures}`,
    `**Failed:** ${p.failed}`,
    `**WP handout scriptures:** ${p.wpHandoutScriptures}`,
    '',
    '## Extracted PDFs (sample)',
    '',
  ];

  for (const pdf of (p.pdfExtractions || []).filter((x) => (x.scripturesCited || []).length).slice(0, 30)) {
    lines.push(`- **${pdf.lessonTitle?.slice(0, 40)}** — ${(pdf.scripturesCited || []).length} refs — ${pdf.status}`);
  }

  fs.writeFileSync(REPORTS.pdf, `${lines.join('\n')}\n`);
}

function writeCamp(data) {
  const c = data.campRecovery;
  const lines = [
    '# Camp Church Recovery',
    '',
    '**Phase:** 3R Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**Camps with data:** ${c.totalCampsWithData}`,
    '',
    '| Camp | Lessons | Sources | Scriptures |',
    '|------|---------|---------|------------|',
  ];

  for (const camp of c.camps) {
    lines.push(`| ${camp.camp} | ${camp.lessons.length} | ${camp.sources.length} | ${camp.scriptureCount} |`);
  }

  fs.writeFileSync(REPORTS.camp, `${lines.join('\n')}\n`);
}

function writeSpanish(data) {
  const s = data.spanishRecovery;
  const lines = [
    '# Spanish Lesson Recovery',
    '',
    '**Phase:** 3R Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total Spanish lessons:** ${s.totalSpanishLessons}`,
    `**With scriptures:** ${s.withScriptures}`,
    `**Needs manual work:** ${s.needsManual}`,
    '',
    '| Title | Topic | Scriptures | Transcript | Manual |',
    '|-------|-------|------------|------------|--------|',
  ];

  for (const l of s.lessons.slice(0, 40)) {
    lines.push(`| ${l.title?.slice(0, 35)} | ${l.doctrineTopic || '—'} | ${l.scriptureCount} | ${l.transcriptStatus} | ${l.manualWorkRequired ? 'yes' : 'no'} |`);
  }

  fs.writeFileSync(REPORTS.spanish, `${lines.join('\n')}\n`);
}

function writeLinkage(data) {
  const l = data.packLinkages;
  const lines = [
    '# Source to Pack Linkage Recovery',
    '',
    '**Phase:** 3R Part H',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total linkages:** ${l.totalLinkages}`,
    `**With pack assignment:** ${l.withPackAssignment}`,
    `**With chain match:** ${l.withChainMatch}`,
    `**With card match:** ${l.withCardMatch}`,
    '',
    '| Lesson | Scriptures | Topic | Pack | Chain |',
    '|--------|------------|-------|------|-------|',
  ];

  for (const link of l.linkages.slice(0, 50)) {
    lines.push(`| ${link.lessonTitle?.slice(0, 30)} | ${link.scriptureCount} | ${link.topicCandidate || '—'} | ${link.doctrinePack || '—'} | ${link.chainMatch ? 'yes' : 'no'} |`);
  }

  fs.writeFileSync(REPORTS.linkage, `${lines.join('\n')}\n`);
}

function writeClaude(data) {
  const a = data.claudeAudit;
  const lines = [
    '# Claude Source Recovery Audit',
    '',
    '**Phase:** 3R Part I — read-only',
    `**Date:** ${data.ranAt}`,
    '',
    a.modelNote,
    '',
    '## Findings',
    '',
  ];

  if (!a.findings.length) lines.push('No critical structural findings.');
  for (const f of a.findings) lines.push(`- **[${f.severity}]** ${f.issue}: ${f.detail}`);

  lines.push('', '## Recommendations', '');
  for (const r of a.recommendations) lines.push(`- ${r}`);

  lines.push('', '## Missed relationships (sample)', '');
  for (const m of a.missedRelationships || []) lines.push(`- ${m}`);

  lines.push('', '## Constraints observed', '');
  lines.push('- Did NOT approve or modify doctrine');
  lines.push('- Did NOT modify production, cards, graph, or prompts');

  fs.writeFileSync(REPORTS.claude, `${lines.join('\n')}\n`);
}

function writeGap(data) {
  const g = data.gapReport;
  const lines = [
    '# Source Gap Elimination Report',
    '',
    '**Phase:** 3R Part J',
    `**Date:** ${data.ranAt}`,
    '',
    '## Coverage',
    '',
    '| Metric | Before 3R | After 3R | Delta |',
    '|--------|-----------|----------|-------|',
    `| Covered | ${g.before.covered} | ${g.after.covered} | ${g.delta.covered} |`,
    `| Partial | ${g.before.partial} | ${g.after.partial} | ${g.delta.partial} |`,
    `| Missing | ${g.before.missing} | ${g.after.missing} | ${g.delta.missing} |`,
    '',
    `**Remaining missing:** ${g.remainingMissingCount}`,
    '',
    '## Why entries remain missing',
    '',
    '- YouTube videos without captions (manual transcript required)',
    '- Facebook pages returning blocked/empty metadata',
    '- Spanish lessons without translated transcript',
    '- Lessons with no public URL in corpus',
    '- PDF handouts that failed parse or contain no extractable refs',
    '',
    '## Remaining missing (sample)',
    '',
  ];

  for (const m of g.remainingMissing.slice(0, 40)) {
    lines.push(`- **${m.lessonTitle?.slice(0, 50)}** — ${m.topic} — ${m.reason}`);
  }

  fs.writeFileSync(REPORTS.gap, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3R Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. New source entries recovered: **${e.newSourceEntriesRecovered}**`,
    `2. New scripture references recovered: **${e.newScriptureReferencesRecovered}**`,
    `3. New lesson titles recovered: **${e.newLessonTitlesRecovered}**`,
    `4. New Q&A items recovered: **${e.newQaItemsRecovered}**`,
    `5. PDFs with scriptures: **${e.pdfsRecovered}**`,
    `6. YouTube transcripts recovered: **${e.youtubeTranscriptsRecovered}** (${e.youtubeVideosProcessed} videos processed)`,
    `7. Facebook sources with scriptures: **${e.facebookSourcesRecovered}**`,
    `8. Spanish lessons with scriptures: **${e.spanishLessonsRecovered}** / ${e.spanishLessonsTotal} total`,
    `9. Remaining missing: **${e.remainingMissing}**`,
    `10. Manual transcript upload needed: **${e.manualTranscriptNeeded}** YouTube items`,
    '',
    '### Coverage',
    '',
    `- Before: ${e.coverageBefore.covered} covered · ${e.coverageBefore.partial} partial · ${e.coverageBefore.missing} missing`,
    `- After: **${e.coverageAfter.covered}** covered · **${e.coverageAfter.partial}** partial · **${e.coverageAfter.missing}** missing`,
    '',
    '### Master inventory',
    '',
    `- Total cataloged sources: **${data.masterInventory.totalEntries}**`,
    `- Known URLs: **${data.urlCatalogCount}**`,
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3R — Full IOG/ICOJ source recovery starting...');
  const data = await runPhase3rSourceRecovery({
    maxUrlFetches: 250,
    maxVideosPerChannel: 60,
    maxTranscripts: 100,
    maxPdfs: 150,
    maxFacebookFetches: 40,
  });

  writeInventory(data);
  writeUrlFetch(data);
  writeYouTube(data);
  writeFacebook(data);
  writePdf(data);
  writeCamp(data);
  writeSpanish(data);
  writeLinkage(data);
  writeClaude(data);
  writeGap(data);
  writeMain(data);

  console.log('Phase 3R — Complete');
  console.log(`Recovered: ${data.executive.newSourceEntriesRecovered} entries · ${data.executive.newScriptureReferencesRecovered} scripture refs`);
  console.log(`Coverage: ${data.executive.coverageAfter.covered} covered · ${data.executive.coverageAfter.partial} partial · ${data.executive.coverageAfter.missing} missing`);
  console.log('Reports written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
