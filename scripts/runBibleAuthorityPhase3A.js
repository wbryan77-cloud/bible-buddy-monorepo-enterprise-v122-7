#!/usr/bin/env node
/**
 * Phase 3A — Full corpus rescrub reports (discovery only).
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3aCorpusRescrub } = require('../services/phase3aCorpusRescrub');
const { deriveLessonTitle, STRENGTH_TIERS } = require('../services/scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  rescrub: path.join(ROOT, 'FullCorpusRescrubReport.md'),
  questions: path.join(ROOT, 'MasterQuestionInventory.md'),
  chains: path.join(ROOT, 'MasterScriptureChainInventory.md'),
  g2r: path.join(ROOT, 'MasterGenesisToRevelationExpansion.md'),
  topicPacks: path.join(ROOT, 'MasterTopicPackReport.md'),
  ranking: path.join(ROOT, 'MasterScriptureRanking.md'),
  queue: path.join(ROOT, 'ImplementationPreparationQueue.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3AReport.md'),
};

function writeRescrubReport(data) {
  const sr = data.sourceRegistry;
  const lines = [
    '# Full Corpus Rescrub Report',
    '',
    '**Phase:** 3A Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total sources in registry:** ${sr.totalSources}`,
    `**Corpus pipeline sources:** ${sr.corpusSourceCount}`,
    `**Transcript entries processed:** ${sr.transcriptEntries}`,
    `**Expanded registry entries:** ${sr.expandedRegistryEntries}`,
    '',
    '## Sources included',
    '',
    '- IOG Q&A material (bulk + expanded registry)',
    '- IOG lesson material',
    '- Approved transcript sources',
    '- User-provided transcripts',
    '- Public scripture-based Q&A',
    '- Previously processed unified candidates',
    '- Phase 2I stress turns',
    '- Corpus expansion pipeline',
    '',
    '## Discovery scope',
    '',
    '- All topics allowed (open topic discovery — not limited to prior topic maps)',
    '- Exact-duplicate deduplication only',
    '- No production mutations',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Questions (deduped) | ${data.questions.length} |`,
    `| Scripture chains | ${data.chains.length} |`,
    `| G2R expansions | ${data.executive.totalGenesisRevelationExpansions} |`,
    `| Review candidates | ${data.reviews.length} |`,
    `| Topic packs | ${data.topicPacks.length} |`,
  ];
  fs.writeFileSync(REPORTS.rescrub, `${lines.join('\n')}\n`);
}

function writeQuestionInventory(data) {
  const lines = [
    '# Master Question Inventory',
    '',
    '**Phase:** 3A Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total questions:** ${data.questions.length}`,
    '',
    '| Topic | Lesson | Question | Freq |',
    '|-------|--------|----------|------|',
  ];
  const sorted = [...data.questions].sort((a, b) => (b.frequency || 1) - (a.frequency || 1));
  for (const q of sorted.slice(0, 200)) {
    const lesson = deriveLessonTitle({ question: q.question, topic: q.topic });
    const shortQ = q.question.length > 80 ? `${q.question.slice(0, 77)}…` : q.question;
    lines.push(`| ${q.topic} | ${lesson.slice(0, 40)} | ${shortQ} | ${q.frequency || 1} |`);
  }
  if (sorted.length > 200) lines.push('', `_Showing 200 of ${sorted.length} questions._`);
  fs.writeFileSync(REPORTS.questions, `${lines.join('\n')}\n`);
}

function writeChainInventory(data) {
  const lines = [
    '# Master Scripture Chain Inventory',
    '',
    '**Phase:** 3A Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total chains:** ${data.chains.length}`,
    '',
  ];
  for (const c of data.chains.slice(0, 100)) {
    lines.push(`## ${c.question.slice(0, 100)}`);
    lines.push(`- **Source:** ${c.source}`);
    lines.push(`- **Scriptures cited:** ${(c.scripturesCited || []).join('; ')}`);
    lines.push(`- **Scripture order:** ${(c.scriptureOrder || []).join('; ')}`, '');
  }
  if (data.chains.length > 100) lines.push(`_… ${data.chains.length - 100} more chains in phase3a-corpus-rescrub-results.json_`);
  fs.writeFileSync(REPORTS.chains, `${lines.join('\n')}\n`);
}

function writeG2rExpansion(data) {
  const lines = [
    '# Master Genesis-to-Revelation Expansion',
    '',
    '**Phase:** 3A Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Expansions with G2R span:** ${data.executive.totalGenesisRevelationExpansions}`,
    '',
  ];
  for (let i = 0; i < Math.min(data.witnessExpansions.length, 80); i += 1) {
    const w = data.witnessExpansions[i];
    const chain = data.chains[i];
    if (!chain) continue;
    lines.push(`### ${chain.question.slice(0, 90)}`);
    lines.push(`- **G2R chain:** ${(w.genesisToRevelationChain || []).join('; ')}`);
    lines.push(`- **Parallel / supporting:** ${(w.parallelRefs || w.supportingWitnesses || []).slice(0, 6).join('; ')}`);
    lines.push(`- **Continuity:** ${(w.continuityWitnesses || []).slice(0, 5).join('; ')}`, '');
  }
  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeTopicPackReport(data) {
  const lines = [
    '# Master Topic Pack Report',
    '',
    '**Phase:** 3A Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Topic packs:** ${data.topicPacks.length}`,
    '',
  ];
  for (const p of data.topicPacks) {
    lines.push(`## ${p.displayName} (${p.topic})`);
    lines.push(`- **Lesson:** ${p.lessonTitle}`);
    lines.push(`- **Support score:** ${p.supportScore} (${p.strengthTier})`);
    lines.push(`- **Questions:** ${p.candidateCount}`);
    lines.push(`- **Original chain:** ${p.originalScriptureChain.slice(0, 6).join('; ')}${p.originalScriptureChain.length > 6 ? '…' : ''}`);
    lines.push(`- **G2R chain:** ${p.genesisToRevelationChain.slice(0, 6).join('; ')}${p.genesisToRevelationChain.length > 6 ? '…' : ''}`);
    lines.push(`- **Parallel:** ${p.parallelScriptures.slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Supporting:** ${p.supportingScriptures.slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Continuity:** ${p.continuityScriptures.slice(0, 5).join('; ') || 'none'}`);
    lines.push(`- **Caution (info):** ${p.cautionScriptures.slice(0, 3).join('; ') || 'none'}`);
    lines.push(`- **Explanation:** ${p.scoreExplanation}`, '');
  }
  fs.writeFileSync(REPORTS.topicPacks, `${lines.join('\n')}\n`);
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
    '# Master Scripture Ranking',
    '',
    '**Phase:** 3A Part F',
    `**Date:** ${data.ranAt}`,
    '',
  ];
  for (const tier of tiers) {
    const packs = data.topicPacks.filter((p) => p.supportScore >= tier.min && p.supportScore <= tier.max);
    lines.push(`## ${tier.label} (${packs.length} topic packs)`, '');
    for (const p of packs.slice(0, 15)) {
      lines.push(`- **${p.displayName}** — ${p.supportScore} (${p.candidateCount} questions)`);
    }
    lines.push('');
  }
  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeQueue(data) {
  const q = data.queues;
  const lines = [
    '# Implementation Preparation Queue',
    '',
    '**Phase:** 3A Part G',
    `**Date:** ${data.ranAt}`,
    '',
    '**Preparation only — no implementation or approvals.**',
    '',
    `## 95–100 (${q.queue95.length} candidates)`,
    '',
  ];
  for (const c of q.queue95.slice(0, 25)) {
    lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore}`);
  }
  lines.push('', `## 90–94 (${q.queue90.length} candidates)`, '');
  for (const c of q.queue90.slice(0, 25)) {
    lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore}`);
  }
  lines.push('', `## 80–89 (${q.queue80.length} candidates)`, '');
  for (const c of q.queue80.slice(0, 25)) {
    lines.push(`- ${c.candidateId} · ${c.topic} · ${c.supportScore}`);
  }
  fs.writeFileSync(REPORTS.queue, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const ex = data.executive;
  const topPacks = data.topicPacks.slice(0, 25);
  const topCandidates = [...data.reviews].sort((a, b) => b.supportScore - a.supportScore).slice(0, 25);
  const strongestG2R = [...data.reviews]
    .sort((a, b) => (b.genesisToRevelationChain?.length || 0) - (a.genesisToRevelationChain?.length || 0))
    .slice(0, 10);

  const filterTopic = (topic) => data.reviews
    .filter((r) => r.topic === topic)
    .sort((a, b) => b.supportScore - a.supportScore)
    .slice(0, 5);

  const lines = [
    '# Bible Authority Phase 3A Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total topics | ${ex.totalTopics} |`,
    `| Total questions | ${ex.totalQuestions} |`,
    `| Scripture chains | ${ex.totalScriptureChains} |`,
    `| G2R expansions | ${ex.totalGenesisRevelationExpansions} |`,
    `| Parallel scriptures (unique) | ${ex.totalParallelScriptures} |`,
    `| Supporting scriptures (unique) | ${ex.totalSupportingScriptures} |`,
    `| Continuity scriptures (unique) | ${ex.totalContinuityScriptures} |`,
    `| Candidates 95+ | ${ex.candidates95Plus} |`,
    `| Candidates 90+ | ${ex.candidates90Plus} |`,
    `| Candidates 80+ | ${ex.candidates80Plus} |`,
    '',
    '## Mission answers',
    '',
    '### 1. Top 25 topic packs',
    topPacks.map((p, i) => `${i + 1}. ${p.displayName} (${p.supportScore})`).join('\n'),
    '',
    '### 2. Top 25 candidates',
    topCandidates.map((c, i) => `${i + 1}. ${c.candidateId} · ${c.topic} · ${c.supportScore}`).join('\n'),
    '',
    '### 3. Strongest G2R chains',
    strongestG2R.map((r) => `- ${r.candidateId}: ${(r.genesisToRevelationChain || []).slice(0, 5).join('; ')}`).join('\n'),
    '',
    '### 4. Strongest Sabbath chains',
    filterTopic('sabbath').map((r) => `- ${r.candidateId} (${r.supportScore}): ${(r.originalScriptureChain || []).slice(0, 4).join('; ')}`).join('\n') || 'None in 3A rescrub set',
    '',
    '### 5. Strongest Death State chains',
    filterTopic('death_state').map((r) => `- ${r.candidateId} (${r.supportScore})`).join('\n') || 'See death_state topic pack',
    '',
    '### 6. Strongest Logos chains',
    filterTopic('messiah_logos').map((r) => `- ${r.candidateId} (${r.supportScore})`).join('\n') || 'See messiah_logos topic pack',
    '',
    '### 7. Ready for human review',
    `Topic packs with pending scripture breadth: ${data.topicPacks.filter((p) => p.supportScore >= 80).slice(0, 5).map((p) => p.displayName).join(', ')}. Implementation queues prepared — human approval required before any apply.`,
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Doctrine / prompts | none |',
    '| Graph / card changes | none |',
    '| Auto-approval | none |',
    '',
    '## Deliverables',
    '',
  ];
  for (const p of Object.values(REPORTS)) {
    lines.push(`- ${path.basename(p)}`);
  }
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3A — Full Corpus Rescrub');
  const data = runPhase3aCorpusRescrub();
  writeRescrubReport(data);
  writeQuestionInventory(data);
  writeChainInventory(data);
  writeG2rExpansion(data);
  writeTopicPackReport(data);
  writeRanking(data);
  writeQueue(data);
  writeMainReport(data);
  console.log(`Questions: ${data.questions.length} · Chains: ${data.chains.length} · Reviews: ${data.reviews.length}`);
  console.log(`Topics: ${data.executive.totalTopics} · 90+: ${data.executive.candidates90Plus}`);
  console.log('Reports written.');
}

main();
