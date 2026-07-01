#!/usr/bin/env node
/**
 * Phase 3I — Scripture recursive expansion reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3iRecursiveExpansion } = require('../services/phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  seedExpansion: path.join(ROOT, 'RecursiveSeedExpansionReport.md'),
  g2r: path.join(ROOT, 'ExpandedGenesisToRevelationChains.md'),
  parallel: path.join(ROOT, 'ExpandedParallelScriptures.md'),
  supporting: path.join(ROOT, 'ExpandedSupportingScriptures.md'),
  continuity: path.join(ROOT, 'ExpandedContinuityScriptures.md'),
  enrichment: path.join(ROOT, 'DoctrinePackEnrichmentReport.md'),
  topicExpansion: path.join(ROOT, 'TopicExpansionCandidates.md'),
  queues: path.join(ROOT, 'ExpandedImplementationPreparationQueue.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3IReport.md'),
};

function writeSeedExpansion(data) {
  const lines = [
    '# Recursive Seed Expansion Report',
    '',
    '**Phase:** 3I Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Doctrine packs expanded:** ${data.executive.packsExpanded}`,
    `**New scripture refs discovered:** ${data.executive.newScriptureRefs}`,
    '',
    'Seeds: original chains + parallel + supporting + continuity from Phase 3G packs.',
    'Search: concordance, continuity chains, G2R registry, witness expansion, support graph, parallel heuristics.',
    '',
    '| Topic | Seeds | New refs | New parallel | New supporting | New continuity |',
    '|-------|-------|----------|--------------|----------------|----------------|',
  ];

  for (const e of data.packExpansions.slice(0, 40)) {
    lines.push(`| ${e.topic} | ${e.seedCount} | ${e.expandedRefs.length} | ${e.newParallelScriptures.length} | ${e.newSupportingScriptures.length} | ${e.newContinuityScriptures.length} |`);
  }

  fs.writeFileSync(REPORTS.seedExpansion, `${lines.join('\n')}\n`);
}

function writeG2R(data) {
  const lines = [
    '# Expanded Genesis to Revelation Chains',
    '',
    '**Phase:** 3I Part B',
    `**Date:** ${data.ranAt}`,
    '',
    'Constructed from Scripture only — no website, lesson title, or Q&A metadata dependency.',
    '',
  ];

  for (const e of data.packExpansions.filter((p) => p.genesisToRevelationSpan).slice(0, 25)) {
    lines.push(`## ${e.displayName}`, '');
    lines.push(`- **Links added:** ${e.enrichment.genesisToRevelationLinksAdded}`);
    lines.push(`- **Chain:** ${e.genesisToRevelationChain.slice(0, 12).join(' → ')}${e.genesisToRevelationChain.length > 12 ? '…' : ''}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeParallel(data) {
  const lines = [
    '# Expanded Parallel Scriptures',
    '',
    '**Phase:** 3I Part C',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total new parallel scriptures:** ${data.executive.newParallelScriptures}`,
    '',
  ];

  for (const e of data.packExpansions.filter((p) => p.newParallelScriptures.length).slice(0, 30)) {
    lines.push(`## ${e.displayName}`, '');
    for (const r of e.newParallelScriptures.slice(0, 12)) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.parallel, `${lines.join('\n')}\n`);
}

function writeSupporting(data) {
  const lines = [
    '# Expanded Supporting Scriptures',
    '',
    '**Phase:** 3I Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total new supporting scriptures:** ${data.executive.newSupportingScriptures}`,
    '',
  ];

  for (const e of data.packExpansions.filter((p) => p.newSupportingScriptures.length).slice(0, 30)) {
    lines.push(`## ${e.displayName}`, '');
    for (const r of e.newSupportingScriptures.slice(0, 12)) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.supporting, `${lines.join('\n')}\n`);
}

function writeContinuity(data) {
  const lines = [
    '# Expanded Continuity Scriptures',
    '',
    '**Phase:** 3I Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Total new continuity scriptures:** ${data.executive.newContinuityScriptures}`,
    '',
  ];

  for (const e of data.packExpansions.filter((p) => p.newContinuityScriptures.length).slice(0, 30)) {
    lines.push(`## ${e.displayName}`, '');
    for (const r of e.newContinuityScriptures.slice(0, 12)) {
      lines.push(`- ${r}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.continuity, `${lines.join('\n')}\n`);
}

function writeEnrichment(data) {
  const lines = [
    '# Doctrine Pack Enrichment Report',
    '',
    '**Phase:** 3I Part F',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Scriptures before | after | Parallel + | Supporting + | Continuity + | G2R + |',
    '|-------|-------------------|-------|------------|--------------|----------------|-------|',
  ];

  for (const p of data.enrichedPacks) {
    const en = p.enrichment;
    lines.push(`| ${p.topic} | ${en.scriptureCountBefore} | ${en.scriptureCountAfter} | ${en.parallelAdded} | ${en.supportingAdded} | ${en.continuityAdded} | ${en.genesisToRevelationLinksAdded} |`);
  }

  fs.writeFileSync(REPORTS.enrichment, `${lines.join('\n')}\n`);
}

function writeTopicExpansion(data) {
  const candidates = data.topicExpansionCandidates || [];
  const lines = [
    '# Topic Expansion Candidates',
    '',
    '**Phase:** 3I Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Candidates evaluated:** ${candidates.length}`,
    `**Can become doctrine packs:** ${data.executive.newDoctrinePackCandidateCount}`,
    '',
    '| Topic | Status | Chains | Scriptures | Pack ready? |',
    '|-------|--------|--------|------------|-------------|',
  ];

  for (const t of candidates.slice(0, 40)) {
    lines.push(`| ${t.topic} | ${t.status} | ${t.matchingChainCount} | ${t.scriptureRefsFound} | ${t.canBecomeDoctrinePack ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Pack-ready candidates', '');
  for (const t of candidates.filter((c) => c.canBecomeDoctrinePack).slice(0, 20)) {
    lines.push(`- **${t.displayName}** — ${t.scriptureRefsFound} scriptures · ${t.recommendation}`);
  }

  fs.writeFileSync(REPORTS.topicExpansion, `${lines.join('\n')}\n`);
}

function writeQueues(data) {
  const q = data.queues;
  const lines = [
    '# Expanded Implementation Preparation Queue',
    '',
    '**Phase:** 3I Part H — preparation only, no implementation',
    `**Date:** ${data.ranAt}`,
    '',
    `## 95–100 (${q.queue95.length})`,
    '',
    ...q.queue95.map((c) => `- ${c.displayName} · ${c.supportScore} · ${c.implementationConfidence} · gain ${c.learningGainScore}`),
    '',
    `## 90–94 (${q.queue90.length})`,
    '',
    ...q.queue90.map((c) => `- ${c.displayName} · ${c.supportScore}`),
    '',
    `## 80–89 (${q.queue80.length})`,
    '',
    ...q.queue80.slice(0, 20).map((c) => `- ${c.displayName} · ${c.supportScore}`),
    '',
    '**Output JSON:** `docs/evidence-candidates/expanded-implementation-queues.json`',
  ];

  fs.writeFileSync(REPORTS.queues, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3I Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. New parallel scriptures discovered: **${e.newParallelScriptures}**`,
    `2. New supporting scriptures discovered: **${e.newSupportingScriptures}**`,
    `3. New continuity scriptures discovered: **${e.newContinuityScriptures}**`,
    `4. Doctrine packs that gained the most depth:`,
    ...e.packsGainedMostDepth.slice(0, 8).map((p) => `   - ${p.displayName}: +${p.scripturesAdded} scriptures (+${p.parallelAdded} parallel, +${p.supportingAdded} supporting, +${p.continuityAdded} continuity)`),
    '',
    `5. Packs exceeding implementation thresholds (score ≥90, scriptures ≥8): **${e.exceedsImplementationThresholdCount}**`,
    ...e.exceedsImplementationThreshold.slice(0, 10).map((t) => `   - ${t}`),
    '',
    `6. Missing topics with enough data for new doctrine packs: **${e.newDoctrinePackCandidateCount}**`,
    ...e.newDoctrinePackCandidates.slice(0, 10).map((t) => `   - ${t}`),
    '',
    '7. Review first:',
    ...e.reviewFirst.slice(0, 10).map((p) => `   - ${p.displayName} — score ${p.supportScore} · gain ${p.learningGainScore} · ${p.implementationConfidence}`),
    '',
    `8. Projected BibleBuddy learning gain (sum of top-pack impact scores): **${e.projectedLearningGain}**`,
    '',
    '### Additional metrics',
    '',
    `- Total new scripture refs from recursive Bible search: **${e.newScriptureRefs}**`,
    `- Genesis-to-Revelation links added: **${e.g2rLinksAdded}**`,
    `- High implementation confidence packs: ${e.highConfidencePacks.join(', ') || 'see enriched packs'}`,
    '',
    '### Implement first for maximum learning value',
    '',
    ...e.implementFirstForLearning.map((p) => `   - ${p.rank}. ${p.displayName} — gain ${p.learningGainScore} · score ${p.supportScore}`),
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| Scripture implementation | none |',
    '| Approvals | none |',
    '| Doctrine / cards / graph / prompts | none |',
    '| Internet discovery | none (Bible-internal only) |',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3I — Scripture recursive expansion starting...');
  const data = runPhase3iRecursiveExpansion();

  writeSeedExpansion(data);
  writeG2R(data);
  writeParallel(data);
  writeSupporting(data);
  writeContinuity(data);
  writeEnrichment(data);
  writeTopicExpansion(data);
  writeQueues(data);
  writeMain(data);

  console.log('Phase 3I — Complete');
  console.log(`New parallel: ${data.executive.newParallelScriptures}`);
  console.log(`New supporting: ${data.executive.newSupportingScriptures}`);
  console.log(`New continuity: ${data.executive.newContinuityScriptures}`);
  console.log(`Packs exceeding threshold: ${data.executive.exceedsImplementationThresholdCount}`);
  console.log('Reports written.');
}

main();
