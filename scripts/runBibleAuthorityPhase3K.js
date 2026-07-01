#!/usr/bin/env node
/**
 * Phase 3K — Missing doctrine pack recovery and maturation reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3kMissingPackRecovery } = require('../services/phase3kMissingPackRecovery');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  recovery: path.join(ROOT, 'MissingDoctrinePackRecoveryReport.md'),
  jesusOtNt: path.join(ROOT, 'JesusOldTestamentNewTestamentPack.md'),
  holySpirit: path.join(ROOT, 'HolySpiritDoctrinePack.md'),
  feasts: path.join(ROOT, 'FeastDayDoctrinePacks.md'),
  prophetic: path.join(ROOT, 'PropheticDoctrineRecovery.md'),
  people: path.join(ROOT, 'PeopleStudyRecovery.md'),
  covenantKingdom: path.join(ROOT, 'CovenantAndKingdomRecovery.md'),
  maturation: path.join(ROOT, 'RecoveredDoctrinePackMaturation.md'),
  humanReview: path.join(ROOT, 'RecoveredDoctrineHumanReviewPackets.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3KReport.md'),
};

function writePackDetail(pack, lines) {
  lines.push(`## ${pack.displayName}`, '');
  lines.push(`- **Topic:** ${pack.topic}`);
  lines.push(`- **Score:** ${pack.supportScore} (${pack.strengthTier}) · Prior status: ${pack.priorStatus}`);
  lines.push(`- **Scriptures:** ${pack.scriptureCount} · Parallel: ${pack.parallelScriptureCount} · Supporting: ${pack.supportingScriptureCount} · Continuity: ${pack.continuityScriptureCount}`);
  lines.push(`- **G2R links:** ${pack.g2rLinkCount} · G2R span: ${pack.genesisToRevelationSpan ? 'yes' : 'no'}`);
  lines.push(`- **Questions:** ${pack.questionCoverage} · Lessons: ${pack.lessonCoverage} · Sources: ${pack.sourceCoverage}`);
  lines.push(`- **Learning gain:** ${pack.learningGainScore} · Confidence: ${pack.implementationConfidence}`);
  if (pack.originalChain?.length) {
    lines.push(`- **Original chain:** ${pack.originalChain.slice(0, 8).join(' → ')}${pack.originalChain.length > 8 ? '…' : ''}`);
  }
  if (pack.parallelScriptures?.length) {
    lines.push(`- **Parallel scriptures:** ${pack.parallelScriptures.slice(0, 6).join(', ')}${pack.parallelScriptures.length > 6 ? '…' : ''}`);
  }
  if (pack.supportingScriptures?.length) {
    lines.push(`- **Supporting scriptures:** ${pack.supportingScriptures.slice(0, 6).join(', ')}${pack.supportingScriptures.length > 6 ? '…' : ''}`);
  }
  if (pack.continuityScriptures?.length) {
    lines.push(`- **Continuity scriptures:** ${pack.continuityScriptures.slice(0, 6).join(', ')}${pack.continuityScriptures.length > 6 ? '…' : ''}`);
  }
  if (pack.genesisToRevelationChain?.length) {
    lines.push(`- **G2R chain:** ${pack.genesisToRevelationChain.slice(0, 10).join(' → ')}${pack.genesisToRevelationChain.length > 10 ? '…' : ''}`);
  }
  if (pack.missingLinks?.length) {
    lines.push(`- **Gaps:** ${pack.missingLinks.join(', ')}`);
  }
  lines.push('');
}

function writeRecovery(data) {
  const lines = [
    '# Missing Doctrine Pack Recovery Report',
    '',
    '**Phase:** 3K Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Recovery targets processed:** ${data.executive.targetsProcessed}`,
    `**Packs recovered (missing → sufficient scriptures):** ${data.executive.missingPacksRecovered}`,
    `**Packs matured (score/depth gain):** ${data.executive.weakPacksMatured}`,
  ];

  lines.push('', '## Recovery status by topic', '');
  lines.push('| Topic | Prior status | Scriptures before | Scriptures after | Score before | Score after | Recovered | Matured |', '');
  lines.push('|-------|--------------|-------------------|------------------|--------------|-------------|-----------|---------|', '');

  for (const r of data.recoveryReport) {
    lines.push(`| ${r.topic} | ${r.priorStatus} | ${r.scriptureCountBefore} | ${r.scriptureCountAfter} | ${r.supportScoreBefore} | ${r.supportScoreAfter} | ${r.recovered ? 'yes' : 'no'} | ${r.matured ? 'yes' : 'no'} |`);
  }

  lines.push('', '## Still missing or underdeveloped', '');
  for (const t of data.executive.remainingGaps.slice(0, 30)) {
    lines.push(`- ${t}`);
  }

  fs.writeFileSync(REPORTS.recovery, `${lines.join('\n')}\n`);
}

function writeJesusOtNt(data) {
  const packs = data.groupPacks.jesusOtNt;
  const lines = [
    '# Jesus Old Testament / New Testament Pack',
    '',
    '**Phase:** 3K Part B',
    `**Date:** ${data.ranAt}`,
    '',
    'Dedicated doctrine pack: Word of God · Angel of the LORD · I AM · Rock in the Wilderness · Captain of the Host · Alpha and Omega · First and Last · Father unseen · John 1 · Hebrews 1 · Colossians 1 · Revelation links · Genesis → Revelation continuity.',
    '',
  ];

  for (const pack of packs) writePackDetail(pack, lines);
  if (!packs.length) lines.push('No pack recovered — see recovery report.', '');

  fs.writeFileSync(REPORTS.jesusOtNt, `${lines.join('\n')}\n`);
}

function writeHolySpirit(data) {
  const packs = data.groupPacks.holySpirit;
  const lines = [
    '# Holy Spirit Doctrine Pack',
    '',
    '**Phase:** 3K Part C',
    `**Date:** ${data.ranAt}`,
    '',
    'Holy Spirit · Spirit of God · Spirit of Christ · Holy Ghost · Messenger · Word of God · Power · Comforter · Breath/Spirit references.',
    '',
  ];

  for (const pack of packs) writePackDetail(pack, lines);
  if (!packs.length) lines.push('No pack recovered — see recovery report.', '');

  fs.writeFileSync(REPORTS.holySpirit, `${lines.join('\n')}\n`);
}

function writeFeasts(data) {
  const packs = data.groupPacks.feasts;
  const lines = [
    '# Feast Day Doctrine Packs',
    '',
    '**Phase:** 3K Part D',
    `**Date:** ${data.ranAt}`,
    '',
    'Passover · Unleavened Bread · Pentecost · Trumpets · Atonement · Tabernacles · Last Great Day · High Sabbaths · Leviticus 23 · Three pilgrimage feasts.',
    '',
    `**Packs in group:** ${packs.length}`,
    '',
  ];

  for (const pack of packs) writePackDetail(pack, lines);

  fs.writeFileSync(REPORTS.feasts, `${lines.join('\n')}\n`);
}

function writeProphetic(data) {
  const packs = data.groupPacks.prophetic;
  const lines = [
    '# Prophetic Doctrine Recovery',
    '',
    '**Phase:** 3K Part E',
    `**Date:** ${data.ranAt}`,
    '',
    'Abomination of Desolation · Great Tribulation · Two Witnesses · 144000 · Mark of the Beast · False Prophet · Gog and Magog · Lake of Fire · New Jerusalem · Millennial Reign · Great White Throne.',
    '',
    `**Packs recovered:** ${packs.length}`,
    '',
  ];

  for (const pack of packs) writePackDetail(pack, lines);

  fs.writeFileSync(REPORTS.prophetic, `${lines.join('\n')}\n`);
}

function writePeople(data) {
  const packs = data.groupPacks.people;
  const lines = [
    '# People Study Recovery',
    '',
    '**Phase:** 3K Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**People packs recovered:** ${packs.length}`,
    '',
    '| Person | Score | Scriptures | G2R | Questions | Lessons | Gain |',
    '|--------|-------|------------|-----|-----------|---------|------|',
  ];

  for (const p of packs) {
    lines.push(`| ${p.displayName} | ${p.supportScore} | ${p.scriptureCount} | ${p.g2rLinkCount} | ${p.questionCoverage} | ${p.lessonCoverage} | ${p.learningGainScore} |`);
  }

  lines.push('', '## Detail', '');
  for (const pack of packs.filter((p) => p.supportScore >= 60).slice(0, 10)) {
    writePackDetail(pack, lines);
  }

  fs.writeFileSync(REPORTS.people, `${lines.join('\n')}\n`);
}

function writeCovenantKingdom(data) {
  const packs = data.groupPacks.covenantKingdom;
  const lines = [
    '# Covenant and Kingdom Recovery',
    '',
    '**Phase:** 3K Part G',
    `**Date:** ${data.ranAt}`,
    '',
    'Abrahamic Covenant · Davidic Covenant · New Covenant · Kingdom of God · Kingdom on Earth · 1000 Year Reign · Father\'s Kingdom.',
    '',
    `**Packs recovered:** ${packs.length}`,
    '',
  ];

  for (const pack of packs) writePackDetail(pack, lines);

  fs.writeFileSync(REPORTS.covenantKingdom, `${lines.join('\n')}\n`);
}

function writeMaturation(data) {
  const lines = [
    '# Recovered Doctrine Pack Maturation',
    '',
    '**Phase:** 3K Part H',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Score | Scriptures | Parallel | Supporting | Continuity | G2R | Questions | Lessons | Sources | Impact |',
    '|-------|-------|------------|----------|------------|------------|-----|-----------|---------|---------|--------|',
  ];

  for (const p of data.recoveredPacks) {
    lines.push(`| ${p.topic} | ${p.supportScore} | ${p.scriptureCount} | ${p.parallelScriptureCount} | ${p.supportingScriptureCount} | ${p.continuityScriptureCount} | ${p.g2rLinkCount} | ${p.questionCoverage} | ${p.lessonCoverage} | ${p.sourceCoverage} | ${p.implementationImpact} |`);
  }

  fs.writeFileSync(REPORTS.maturation, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const lines = [
    '# Recovered Doctrine Human Review Packets',
    '',
    '**Phase:** 3K Part I — review packets only, no approvals',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${data.humanReviewPackets.length}`,
    '',
  ];

  for (const pkt of data.humanReviewPackets
    .filter((p) => p.supportScore >= 60 || p.recovered || p.implementationReady)
    .slice(0, 50)) {
    lines.push(`## ${pkt.displayName}`, '');
    lines.push(`- **Score:** ${pkt.supportScore} (${pkt.strengthTier}) · Prior: ${pkt.priorStatus}`);
    lines.push(`- **Recovered:** ${pkt.recovered ? 'yes' : 'no'} · **Matured:** ${pkt.matured ? 'yes' : 'no'}`);
    lines.push(`- **Scriptures:** ${pkt.scriptureCount} · Parallel: ${pkt.parallelScriptureCount} · Supporting: ${pkt.supportingScriptureCount} · Continuity: ${pkt.continuityScriptureCount}`);
    lines.push(`- **G2R links:** ${pkt.g2rLinkCount} · Questions: ${pkt.questionCoverage} · Lessons: ${pkt.lessonCoverage} · Sources: ${pkt.sourceCoverage}`);
    lines.push(`- **Impact:** ${pkt.implementationImpact} · Confidence: ${pkt.implementationConfidence}`);
    lines.push(`- **New scriptures (expansion):** ${pkt.newScripturesAdded}`);
    for (const note of pkt.reviewNotes || []) lines.push(`- ${note}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const t = e.expansionTotals;
  const lines = [
    '# Bible Authority Phase 3K Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Missing packs recovered: **${e.missingPacksRecovered}**`,
    `2. Weak packs matured: **${e.weakPacksMatured}**`,
    '3. Recovered packs that gained the most depth:',
    ...e.packsGainedMostDepth.slice(0, 8).map((p) => `   - ${p.displayName}: +${p.scripturesAdded} scriptures · score ${p.supportScore}`),
    '',
    '4. Recovered packs now exceeding 95:',
    ...e.exceeds95.slice(0, 10).map((p) => `   - ${p.displayName}: ${p.supportScore}`),
    e.exceeds95.length === 0 ? '   - None in this pass' : '',
    '',
    '5. Recovered packs exceeding 90:',
    ...e.exceeds90.slice(0, 12).map((p) => `   - ${p.displayName}: ${p.supportScore}`),
  ];

  lines.push(
    '',
    `6. Implementation-ready packs: **${e.implementationReadyCount}**`,
    ...e.implementationReady.slice(0, 10).map((t) => `   - ${t}`),
    '',
    '7. Review first:',
    ...e.reviewFirst.slice(0, 10).map((p) => `   - ${p.displayName} — score ${p.supportScore} · gain ${p.learningGainScore} · ${p.implementationConfidence}`),
    '',
    '8. Largest projected learning gain:',
    ...e.largestLearningGain.slice(0, 8).map((p) => `   - ${p.displayName}: gain ${p.learningGainScore}`),
    '',
    '9. Missing gaps still remaining:',
    ...(e.remainingGaps.length
      ? e.remainingGaps.slice(0, 10).map((t) => `   - ${t} (no scripture depth)`)
      : ['   - No zero-scripture catalog topics remain']),
    ...(e.remainingWeakGapCount
      ? [`   - **${e.remainingWeakGapCount} packs still weak** (score <70 or >3 missing-link flags) — e.g. ${e.remainingWeakGaps.slice(0, 5).map((w) => w.displayName).join(', ')}`]
      : []),
    '',
    '10. Implement first after human review:',
    ...e.implementFirstAfterReview.map((p) => `   - ${p.rank}. ${p.displayName} — score ${p.supportScore} · gain ${p.learningGainScore}`),
    '',
    '### Expansion totals (this pass)',
    '',
    `- Targets processed: ${t.targetsProcessed}`,
    `- New scriptures: ${t.newScriptures}`,
    `- New parallel: ${t.newParallel}`,
    `- New supporting: ${t.newSupporting}`,
    `- New continuity: ${t.newContinuity}`,
    `- Projected learning gain: ${e.projectedLearningGain}`,
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
  console.log('Phase 3K — Missing doctrine pack recovery starting...');
  const data = runPhase3kMissingPackRecovery({ maxDepth: 3 });

  writeRecovery(data);
  writeJesusOtNt(data);
  writeHolySpirit(data);
  writeFeasts(data);
  writeProphetic(data);
  writePeople(data);
  writeCovenantKingdom(data);
  writeMaturation(data);
  writeHumanReview(data);
  writeMain(data);

  console.log('Phase 3K — Complete');
  console.log(`Targets processed: ${data.executive.targetsProcessed}`);
  console.log(`Missing recovered: ${data.executive.missingPacksRecovered}`);
  console.log(`Weak matured: ${data.executive.weakPacksMatured}`);
  console.log(`Implementation-ready: ${data.executive.implementationReadyCount}`);
  console.log(`Projected learning gain: ${data.executive.projectedLearningGain}`);
  console.log('Reports written.');
}

main();
