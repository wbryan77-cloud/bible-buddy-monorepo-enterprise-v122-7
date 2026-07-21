#!/usr/bin/env node
/**
 * Phase 3F — Scripture content extraction and chain building reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3fContentExtraction } = require('../services/phase3fContentExtraction');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  targets: path.join(ROOT, 'ContentExtractionTargetReport.md'),
  pdf: path.join(ROOT, 'PdfHandoutExtractionReport.md'),
  website: path.join(ROOT, 'WebsiteLessonExtractionReport.md'),
  video: path.join(ROOT, 'VideoDescriptionScriptureExtractionReport.md'),
  transcript: path.join(ROOT, 'TranscriptProcessingReport.md'),
  normalization: path.join(ROOT, 'ScriptureReferenceNormalizationReport.md'),
  chains: path.join(ROOT, 'ExpandedScriptureChainBuildReport.md'),
  support: path.join(ROOT, 'ExpandedChainScriptureSupportReport.md'),
  ranking: path.join(ROOT, 'ContentExtractionScriptureRanking.md'),
  queues: path.join(ROOT, 'ContentExtractionImplementationQueues.md'),
  failure: path.join(ROOT, 'ContentExtractionFailureAudit.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3FReport.md'),
};

function writeTargets(data) {
  const t = data.extractionTargets;
  const lines = [
    '# Content Extraction Target Report',
    '',
    '**Phase:** 3F Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total scrubbed questions:** ${t.totalQuestions}`,
    `**Weak scripture (no refs):** ${t.totalWeakQuestions}`,
    `**Registry sources:** ${t.registrySourceCount}`,
    '',
    '## Priority sources (weak chains)',
    '',
    '| Priority | Source | Camp | Weak Qs | Type | Sample URL |',
    '|----------|--------|------|---------|------|------------|',
  ];

  for (const s of t.prioritizedSources.slice(0, 25)) {
    lines.push(`| ${s.priority} | ${s.sourceName?.slice(0, 28)} | ${s.camp} | ${s.weakQuestionCount} | ${s.sourceType} | ${(s.sampleUrls[0] || '').slice(0, 45)} |`);
  }

  lines.push('', '## Extraction strategy', '', '- ICOJ PDF lesson handouts — pdf-parse text extraction', '- IOG/ICOJ WordPress and HTML lesson pages — body text + ref regex', '- YouTube title/description metadata from Phase 3E corpus', '- Public caption probe (timedtext) where available', '- Scripture normalization before KJV validation');

  fs.writeFileSync(REPORTS.targets, `${lines.join('\n')}\n`);
}

function writePdf(data) {
  const pdfs = data.pdfExtractions;
  const lines = [
    '# PDF Handout Extraction Report',
    '',
    '**Phase:** 3F Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**PDFs processed:** ${pdfs.length}`,
    `**With scriptures:** ${pdfs.filter((p) => p.status === 'extracted').length}`,
    `**Parse failures:** ${pdfs.filter((p) => p.status === 'pdf_parse_failed').length}`,
    `**No refs in text:** ${pdfs.filter((p) => p.status === 'no_refs_in_text').length}`,
    '',
    '| Lesson | Status | Scriptures | Pages | URL |',
    '|--------|--------|------------|-------|-----|',
  ];

  for (const p of pdfs.slice(0, 40)) {
    lines.push(`| ${(p.lessonTitle || '').slice(0, 35)} | ${p.status} | ${(p.scripturesCited || []).length} | ${p.pages || '-'} | ${(p.pdfUrl || p.sourceUrl || '').slice(0, 40)} |`);
  }

  lines.push('', '**Output JSON:** `docs/evidence-candidates/pdf-handout-extractions.json`');
  fs.writeFileSync(REPORTS.pdf, `${lines.join('\n')}\n`);
}

function writeWebsite(data) {
  const sites = data.websiteExtractions;
  const lines = [
    '# Website Lesson Extraction Report',
    '',
    '**Phase:** 3F Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Pages processed:** ${sites.length}`,
    `**With scriptures:** ${sites.filter((s) => s.scripturesCited?.length).length}`,
    '',
    '| Title | Status | Scriptures | Source |',
    '|-------|--------|------------|--------|',
  ];

  for (const s of sites.slice(0, 30)) {
    lines.push(`| ${(s.title || s.lessonTitle || '').slice(0, 40)} | ${s.status} | ${(s.scripturesCited || []).length} | ${s.sourceName?.slice(0, 20)} |`);
  }

  lines.push('', '**Output JSON:** `docs/evidence-candidates/website-lesson-extractions.json`');
  fs.writeFileSync(REPORTS.website, `${lines.join('\n')}\n`);
}

function writeVideo(data) {
  const videos = data.videoExtractions;
  const missing = videos.filter((v) => v.scriptureStatus === 'missing_from_description');
  const lines = [
    '# Video Description Scripture Extraction Report',
    '',
    '**Phase:** 3F Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Videos processed:** ${videos.length}`,
    `**Scriptures found:** ${videos.filter((v) => v.scripturesCited?.length).length}`,
    `**missing_from_description:** ${missing.length}`,
    '',
    '| Title | Scriptures | Status | Camp |',
    '|-------|------------|--------|------|',
  ];

  for (const v of videos.slice(0, 30)) {
    lines.push(`| ${(v.lessonTitle || '').slice(0, 45)} | ${(v.scripturesCited || []).length} | ${v.scriptureStatus} | ${v.camp} |`);
  }

  lines.push('', '**Output JSON:** `docs/evidence-candidates/video-description-scripture-extractions.json`');
  fs.writeFileSync(REPORTS.video, `${lines.join('\n')}\n`);
}

function writeTranscript(data) {
  const t = data.transcriptExtractions;
  const lines = [
    '# Transcript Processing Report',
    '',
    '**Phase:** 3F Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Videos probed:** ${t.length}`,
    `**Captions extracted:** ${t.filter((x) => x.status === 'extracted').length}`,
    `**captionUnavailable:** ${t.filter((x) => x.captionUnavailable).length}`,
    `**apiKeyNeeded:** ${t.filter((x) => x.apiKeyNeeded).length}`,
    `**manualTranscriptNeeded:** ${t.filter((x) => x.manualTranscriptNeeded).length}`,
    '',
    '| Video | Status | Scriptures | Notes |',
    '|-------|--------|------------|-------|',
  ];

  for (const x of t.slice(0, 25)) {
    const note = x.captionUnavailable ? (x.apiKeyNeeded ? 'apiKeyNeeded' : 'captionUnavailable') : x.status;
    lines.push(`| ${(x.lessonTitle || '').slice(0, 40)} | ${x.status} | ${(x.scripturesCited || []).length} | ${note} |`);
  }

  lines.push('', '**Output JSON:** `docs/evidence-candidates/transcript-extractions.json`');
  fs.writeFileSync(REPORTS.transcript, `${lines.join('\n')}\n`);
}

function writeNormalization(data) {
  const n = data.normalization;
  const samples = (n.audit || []).slice(0, 40);
  const lines = [
    '# Scripture Reference Normalization Report',
    '',
    '**Phase:** 3F Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**Raw references seen:** ${n.rawCount}`,
    `**Normalized valid KJV:** ${n.normalizedCount}`,
    '',
    'Handles: book abbreviations, Roman numerals, verse ranges, comma lists, uppercase PDF text, KJV book names.',
    '',
    '## Sample normalizations',
    '',
    '| Raw | Normalized | Valid |',
    '|-----|------------|-------|',
  ];

  for (const s of samples) {
    lines.push(`| ${(s.raw || '').slice(0, 30)} | ${(s.normalized || '').slice(0, 30)} | ${s.valid ? 'yes' : 'no'} |`);
  }

  fs.writeFileSync(REPORTS.normalization, `${lines.join('\n')}\n`);
}

function writeChains(data) {
  const lines = [
    '# Expanded Scripture Chain Build Report',
    '',
    '**Phase:** 3F Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Chains built:** ${data.chains.length}`,
    `**Prior Phase 3E chains:** ${data.executive.priorChainCount}`,
    `**Delta:** ${data.executive.chainCountDelta >= 0 ? '+' : ''}${data.executive.chainCountDelta}`,
    '',
    '## Chain sources',
    '',
  ];

  const bySource = {};
  for (const c of data.chains) {
    bySource[c.chainSource] = (bySource[c.chainSource] || 0) + 1;
  }
  for (const [src, count] of Object.entries(bySource)) {
    lines.push(`- **${src}:** ${count}`);
  }

  lines.push('', '## Sample chains', '');
  for (const c of data.chains.slice(0, 20)) {
    lines.push(`- **${c.question?.slice(0, 60)}…** — ${(c.originalScriptureChain || []).length} refs (${c.chainSource}, ${c.chainConfidence})`);
  }

  lines.push('', '**Output JSON:** `docs/evidence-candidates/expanded-scripture-chains.json`');
  fs.writeFileSync(REPORTS.chains, `${lines.join('\n')}\n`);
}

function writeSupport(data) {
  const lines = [
    '# Expanded Chain Scripture Support Report',
    '',
    '**Phase:** 3F Part H',
    `**Date:** ${data.ranAt}`,
    '',
    `**Expanded chains:** ${data.expandedChains.length}`,
    '',
    '| Question | Original | Parallel | Supporting | Continuity | G2R |',
    '|----------|----------|----------|------------|------------|-----|',
  ];

  for (const c of data.expandedChains.slice(0, 20)) {
    lines.push(`| ${c.question?.slice(0, 35)}… | ${(c.originalScriptureChain || []).length} | ${(c.parallelScriptures || []).length} | ${(c.supportingScriptures || []).length} | ${(c.continuityScriptures || []).length} | ${(c.genesisToRevelationChain || []).length} |`);
  }

  lines.push('', '**Output JSON:** `docs/evidence-candidates/expanded-chain-support.json`');
  fs.writeFileSync(REPORTS.support, `${lines.join('\n')}\n`);
}

function writeRanking(data) {
  const tiers = [
    [95, 100, 'Very Strong'],
    [90, 94, 'Strong'],
    [80, 89, 'Good Support'],
    [70, 79, 'Review Needed'],
    [0, 69, 'Research Needed'],
  ];
  const lines = [
    '# Content Extraction Scripture Ranking',
    '',
    '**Phase:** 3F Part I',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  for (const [min, max, label] of tiers) {
    const items = data.ranked.filter((r) => r.supportScore >= min && r.supportScore <= max);
    lines.push(`## ${min}–${max} ${label} (${items.length})`, '');
    for (const r of items.slice(0, 12)) {
      lines.push(`- **${r.topic}** — ${r.supportScore} — ${r.question?.slice(0, 55)}…`);
    }
    lines.push('');
  }

  lines.push('**Output JSON:** `docs/evidence-candidates/content-extraction-ranking.json`');
  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeQueues(data) {
  const q = data.queues;
  const lines = [
    '# Content Extraction Implementation Queues',
    '',
    '**Phase:** 3F Part J — preparation only, no implementation',
    `**Date:** ${data.ranAt}`,
    '',
    `## 95–100 (${q.queue95.length})`,
    '',
    ...q.queue95.slice(0, 15).map((c) => `- ${c.supportScore} · ${c.topic} · ${c.chainSource} · ${c.question?.slice(0, 50)}`),
    '',
    `## 90–94 (${q.queue90.length})`,
    '',
    ...q.queue90.slice(0, 15).map((c) => `- ${c.supportScore} · ${c.topic}`),
    '',
    `## 80–89 (${q.queue80.length})`,
    '',
    `## 70–79 (${q.queue70.length})`,
    '',
    `## Below 70 (${q.queueBelow70.length})`,
    '',
    '**Output JSON:** `docs/evidence-candidates/content-extraction-implementation-queues.json`',
  ];

  fs.writeFileSync(REPORTS.queues, `${lines.join('\n')}\n`);
}

function writeFailure(data) {
  const byReason = {};
  for (const f of data.failureAudit) {
    byReason[f.reasonNoScriptureChain] = (byReason[f.reasonNoScriptureChain] || 0) + 1;
  }

  const lines = [
    '# Content Extraction Failure Audit',
    '',
    '**Phase:** 3F Part K',
    `**Date:** ${data.ranAt}`,
    '',
    `**Items without scripture chain:** ${data.failureAudit.length}`,
    '',
    '## By reason',
    '',
  ];

  for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${reason}:** ${count}`);
  }

  lines.push('', '| Source | Lesson | Reason | Next action |', '|--------|--------|--------|-------------|');
  for (const f of data.failureAudit.slice(0, 40)) {
    lines.push(`| ${f.sourceName?.slice(0, 22)} | ${(f.lessonTitle || '').slice(0, 25)} | ${f.reasonNoScriptureChain} | ${(f.nextActionNeeded || '').slice(0, 30)} |`);
  }

  fs.writeFileSync(REPORTS.failure, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3F Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. PDFs / handouts processed: **${e.pdfsProcessed}** (${e.pdfsWithScriptures} with scriptures)`,
    `2. Website lessons processed: **${e.websiteLessonsProcessed}** (${e.websiteWithScriptures} with scriptures)`,
    `3. Video descriptions processed: **${e.videoDescriptionsProcessed}** (${e.videosWithScriptures} with scriptures)`,
    `4. Transcripts / captions processed: **${e.transcriptsProcessed}** (${e.transcriptsWithScriptures} with scriptures)`,
    `5. Scripture references extracted: **${e.scriptureReferencesExtracted}**`,
    `6. References normalized: **${e.referencesNormalized}**`,
    `7. New scripture chains built: **${e.newScriptureChainsBuilt}** (Phase 3E: ${e.priorChainCount}, delta: **${e.chainCountDelta >= 0 ? '+' : ''}${e.chainCountDelta}**)`,
    `8. Questions still lacking chains: **${e.questionsStillWithoutChains}** / ${e.totalQuestions}`,
    `9. Candidates scored 95+: **${e.candidates95Plus}**`,
    `10. Candidates scored 90+: **${e.candidates90Plus}**`,
    `11. Candidates scored 80+: **${e.candidates80Plus}**`,
    `12. Chain count increased significantly beyond 127: **${e.chainCountIncreasedSignificantly ? 'YES' : 'NO — see failure audit for source-by-source reasons'}**`,
    '',
    '### Top scripture-producing sources',
    '',
    ...e.topSources.map((s) => `- ${s.sourceName}: ${s.scriptureRefs} refs`),
    '',
    '### Strongest topics',
    '',
    ...e.strongestTopics.slice(0, 10).map((t) => `- ${t.topic}: avg ${t.avgScore} (${t.count} chains)`),
    '',
    '### Ready for human review',
    '',
    `- 95–100 queue: ${data.queues.queue95.length}`,
    `- 90–94 queue: ${data.queues.queue90.length}`,
    `- Total high-confidence (90+): ${e.candidates90Plus}`,
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Scripture implementation | none |',
    '| Approvals | none |',
    '| Doctrine / cards / graph | none |',
  ];

  if (!e.chainCountIncreasedSignificantly) {
    lines.push('', '## Chain growth gap analysis', '', '- ICOJ PDF handouts are primary scripture source; IOG WordPress pages are metadata-heavy', '- YouTube descriptions rarely contain explicit refs — transcripts blocked without API key', '- See `ContentExtractionFailureAudit.md` for per-item reasons');
  }

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3F — Scripture content extraction starting (network requests)...');
  const data = await runPhase3fContentExtraction({ maxPdfs: 55, maxWebPages: 35, maxTranscriptProbes: 25 });

  writeTargets(data);
  writePdf(data);
  writeWebsite(data);
  writeVideo(data);
  writeTranscript(data);
  writeNormalization(data);
  writeChains(data);
  writeSupport(data);
  writeRanking(data);
  writeQueues(data);
  writeFailure(data);
  writeMain(data);

  console.log('Phase 3F — Complete');
  console.log(`Chains: ${data.executive.newScriptureChainsBuilt} (delta vs 3E: ${data.executive.chainCountDelta >= 0 ? '+' : ''}${data.executive.chainCountDelta})`);
  console.log(`PDFs with scriptures: ${data.executive.pdfsWithScriptures}/${data.executive.pdfsProcessed}`);
  console.log(`Questions without chains: ${data.executive.questionsStillWithoutChains}`);
  console.log('Reports written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
