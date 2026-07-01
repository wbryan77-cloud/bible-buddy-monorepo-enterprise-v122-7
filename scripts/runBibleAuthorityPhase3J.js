#!/usr/bin/env node
/**
 * Phase 3J Rev 2 — Full doctrine pack maturation reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3jDoctrinePackMaturation } = require('../services/phase3jDoctrinePackMaturation');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  fullExpansion: path.join(ROOT, 'FullDoctrinePackExpansion.md'),
  bibleWide: path.join(ROOT, 'BibleWideDoctrinePackDiscovery.md'),
  deepExpansion: path.join(ROOT, 'DeepScriptureExpansion.md'),
  g2rMaturity: path.join(ROOT, 'FullGenesisToRevelationMaturityReport.md'),
  missingLinks: path.join(ROOT, 'DoctrinePackMissingLinksReport.md'),
  humanReview: path.join(ROOT, 'DoctrinePackHumanReviewPackets.md'),
  implementation: path.join(ROOT, 'BibleAuthorityImplementationPreparation.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3JReport.md'),
};

function writeFullExpansion(data) {
  const lines = [
    '# Full Doctrine Pack Expansion',
    '',
    '**Phase:** 3J Rev 2 Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Doctrine packs in corpus:** ${data.executive.doctrinePackCount}`,
    `**Packs expanded (depth 3):** ${data.executive.packsExpanded}`,
    '',
    '| Topic | Before | After | Parallel + | Supporting + | Continuity + | G2R + | Score |',
    '|-------|--------|-------|------------|--------------|----------------|-------|-------|',
  ];

  for (const p of data.maturedPacks.slice(0, 50)) {
    const e = p.enrichment;
    lines.push(`| ${p.topic} | ${e.scriptureCountBefore} | ${e.scriptureCountAfter} | ${e.parallelAdded} | ${e.supportingAdded} | ${e.continuityAdded} | ${e.genesisToRevelationLinksAdded} | ${p.supportScore} |`);
  }

  fs.writeFileSync(REPORTS.fullExpansion, `${lines.join('\n')}\n`);
}

function writeBibleWide(data) {
  const b = data.bibleWideDiscovery;
  const lines = [
    '# Bible-Wide Doctrine Pack Discovery',
    '',
    '**Phase:** 3J Rev 2 Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Catalog topics scanned:** ${b.catalogTopics.length}`,
    `**Found (adequate):** ${b.foundTopics.length}`,
    `**Weak:** ${b.weakTopics.length}`,
    `**Missing / emerging:** ${b.missingTopics.length}`,
    `**Auto-discovered topics:** ${b.autoDiscoveredTopics.length}`,
    '',
    '## Found topics',
    '',
    ...b.foundTopics.slice(0, 30).map((t) => `- **${t.displayName}** — ${t.scriptureRefsFound} scriptures · ${t.matchingChainCount} chains`),
    '',
    '## Weak topics',
    '',
    ...b.weakTopics.map((t) => `- **${t.displayName}** — ${t.scriptureRefsFound} scriptures`),
    '',
    '## Missing / emerging topics',
    '',
    ...b.missingTopics.map((t) => `- **${t.displayName}** (${t.status}) — ${t.scriptureRefsFound} scriptures in corpus`),
    '',
    '## Auto-discovered additional topics',
    '',
    ...b.autoDiscoveredTopics.slice(0, 25).map((t) => `- ${t.displayName} — ${t.sourceText?.slice(0, 60)}…`),
  ];

  fs.writeFileSync(REPORTS.bibleWide, `${lines.join('\n')}\n`);
}

function writeDeepExpansion(data) {
  const e = data.executive.expansionTotals;
  const lines = [
    '# Deep Scripture Expansion',
    '',
    '**Phase:** 3J Rev 2 Part C',
    `**Date:** ${data.ranAt}`,
    '',
    'Scripture-only recursive search (depth 3): same doctrine, command, warning, covenant, prophecy, kingdom, messianic, resurrection, feast, and holiness themes.',
    '',
    `**New scriptures:** ${e.newScriptures}`,
    `**New parallel:** ${e.newParallel}`,
    `**New supporting:** ${e.newSupporting}`,
    `**New continuity:** ${e.newContinuity}`,
    '',
    '## Top depth gains',
    '',
  ];

  for (const p of data.executive.packsGainedMostDepth.slice(0, 20)) {
    lines.push(`- **${p.displayName}** — +${p.scripturesAdded} scriptures · score ${p.supportScore}`);
  }

  fs.writeFileSync(REPORTS.deepExpansion, `${lines.join('\n')}\n`);
}

function writeG2RMaturity(data) {
  const lines = [
    '# Full Genesis to Revelation Maturity Report',
    '',
    '**Phase:** 3J Rev 2 Part D',
    `**Date:** ${data.ranAt}`,
    '',
    'Era coverage: Genesis · Torah · Former Prophets · Latter Prophets · Psalms/Writings · Gospels · Acts · Epistles · Revelation',
    '',
  ];

  for (const p of data.maturedPacks.filter((x) => x.genesisToRevelationSpan).slice(0, 25)) {
    const eras = p.g2rEras || {};
    lines.push(`## ${p.displayName}`, '');
    lines.push(`- Genesis: ${eras.genesis?.length || 0} · Torah: ${eras.torah?.length || 0} · Former Prophets: ${eras.formerProphets?.length || 0}`);
    lines.push(`- Latter Prophets: ${eras.latterProphets?.length || 0} · Writings: ${eras.psalmsWritings?.length || 0} · Gospels: ${eras.gospels?.length || 0}`);
    lines.push(`- Acts: ${eras.acts?.length || 0} · Epistles: ${eras.epistles?.length || 0} · Revelation: ${eras.revelation?.length || 0}`);
    lines.push(`- **G2R chain:** ${(p.genesisToRevelationChain || []).slice(0, 10).join(' → ')}…`, '');
  }

  fs.writeFileSync(REPORTS.g2rMaturity, `${lines.join('\n')}\n`);
}

function writeMissingLinks(data) {
  const lines = [
    '# Doctrine Pack Missing Links Report',
    '',
    '**Phase:** 3J Rev 2 Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Score | Scriptures | Questions | Lessons | Sources | Missing links |',
    '|-------|-------|------------|-----------|---------|---------|---------------|',
  ];

  for (const p of data.maturedPacks.filter((x) => x.missingLinks?.length).slice(0, 50)) {
    lines.push(`| ${p.topic} | ${p.supportScore} | ${p.scriptureCount} | ${p.questionCoverage} | ${p.lessonCoverage} | ${p.sourceCoverage} | ${p.missingLinks.join(', ')} |`);
  }

  fs.writeFileSync(REPORTS.missingLinks, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const lines = [
    '# Doctrine Pack Human Review Packets',
    '',
    '**Phase:** 3J Rev 2 Part F — review packets only, no approvals',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${data.humanReviewPackets.length}`,
    '',
  ];

  for (const pkt of data.humanReviewPackets
    .filter((p) => p.supportScore >= 75 || p.implementationReady)
    .slice(0, 40)) {
    lines.push(`## ${pkt.displayName}`, '');
    lines.push(`- **Score:** ${pkt.supportScore} (${pkt.strengthTier})`);
    lines.push(`- **Scriptures:** ${pkt.scriptureCount} · Parallel: ${pkt.parallelScriptureCount} · Supporting: ${pkt.supportingScriptureCount} · Continuity: ${pkt.continuityScriptureCount}`);
    lines.push(`- **G2R links:** ${pkt.g2rLinkCount} · Questions: ${pkt.questionCoverage} · Lessons: ${pkt.lessonCoverage} · Sources: ${pkt.sourceCoverage}`);
    lines.push(`- **Impact score:** ${pkt.implementationImpact} · Confidence: ${pkt.implementationConfidence}`);
    lines.push(`- **New scriptures (expansion):** ${pkt.newScripturesAdded}`);
    if (pkt.missingLinks?.length) {
      lines.push(`- **Gaps:** ${pkt.missingLinks.join(', ')}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeImplementation(data) {
  const q = data.queues;
  const lines = [
    '# Bible Authority Implementation Preparation',
    '',
    '**Phase:** 3J Rev 2 Part G — preparation only',
    `**Date:** ${data.ranAt}`,
    '',
    `**Implementation-ready packs:** ${data.executive.implementationReadyCount}`,
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
    `## 70–79 (${q.queue70.length})`,
    '',
    `## Below 70 (${q.queueBelow70.length})`,
    '',
    '**Output JSON:** `docs/evidence-candidates/bible-authority-implementation-queues.json`',
  ];

  fs.writeFileSync(REPORTS.implementation, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3J Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Doctrine packs in corpus: **${e.doctrinePackCount}**`,
    `2. Doctrine packs expanded (depth 3): **${e.packsExpanded}**`,
    '3. Packs that gained the most depth:',
    ...e.packsGainedMostDepth.slice(0, 8).map((p) => `   - ${p.displayName}: +${p.scripturesAdded} scriptures`),
    '',
    '4. Strongest packs:',
    ...e.strongestPacks.slice(0, 8).map((p) => `   - ${p.displayName}: ${p.supportScore}`),
    '',
    '5. Weak packs (score <70 or many missing links):',
    ...e.weakPacks.slice(0, 8).map((p) => `   - ${p.topic}: ${p.supportScore} (${(p.missingLinks || []).slice(0, 2).join(', ')})`),
    '',
    '6. Missing doctrine pack topics:',
    ...e.missingPackTopics.slice(0, 12).map((t) => `   - ${t}`),
    '',
    `7. Implementation-ready packs: **${e.implementationReadyCount}**`,
    ...e.implementationReady.slice(0, 10).map((t) => `   - ${t}`),
    '',
    '8. Review first:',
    ...e.reviewFirst.slice(0, 10).map((p) => `   - ${p.displayName} — score ${p.supportScore} · gain ${p.learningGainScore} · ${p.implementationConfidence}`),
    '',
    '9. Greatest projected learning gain packs:',
    ...data.maturedPacks.slice(0, 8).map((p) => `   - ${p.displayName}: gain ${p.learningGainScore}`),
    '',
    `10. Implement first after human review:`,
    ...e.implementFirstAfterReview.map((p) => `   - ${p.rank}. ${p.displayName} — score ${p.supportScore} · gain ${p.learningGainScore}`),
    '',
    '### Bible-wide discovery',
    '',
    `- Catalog topics: ${e.bibleWideDiscovery.catalogTopics}`,
    `- Found: ${e.bibleWideDiscovery.found}`,
    `- Weak: ${e.bibleWideDiscovery.weak}`,
    `- Missing/emerging: ${e.bibleWideDiscovery.missing}`,
    `- Auto-discovered: ${e.bibleWideDiscovery.autoDiscovered}`,
    '',
    '### Expansion totals (this pass)',
    '',
    `- New scriptures: ${e.expansionTotals.newScriptures}`,
    `- New parallel: ${e.expansionTotals.newParallel}`,
    `- New supporting: ${e.expansionTotals.newSupporting}`,
    `- New continuity: ${e.expansionTotals.newContinuity}`,
  ];

  lines.push(
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
  );

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3J Rev 2 — Doctrine pack maturation starting...');
  const data = runPhase3jDoctrinePackMaturation({ maxDepth: 3 });

  writeFullExpansion(data);
  writeBibleWide(data);
  writeDeepExpansion(data);
  writeG2RMaturity(data);
  writeMissingLinks(data);
  writeHumanReview(data);
  writeImplementation(data);
  writeMain(data);

  console.log('Phase 3J Rev 2 — Complete');
  console.log(`Doctrine packs: ${data.executive.doctrinePackCount}`);
  console.log(`Implementation-ready: ${data.executive.implementationReadyCount}`);
  console.log(`Projected learning gain: ${data.executive.projectedLearningGain}`);
  console.log('Reports written.');
}

main();
