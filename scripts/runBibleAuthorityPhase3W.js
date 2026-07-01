#!/usr/bin/env node
/**
 * Phase 3W — Corpus quality assurance & relationship reconciliation.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3wCorpusQualityAssurance } = require('../services/phase3wCorpusQualityAssurance');

const ROOT = path.join(__dirname, '..');

function writeGlobalReconciliation(data) {
  const r = data.reconciliation;
  const lines = [
    '# Global Reconciliation Report',
    '',
    `**Phase:** 3W Part A`,
    `**Date:** ${data.ranAt}`,
    '',
    '## Corpus inventory',
    '',
    `- Doctrine packs: **${r.doctrinePackCount}**`,
    `- Scripture witnesses: **${r.scriptureWitnessCount}**`,
    `- Observed chains: **${r.chainCount}**`,
    `- Human review queue: **${r.reviewQueueSize}**`,
    '',
    '## Duplicates detected',
    '',
    `| Type | Count |`,
    `|------|-------|`,
    `| Scripture across packs | ${r.duplicateScriptures.length} |`,
    `| Chains | ${r.duplicateChains.length} |`,
    `| Topics | ${r.duplicateTopics.length} |`,
    `| Inheritance entries | ${r.duplicateInheritance.length} |`,
    '',
  ];

  if (r.duplicateScriptures.length) {
    lines.push('### Duplicate scriptures (sample)', '');
    for (const d of r.duplicateScriptures.slice(0, 15)) {
      lines.push(`- **${d.scripture}** — packs: ${d.topics.slice(0, 5).join(', ')}`);
    }
    lines.push('');
  }

  if (r.duplicateChains.length) {
    lines.push('### Duplicate chains', '');
    for (const d of r.duplicateChains.slice(0, 10)) {
      lines.push(`- ${d.chainId} duplicates ${d.duplicateOf}`);
    }
    lines.push('');
  }

  fs.writeFileSync(path.join(ROOT, 'GlobalReconciliationReport.md'), `${lines.join('\n')}\n`);
}

function writeEnrichmentReport(data) {
  const packs = data.enrichment;
  const lines = [
    '# Bible-Wide Scripture Enrichment Report',
    '',
    `**Phase:** 3W Part D.3`,
    `**Date:** ${data.ranAt}`,
    '',
    `**Packs enriched:** ${packs.length}`,
    '',
    '| Topic | Original | Parallel | Supporting | Continuity | G2R Sections |',
    '|-------|----------|----------|------------|------------|--------------|',
  ];
  for (const p of packs) {
    lines.push(`| ${p.topic} | ${p.originalCount} | ${p.parallelCount} | ${p.supportingCount} | ${p.continuityCount} | ${p.genesisToRevelationWitnesses} |`);
  }
  const incomplete = packs.filter((p) => !p.witnessInventoryComplete);
  if (incomplete.length) {
    lines.push('', '## Packs needing witness inventory', '');
    for (const p of incomplete) lines.push(`- ${p.topic} (${p.originalCount} originals)`);
  }
  lines.push('', 'No doctrine generation. Corpus enrichment inventory only.');
  fs.writeFileSync(path.join(ROOT, 'BibleWideScriptureEnrichmentReport.md'), `${lines.join('\n')}\n`);
}

function writeImplementationReadiness(data) {
  const r = data.readiness;
  const f = data.functionalAudit;
  const lines = [
    '# Implementation Readiness Audit',
    '',
    `**Phase:** 3W Part F`,
    `**Date:** ${data.ranAt}`,
    '',
    `**Readiness score:** ${r.readinessScore}% (${r.passedCount}/${r.totalChecks} checks)`,
    `**Ready for BibleBuddy intelligence layer:** ${r.readyForBibleBuddyIntelligence ? 'yes' : 'no'}`,
    '',
    '## Checks',
    '',
  ];
  for (const [k, v] of Object.entries(r.checks)) {
    lines.push(`- ${k}: ${v ? '✅' : '❌'}`);
  }
  if (r.blockers.length) {
    lines.push('', '## Blockers', '');
    for (const b of r.blockers) lines.push(`- ${b}`);
  }
  lines.push('', '## Functional health — weakest areas', '');
  for (const w of f.weakestAreas) lines.push(`- ${w}`);
  lines.push('', '## Recommended next actions', '');
  for (const a of f.recommendedNextActions) lines.push(`- ${a}`);
  lines.push('', 'No implementation performed. Readiness measurement only.');
  fs.writeFileSync(path.join(ROOT, 'ImplementationReadinessAudit.md'), `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const e = data.executive;
  const s = data.scorecard;
  const lines = [
    '# Bible Authority Phase 3W Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Mission',
    '',
    'Shift from recovery to intelligence — relationship understanding without doctrine generation.',
    '',
    '## Results',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Doctrine packs reconciled | ${e.doctrinePacks} |`,
    `| Observed relationships | ${e.observedRelationships} |`,
    `| Candidate relationships | ${e.candidateRelationships} |`,
    `| Witness topics scored | ${e.witnessTopics} |`,
    `| Vine network nodes | ${e.vineNodes} |`,
    `| Isolated topics | ${e.isolatedTopics} |`,
    `| Enrichment packs | ${e.enrichmentPacks} |`,
    `| Review queue | ${e.reviewQueueSize} |`,
    `| Implementation readiness | ${e.readinessScore}% |`,
    '',
    '## Corpus health',
    '',
    `- Normalization: ${s.normalizationCoverage}`,
    `- Traceability: ${s.traceabilityCoverage}`,
    `- Continuity: ${s.continuityCoverage}`,
    `- Inheritance: ${s.inheritanceCoverage}`,
    `- Question coverage: ${s.questionCoverage}`,
    `- Enrichment coverage: ${s.enrichmentCoverage}`,
    '',
    '## Artifacts',
    '',
    '- `ObservedRelationshipLibrary.json`',
    '- `CandidateRelationshipLibrary.json`',
    '- `WitnessVerificationIndex.json`',
    '- `topic-intelligence-map.json`',
    '- `ScriptureVineNetwork.json`',
    '- `CorpusHealthScorecard.json`',
    '- `CorpusFunctionalHealthAudit.json`',
    '- `bible-wide-scripture-enrichment.json`',
  ];
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase3WReport.md'), `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 3W — Corpus QA & relationship reconciliation starting...');
  const data = runPhase3wCorpusQualityAssurance();
  writeGlobalReconciliation(data);
  writeEnrichmentReport(data);
  writeImplementationReadiness(data);
  writeMainReport(data);
  console.log('Phase 3W — Complete');
  console.log(`Packs: ${data.executive.doctrinePacks} · Observed: ${data.executive.observedRelationships} · Candidate: ${data.executive.candidateRelationships}`);
  console.log(`Vine nodes: ${data.executive.vineNodes} · Isolated: ${data.executive.isolatedTopics} · Readiness: ${data.executive.readinessScore}%`);
}

main();
