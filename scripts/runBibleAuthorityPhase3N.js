#!/usr/bin/env node
/**
 * Phase 3N — Source gap recovery and doctrine linkage expansion reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3nSourceGapRecovery } = require('../services/phase3nSourceGapRecovery');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  gapRecovery: path.join(ROOT, 'GapItemRecoveryReport.md'),
  sourceFirst: path.join(ROOT, 'SourceFirstTopicRecovery.md'),
  weakPacks: path.join(ROOT, 'WeakPackRecoveryExpansion.md'),
  feasts: path.join(ROOT, 'FeastDoctrineVerification.md'),
  jesus: path.join(ROOT, 'JesusOTNTSourceExpansion.md'),
  holySpirit: path.join(ROOT, 'HolySpiritSourceExpansion.md'),
  missingTopics: path.join(ROOT, 'MissingTopicSourceRecovery.md'),
  coverage: path.join(ROOT, 'SourceCoverageRecoveryReport.md'),
  implementation: path.join(ROOT, 'RecoveredImplementationPreparation.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3NReport.md'),
};

function writeGapRecovery(data) {
  const recovered = data.gapRecoveries.filter((r) => r.recovered).length;
  const lines = [
    '# Gap Item Recovery Report',
    '',
    '**Phase:** 3N Part A',
    `**Date:** ${data.ranAt}`,
    '',
    `**Gap items processed:** ${data.gapRecoveries.length}`,
    `**Recovered:** ${recovered}`,
    '',
    '| Source | Camp | Lesson | Existing topic | Suggested topic | Scriptures | Chain | Reason | Status |',
    '|--------|------|--------|----------------|-----------------|------------|-------|--------|--------|',
  ];

  for (const r of data.gapRecoveries.slice(0, 80)) {
    lines.push(`| ${r.source} | ${r.camp} | ${(r.lessonTitle || '').slice(0, 30)} | ${r.existingTopic} | ${r.suggestedTopic} | ${r.scriptureCount} | ${r.chainFound ? 'yes' : 'no'} | ${r.reasonMissing || 'recovered'} | ${r.postRecoveryStatus} |`);
  }

  if (data.gapRecoveries.length > 80) {
    lines.push('', `*Full linkage data: ${data.gapRecoveries.length} entries in phase3n trace JSON*`);
  }

  fs.writeFileSync(REPORTS.gapRecovery, `${lines.join('\n')}\n`);
}

function writeSourceFirst(data) {
  const sf = data.sourceFirstRecovery;
  const lines = [
    '# Source-First Topic Recovery',
    '',
    '**Phase:** 3N Part B',
    `**Date:** ${data.ranAt}`,
    '',
    `**Emergent topics:** ${sf.emergentTopics.length}`,
    '',
  ];

  for (const bucket of sf.ordered) {
    lines.push(`## ${bucket.priority} (${bucket.items.length})`, '');
    for (const item of bucket.items.filter((i) => i.recovered || i.suggestedTopic !== 'unclassified').slice(0, 15)) {
      lines.push(`- **${item.lessonTitle?.slice(0, 50)}** → ${item.suggestedTopic} · ${item.scriptureCount} scriptures · ${item.postRecoveryStatus}`);
    }
    lines.push('');
  }

  lines.push('## Emergent doctrine topics', '');
  for (const t of sf.emergentTopics.slice(0, 25)) {
    lines.push(`- **${t.displayName}** (${t.topic}) — ${t.lessonCount || t.sourceHits || 0} lessons · pack: ${t.packExists ? 'yes' : 'new'}`);
  }

  fs.writeFileSync(REPORTS.sourceFirst, `${lines.join('\n')}\n`);
}

function writeWeakPacks(data) {
  const lines = [
    '# Weak Pack Recovery Expansion',
    '',
    '**Phase:** 3N Part C',
    `**Date:** ${data.ranAt}`,
    '',
  ];

  for (const w of data.weakPackExpansions) {
    lines.push(`## ${w.displayName}`, '');
    lines.push(`- **Recovery status:** ${w.recoveryStatus}`);
    lines.push(`- **Corpus questions:** ${w.improvement.corpusQuestionsFound} · **Chains:** ${w.improvement.corpusChainsFound} · **Scriptures:** ${w.improvement.corpusScripturesFound}`);
    lines.push(`- **Gaps remaining:** ${w.improvement.gapsRemaining.join(', ')}`);
    if (w.improvement.linkedLessons?.length) {
      lines.push(`- **Linked lessons:** ${w.improvement.linkedLessons.join('; ')}`);
    }
    if (w.recoveredLinkages?.length) {
      lines.push('', '### Source linkages', '');
      for (const l of w.recoveredLinkages.slice(0, 5)) {
        lines.push(`- ${l.lessonTitle} — ${(l.scriptures || []).slice(0, 3).join(', ')}`);
      }
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.weakPacks, `${lines.join('\n')}\n`);
}

function writeFeasts(data) {
  const lines = [
    '# Feast Doctrine Verification',
    '',
    '**Phase:** 3N Part D',
    `**Date:** ${data.ranAt}`,
    '',
    '| Feast | Original | G2R | Parallel | Supporting | Continuity | Readiness | Status | Weak areas |',
    '|-------|----------|-----|----------|------------|------------|-----------|--------|------------|',
  ];

  for (const f of data.feastVerification) {
    lines.push(`| ${f.displayName} | ${f.originalChainLength} | ${f.g2rLength} | ${f.parallelCount} | ${f.supportingCount} | ${f.continuityCount} | ${f.reviewReadiness ?? '—'} | ${f.status} | ${f.weakAreas.join(', ')} |`);
  }

  fs.writeFileSync(REPORTS.feasts, `${lines.join('\n')}\n`);
}

function writeJesus(data) {
  const j = data.jesusExpansion;
  const lines = [
    '# Jesus OT/NT Source Expansion',
    '',
    '**Phase:** 3N Part E',
    `**Date:** ${data.ranAt}`,
    '',
    `**Source hits:** ${j.sourceHitCount} · **Source scriptures:** ${j.sourceScriptureCount}`,
    `**New source scriptures (not in pack):** ${j.newSourceScriptures?.length || 0}`,
    '',
    '## Subchain source hits',
    '',
    '| Subchain | Source hits | Scriptures |',
    '|----------|-------------|------------|',
  ];

  for (const s of j.subchainHits || []) {
    lines.push(`| ${s.label} | ${s.sourceHits} | ${s.scripturesFromSource?.length || 0} |`);
  }

  lines.push('', '## Sample source hits', '');
  for (const h of j.sampleHits || []) {
    lines.push(`- ${h.lessonTitle} (${h.source}) — ${h.scriptures?.slice(0, 4).join(', ')}`);
  }

  fs.writeFileSync(REPORTS.jesus, `${lines.join('\n')}\n`);
}

function writeHolySpirit(data) {
  const h = data.holySpiritExpansion;
  const lines = [
    '# Holy Spirit Source Expansion',
    '',
    '**Phase:** 3N Part F',
    `**Date:** ${data.ranAt}`,
    '',
    `**Source hits:** ${h.sourceHitCount} · **Source scriptures:** ${h.sourceScriptureCount}`,
    `**New source scriptures:** ${h.newSourceScriptures?.length || 0}`,
    '',
    '## Sample source hits',
    '',
  ];

  for (const hit of h.sampleHits || []) {
    lines.push(`- ${hit.lessonTitle} (${hit.source}) — ${hit.scriptures?.slice(0, 4).join(', ')}`);
  }

  fs.writeFileSync(REPORTS.holySpirit, `${lines.join('\n')}\n`);
}

function writeMissingTopics(data) {
  const lines = [
    '# Missing Topic Source Recovery',
    '',
    '**Phase:** 3N Part G',
    `**Date:** ${data.ranAt}`,
    '',
    `**Topics discovered:** ${data.missingTopicDiscovery.length}`,
    '',
    '| Topic | Watchlist | Source hits | Scriptures | Pack | Status |',
    '|-------|-----------|-------------|------------|------|--------|',
  ];

  for (const t of data.missingTopicDiscovery.slice(0, 40)) {
    lines.push(`| ${t.displayName} | ${t.watchlist ? 'yes' : 'no'} | ${t.sourceHits} | ${t.scriptureCount || 0} | ${t.packExists ? 'yes' : 'no'} | ${t.status} |`);
  }

  fs.writeFileSync(REPORTS.missingTopics, `${lines.join('\n')}\n`);
}

function writeCoverage(data) {
  const c = data.coverageRecalculation;
  const t = c.targets;
  const lines = [
    '# Source Coverage Recovery Report',
    '',
    '**Phase:** 3N Part H',
    `**Date:** ${data.ranAt}`,
    '',
    '| Metric | Prior (3M) | After (3N) | Delta | Target | Met |',
    '|--------|------------|------------|-------|--------|-----|',
    `| Covered | ${c.prior.covered} | ${c.after.covered} | ${c.delta.covered} | ≥350 | ${t.coveredMet ? 'yes' : 'no'} |`,
    `| Partial | ${c.prior.partial} | ${c.after.partial} | ${c.delta.partial} | ≤75 | ${t.partialMet ? 'yes' : 'no'} |`,
    `| Missing | ${c.prior.missing} | ${c.after.missing} | ${c.delta.missing} | ≤150 | ${t.missingMet ? 'yes' : 'no'} |`,
    '',
    'Recovery applied via SOURCE → QUESTION → CHAIN → TOPIC → PACK linkage (no new scraping).',
  ];

  fs.writeFileSync(REPORTS.coverage, `${lines.join('\n')}\n`);
}

function writeImplementation(data) {
  const p = data.implementationPrep;
  const lines = [
    '# Recovered Implementation Preparation',
    '',
    '**Phase:** 3N Part I — preparation only, no implementation',
    `**Date:** ${data.ranAt}`,
    '',
    `**Packs strengthened:** ${p.packsStrengthened}`,
    `**Linkages recovered:** ${p.packsRecovered}`,
    `**Newly discovered topics:** ${p.packsNewlyDiscovered}`,
    `**Ready for human review:** ${p.packsReadyForReview}`,
    '',
    '## Review-ready packs',
    '',
  ];

  for (const pack of p.reviewReadyPacks || []) {
    lines.push(`- **${pack.displayName}** — readiness ${pack.reviewReadiness} · score ${pack.supportScore}`);
  }

  lines.push('', '## Newly discovered source topics', '');
  for (const t of p.newlyDiscoveredTopics || []) {
    lines.push(`- ${t}`);
  }

  lines.push('', '## Weak pack improvements', '');
  for (const w of p.weakPackImprovements || []) {
    lines.push(`- **${w.topic}** — ${w.improvement.corpusScripturesFound} corpus scriptures · ${w.recoveryStatus}`);
  }

  fs.writeFileSync(REPORTS.implementation, `${lines.join('\n')}\n`);
}

function writeMain(data) {
  const e = data.executive;
  const c = e.coverageRecalculation;
  const lines = [
    '# Bible Authority Phase 3N Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Executive Summary',
    '',
    `1. Gap items recovered: **${e.gapItemsRecovered}** of ${e.gapItemsProcessed}`,
    `2. Missing entries classified: **${e.missingEntriesClassified}**`,
    `3. New source-derived topics discovered: **${e.newSourceDerivedTopics}**`,
    '4. Weak packs improved most:',
    ...e.weakPacksImprovedMost.map((w) => `   - ${w.topic}: ${w.corpusScriptures} corpus scriptures · ${w.recoveryStatus}`),
    '',
    '5. Packs that gained the most scripture depth:',
    ...e.packsGainedMostDepth.slice(0, 6).map((p) => `   - ${p.lessonTitle?.slice(0, 45)}: ${p.scriptures} scriptures → ${p.topic}`),
    '',
    '6. Packs that gained the most source coverage:',
    ...e.packsGainedMostSourceCoverage.slice(0, 6).map((p) => `   - ${p.lessonTitle?.slice(0, 45)}: ${p.questions} questions → ${p.topic}`),
    '',
    `7. Packs ready for human review: **${e.reviewReadyCount}**`,
    ...e.reviewReadyPacks.slice(0, 8).map((p) => `   - ${p.displayName} (${p.reviewReadiness})`),
    '',
    `8. Still missing: **${e.stillMissingCount}** items`,
    ...e.stillMissingSample.slice(0, 6).map((r) => `   - ${r.lessonTitle?.slice(0, 50)}: ${r.reason}`),
    '',
    '9. Prioritize next:',
    ...e.prioritizeNext.slice(0, 8).map((item) => `   - ${item}`),
    '',
    `10. BibleBuddy learning from majority of source material: **${e.majoritySourceMaterialLinked ? 'Yes' : 'Partial'}** (${e.sourceLinkageRate}% linkage rate)`,
    '',
    '### Coverage recovery',
    '',
    `- Covered: ${c.prior.covered} → **${c.after.covered}** (target ≥350: ${e.targetsMet.coveredMet ? 'met' : 'not met'})`,
    `- Partial: ${c.prior.partial} → **${c.after.partial}** (target ≤75: ${e.targetsMet.partialMet ? 'met' : 'not met'})`,
    `- Missing: ${c.prior.missing} → **${c.after.missing}** (target ≤150: ${e.targetsMet.missingMet ? 'met' : 'not met'})`,
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
  console.log('Phase 3N — Source gap recovery starting...');
  const data = runPhase3nSourceGapRecovery();

  writeGapRecovery(data);
  writeSourceFirst(data);
  writeWeakPacks(data);
  writeFeasts(data);
  writeJesus(data);
  writeHolySpirit(data);
  writeMissingTopics(data);
  writeCoverage(data);
  writeImplementation(data);
  writeMain(data);

  console.log('Phase 3N — Complete');
  console.log(`Gap items recovered: ${data.executive.gapItemsRecovered}`);
  console.log(`Coverage: ${data.coverageRecalculation.after.covered} covered · ${data.coverageRecalculation.after.partial} partial · ${data.coverageRecalculation.after.missing} missing`);
  console.log(`Review-ready: ${data.executive.reviewReadyCount}`);
  console.log('Reports written.');
}

main();
