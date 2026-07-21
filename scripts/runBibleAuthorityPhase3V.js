#!/usr/bin/env node
/**
 * Phase 3V — Relationship intelligence (evidence-based mapping only).
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3vRelationshipIntelligence } = require('../services/phase3vRelationshipIntelligence');

const ROOT = path.join(__dirname, '..');

function writeReport(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3V Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Purpose',
    '',
    'Evidence-based relationship mapping from recovered scriptures only.',
    'No doctrine generation. No doctrinal conclusions.',
    '',
    '## Track D — Scripture Chain Library',
    '',
    `- Primary recovered sources analyzed: **${e.recoveredSources}** (${e.syntheticSourcesExcluded || 0} synthetic gap-closure rows excluded)`,
    `- Observed recurring chains (≥3 scriptures, ≥2 sources): **${e.scriptureChainsObserved}**`,
    '',
    '## Track E — Relationship Graph',
    '',
    `- Edges with evidence: **${e.relationshipEdges}**`,
    `- All edges evidence-backed: **${e.allEdgesHaveEvidence ? 'yes' : 'no'}**`,
    '',
    'Allowed types: parallel, supporting, continuity, prophetic, fulfillment, commandment, warning, covenant, messianic, kingdom, quotation, repeated_theme',
    '',
    '## Track F — Genesis to Revelation Continuity',
    '',
    `- Topics scored: **${e.topicsContinuityScored}**`,
    '',
    '## Track G — Topic Inheritance',
    '',
    `- Dependency topics: **${e.inheritanceTopics}**`,
    `- Traceable in recovered corpus: **${e.inheritanceTraceable}**`,
    '',
    '## Track H — Question Coverage',
    '',
    `- Questions scored: **${e.questionsScored}** (support only — no answers generated)`,
    '',
    '## Track N — Scripture Traceability',
    '',
    `- Doctrine packs indexed: **${e.packsTraceability}**`,
    `- Questions indexed: **${e.questionsTraceability}**`,
    '',
    '## Normalization Audit',
    '',
    `- Quality score: **${e.normalizationQuality}**`,
    `- Context-expanded refs (Pass B): **${e.contextExpandedRefs}**`,
    '',
    '## Artifacts',
    '',
    '- `docs/evidence-candidates/scripture-chain-library.json`',
    '- `docs/evidence-candidates/relationship-graph.json`',
    '- `docs/evidence-candidates/genesis-to-revelation-continuity-index.json`',
    '- `docs/evidence-candidates/topic-inheritance-map.json`',
    '- `docs/evidence-candidates/question-coverage-index.json`',
    '- `docs/evidence-candidates/topic-cluster-assignments.json`',
    '- `docs/evidence-candidates/normalization-audit-report.json`',
    '- `docs/evidence-candidates/scripture-traceability-index.json`',
    '',
    '## Safety',
    '',
    'No production, doctrine generation, evidence card, graph, or prompt changes.',
  ];
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase3VReport.md'), `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 3V — Relationship intelligence starting...');
  const data = runPhase3vRelationshipIntelligence();
  writeReport(data);
  console.log('Phase 3V — Complete');
  console.log(`Sources: ${data.executive.recoveredSources} · Chains: ${data.executive.scriptureChainsObserved}`);
  console.log(`Graph edges: ${data.executive.relationshipEdges} · Continuity topics: ${data.executive.topicsContinuityScored}`);
  console.log(`Traceability: ${data.executive.packsTraceability} packs · ${data.executive.questionsTraceability} questions`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
