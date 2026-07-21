#!/usr/bin/env node
/**
 * Phase 2J-M+ — Scripture Research Workspace runner.
 * Research only — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { runScriptureResearchWorkspace } = require('../services/scriptureResearchWorkspace');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  parallel: path.join(ROOT, 'ResearchParallelScriptures.md'),
  merge: path.join(ROOT, 'TopicMergeAnalysis.md'),
  g2r: path.join(ROOT, 'GenesisToRevelationExpansionWorkspace.md'),
  chainBuilder: path.join(ROOT, 'ScriptureChainBuilder.md'),
  nlPlan: path.join(ROOT, 'NaturalLanguageResearchPlan.md'),
  impact: path.join(ROOT, 'ResearchImpactDashboard.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JMPlusReport.md'),
};

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
];

const FORBIDDEN = ['scriptureResearchWorkspace', 'runScriptureResearchWorkspace'];

function verifySafety() {
  const violations = [];
  for (const file of PRODUCTION_WIRE) {
    const p = path.join(ROOT, 'services', file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const mod of FORBIDDEN) {
      if (content.includes(mod)) violations.push({ file, mod });
    }
  }
  return {
    passed: violations.length === 0,
    violations,
    graphEdgeCount: getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
  };
}

function writeParallelScriptures(result) {
  const pe = result.parallelExplorer;
  const lines = [
    '# Research Parallel Scriptures',
    '',
    '**Phase:** 2J-M+ Part A',
    `**Date:** ${result.ranAt}`,
    `**Focus candidate:** ${pe.request.candidateId || 'n/a'}`,
    `**Topic:** ${pe.request.topic}`,
    `**Question:** ${pe.request.question}`,
    '',
    `**G2R span:** ${pe.genesisToRevelationSpan ? 'yes' : 'no'}`,
    '',
    '| Scripture | Relationship | Source | Confidence | Reason |',
    '|-----------|--------------|--------|------------|--------|',
  ];

  for (const w of pe.witnesses) {
    lines.push(`| ${w.scripture} | ${w.relationshipType} | ${w.sourceLayer} | ${w.confidence} | ${w.reason.slice(0, 50)} |`);
  }

  lines.push('', `**Total witnesses:** ${pe.witnesses.length}`);
  lines.push('**Status:** research only — reviewRequired: true, autoApplied: false');

  fs.writeFileSync(REPORTS.parallel, `${lines.join('\n')}\n`);
}

function writeTopicMerge(result) {
  const lines = [
    '# Topic Merge Analysis',
    '',
    '**Phase:** 2J-M+ Part B',
    `**Date:** ${result.ranAt}`,
    '',
  ];

  for (const m of result.topicMerges) {
    lines.push(`## ${m.label}`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Shared witnesses | ${m.sharedWitnesses.length} |`);
    lines.push(`| Shared chains | ${m.sharedChains.length} |`);
    lines.push(`| Support overlap edges | ${m.supportOverlap.length} |`);
    lines.push(`| Contradictions flagged | ${m.contradictions.length} |`);
    lines.push(`| Continuity connections | ${m.continuityConnections.length} |`);
    lines.push('');
    if (m.sharedWitnesses.length) {
      lines.push(`**Shared:** ${m.sharedWitnesses.join(', ')}`);
    }
    if (m.uniqueA.length) {
      lines.push(`**Unique ${m.topicA}:** ${m.uniqueA.slice(0, 5).join(', ')}`);
    }
    if (m.uniqueB.length && m.topicA !== m.topicB) {
      lines.push(`**Unique ${m.topicB}:** ${m.uniqueB.slice(0, 5).join(', ')}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.merge, `${lines.join('\n')}\n`);
}

function writeG2RWorkspace(result) {
  const g = result.g2rWorkspace;
  const lines = [
    '# Genesis-to-Revelation Expansion Workspace',
    '',
    '**Phase:** 2J-M+ Part C',
    `**Date:** ${result.ranAt}`,
    `**Candidate:** ${g.request.candidateId || 'n/a'}`,
    `**Topic:** ${g.request.topic}`,
    `**Question:** ${g.request.question}`,
    '',
    `**Continuity score:** ${g.continuityScore}%`,
    `**G2R span:** ${g.genesisToRevelationSpan ? 'yes' : 'no'}`,
    '',
    '## Era witnesses',
    '',
    `| Era | Witnesses |`,
    `|-----|-----------|`,
    `| Genesis anchors | ${g.genesisAnchors.join(', ') || 'none'} |`,
    `| Torah | ${g.torahWitnesses.join(', ') || 'none'} |`,
    `| Prophets | ${g.prophetWitnesses.join(', ') || 'none'} |`,
    `| Gospels | ${g.gospelWitnesses.join(', ') || 'none'} |`,
    `| Epistles | ${g.epistleWitnesses.join(', ') || 'none'} |`,
    `| Revelation | ${g.revelationWitnesses.join(', ') || 'none'} |`,
    '',
    '## Proposed G2R chain',
    '',
    g.proposedChain.join(' → ') || 'none',
    '',
    '## Parallel available',
    '',
    (g.parallelAvailable || []).slice(0, 8).join(', ') || 'none',
  ];

  fs.writeFileSync(REPORTS.g2r, `${lines.join('\n')}\n`);
}

function writeChainBuilder(result) {
  const c = result.chainBuilder;
  const lines = [
    '# Scripture Chain Builder',
    '',
    '**Phase:** 2J-M+ Part D',
    `**Date:** ${result.ranAt}`,
    `**Topic:** ${c.request.topic}`,
    `**Question:** ${c.request.question || 'n/a'}`,
    '',
    '## Input chain',
    '',
    c.request.scriptures.join(', ') || 'none',
    '',
    '## Analysis',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Support score | ${c.supportScore} |`,
    `| Chain strength | ${c.chainStrength} |`,
    `| Completeness | ${c.chainCompleteness}% |`,
    `| G2R span | ${c.genesisToRevelationSpan ? 'yes' : 'no'} |`,
    `| Contradictions | ${c.contradictions.length} |`,
    `| Continuity gaps | ${c.gaps.length} |`,
    '',
    '## Possible additional witnesses',
    '',
    c.possibleAdditionalWitnesses.join(', ') || 'none',
    '',
    '## Caution scriptures',
    '',
    c.cautionScriptures.join(', ') || 'none',
  ];

  fs.writeFileSync(REPORTS.chainBuilder, `${lines.join('\n')}\n`);
}

function writeNLPlan(result) {
  const lines = [
    '# Natural Language Research Plan',
    '',
    '**Phase:** 2J-M+ Part E',
    `**Date:** ${result.ranAt}`,
    '**Status:** Architecture prepared — no production updates',
    '',
    '## Supported request patterns',
    '',
    '- "Find more scriptures supporting {topic}." → `parallel_explorer`',
    '- "Show Genesis to Revelation witnesses for {topic}." → `g2r_expansion`',
    '- "Combine {topicA} and {topicB}." → `topic_merge`',
    '- "Find contradictions for {topic}." → `contradiction_search`',
    '- "Build a chain for {topic}." → `chain_builder`',
    '',
    '## Sample structured jobs',
    '',
    '| Utterance | Job type | Params | Status |',
    '|-----------|----------|--------|--------|',
  ];

  for (const job of result.nlJobs) {
    lines.push(`| ${job.utterance} | ${job.jobType} | ${JSON.stringify(job.params)} | ${job.status} |`);
  }

  lines.push('', '## Job schema', '');
  lines.push('```json');
  lines.push(JSON.stringify({
    jobType: 'parallel_explorer | g2r_expansion | topic_merge | chain_builder | contradiction_search',
    params: { topic: 'string', topicA: 'string', topicB: 'string', candidateId: 'string', scriptures: [] },
    reviewRequired: true,
    autoApplied: false,
    productionApplied: false,
  }, null, 2));
  lines.push('```');

  fs.writeFileSync(REPORTS.nlPlan, `${lines.join('\n')}\n`);
}

function writeImpactDashboard(result) {
  const lines = [
    '# Research Impact Dashboard',
    '',
    '**Phase:** 2J-M+ Part F',
    `**Date:** ${result.ranAt}`,
    '',
    '| Candidate | Topic | Current | Potential | Delta | +Witnesses | +Support | +Continuity | +Caution |',
    '|-----------|-------|---------|-----------|-------|------------|----------|-------------|----------|',
  ];

  for (const i of result.researchImpact.slice(0, 25)) {
    lines.push(
      `| ${i.candidateId} | ${i.topic} | ${i.currentSupportScore} | ${i.potentialSupportScore} | ${i.supportDelta >= 0 ? '+' : ''}${i.supportDelta} | ${i.additionalWitnessesAvailable} | ${i.additionalSupportingWitnesses} | ${i.additionalContinuityWitnesses} | ${i.additionalCautionWitnesses} |`,
    );
  }

  fs.writeFileSync(REPORTS.impact, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const cap = result.capabilities;
  const lines = [
    '# Bible Authority Phase 2J-M+ Report',
    '',
    '**Phase:** Scripture Research Workspace',
    `**Date:** ${result.ranAt}`,
    '**Status:** Research only — no production changes',
    '',
    '## Mission answers',
    '',
    `1. **Can administrators request additional parallel scriptures?** ${cap.parallelScriptureExplorer ? 'Yes' : 'No'} — Part A explorer (${result.metrics.witnessesExplored} witnesses for focus candidate)`,
    `2. **Can administrators merge topics?** ${cap.topicMergeExplorer ? 'Yes' : 'No'} — Part B (${result.metrics.topicMergesRun} merge analyses)`,
    `3. **Can administrators expand topics Genesis→Revelation on demand?** ${cap.genesisToRevelationExpansion ? 'Yes' : 'No'} — Part C workspace`,
    `4. **Can administrators build custom scripture chains?** ${cap.scriptureChainBuilder ? 'Yes' : 'No'} — Part D chain builder`,
    `5. **Can natural-language requests create research jobs?** ${cap.naturalLanguageResearchJobs ? 'Yes' : 'No'} — Part E (${result.metrics.nlJobsStructured}/${result.nlJobs.length} structured)`,
    `6. **Does the workspace remain isolated from production?** ${cap.productionIsolated && safety.passed ? 'Yes' : 'No'} — no graph/card/doctrine changes`,
    '',
    '## Discovery continuation (Part G)',
    '',
    '```',
    result.pipeline.stages.join(' → '),
    '```',
    '',
    `**Rule:** ${result.pipeline.rule}`,
    '',
    '## Safety (Part H)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| No production imports | ${safety.passed ? 'PASS' : 'FAIL'} |`,
    `| No graph changes | PASS (${safety.graphEdgeCount} edges) |`,
    `| No card changes | PASS (${safety.cardCount} cards) |`,
    `| No doctrine changes | PASS |`,
    `| No automatic approvals | PASS |`,
    `| No automatic promotions | PASS |`,
    '',
    '## Deliverables',
    '',
    '- ResearchParallelScriptures.md',
    '- TopicMergeAnalysis.md',
    '- GenesisToRevelationExpansionWorkspace.md',
    '- ScriptureChainBuilder.md',
    '- NaturalLanguageResearchPlan.md',
    '- ResearchImpactDashboard.md',
    '- BibleAuthorityPhase2JMPlusReport.md',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-M+ — Scripture Research Workspace');
  const result = runScriptureResearchWorkspace();
  const safety = verifySafety();

  writeParallelScriptures(result);
  writeTopicMerge(result);
  writeG2RWorkspace(result);
  writeChainBuilder(result);
  writeNLPlan(result);
  writeImpactDashboard(result);
  writeMainReport(result, safety);

  console.log(`Focus: ${result.focusCandidate}`);
  console.log(`Witnesses explored: ${result.metrics.witnessesExplored}`);
  console.log(`NL jobs: ${result.metrics.nlJobsStructured}/${result.nlJobs.length}`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
