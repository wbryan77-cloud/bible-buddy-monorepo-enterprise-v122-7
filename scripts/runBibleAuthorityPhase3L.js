#!/usr/bin/env node
/**
 * Phase 3L — Recovered pack strengthening and precept chain organization reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3lRecoveredPackStrengthening } = require('../services/phase3lRecoveredPackStrengthening');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  inputAudit: path.join(ROOT, 'RecoveredPackInputAudit.md'),
  preceptChains: path.join(ROOT, 'RecoveredPreceptChainOrganization.md'),
  g2rStructure: path.join(ROOT, 'RecoveredGenesisToRevelationStructure.md'),
  missingLinkFill: path.join(ROOT, 'RecoveredPackMissingLinkFill.md'),
  highPriority: path.join(ROOT, 'HighPriorityRecoveredPackReport.md'),
  jesusDeep: path.join(ROOT, 'JesusOTNTDeepPack.md'),
  holySpiritDeep: path.join(ROOT, 'HolySpiritDeepPack.md'),
  feastsDeep: path.join(ROOT, 'FeastsHighSabbathsDeepPack.md'),
  reviewReadiness: path.join(ROOT, 'RecoveredPackReviewReadiness.md'),
  humanReview: path.join(ROOT, 'RecoveredPackHumanReviewPacketsV2.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3LReport.md'),
};

function writeInputAudit(data) {
  const a = data.inputAudit;
  const lines = [
    '# Recovered Pack Input Audit',
    '',
    '**Phase:** 3L Part A',
    `**Date:** ${data.ranAt}`,
    '',
    '| Source | Count |',
    '|--------|-------|',
    `| Recovered doctrine packs (3K) | ${a.recoveredPackCount} |`,
    `| Recovered pack run date | ${a.recoveredAt || 'n/a'} |`,
    `| Matured doctrine packs (3J) | ${a.maturedPackCount} |`,
    `| Enriched topic packs (3I) | ${a.enrichedPackCount} |`,
    `| Master topic packs (3G) | ${a.masterPackCount} |`,
    `| Evidence cards | ${a.evidenceCardCount} |`,
    `| Support graph edges | ${a.supportEdgeCount} |`,
    `| Scripture chains | ${a.scriptureChainCount} |`,
    `| Question inventory | ${a.questionCount} |`,
    `| Phase 3K targets processed | ${a.phase3kTargets} |`,
    '',
    '**Input files:**',
    '- `docs/evidence-candidates/recovered-doctrine-packs.json`',
    '- `docs/regression-trace/phase3k-missing-pack-recovery-results.json`',
    '- `docs/evidence-candidates/matured-doctrine-packs.json`',
    '- `docs/evidence-candidates/enriched-topic-packs.json`',
    '- `docs/evidence-candidates/master-topic-packs.json`',
    '- Evidence cards · approved support graph · IOG/ICOJ chain extractions',
  ];

  fs.writeFileSync(REPORTS.inputAudit, `${lines.join('\n')}\n`);
}

function writePreceptChains(data) {
  const lines = [
    '# Recovered Precept Chain Organization',
    '',
    '**Phase:** 3L Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packs reorganized:** ${data.executive.packsReorganized}`,
    `**Flat lists converted:** ${data.executive.flatListsConverted}`,
    '',
    'Each pack now has separated: Original Scripture Chain · Genesis-to-Revelation Chain · Parallel · Supporting · Continuity.',
    '',
  ];

  for (const p of data.strengthenedPacks.slice(0, 40)) {
    lines.push(`## ${p.displayName}`, '');
    lines.push(`- **Original chain (${p.originalScriptureChain.length}):** ${p.originalScriptureChain.slice(0, 6).join(' → ')}${p.originalScriptureChain.length > 6 ? '…' : ''}`);
    lines.push(`- **G2R chain (${p.genesisToRevelationChain.length}):** ${p.genesisToRevelationChain.slice(0, 6).join(' → ')}${p.genesisToRevelationChain.length > 6 ? '…' : ''}`);
    lines.push(`- **Parallel (${p.parallelScriptures.length}):** ${p.parallelScriptures.slice(0, 4).join(', ')}${p.parallelScriptures.length > 4 ? '…' : ''}`);
    lines.push(`- **Supporting (${p.supportingScriptures.length}):** ${p.supportingScriptures.slice(0, 4).join(', ')}${p.supportingScriptures.length > 4 ? '…' : ''}`);
    lines.push(`- **Continuity (${p.continuityScriptures.length}):** ${p.continuityScriptures.slice(0, 4).join(', ')}${p.continuityScriptures.length > 4 ? '…' : ''}`);
    lines.push(`- Flat converted: ${p.convertedFromFlat ? 'yes' : 'no'}`, '');
  }

  fs.writeFileSync(REPORTS.preceptChains, `${lines.join('\n')}\n`);
}

function writeG2rStructure(data) {
  const lines = [
    '# Recovered Genesis to Revelation Structure',
    '',
    '**Phase:** 3L Part C',
    `**Date:** ${data.ranAt}`,
    '',
    'Era coverage: Genesis · Torah · Former Prophets · Latter Prophets · Psalms/Writings · Gospels · Acts · Epistles · Revelation',
    '',
    `**Packs with complete G2R era coverage:** ${data.executive.g2rStructureComplete}`,
    '',
  ];

  for (const p of data.strengthenedPacks.filter((x) => x.genesisToRevelationSpan).slice(0, 30)) {
    const e = p.eraStructure || {};
    lines.push(`## ${p.displayName}`, '');
    lines.push(`- Genesis: ${e.genesis?.length || 0} · Torah: ${e.torah?.length || 0} · Former Prophets: ${e.formerProphets?.length || 0}`);
    lines.push(`- Latter Prophets: ${e.latterProphets?.length || 0} · Writings: ${e.psalmsWritings?.length || 0} · Gospels: ${e.gospels?.length || 0}`);
    lines.push(`- Acts: ${e.acts?.length || 0} · Epistles: ${e.epistles?.length || 0} · Revelation: ${e.revelation?.length || 0}`);
    if (p.missingEras?.length) lines.push(`- **Missing eras:** ${p.missingEras.join(', ')}`);
    else lines.push('- **Missing eras:** none');
    lines.push('');
  }

  fs.writeFileSync(REPORTS.g2rStructure, `${lines.join('\n')}\n`);
}

function writeMissingLinkFill(data) {
  const lines = [
    '# Recovered Pack Missing Link Fill',
    '',
    '**Phase:** 3L Part D',
    `**Date:** ${data.ranAt}`,
    '',
    'Candidate scriptures added to parallel · supporting · continuity from registry, concordance, and continuity chains.',
    '',
    '| Topic | Fill count | Parallel + | Supporting + | Continuity + | Missing eras remaining |',
    '|-------|------------|------------|--------------|--------------|------------------------|',
  ];

  for (const p of data.strengthenedPacks.filter((x) => x.missingLinkFillCount > 0).slice(0, 40)) {
    const f = p.missingLinkFill || {};
    lines.push(`| ${p.topic} | ${p.missingLinkFillCount} | ${(f.parallel || []).length} | ${(f.supporting || []).length} | ${(f.continuity || []).length} | ${(p.missingEras || []).join(', ') || 'none'} |`);
  }

  fs.writeFileSync(REPORTS.missingLinkFill, `${lines.join('\n')}\n`);
}

function writeHighPriority(data) {
  const lines = [
    '# High Priority Recovered Pack Report',
    '',
    '**Phase:** 3L Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**High-priority packs:** ${data.highPriorityReports.length}`,
    '',
    '| Pack | Review readiness | Support score | Original | G2R | Parallel | Supporting | Continuity |',
    '|------|------------------|---------------|----------|-----|----------|------------|------------|',
  ];

  for (const p of data.highPriorityReports) {
    lines.push(`| ${p.displayName} | ${p.reviewReadiness} | ${p.supportScore} | ${p.originalScriptureChain.length} | ${p.genesisToRevelationChain.length} | ${p.parallelScriptures.length} | ${p.supportingScriptures.length} | ${p.continuityScriptures.length} |`);
  }

  lines.push('', '## Detail', '');
  for (const p of data.highPriorityReports.slice(0, 15)) {
    lines.push(`### ${p.displayName}`, '');
    lines.push(`- Review readiness: ${p.reviewReadiness} · Status: ${p.implementationPreparationStatus}`);
    lines.push(`- Original: ${p.originalScriptureChain.slice(0, 5).join(' → ')}…`);
    lines.push(`- G2R: ${p.genesisToRevelationChain.slice(0, 5).join(' → ')}…`);
    if (p.missingLinksStillRemaining?.length) {
      lines.push(`- Gaps: ${p.missingLinksStillRemaining.join(', ')}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.highPriority, `${lines.join('\n')}\n`);
}

function writeJesusDeep(data) {
  const j = data.jesusDeep;
  const lines = [
    '# Jesus OT/NT Deep Pack',
    '',
    '**Phase:** 3L Part F',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  if (!j) {
    lines.push('Jesus OT/NT pack not found in recovered corpus.', '');
  } else {
    lines.push(
      `**Support score:** ${j.supportScore} (prior ${j.priorSupportScore}) · **Review readiness:** ${j.reviewReadiness}`,
      `**Total scriptures:** ${j.totalScriptures}`,
      '',
      '## Original Scripture Chain',
      '',
      j.originalScriptureChain.join(' → '),
      '',
      '## Genesis-to-Revelation Chain',
      '',
      j.genesisToRevelationChain.join(' → '),
      '',
      '## Subchains',
      '',
    );
    for (const s of j.subchains) {
      lines.push(`### ${s.label} (${s.scriptureCount})`, '');
      if (s.scriptures.length) lines.push(s.scriptures.join(' → '), '');
      else lines.push('No scriptures assigned in this subchain yet.', '');
    }
  }

  fs.writeFileSync(REPORTS.jesusDeep, `${lines.join('\n')}\n`);
}

function writeHolySpiritDeep(data) {
  const h = data.holySpiritDeep;
  const lines = [
    '# Holy Spirit Deep Pack',
    '',
    '**Phase:** 3L Part G',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  if (!h) {
    lines.push('Holy Spirit pack not found in recovered corpus.', '');
  } else {
    lines.push(
      `**Support score:** ${h.supportScore} (prior ${h.priorSupportScore}) · **Review readiness:** ${h.reviewReadiness}`,
      `**Total scriptures:** ${h.totalScriptures}`,
      '',
      '## Original Scripture Chain',
      '',
      h.originalScriptureChain.join(' → '),
      '',
      '## Genesis-to-Revelation Chain',
      '',
      h.genesisToRevelationChain.join(' → '),
      '',
      '## Subchains',
      '',
    );
    for (const s of h.subchains) {
      lines.push(`### ${s.label} (${s.scriptureCount})`, '');
      if (s.scriptures.length) lines.push(s.scriptures.join(' → '), '');
      else lines.push('No scriptures assigned in this subchain yet.', '');
    }
  }

  fs.writeFileSync(REPORTS.holySpiritDeep, `${lines.join('\n')}\n`);
}

function writeFeastsDeep(data) {
  const f = data.feastsDeep;
  const lines = [
    '# Feasts / High Sabbaths Deep Pack',
    '',
    '**Phase:** 3L Part H',
    `**Date:** ${data.ranAt}`,
    '',
    `**Feast packs organized:** ${f.packs.length}`,
    '',
    '## Feast pack summaries',
    '',
    '| Feast | Review readiness | Support score | Original chain |',
    '|-------|------------------|---------------|----------------|',
  ];

  for (const p of f.feastPackSummaries) {
    lines.push(`| ${p.displayName} | ${p.reviewReadiness} | ${p.supportScore} | ${p.originalScriptureChain.length} |`);
  }

  lines.push('', '## Cross-feast subchains', '');
  for (const s of f.subchains) {
    lines.push(`### ${s.label} (${s.scriptureCount})`, '');
    if (s.scriptures.length) lines.push(s.scriptures.join(' → '), '');
    else lines.push('Pending scripture assignment.', '');
  }

  fs.writeFileSync(REPORTS.feastsDeep, `${lines.join('\n')}\n`);
}

function writeReviewReadiness(data) {
  const lines = [
    '# Recovered Pack Review Readiness',
    '',
    '**Phase:** 3L Part I — informational scores only; do not block human review',
    `**Date:** ${data.ranAt}`,
    '',
    `**Review-ready packs:** ${data.executive.reviewReadyCount}`,
    '',
    '| Topic | Support | Scripture depth | Chain org | G2R complete | Review readiness | Status |',
    '|-------|---------|-----------------|-----------|--------------|------------------|--------|',
  ];

  for (const p of data.strengthenedPacks) {
    lines.push(`| ${p.topic} | ${p.supportScore} | ${p.scriptureDepth} | ${p.chainOrganizationScore} | ${p.g2rCompleteness}% | ${p.reviewReadiness} | ${p.implementationPreparationStatus} |`);
  }

  fs.writeFileSync(REPORTS.reviewReadiness, `${lines.join('\n')}\n`);
}

function writeHumanReview(data) {
  const lines = [
    '# Recovered Pack Human Review Packets V2',
    '',
    '**Phase:** 3L Part J — review packets only, no approvals',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packets:** ${data.humanReviewPackets.length}`,
    '',
  ];

  for (const pkt of data.humanReviewPackets
    .filter((p) => p.reviewReadiness >= 50 || p.implementationPreparationStatus !== 'weak')
    .slice(0, 50)) {
    lines.push(`## ${pkt.topic} (order #${pkt.recommendedReviewOrder})`, '');
    lines.push(`- **Lesson:** ${pkt.lessonTitle || 'n/a'}`);
    lines.push(`- **Support score:** ${pkt.supportScore} · **Review readiness:** ${pkt.reviewReadiness}`);
    lines.push(`- **Status:** ${pkt.implementationPreparationStatus}`);
    lines.push(`- **Original chain:** ${pkt.originalScriptureChain.slice(0, 8).join(' → ')}${pkt.originalScriptureChain.length > 8 ? '…' : ''}`);
    lines.push(`- **G2R chain:** ${pkt.genesisToRevelationChain.slice(0, 8).join(' → ')}${pkt.genesisToRevelationChain.length > 8 ? '…' : ''}`);
    lines.push(`- **Parallel:** ${pkt.parallelScriptures.slice(0, 5).join(', ')}${pkt.parallelScriptures.length > 5 ? '…' : ''}`);
    lines.push(`- **Supporting:** ${pkt.supportingScriptures.slice(0, 5).join(', ')}${pkt.supportingScriptures.length > 5 ? '…' : ''}`);
    lines.push(`- **Continuity:** ${pkt.continuityScriptures.slice(0, 5).join(', ')}${pkt.continuityScriptures.length > 5 ? '…' : ''}`);
    if (pkt.missingLinksStillRemaining?.length) {
      lines.push(`- **Gaps remaining:** ${pkt.missingLinksStillRemaining.join(', ')}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.humanReview, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3L Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Recovered packs reorganized: **${e.packsReorganized}**`,
    `2. Flat scripture lists converted to structured chains: **${e.flatListsConverted}**`,
    '3. Packs that gained the most missing-link support:',
    ...e.topMissingLinkFill.slice(0, 8).map((p) => `   - ${p.displayName}: +${p.fillCount} candidates · readiness ${p.reviewReadiness}`),
    '',
    `4. Packs with complete Genesis-to-Revelation era structure: **${e.g2rStructureComplete}**`,
    '5. Strongest packs for human review:',
    ...e.strongestForReview.slice(0, 8).map((p) => `   - ${p.displayName}: readiness ${p.reviewReadiness} · score ${p.supportScore}`),
    '',
    '6. Weak packs remaining:',
    ...e.weakPacks.slice(0, 8).map((p) => `   - ${p.displayName}: readiness ${p.reviewReadiness} (${(p.reasons || []).slice(0, 2).join(', ')})`),
    '',
    '7. Review first:',
    ...e.reviewFirst.slice(0, 10).map((p) => `   - ${p.displayName} — readiness ${p.reviewReadiness} · score ${p.supportScore}`),
    '',
    '8. Prepare for implementation after human review:',
    ...e.implementAfterReview.map((p) => `   - ${p.rank}. ${p.displayName} — readiness ${p.reviewReadiness} · score ${p.supportScore}`),
    e.implementAfterReview.length === 0 ? '   - None at review_ready threshold yet' : '',
    '',
    '9. Jesus OT/NT improvement:',
    e.jesusImprovement
      ? `   - Score ${e.jesusImprovement.priorSupportScore} → ${e.jesusImprovement.newSupportScore} (+${e.jesusImprovement.scoreDelta}) · readiness ${e.jesusImprovement.reviewReadiness} · original chain ${e.jesusImprovement.originalChainLength} · G2R ${e.jesusImprovement.g2rLength} · subchains ${e.jesusImprovement.subchainCount}`
      : '   - Not found',
    '',
    '10. Holy Spirit improvement:',
    e.holySpiritImprovement
      ? `   - Score ${e.holySpiritImprovement.priorSupportScore} → ${e.holySpiritImprovement.newSupportScore} (+${e.holySpiritImprovement.scoreDelta}) · readiness ${e.holySpiritImprovement.reviewReadiness} · subchains ${e.holySpiritImprovement.subchainCount}`
      : '   - Not found',
    '',
    '11. Feasts / High Sabbaths improvement:',
    `   - ${e.feastsImprovement.packCount} feast packs · avg score delta +${e.feastsImprovement.avgScoreDelta} · avg readiness ${e.feastsImprovement.avgReviewReadiness} · subchains populated ${e.feastsImprovement.subchainsPopulated}`,
    '',
    `**Review-ready count:** ${e.reviewReadyCount} · **Weak remaining:** ${e.weakRemainingCount}`,
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
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3L — Recovered pack strengthening starting...');
  const data = runPhase3lRecoveredPackStrengthening();

  writeInputAudit(data);
  writePreceptChains(data);
  writeG2rStructure(data);
  writeMissingLinkFill(data);
  writeHighPriority(data);
  writeJesusDeep(data);
  writeHolySpiritDeep(data);
  writeFeastsDeep(data);
  writeReviewReadiness(data);
  writeHumanReview(data);
  writeMain(data);

  console.log('Phase 3L — Complete');
  console.log(`Packs reorganized: ${data.executive.packsReorganized}`);
  console.log(`Flat lists converted: ${data.executive.flatListsConverted}`);
  console.log(`Review-ready: ${data.executive.reviewReadyCount}`);
  console.log(`G2R complete: ${data.executive.g2rStructureComplete}`);
  console.log('Reports written.');
}

main();
