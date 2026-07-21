#!/usr/bin/env node
/**
 * Phase 3G — Topic pack consolidation and implementation preparation reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3gTopicPackConsolidation } = require('../services/phase3gTopicPackConsolidation');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  inventory: path.join(ROOT, 'MasterTopicPackInventory.md'),
  consolidation: path.join(ROOT, 'TopicPackConsolidationReport.md'),
  duplicates: path.join(ROOT, 'TopicPackDuplicateReductionReport.md'),
  masterPacks: path.join(ROOT, 'MasterScriptureTopicPacks.md'),
  ranking: path.join(ROOT, 'MasterTopicPackRanking.md'),
  readiness: path.join(ROOT, 'ImplementationReadinessByTopic.md'),
  humanReview: path.join(ROOT, 'HumanReviewTopicPackets.md'),
  sourceEffectiveness: path.join(ROOT, 'SourceEffectivenessReport.md'),
  implementationImpact: path.join(ROOT, 'ImplementationImpactAnalysis.md'),
  missingWatchlist: path.join(ROOT, 'MissingTopicWatchlist.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3GReport.md'),
};

function writeInventory(data) {
  const packs = data.packs;
  const lines = [
    '# Master Topic Pack Inventory',
    '',
    '**Phase:** 3G Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Raw scripture chains (Phase 3F):** ${data.executive.rawChainCount}`,
    `**Topic packs created:** ${packs.length}`,
    '',
    '| Topic | Display | Chains | Lessons | Sources | Scriptures | Score | Tier |',
    '|-------|---------|--------|---------|---------|------------|-------|------|',
  ];

  for (const p of packs) {
    lines.push(`| ${p.topic} | ${p.displayName?.slice(0, 28)} | ${p.chainCount} | ${p.lessonCount} | ${p.sourceCount} | ${p.scriptureCount} | ${p.supportScore} | ${p.strengthTier} |`);
  }

  lines.push('', '## Natural topic emergence', '', 'Topics discovered from lesson titles and scripture content — not forced into pre-existing packs only.');
  fs.writeFileSync(REPORTS.inventory, `${lines.join('\n')}\n`);
}

function writeConsolidation(data) {
  const lines = [
    '# Topic Pack Consolidation Report',
    '',
    '**Phase:** 3G Part B',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Chains | Questions | Lessons | Sources | Original | Parallel | Supporting | Continuity |',
    '|-------|--------|-----------|---------|---------|----------|----------|------------|------------|',
  ];

  for (const p of data.packs) {
    lines.push(`| ${p.topic} | ${p.chainCount} | ${p.questionCount} | ${p.lessonCount} | ${p.sourceCount} | ${p.uniqueScriptures.length} | ${p.uniqueParallelScriptures.length} | ${p.uniqueSupportingScriptures.length} | ${p.uniqueContinuityScriptures.length} |`);
  }

  fs.writeFileSync(REPORTS.consolidation, `${lines.join('\n')}\n`);
}

function writeDuplicates(data) {
  const d = data.duplicates;
  const lines = [
    '# Topic Pack Duplicate Reduction Report',
    '',
    '**Phase:** 3G Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Raw chains:** ${d.stats.rawChains}`,
    `**Unique scripture fingerprints:** ${d.stats.uniqueScriptureFingerprints}`,
    `**Unique questions:** ${d.stats.uniqueQuestions}`,
    `**Exact duplicate groups:** ${d.stats.exactDuplicateGroups}`,
    `**Near-duplicate pairs:** ${d.stats.nearDuplicatePairs}`,
    `**Camp/lesson variant groups:** ${d.stats.campVariantGroups}`,
    `**Duplicate chains consolidated:** ${d.stats.duplicateChainsConsolidated}`,
    `**Review effort eliminated:** ${d.stats.reviewEffortEliminated} redundant review units`,
    '',
    'Source history preserved in `sourceQuestions` within each pack — no deletions.',
    '',
    '## Exact scripture chain duplicates',
    '',
  ];

  for (const g of d.duplicateGroups.slice(0, 20)) {
    lines.push(`- **${g.chainCount} chains** — ${g.scriptureCount} refs — canonical: ${g.canonicalQuestion?.slice(0, 60)}…`);
    for (const m of g.members.slice(0, 3)) {
      lines.push(`  - ${m.camp || '—'} · ${m.lessonTitle?.slice(0, 40)}`);
    }
  }

  lines.push('', '## Camp / lesson question variants', '');
  for (const g of d.campVariantGroups.slice(0, 15)) {
    lines.push(`- **${g.lessonTitle?.slice(0, 50)}** — ${g.chainCount} variants → canonical: ${g.canonicalQuestion?.slice(0, 50)}…`);
  }

  lines.push('', '## Near-duplicate same-topic pairs', '');
  for (const g of d.nearDuplicateGroups.slice(0, 15)) {
    lines.push(`- **${g.topic}** (${g.overlap}% overlap) — ${g.chainA.lessonTitle?.slice(0, 35)} ↔ ${g.chainB.lessonTitle?.slice(0, 35)}`);
  }

  fs.writeFileSync(REPORTS.duplicates, `${lines.join('\n')}\n`);
}

function writeMasterPacks(data) {
  const lines = [
    '# Master Scripture Topic Packs',
    '',
    '**Phase:** 3G Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packs:** ${data.masterPacks.length}`,
    '',
    '**Output JSON:** `docs/evidence-candidates/master-topic-packs.json`',
    '',
  ];

  for (const p of data.masterPacks.slice(0, 30)) {
    lines.push(`## ${p.displayName} (${p.topic})`, '');
    lines.push(`- **Support score:** ${p.supportScore} (${p.strengthTier})`);
    lines.push(`- **Chains consolidated:** ${p.chainCount}`);
    lines.push(`- **Scriptures:** ${p.allOriginalScriptures.length} original, ${p.allParallelScriptures.length} parallel, ${p.allSupportingScriptures.length} supporting, ${p.allContinuityScriptures.length} continuity`);
    lines.push(`- **Strongest chain:** ${p.strongestChain?.question?.slice(0, 70)}…`);
    lines.push(`- **Lessons:** ${p.sourceLessons?.length || 0}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.masterPacks, `${lines.join('\n')}\n`);
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
    '# Master Topic Pack Ranking',
    '',
    '**Phase:** 3G Part E',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  for (const [min, max, label] of tiers) {
    const items = data.packs.filter((p) => p.supportScore >= min && p.supportScore <= max);
    lines.push(`## ${min}–${max} ${label} (${items.length})`, '');
    for (const p of items.slice(0, 15)) {
      lines.push(`- **${p.displayName}** — ${p.supportScore} · ${p.scriptureCount} scriptures · ${p.chainCount} chains`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.ranking, `${lines.join('\n')}\n`);
}

function writeReadiness(data) {
  const lines = [
    '# Implementation Readiness By Topic',
    '',
    '**Phase:** 3G Part F',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Score | Human Review | Impl Prep | More Extraction | More Sources | More Support |',
    '|-------|-------|--------------|-----------|-----------------|--------------|--------------|',
  ];

  for (const p of data.packs) {
    const r = p.readiness;
    lines.push(`| ${p.topic} | ${p.supportScore} | ${r.readyForHumanReview ? 'yes' : 'no'} | ${r.readyForImplementationPreparation ? 'yes' : 'no'} | ${r.needsMoreExtraction ? 'yes' : 'no'} | ${r.needsMoreSources ? 'yes' : 'no'} | ${r.needsMoreScriptureSupport ? 'yes' : 'no'} |`);
  }

  lines.push(
    '',
    `**Ready for human review:** ${data.executive.readyForHumanReviewCount}`,
    `**Ready for implementation preparation:** ${data.executive.readyForImplementationPreparationCount}`,
    `**Needs more extraction:** ${data.executive.needsMoreExtractionCount}`,
  );

  fs.writeFileSync(REPORTS.readiness, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const lines = [
    '# Human Review Topic Packets',
    '',
    '**Phase:** 3G Part G — review packets only, no approvals',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${data.humanReviewPackets.length}`,
    '',
  ];

  for (const pkt of data.humanReviewPackets.filter((p) => p.readyForHumanReview).slice(0, 40)) {
    lines.push(`## ${pkt.displayName}`, '');
    lines.push(`- **Tier:** ${pkt.strengthTier} (${pkt.supportScore})`);
    lines.push(`- **Questions:** ${pkt.questionCount} · **Scriptures:** ${pkt.scriptureCount} · Parallel: ${pkt.parallelScriptureCount} · Supporting: ${pkt.supportingScriptureCount} · Continuity: ${pkt.continuityScriptureCount}`);
    lines.push(`- **Strongest chain:** ${pkt.strongestChain?.question?.slice(0, 80)}`);
    lines.push(`- **Impl prep ready:** ${pkt.readyForImplementationPreparation ? 'yes' : 'no'}`);
    if (pkt.reviewNotes?.length) {
      lines.push('- **Review notes:**', ...pkt.reviewNotes.map((n) => `  - ${n}`));
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeSourceEffectiveness(data) {
  const s = data.sourceEffectiveness;
  const lines = [
    '# Source Effectiveness Report',
    '',
    '**Phase:** 3G Part H',
    `**Date:** ${data.ranAt}`,
    '',
    '## Top sources (scripture references)',
    '',
    '| Source | Scripture refs | Chains | Avg score |',
    '|--------|----------------|--------|-----------|',
  ];

  for (const src of s.topSources) {
    lines.push(`| ${src.sourceName?.slice(0, 40)} | ${src.scriptureRefs} | ${src.chains} | ${src.avgScore} |`);
  }

  lines.push('', '## Top camps (chains)', '', '| Camp | Chains | Scripture refs |', '|------|--------|----------------|');
  for (const c of s.topCamps) {
    lines.push(`| ${c.camp} | ${c.chains} | ${c.scriptureRefs} |`);
  }

  lines.push('', '## Strongest lessons', '', '| Lesson | Chains | Scriptures | Avg score |', '|--------|--------|------------|-----------|');
  for (const l of s.strongestLessons.slice(0, 15)) {
    lines.push(`| ${l.lessonTitle?.slice(0, 45)} | ${l.chains} | ${l.scriptureRefs} | ${l.avgScore} |`);
  }

  lines.push('', '## Strongest Q&A sessions', '');
  for (const q of s.strongestQaSessions.slice(0, 10)) {
    lines.push(`- **${q.lessonTitle?.slice(0, 50)}** — avg ${q.avgScore} (${q.chains} chains)`);
  }

  fs.writeFileSync(REPORTS.sourceEffectiveness, `${lines.join('\n')}\n`);
}

function writeImplementationImpact(data) {
  const impacts = data.implementationImpact || [];
  const lines = [
    '# Implementation Impact Analysis',
    '',
    '**Phase:** 3G Part H',
    `**Date:** ${data.ranAt}`,
    '',
    'Implementation Confidence is **informational only**. It never blocks implementation, overrides support score, or overrides human review.',
    '',
    `**Doctrine Completeness Score (informational):** ${data.executive.doctrineCompletenessScore}%`,
    '',
    '| Topic | New Scriptures | New Chains | New Questions | Confidence | Learning Gain |',
    '|-------|----------------|------------|---------------|------------|---------------|',
  ];

  for (const i of impacts) {
    lines.push(`| ${i.topic} | ${i.newScripturesAdded} | ${i.newChainsAdded} | ${i.newQuestionsCovered} | ${i.implementationConfidence} | ${i.learningGainScore} |`);
  }

  lines.push('', '## Per-pack summaries', '');
  for (const i of impacts.slice(0, 30)) {
    lines.push(`### ${i.displayName} (${i.topic})`, '', i.implementationImpactSummary, '');
  }

  lines.push('**Output JSON:** `docs/evidence-candidates/implementation-impact-analysis.json`');
  fs.writeFileSync(REPORTS.implementationImpact, `${lines.join('\n')}\n`);
}

function writeMissingWatchlist(data) {
  const w = data.missingTopicWatchlist || {};
  const lines = [
    '# Missing Topic Watchlist',
    '',
    '**Phase:** 3G Part I',
    `**Date:** ${data.ranAt}`,
    '',
    `**Seed topics tracked:** ${w.seedTopicCount}`,
    `**Found (adequate depth):** ${w.foundCount}`,
    `**Weak:** ${w.weakCount}`,
    `**Missing:** ${w.missingCount}`,
    '',
    `**Doctrine Completeness Score:** ${w.doctrineCompletenessScore}% (${w.doctrineCompletenessNote})`,
    '',
    '## Found topics',
    '',
    ...w.foundTopics.slice(0, 40).map((t) => `- **${t.displayName}** — score ${t.supportScore} · ${t.scriptureCount} scriptures · ${t.chainCount} chains`),
    '',
    '## Weak topics',
    '',
    ...w.weakTopics.map((t) => `- **${t.displayName}** (${t.packTopic}) — ${t.reason} · score ${t.supportScore} · ${t.scriptureCount} scriptures`),
    '',
    '## Missing topics',
    '',
    ...w.missingTopics.map((t) => `- **${t.displayName}** (${t.topic}) — ${t.reason}`),
    '',
    '## Major Bible topics still weak',
    '',
    ...w.majorTopicsWeak.map((t) => `- ${displayNameFallback(t)}`),
    '',
    '## Major Bible topics still missing',
    '',
    ...w.majorTopicsMissing.map((t) => `- ${displayNameFallback(t)}`),
    '',
    '**Output JSON:** `docs/evidence-candidates/missing-topic-watchlist.json`',
  ];

  fs.writeFileSync(REPORTS.missingWatchlist, `${lines.join('\n')}\n`);
}

function displayNameFallback(topic = '') {
  return topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3G Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Topic packs created: **${e.topicPackCount}** (from ${e.rawChainCount} chains)`,
    '',
    '2. Strongest topic packs:',
    ...e.strongestTopicPacks.map((p) => `   - ${p.displayName}: ${p.supportScore} (${p.scriptureCount} scriptures)`),
    '',
    '3. Most scripture support:',
    ...e.mostScriptureSupport.slice(0, 5).map((p) => `   - ${p.topic}: ${p.scriptureCount} scriptures (${p.chainCount} chains)`),
    '',
    '4. Most parallel scriptures:',
    ...e.mostParallelScriptures.slice(0, 5).map((p) => `   - ${p.topic}: ${p.parallelScriptureCount}`),
    '',
    '5. Most supporting scriptures:',
    ...e.mostSupportingScriptures.slice(0, 5).map((p) => `   - ${p.topic}: ${p.supportingScriptureCount}`),
    '',
    '6. Most continuity scriptures:',
    ...e.mostContinuityScriptures.slice(0, 5).map((p) => `   - ${p.topic}: ${p.continuityScriptureCount}`),
    '',
    `7. Ready for human review: **${e.readyForHumanReviewCount}** packs`,
    ...e.readyForHumanReview.slice(0, 10).map((t) => `   - ${t}`),
    '',
    `8. Ready for implementation preparation: **${e.readyForImplementationPreparationCount}** packs`,
    ...e.readyForImplementationPreparation.slice(0, 10).map((t) => `   - ${t}`),
    '',
    `9. Need more extraction: **${e.needsMoreExtractionCount}** packs`,
    ...e.needsMoreExtraction.slice(0, 8).map((t) => `   - ${t}`),
    '',
    '10. Top scripture-producing sources:',
    ...e.topSources.slice(0, 5).map((s) => `   - ${s.sourceName}: ${s.scriptureRefs} refs`),
    '',
    '11. Topic packs with **High** implementation confidence (informational):',
    ...(e.highImplementationConfidence?.length
      ? e.highImplementationConfidence.map((p) => `   - ${p.displayName}: +${p.newScripturesAdded} new scriptures · gain score ${p.learningGainScore}`)
      : ['   - None at High tier — see Medium confidence packs']),
    '',
    '12. Largest BibleBuddy learning gain (impact score):',
    ...e.largestLearningGain.slice(0, 10).map((p) => `   - ${p.displayName}: gain ${p.learningGainScore} (+${p.newScripturesAdded} scriptures, +${p.newChainsAdded} chains)`),
    '',
    '13. Major Bible topics still **weak**:',
    ...(e.majorTopicsWeak?.length
      ? e.majorTopicsWeak.map((t) => `   - ${displayNameFallback(t)}`)
      : ['   - None flagged among major watchlist']),
    '',
    '14. Major Bible topics still **missing**:',
    ...(e.majorTopicsMissing?.length
      ? e.majorTopicsMissing.map((t) => `   - ${displayNameFallback(t)}`)
      : ['   - None from major watchlist']),
    '',
    '15. Implement first for maximum learning value (after human review):',
    ...e.implementFirstForMaxLearning.map((p) => `   - ${p.rank}. ${p.displayName} — gain ${p.learningGainScore} · confidence ${p.implementationConfidence} · support ${p.supportScore}`),
    '',
    `**Doctrine Completeness Score (informational only):** ${e.doctrineCompletenessScore}% — ${e.doctrineCompletenessNote}`,
    '',
    '### Consolidation metrics',
    '',
    `- Duplicate chains consolidated: **${e.duplicateChainsConsolidated}**`,
    `- Review effort eliminated: **${e.reviewEffortEliminated}** redundant review units`,
  ];

  lines.push(
    '',
    '### Top 25 topic packs for BibleBuddy learning',
    '',
    ...e.top25ForLearning.map((p) => `   - ${p.rank}. ${p.displayName} — ${p.supportScore} · ${p.scriptureCount} scriptures · ${p.chainCount} chains`),
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Scripture implementation | none |',
    '| Approvals | none |',
    '| Doctrine / cards / graph / prompts | none |',
    '| Doctrine Completeness Score gates | none (informational only) |',
    '| Human review authority | final |',
  );

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3G — Topic pack consolidation starting...');
  const data = runPhase3gTopicPackConsolidation();

  writeInventory(data);
  writeConsolidation(data);
  writeDuplicates(data);
  writeMasterPacks(data);
  writeRanking(data);
  writeReadiness(data);
  writeHumanReview(data);
  writeSourceEffectiveness(data);
  writeImplementationImpact(data);
  writeMissingWatchlist(data);
  writeMain(data);

  console.log('Phase 3G — Complete');
  console.log(`Topic packs: ${data.executive.topicPackCount} (from ${data.executive.rawChainCount} chains)`);
  console.log(`Ready for human review: ${data.executive.readyForHumanReviewCount}`);
  console.log(`Ready for impl prep: ${data.executive.readyForImplementationPreparationCount}`);
  console.log(`Review effort eliminated: ${data.executive.reviewEffortEliminated}`);
  console.log('Reports written.');
}

main();
