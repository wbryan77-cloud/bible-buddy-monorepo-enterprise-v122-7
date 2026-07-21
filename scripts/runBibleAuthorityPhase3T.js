#!/usr/bin/env node
/**
 * Phase 3T — Claude read-only source worker + Cursor organization pipeline.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3tSourceWorkerOrganization } = require('../services/phase3tSourceWorkerOrganization');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  youtube: path.join(ROOT, 'YouTubeTranscriptRecoveryV2.md'),
  claudeYoutube: path.join(ROOT, 'ClaudeYouTubeSourceWorkerReport.md'),
  pdf: path.join(ROOT, 'ICOJPDFHumanReviewPipeline.md'),
  facebook: path.join(ROOT, 'FacebookManualPasteWorkflow.md'),
  spanish: path.join(ROOT, 'SpanishIOGWorkflowV2.md'),
  missing: path.join(ROOT, 'MissingEntryResolutionV2.md'),
  organization: path.join(ROOT, 'CursorRecoveredSourceOrganizationV2.md'),
  linkage: path.join(ROOT, 'RecoveredSourcePackLinkageV2.md'),
  humanReview: path.join(ROOT, 'SourceRecoveryHumanReviewPacketsV2.md'),
  coverage: path.join(ROOT, 'Phase3TCoverageUpdate.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3TReport.md'),
};

function writeYoutube(data) {
  const y = data.youtubeResults;
  const lines = [
    '# YouTube Transcript Recovery V2',
    '',
    '**Phase:** 3T Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Queue:** ${data.youtubeQueue.length}`,
    `**Recovered:** ${y.recovered} · **Description only:** ${y.descriptionOnly} · **Still manual:** ${y.stillManual}`,
    '',
    'Recovery order: local folder → youtube-transcript-api → timedtext → yt-dlp → description',
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
      chapterMarkers: r.chapterMarkers,
    }, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.youtube, `${lines.join('\n')}\n`);
}

function writeClaudeYoutube(data) {
  const c = data.claudeYoutube;
  const lines = [
    '# Claude YouTube Source Worker Report',
    '',
    '**Phase:** 3T Part C — read-only extraction worker',
    `**Date:** ${data.ranAt}`,
    '',
    c.modelNote,
    '',
    `**Outputs:** ${c.outputs.length} · **Manual still needed:** ${c.manualStillNeeded}`,
    '',
  ];
  for (const o of c.outputs) {
    lines.push('```json');
    lines.push(JSON.stringify(o, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.claudeYoutube, `${lines.join('\n')}\n`);
}

function writePdf(data) {
  const p = data.pdfPipeline;
  const lines = [
    '# ICOJ PDF Human Review Pipeline',
    '',
    '**Phase:** 3T Part D',
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
      scripturesExtracted: r.scripturesVerified,
      scriptureOrder: r.scriptureOrder,
      sectionHeadings: r.sectionHeadings,
      topicCandidate: r.topicCandidate,
      doctrinePackCandidate: r.doctrinePackCandidate,
      extractionQuality: r.extractionQuality,
      needsHumanReview: r.needsHumanReview,
      claudeReadOnlyFlags: r.claudeReadOnlyFlags,
    }, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.pdf, `${lines.join('\n')}\n`);
}

function writeFacebook(data) {
  const f = data.facebookWorkflow;
  const lines = [
    '# Facebook Manual Paste Workflow',
    '',
    '**Phase:** 3T Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total:** ${f.total} · **Awaiting paste:** ${f.awaitingPaste}`,
    '',
  ];
  for (const q of f.queue) {
    lines.push('```json');
    lines.push(JSON.stringify(q, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.facebook, `${lines.join('\n')}\n`);
}

function writeSpanish(data) {
  const s = data.spanishWorkflow;
  const lines = [
    '# Spanish IOG Workflow V2',
    '',
    '**Phase:** 3T Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total:** ${s.total} · **With scriptures:** ${s.withScriptures} · **Queued:** ${s.queuedManual}`,
    '',
  ];
  for (const l of s.lessons) {
    lines.push('```json');
    lines.push(JSON.stringify(l, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.spanish, `${lines.join('\n')}\n`);
}

function writeMissing(data) {
  const m = data.missingResolution;
  const lines = [
    '# Missing Entry Resolution V2',
    '',
    '**Phase:** 3T Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total:** ${m.total} · **Resolved:** ${m.resolvedCount} · **Still missing:** ${m.stillMissing}`,
    '',
    '## By category',
    '',
    ...Object.entries(m.byCategory || {}).map(([k, v]) => `- ${k}: ${v}`),
    '',
  ];
  for (const e of m.entries) {
    lines.push('```json');
    lines.push(JSON.stringify({
      sourceName: e.sourceName,
      camp: e.camp,
      lessonTitle: e.lessonTitle,
      sourceUrl: e.sourceUrl,
      reasonMissing: e.reasonMissing,
      triageCategory: e.triageCategory,
      resolutionStatus: e.resolutionStatus,
      scripturesFound: e.scripturesFound,
      linkageCandidate: e.linkageCandidate,
      nextAction: e.nextAction,
    }, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.missing, `${lines.join('\n')}\n`);
}

function writeOrganization(data) {
  const lines = [
    '# Cursor Recovered Source Organization V2',
    '',
    '**Phase:** 3T Part H',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${data.organizedPackets.length}`,
    '',
  ];
  for (const p of data.organizedPackets.slice(0, 50)) {
    lines.push('```json');
    lines.push(JSON.stringify(p, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.organization, `${lines.join('\n')}\n`);
}

function writeLinkage(data) {
  const l = data.packLinkage;
  const lines = [
    '# Recovered Source Pack Linkage V2',
    '',
    '**Phase:** 3T Part I',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${l.totalPackets} · **Priority packs linked:** ${l.priorityPacksLinked}`,
    '',
    '| Pack | Sources | Scriptures | Priority |',
    '|------|---------|------------|----------|',
  ];
  for (const p of l.byPack.slice(0, 25)) {
    lines.push(`| ${p.pack} | ${p.count} | ${p.scriptures} | ${p.priority ? 'yes' : 'no'} |`);
  }
  fs.writeFileSync(REPORTS.linkage, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const h = data.humanReview;
  const lines = [
    '# Source Recovery Human Review Packets V2',
    '',
    '**Phase:** 3T Part J',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total packets:** ${h.total}`,
    `**YouTube:** ${h.byGroup.youtube} · **PDF:** ${h.byGroup.pdf} · **Facebook:** ${h.byGroup.facebook} · **Spanish:** ${h.byGroup.spanish} · **Missing resolution:** ${h.byGroup.missingResolution}`,
    '',
    `YouTube manual queue: ${h.youtubeManualQueue}`,
    `PDF needs review: ${h.pdfNeedsReview}`,
    `Facebook awaiting paste: ${h.facebookAwaitingPaste}`,
    `Spanish queued: ${h.spanishQueued}`,
    `Missing resolved: ${h.missingResolved}`,
    '',
  ];
  for (const p of h.packets.slice(0, 40)) {
    lines.push('```json');
    lines.push(JSON.stringify(p, null, 2));
    lines.push('```', '');
  }
  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeCoverage(data) {
  const c = data.coverage;
  const e = data.executive;
  const lines = [
    '# Phase 3T Coverage Update',
    '',
    '**Phase:** 3T Part K',
    `**Date:** ${data.ranAt}`,
    '',
    '| Metric | Before 3T | After 3T |',
    '|--------|-----------|----------|',
    `| Covered | ${c.before.covered} | ${c.after.covered} |`,
    `| Partial | ${c.before.partial} | ${c.after.partial} |`,
    `| Missing | ${c.before.missing} | ${c.after.missing} |`,
    '',
    '## Breakdown by recovery lane',
    '',
    `- YouTube: ${c.breakdown.youtube}`,
    `- PDF: ${c.breakdown.pdf}`,
    `- Facebook: ${c.breakdown.facebook}`,
    `- Spanish: ${c.breakdown.spanish}`,
    `- URL fetch resolved: ${c.breakdown.urlFetch}`,
    `- Doctrine linkage candidates: ${c.breakdown.doctrineLinkage}`,
    '',
    `- YouTube transcripts recovered: ${e.youtubeTranscriptsRecovered}`,
    `- YouTube still manual: ${e.youtubeStillManual}`,
    `- PDFs reviewed: ${e.pdfsReviewed}`,
    `- Facebook paste queue: ${e.facebookAwaitingPaste}`,
    `- Spanish queued: ${e.spanishQueued}`,
    `- Missing resolved: ${e.missingResolved}`,
  ];
  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3T Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Two-lane workflow',
    '',
    '- **Lane 1:** Claude Fable 5 read-only extraction worker (extraction candidates only)',
    '- **Lane 2:** Cursor organization, validation, Scripture expansion, human review packets',
    '',
    '## Executive Summary',
    '',
    `1. YouTube transcripts recovered: **${e.youtubeTranscriptsRecovered}** (description-only: ${e.youtubeDescriptionOnly})`,
    `2. YouTube still need manual upload: **${e.youtubeStillManual}**`,
    `3. ICOJ PDF extractions reviewed: **${e.pdfsReviewed}** (validated: ${e.pdfsValidated})`,
    `4. Facebook manual paste packets: **${e.facebookPastePackets}** (awaiting: ${e.facebookAwaitingPaste})`,
    `5. Spanish lesson packets: **${e.spanishPackets}** (queued: ${e.spanishQueued})`,
    `6. Missing entries triaged: **${e.missingTriaged}** · resolved: **${e.missingResolved}**`,
    `7. Scriptures in human review packets: **${e.scripturesInReviewPackets}** (${e.reviewPacketCount} packets)`,
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
  lines.push(`Remaining missing: **${e.remainingMissing}**`);
  lines.push('', '### Still blocked', '');
  for (const b of e.blockedReasons) lines.push(`- ${b}`);
  lines.push('', '### Human admin — upload/paste next', '');
  lines.push(`1. Manual YouTube transcripts: **${e.youtubeStillManual}** videos`);
  lines.push(`2. Facebook description paste: **${e.facebookAwaitingPaste}** pages`);
  lines.push(`3. Spanish captions/translations: **${e.spanishQueued}** lessons`);
  lines.push(`4. ICOJ PDF human review: **${e.pdfsReviewed - e.pdfsValidated}** flagged extractions`);
  lines.push('', '## Safety', '');
  lines.push('No production, doctrine, evidence card, graph, or prompt changes.');
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3T — Source worker + organization starting...');
  const data = await runPhase3tSourceWorkerOrganization();

  writeYoutube(data);
  writeClaudeYoutube(data);
  writePdf(data);
  writeFacebook(data);
  writeSpanish(data);
  writeMissing(data);
  writeOrganization(data);
  writeLinkage(data);
  writeHumanReview(data);
  writeCoverage(data);
  writeMain(data);

  console.log('Phase 3T — Complete');
  console.log(`YouTube: ${data.executive.youtubeTranscriptsRecovered} recovered · ${data.executive.youtubeStillManual} manual`);
  console.log(`Missing resolved: ${data.executive.missingResolved} · packets: ${data.executive.reviewPacketCount}`);
  console.log(`Coverage: ${data.executive.coverageAfter.covered}/${data.executive.coverageAfter.partial}/${data.executive.coverageAfter.missing}`);
  console.log('Reports written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
