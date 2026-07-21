#!/usr/bin/env node
/**
 * Phase 3D — Full IOG / ICOJ corpus expansion reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3dCorpusExpansion } = require('../services/phase3dCorpusExpansion');
const { STRENGTH_TIERS } = require('../services/scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  campInventory: path.join(ROOT, 'FullCampSourceInventory.md'),
  topicMap: path.join(ROOT, 'BibleWideTopicMap.md'),
  openTopic: path.join(ROOT, 'OpenTopicDiscoveryReport.md'),
  questions: path.join(ROOT, 'FullQuestionInventory.md'),
  chains: path.join(ROOT, 'FullScriptureChainInventory.md'),
  expansion: path.join(ROOT, 'FullParallelSupportingScriptureExpansion.md'),
  ranking: path.join(ROOT, 'FullCorpusScriptureRanking.md'),
  queues: path.join(ROOT, 'FullCorpusImplementationQueues.md'),
  gap: path.join(ROOT, 'FullCorpusGapReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3DReport.md'),
};

function writeCampInventory(data) {
  const r = data.registry;
  const lines = [
    '# Full Camp Source Inventory',
    '',
    '**Phase:** 3D Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Seed sources loaded:** ${data.executive.seedSourcesLoaded}`,
    `**Additional sources discovered:** ${data.executive.additionalSourcesDiscovered}`,
    `**Final source count:** ${data.executive.totalSources}`,
    `**Camps:** ${data.executive.camps}`,
    `**IOG sources:** ${data.executive.iogSources}`,
    `**ICOJ sources:** ${data.executive.icojSources}`,
    '',
    '| Source | Org | Camp | Type | Est. Q | Loaded Q | Est. Lessons | Est. Q&A | Processing |',
    '|--------|-----|------|------|--------|----------|--------------|----------|------------|',
  ];

  for (const s of r.sources) {
    lines.push(
      `| ${s.sourceName?.slice(0, 36)} | ${s.organization} | ${s.camp} | ${s.sourceType} | ${s.estimatedQuestions} | ${s.loadedQuestions} | ${s.estimatedLessons} | ${s.estimatedQaSessions} | ${s.processingAllowed ? 'yes' : 'metadata'} |`,
    );
  }

  lines.push(
    '',
    '## Registry file',
    '',
    '`data/full-corpus-source-registry.json`',
  );

  fs.writeFileSync(REPORTS.campInventory, `${lines.join('\n')}\n`);
}

function writeTopicMap(data) {
  const lines = [
    '# Bible-Wide Topic Map',
    '',
    '**Phase:** 3D Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Topics discovered:** ${data.topicMap.length}`,
    '',
    '| Topic | Category | Questions | Sources | New topic |',
    '|-------|----------|-----------|---------|-----------|',
  ];

  for (const t of data.topicMap) {
    lines.push(`| ${t.topic} | ${t.category} | ${t.questionCount} | ${t.sources.length} | ${t.isNewTopic ? 'yes' : 'no'} |`);
  }

  fs.writeFileSync(REPORTS.topicMap, `${lines.join('\n')}\n`);
}

function writeOpenTopicReport(data) {
  const open = data.topicMap.filter((t) =>
    t.topic === 'unclassified' || t.topic === 'open_topic' || t.topic === 'mixed',
  );
  const lines = [
    '# Open Topic Discovery Report',
    '',
    '**Phase:** 3D Part B',
    `**Date:** ${data.ranAt}`,
    '',
    'Open-topic collapse avoided — `unclassified` used only when no seed or token match.',
    '',
    `**Unclassified / broad topics:** ${open.length}`,
    `**Total discovered topics:** ${data.topicMap.length}`,
    '',
    '## Classification summary',
    '',
    `- Collapsed to unclassified: ${data.gapAnalysis.classificationGaps} review candidates`,
    `- Watchlist topics found: ${data.gapAnalysis.foundTopics.length}`,
    `- Watchlist topics missing: ${data.gapAnalysis.missingTopics.length}`,
    '',
    '## New topic packs (sample)',
    '',
  ];

  for (const t of data.topicMap.filter((x) => x.isNewTopic).slice(0, 25)) {
    lines.push(`- **${t.topic}** (${t.questionCount} Q) — ${t.sampleQuestions[0]?.slice(0, 70) || ''}`);
  }

  fs.writeFileSync(REPORTS.openTopic, `${lines.join('\n')}\n`);
}

function writeQuestionInventory(data) {
  const lines = [
    '# Full Question Inventory',
    '',
    '**Phase:** 3D Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total questions (exact-deduped):** ${data.questions.length}`,
    '',
    '| Camp | Lesson | Topic | Question | Scriptures | Source |',
    '|------|--------|-------|----------|------------|--------|',
  ];

  for (const e of data.extractions.slice(0, 250)) {
    const q = e.question.length > 60 ? `${e.question.slice(0, 57)}…` : e.question;
    const refs = (e.scripturesCited || []).slice(0, 2).join('; ') || '—';
    lines.push(`| ${e.camp || '—'} | ${(e.lessonTitle || '').slice(0, 30)} | ${e.topicCandidate} | ${q} | ${refs} | ${(e.sourceName || '').slice(0, 20)} |`);
  }

  if (data.extractions.length > 250) {
    lines.push('', `_Showing 250 of ${data.extractions.length} — full list in phase3d-corpus-expansion-results.json_`);
  }

  fs.writeFileSync(REPORTS.questions, `${lines.join('\n')}\n`);
}

function writeChainInventory(data) {
  const lines = [
    '# Full Scripture Chain Inventory',
    '',
    '**Phase:** 3D Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total chains:** ${data.chains.length}`,
    '',
  ];

  for (const c of data.chains.slice(0, 120)) {
    lines.push(`## ${c.question.slice(0, 100)}`);
    lines.push(`- **Topic:** ${c.topic}`);
    lines.push(`- **Lesson:** ${c.lessonTitle || '—'}`);
    lines.push(`- **Source:** ${c.source}`);
    lines.push(`- **Chain:** ${(c.scriptureOrder || c.scripturesCited || []).join('; ')}`, '');
  }

  fs.writeFileSync(REPORTS.chains, `${lines.join('\n')}\n`);
}

function writeScriptureExpansion(data) {
  const lines = [
    '# Full Parallel / Supporting Scripture Expansion',
    '',
    '**Phase:** 3D Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Parallel (unique):** ${data.executive.totalParallelScriptures}`,
    `**Supporting (unique):** ${data.executive.totalSupportingScriptures}`,
    `**Continuity (unique):** ${data.executive.totalContinuityScriptures}`,
    `**G2R expansions:** ${data.executive.totalGenesisRevelationExpansions}`,
    '',
  ];

  for (const r of data.reviews.slice(0, 80)) {
    lines.push(`### ${r.candidateId} — ${r.topic} (${r.supportScore})`);
    lines.push(`- **Question:** ${r.question?.slice(0, 90)}`);
    lines.push(`- **G2R:** ${(r.genesisToRevelationChain || []).slice(0, 6).join('; ')}`);
    lines.push(`- **Parallel:** ${(r.parallelScriptures || []).slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Supporting:** ${(r.supportingScriptures || []).slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Continuity:** ${(r.continuityScriptures || []).slice(0, 5).join('; ') || 'none'}`, '');
  }

  fs.writeFileSync(REPORTS.expansion, `${lines.join('\n')}\n`);
}

function writeRanking(data) {
  const tiers = [
    { label: '95–100 Very Strong', min: 95, max: 100 },
    { label: '90–94 Strong', min: 90, max: 94 },
    { label: '80–89 Good Support', min: 80, max: 89 },
    { label: '70–79 Review Needed', min: 70, max: 79 },
    { label: 'Below 70 Research Needed', min: 0, max: 69 },
  ];

  const lines = [
    '# Full Corpus Scripture Ranking',
    '',
    '**Phase:** 3D Part F',
    `**Date:** ${data.ranAt}`,
    '',
    '## Topic packs',
    '',
  ];

  for (const tier of tiers) {
    const packs = data.topicPacks.filter((p) => p.supportScore >= tier.min && p.supportScore <= tier.max);
    lines.push(`### ${tier.label} (${packs.length})`, '');
    for (const p of packs.slice(0, 20)) {
      lines.push(`- **${p.displayName}** — ${p.supportScore} (${p.candidateCount} candidates)`);
    }
    lines.push('');
  }

  lines.push('## Top candidates', '');
  lines.push('| ID | Topic | Score | Camp | Parallel | Supporting | Continuity |');
  lines.push('|----|-------|-------|------|----------|------------|------------|');
  for (const r of [...data.reviews].sort((a, b) => b.supportScore - a.supportScore).slice(0, 40)) {
    lines.push(`| ${r.candidateId} | ${r.topic} | ${r.supportScore} | ${r.camp || '—'} | ${r.parallelCount || 0} | ${r.supportingCount || 0} | ${r.continuityCount || 0} |`);
  }

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeQueues(data) {
  const q = data.queues;
  const lines = [
    '# Full Corpus Implementation Queues',
    '',
    '**Phase:** 3D Part G',
    `**Date:** ${data.ranAt}`,
    '',
    '**Preparation only — no implementation or approvals.**',
    '',
    `## 95–100 (${q.queue95.length})`,
    '',
  ];

  for (const c of q.queue95) lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore} · ${c.camp || '—'}`);
  lines.push('', `## 90–94 (${q.queue90.length})`, '');
  for (const c of q.queue90.slice(0, 30)) lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore}`);
  lines.push('', `## 80–89 (${q.queue80.length})`, '');
  for (const c of q.queue80) lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore}`);
  lines.push('', `## 70–79 (${q.queue70.length})`, '');
  for (const c of q.queue70.slice(0, 20)) lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore}`);
  lines.push('', `## Below 70 (${q.queueBelow70.length})`, '');
  lines.push(`_See phase3d-implementation-queues.json for full list._`);

  fs.writeFileSync(REPORTS.queues, `${lines.join('\n')}\n`);
}

function writeGapReport(data) {
  const g = data.gapAnalysis;
  const lines = [
    '# Full Corpus Gap Report',
    '',
    '**Phase:** 3D Part H',
    `**Date:** ${data.ranAt}`,
    '',
    '## Watchlist coverage',
    '',
    `**Found:** ${g.foundTopics.length} / ${g.watchlistTotal}`,
    `**Missing:** ${g.missingTopics.length}`,
    '',
    '### Missing topics (sample)',
    '',
    ...g.missingTopics.slice(0, 30).map((t) => `- ${t}`),
    '',
    '### Found topics',
    '',
    ...g.foundTopics.map((t) => `- ${t}`),
    '',
    '## Collapsed topics',
    '',
    ...g.collapsedTopics.map((t) => `- ${t.topic}: ${t.questionCount} questions`),
    '',
    '## Transcript gaps',
    '',
    ...g.transcriptGaps.slice(0, 15).map((s) => `- ${s}`),
    '',
    `## Source gaps: ${g.sourceGaps} sources with zero loaded questions`,
    '',
    '## Phase 3A comparison',
    '',
    `| Metric | Phase 3A | Phase 3D | Delta |`,
    `|--------|----------|----------|-------|`,
    `| Questions | ${g.phase3aComparison.phase3aQuestions} | ${data.questions.length} | ${data.executive.corpusGrowthVsPhase3a.questions} |`,
    `| Topics | ${g.phase3aComparison.phase3aTopics} | ${data.topicMap.length} | ${data.executive.corpusGrowthVsPhase3a.topics} |`,
    `| Chains | ${g.phase3aComparison.phase3aChains} | ${data.chains.length} | ${data.executive.corpusGrowthVsPhase3a.chains} |`,
  ];

  fs.writeFileSync(REPORTS.gap, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3D Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive answers',
    '',
    `1. **Total sources found:** ${e.totalSources}`,
    `2. **Total IOG sources:** ${e.iogSources}`,
    `3. **Total ICOJ sources:** ${e.icojSources}`,
    `4. **Total lessons found (loaded):** ${e.lessonsFound}`,
    `5. **Total Q&A sessions found (loaded):** ${e.qaSessionsFound}`,
    `6. **Total questions extracted:** ${e.totalQuestions}`,
    `7. **Total topics discovered:** ${e.totalTopics}`,
    `8. **Total scripture chains extracted:** ${e.totalScriptureChains}`,
    `9. **Total Genesis-to-Revelation expansions:** ${e.totalGenesisRevelationExpansions}`,
    `10. **Total parallel scriptures (unique):** ${e.totalParallelScriptures}`,
    `11. **Total supporting scriptures (unique):** ${e.totalSupportingScriptures}`,
    `12. **Total continuity scriptures (unique):** ${e.totalContinuityScriptures}`,
    `13. **Candidates 95+:** ${e.candidates95Plus}`,
    `14. **Candidates 90+:** ${e.candidates90Plus}`,
    `15. **Candidates 80+:** ${e.candidates80Plus}`,
    '',
    '### 16. Strongest topic packs',
    '',
    ...e.strongestTopicPacks.map((p) => `- ${p.topic}: ${p.score} (${p.questions} questions)`),
    '',
    '### 17. Missing topic packs (watchlist)',
    '',
    ...e.missingTopicPacks.slice(0, 15).map((t) => `- ${t}`),
    '',
    `18. **Source coverage:** ${e.sourceCoveragePct}% of estimated corpus questions loaded`,
    '',
    '### 19. Corpus growth vs Phase 3A',
    '',
    `- Questions: +${e.corpusGrowthVsPhase3a.questions}`,
    `- Topics: +${e.corpusGrowthVsPhase3a.topics}`,
    `- Chains: +${e.corpusGrowthVsPhase3a.chains}`,
    `- Sources registered: ${e.corpusGrowthVsPhase3a.sources}`,
    '',
    '### 20. Ready-for-review queues',
    '',
    `- 95–100: ${data.queues.queue95.length} candidates`,
    `- 90–94: ${data.queues.queue90.length} candidates`,
    `- 80–89: ${data.queues.queue80.length} candidates`,
  ];

  lines.push(
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Implementation | none |',
    '| Approvals | none |',
    '',
    '## Deliverables',
    '',
    '- FullCampSourceInventory.md',
    '- data/full-corpus-source-registry.json',
    '- BibleWideTopicMap.md',
    '- OpenTopicDiscoveryReport.md',
    '- FullQuestionInventory.md',
    '- FullScriptureChainInventory.md',
    '- FullParallelSupportingScriptureExpansion.md',
    '- FullCorpusScriptureRanking.md',
    '- FullCorpusImplementationQueues.md',
    '- FullCorpusGapReport.md',
    '- BibleAuthorityPhase3DReport.md',
  );

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const data = runPhase3dCorpusExpansion();
  writeCampInventory(data);
  writeTopicMap(data);
  writeOpenTopicReport(data);
  writeQuestionInventory(data);
  writeChainInventory(data);
  writeScriptureExpansion(data);
  writeRanking(data);
  writeQueues(data);
  writeGapReport(data);
  writeMainReport(data);

  console.log('Phase 3D — Full Corpus Expansion');
  console.log(`Sources: ${data.executive.totalSources} · Questions: ${data.executive.totalQuestions} · Topics: ${data.executive.totalTopics}`);
  console.log(`Chains: ${data.executive.totalScriptureChains} · Coverage: ${data.executive.sourceCoveragePct}%`);
  console.log('Reports written.');
}

main();
