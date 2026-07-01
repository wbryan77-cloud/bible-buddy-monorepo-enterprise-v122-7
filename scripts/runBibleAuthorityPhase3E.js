#!/usr/bin/env node
/**
 * Phase 3E — Full open-source IOG / ICOJ scrub reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3eOpenSourceScrub } = require('../services/phase3eOpenSourceScrub');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  sourceProcessing: path.join(ROOT, 'FullSourceProcessingReport.md'),
  youtube: path.join(ROOT, 'YouTubeVideoScrubReport.md'),
  website: path.join(ROOT, 'WebsiteHandoutScrubReport.md'),
  questions: path.join(ROOT, 'ExpandedQuestionInventory.md'),
  openTopic: path.join(ROOT, 'ExpandedOpenTopicDiscoveryReport.md'),
  chains: path.join(ROOT, 'ExpandedScriptureChainInventory.md'),
  expansion: path.join(ROOT, 'ExpandedParallelSupportingContinuityReport.md'),
  ranking: path.join(ROOT, 'ExpandedCorpusRanking.md'),
  queues: path.join(ROOT, 'ExpandedImplementationQueues.md'),
  failure: path.join(ROOT, 'SourceFailureAudit.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3EReport.md'),
};

function writeSourceProcessing(data) {
  const lines = [
    '# Full Source Processing Report',
    '',
    '**Phase:** 3E Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Sources processed:** ${data.executive.sourcesProcessed} / ${data.executive.sourcesTotal}`,
    `**Sources failed:** ${data.executive.sourcesFailed}`,
    '',
    '| Source | Camp | Processed | Content | Videos | Lessons | Q&A | Transcripts | Questions | Scriptures | Failure |',
    '|--------|------|-----------|---------|--------|---------|-----|-------------|-----------|------------|---------|',
  ];

  for (const r of data.sourceReports) {
    lines.push(
      `| ${r.sourceName?.slice(0, 32)} | ${r.camp} | ${r.processed ? 'yes' : 'no'} | ${r.contentItemsFound || 0} | ${r.videosFound || 0} | ${r.lessonsFound || 0} | ${r.qnaItemsFound || 0} | ${r.transcriptsFound || 0} | ${r.questionsExtracted || 0} | ${r.scripturesExtracted || 0} | ${(r.failureReason || '').slice(0, 40)} |`,
    );
  }

  fs.writeFileSync(REPORTS.sourceProcessing, `${lines.join('\n')}\n`);
}

function writeYouTubeReport(data) {
  const yt = data.sourceReports.filter((r) => (r.videosFound || 0) > 0 || /youtube/i.test(r.url || ''));
  const lines = [
    '# YouTube Video Scrub Report',
    '',
    '**Phase:** 3E Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Videos found:** ${data.executive.youtubeVideosFound}`,
    `**Transcripts/captions detected:** ${data.executive.transcriptsFound}`,
    `**Q&A items:** ${data.executive.qnaItemsProcessed}`,
    '',
    '**Methods:** Public channel /videos page metadata scrape; per-video title + description; caption track list probe (no download).',
    '',
    '| Source | Videos | Transcripts | Questions | Notes |',
    '|--------|--------|-------------|-----------|-------|',
  ];

  for (const r of yt) {
    lines.push(`| ${r.sourceName} | ${r.videosFound || 0} | ${r.transcriptsFound || 0} | ${r.questionsExtracted || 0} | ${r.failureReason || 'ok'} |`);
  }

  const videoItems = data.scrubbedItems.filter((i) => /youtube/i.test(i.sourceType || ''));
  lines.push('', '## Sample video extractions', '');
  for (const v of videoItems.slice(0, 25)) {
    lines.push(`- **${v.lessonTitle?.slice(0, 70)}** — ${v.question?.slice(0, 60)}…`);
  }

  fs.writeFileSync(REPORTS.youtube, `${lines.join('\n')}\n`);
}

function writeWebsiteHandout(data) {
  const web = data.scrubbedItems.filter((i) =>
    /wordpress|handout|rss|website/i.test(i.sourceType || ''),
  );
  const lines = [
    '# Website / Handout Scrub Report',
    '',
    '**Phase:** 3E Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Lesson pages processed:** ${data.executive.lessonPagesProcessed}`,
    `**Handouts processed:** ${data.executive.handoutsProcessed}`,
    '',
    '| Lesson | URL | Scriptures | Topic |',
    '|--------|-----|------------|-------|',
  ];

  for (const w of web.slice(0, 80)) {
    lines.push(`| ${(w.lessonTitle || '').slice(0, 45)} | ${(w.sourceUrl || '').slice(0, 50)} | ${(w.scripturesCited || []).length} | ${w.topicCandidate || w.topic} |`);
  }

  fs.writeFileSync(REPORTS.website, `${lines.join('\n')}\n`);
}

function writeQuestionInventory(data) {
  const lines = [
    '# Expanded Question Inventory',
    '',
    '**Phase:** 3E Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total questions (exact-deduped):** ${data.questions.length}`,
    `**New scrub extractions (pre-dedup):** ${data.executive.scrubbedNewExtractions}`,
    `**Growth vs Phase 3D:** +${data.executive.corpusGrowthVsPhase3d.questions}`,
    '',
    '| Camp | Lesson | Topic | Question | Source |',
    '|------|--------|-------|----------|--------|',
  ];

  for (const q of data.questions.slice(0, 300)) {
    const question = q.question.length > 55 ? `${q.question.slice(0, 52)}…` : q.question;
    lines.push(`| ${q.camp || '—'} | ${(q.lessonTitle || '').slice(0, 28)} | ${q.topic} | ${question} | ${(q.sourceName || '').slice(0, 18)} |`);
  }

  if (data.questions.length > 300) {
    lines.push('', `_Showing 300 of ${data.questions.length} — full list in phase3e-open-source-scrub-results.json_`);
  }

  fs.writeFileSync(REPORTS.questions, `${lines.join('\n')}\n`);
}

function writeOpenTopic(data) {
  const lines = [
    '# Expanded Open Topic Discovery Report',
    '',
    '**Phase:** 3E Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Topics discovered:** ${data.topicMap.length}`,
    '',
    '| Topic | Category | Questions | Sources |',
    '|-------|----------|-----------|---------|',
  ];

  for (const t of data.topicMap.slice(0, 80)) {
    lines.push(`| ${t.topic} | ${t.category} | ${t.questionCount} | ${t.sources.length} |`);
  }

  fs.writeFileSync(REPORTS.openTopic, `${lines.join('\n')}\n`);
}

function writeChains(data) {
  const lines = [
    '# Expanded Scripture Chain Inventory',
    '',
    '**Phase:** 3E Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**Chains:** ${data.chains.length}`,
    '',
  ];

  for (const c of data.chains.slice(0, 100)) {
    lines.push(`## ${c.question.slice(0, 90)}`);
    lines.push(`- Topic: ${c.topic} · Camp: ${c.camp || '—'}`);
    lines.push(`- Chain: ${(c.scriptureOrder || c.scripturesCited || []).join('; ') || 'none'}`, '');
  }

  fs.writeFileSync(REPORTS.chains, `${lines.join('\n')}\n`);
}

function writeExpansion(data) {
  const e = data.executive;
  const lines = [
    '# Expanded Parallel / Supporting / Continuity Report',
    '',
    '**Phase:** 3E Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `| Type | Unique count |`,
    `|------|--------------|`,
    `| Parallel | ${e.totalParallelScriptures} |`,
    `| Supporting | ${e.totalSupportingScriptures} |`,
    `| Continuity | ${e.totalContinuityScriptures} |`,
    `| G2R expansions | ${e.totalGenesisRevelationExpansions} |`,
    '',
  ];

  for (const r of data.reviews.slice(0, 60)) {
    lines.push(`### ${r.candidateId} — ${r.topic}`);
    lines.push(`- Parallel: ${(r.parallelScriptures || []).slice(0, 4).join('; ') || 'none'}`);
    lines.push(`- Supporting: ${(r.supportingScriptures || []).slice(0, 4).join('; ') || 'none'}`);
    lines.push(`- Continuity: ${(r.continuityScriptures || []).slice(0, 4).join('; ') || 'none'}`, '');
  }

  fs.writeFileSync(REPORTS.expansion, `${lines.join('\n')}\n`);
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
    '# Expanded Corpus Ranking',
    '',
    '**Phase:** 3E Part H',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  for (const [min, max, label] of tiers) {
    const packs = data.topicPacks.filter((p) => p.supportScore >= min && p.supportScore <= max);
    lines.push(`## ${min}–${max} ${label} (${packs.length})`, '');
    for (const p of packs.slice(0, 15)) {
      lines.push(`- **${p.displayName}** — ${p.supportScore} (${p.candidateCount})`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeQueues(data) {
  const q = data.queues;
  const lines = [
    '# Expanded Implementation Queues',
    '',
    '**Phase:** 3E Part I — preparation only',
    `**Date:** ${data.ranAt}`,
    '',
    `## 95–100 (${q.queue95.length})`,
    '',
    ...q.queue95.slice(0, 20).map((c) => `- ${c.candidateId} · ${c.topic} · ${c.supportScore}`),
    '',
    `## 90–94 (${q.queue90.length})`,
    '',
    ...q.queue90.slice(0, 20).map((c) => `- ${c.candidateId} · ${c.topic} · ${c.supportScore}`),
    '',
    `## 80–89 (${q.queue80.length})`,
    '',
    ...q.queue80.map((c) => `- ${c.candidateId} · ${c.topic} · ${c.supportScore}`),
    '',
    `## 70–79 (${q.queue70.length})`,
    '',
    `## Below 70 (${q.queueBelow70.length})`,
  ];

  fs.writeFileSync(REPORTS.queues, `${lines.join('\n')}\n`);
}

function writeFailure(data) {
  const lines = [
    '# Source Failure Audit',
    '',
    '**Phase:** 3E Part J',
    `**Date:** ${data.ranAt}`,
    '',
    `**Zero-result sources:** ${data.failureAudit.length}`,
    '',
    '| Source | URL | No questions | No transcript | Next action |',
    '|--------|-----|--------------|---------------|-------------|',
  ];

  for (const f of data.failureAudit.slice(0, 60)) {
    lines.push(`| ${f.sourceName?.slice(0, 30)} | ${(f.url || '').slice(0, 40)} | ${(f.reasonNoQuestions || '').slice(0, 35)} | ${(f.reasonNoTranscript || '').slice(0, 25)} | ${(f.nextActionNeeded || '').slice(0, 35)} |`);
  }

  if (!data.executive.questionCountIncreased) {
    lines.push('', '## Question count did not increase', '', 'See executive report for per-source failure reasons.');
  }

  fs.writeFileSync(REPORTS.failure, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3E Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive answers',
    '',
    `1. Sources processed: **${e.sourcesProcessed}** / ${e.sourcesTotal}`,
    `2. Sources failed: **${e.sourcesFailed}**`,
    `3. YouTube videos found: **${e.youtubeVideosFound}**`,
    `4. Playlists registered: **${e.playlistsFound}**`,
    `5. Transcripts/captions detected: **${e.transcriptsFound}**`,
    `6. Lesson pages processed: **${e.lessonPagesProcessed}**`,
    `7. Handouts processed: **${e.handoutsProcessed}**`,
    `8. Q&A items processed: **${e.qnaItemsProcessed}**`,
    `9. Questions extracted: **${e.totalQuestions}** (Phase 3D: 167, delta: **+${e.corpusGrowthVsPhase3d.questions}**)`,
    `10. Topics discovered: **${e.totalTopics}**`,
    `11. Scripture chains: **${e.totalScriptureChains}**`,
    `12. G2R expansions: **${e.totalGenesisRevelationExpansions}**`,
    `13. Parallel scriptures (unique): **${e.totalParallelScriptures}**`,
    `14. Supporting scriptures (unique): **${e.totalSupportingScriptures}**`,
    `15. Continuity scriptures (unique): **${e.totalContinuityScriptures}**`,
    `16. Candidates 95+: **${e.candidates95Plus}**`,
    `17. Candidates 90+: **${e.candidates90Plus}**`,
    `18. Candidates 80+: **${e.candidates80Plus}**`,
    '',
    '### Strongest topic packs',
    '',
    ...e.strongestTopicPacks.slice(0, 10).map((p) => `- ${p.topic}: ${p.supportScore} (${p.candidateCount} Q)`),
    '',
    `### Corpus growth vs Phase 3D`,
    `- Questions: **${e.questionCountIncreased ? 'INCREASED' : 'NO CHANGE'}** (+${e.corpusGrowthVsPhase3d.questions})`,
    `- Topics: +${e.corpusGrowthVsPhase3d.topics}`,
    `- Chains: +${e.corpusGrowthVsPhase3d.chains}`,
  ];

  if (e.questionCountIncreased) {
    lines.push('', '### Ready for human review', '', `- 95–100 queue: ${data.queues.queue95.length} candidates`, `- 90–94 queue: ${data.queues.queue90.length} candidates`);
  } else {
    lines.push('', '### Why question count may not have increased', '', '- Exact-dedup merged scrub questions with existing Phase 3D corpus', '- Facebook/Instagram/camp-only entries blocked', '- YouTube captions mostly unavailable via public timedtext API', '- Configure YOUTUBE_API_KEY for full playlist pagination');
  }

  lines.push('', '## Safety', '', '| Check | Status |', '|-------|--------|', '| Production | none |', '| Implementation | none |', '| Approvals | none |');

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3E — Open source scrub starting (network requests)...');
  const data = await runPhase3eOpenSourceScrub({ scrubAllSources: true });
  writeSourceProcessing(data);
  writeYouTubeReport(data);
  writeWebsiteHandout(data);
  writeQuestionInventory(data);
  writeOpenTopic(data);
  writeChains(data);
  writeExpansion(data);
  writeRanking(data);
  writeQueues(data);
  writeFailure(data);
  writeMain(data);

  console.log('Phase 3E — Complete');
  console.log(`Questions: ${data.executive.totalQuestions} (delta vs 3D: +${data.executive.corpusGrowthVsPhase3d.questions})`);
  console.log(`Scrubbed new items: ${data.executive.scrubbedNewExtractions}`);
  console.log(`Topics: ${data.executive.totalTopics}`);
  console.log('Reports written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
