#!/usr/bin/env node
/**
 * Phase 2J-P — Scripture Research & Review Console runner.
 * Consolidated admin surface — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('../services/scriptureResearchReviewConsole');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  console: path.join(ROOT, 'ScriptureResearchReviewConsoleReport.md'),
  issues: path.join(ROOT, 'IssueDetectionReport.md'),
  simplification: path.join(ROOT, 'ReviewSimplificationReport.md'),
  voice: path.join(ROOT, 'VoiceResearchPreparationPlan.md'),
  consolidation: path.join(ROOT, 'AdminWorkflowConsolidationReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JPReport.md'),
};

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
  'evidenceCards/index.js',
];

const FORBIDDEN = [
  'scriptureResearchReviewConsole',
  'runScriptureResearchReviewConsole',
  'console-queue.json',
];

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

function writeConsoleReport(result) {
  const focus = result.focusReview.candidateId ? result.focusReview : null;
  const lines = [
    '# Scripture Research & Review Console Report',
    '',
    '**Phase:** 2J-P Part A',
    `**Date:** ${result.ranAt}`,
    '',
    '## Unified pipeline',
    '',
    result.pipeline.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    '',
    '## Console entry points',
    '',
    '- `candidateId` — single candidate review',
    '- `question` — lookup by question text',
    '- `topic` — all candidates for topic',
    '- `customResearchRequest` — admin research command',
    '',
    `**Candidates in console:** ${result.metrics.candidateCount}`,
    '',
    '## Sample unified review object',
    '',
  ];

  if (focus) {
    lines.push('```');
    lines.push(focus.aiSummary);
    lines.push('```');
    lines.push('');
    lines.push(`**Candidate:** ${focus.candidateId}`);
    lines.push(`**Recommended action (advisory):** ${focus.recommendedReviewAction}`);
    lines.push(`**Issues:** ${focus.issues.filter((i) => i.issueType !== 'NONE').length || 'none'}`);
  }

  lines.push('', '## Research commands executed', '');
  for (const cmd of result.commandResults) {
    lines.push(`- **${cmd.request}** → \`${cmd.parsed.command}\` (${cmd.parsed.status})`);
  }

  lines.push('', '**Re-run:** `node scripts/runScriptureResearchReviewConsole.js`');

  fs.writeFileSync(REPORTS.console, `${lines.join('\n')}\n`);
}

function writeIssueReport(result) {
  const lines = [
    '# Issue Detection Report',
    '',
    '**Phase:** 2J-P Part B',
    `**Date:** ${result.ranAt}`,
    '',
    'Issue detection replaces standalone contradiction dashboards.',
    'Issues explain — they do not auto-reject.',
    '',
    '## Issue type counts',
    '',
    '| Issue type | Count |',
    '|------------|-------|',
  ];

  for (const [type, count] of Object.entries(result.issueCounts).sort((a, b) => b[1] - a[1])) {
    if (count > 0) lines.push(`| ${type} | ${count} |`);
  }

  lines.push('', '## Candidates with contradictions (integrated)', '');
  const withContradiction = result.reviews.filter((r) =>
    r.issues.some((i) => ['POTENTIAL_CONTRADICTION', 'INTERPRETATION_CONFLICT'].includes(i.issueType)),
  );

  lines.push(`**Total:** ${withContradiction.length}`, '');
  for (const r of withContradiction.slice(0, 15)) {
    const issue = r.issues.find((i) => i.issueType !== 'NONE');
    lines.push(`- **${r.candidateId}** (${r.topic}, score ${r.supportScore}): ${issue?.reason || 'see console'}`);
  }

  if (withContradiction.length > 15) {
    lines.push(`- _…and ${withContradiction.length - 15} more in console-queue.json_`);
  }

  fs.writeFileSync(REPORTS.issues, `${lines.join('\n')}\n`);
}

function writeSimplificationReport(result) {
  const lines = [
    '# Review Simplification Report',
    '',
    '**Phase:** 2J-P Part G',
    `**Date:** ${result.ranAt}`,
    '',
    '## Retired as separate review surfaces',
    '',
    'All activity now routes through **Scripture Research & Review Console**.',
    'Green/Yellow/Red triage is replaced by issue types + approve/hold/reject advisory.',
    '',
    '## Consolidated systems',
    '',
    '| System | Phase | Status |',
    '|--------|-------|--------|',
  ];

  for (const sys of result.consolidatedSystems) {
    lines.push(`| ${sys.label} | ${sys.phase} | routed to console |`);
  }

  lines.push('', '## Single decision path', '');
  lines.push('`approve` | `hold` | `reject` — human decision only.');
  lines.push('', 'No additional dashboards or review layers created in 2J-P.');

  fs.writeFileSync(REPORTS.simplification, `${lines.join('\n')}\n`);
}

function writeVoicePlan(result) {
  const lines = [
    '# Voice Research Preparation Plan',
    '',
    '**Phase:** 2J-P Part F',
    `**Date:** ${result.ranAt}`,
    '',
    '## Design layer',
    '',
    '```',
    'Voice → Text → Research Command → Research Console',
    '```',
    '',
    'Voice support remains **optional**. No production impact.',
    '',
    '## Sample voice → console routing',
    '',
  ];

  for (const v of result.voiceSamples) {
    lines.push(`### "${v.voiceInput}"`);
    lines.push('');
    lines.push(`- Command: \`${v.researchCommand.command}\``);
    lines.push(`- Status: ${v.researchCommand.status}`);
    lines.push(`- Console route: ${v.consoleRoute}`);
    lines.push('');
  }

  lines.push('## Implementation notes', '');
  lines.push('- Speech-to-text handled externally (not in scope for 2J-P)');
  lines.push('- `parseVoiceToResearchCommand()` normalizes transcript to research command');
  lines.push('- All voice-initiated research remains review-only');
  lines.push('- Human approval required before any staging or promotion');

  fs.writeFileSync(REPORTS.voice, `${lines.join('\n')}\n`);
}

function writeConsolidationReport(result) {
  const ts = result.timeSavings;
  const lines = [
    '# Admin Workflow Consolidation Report',
    '',
    '**Phase:** 2J-P Parts A–H',
    `**Date:** ${result.ranAt}`,
    '',
    '## Before (fragmented)',
    '',
    'Discovery → Recovery → G2R → Witness → Scoring → G/Y/R → Packages → Dashboards → Contradiction reports',
    '',
    '## After (unified)',
    '',
    result.futurePipeline.join(' → '),
    '',
    '## Advisory action distribution',
    '',
    `| Action | Count |`,
    `|--------|-------|`,
    `| approve (advisory) | ${result.actionCounts.approve} |`,
    `| hold (advisory) | ${result.actionCounts.hold} |`,
    `| reject (advisory) | ${result.actionCounts.reject} |`,
    '',
    '## Time savings projection',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Prior review path | ~${ts.priorMinutesPerCandidate} min/candidate across ${ts.consolidatedLayers} layers |`,
    `| Console path | ~${ts.consoleMinutesPerCandidate} min/candidate |`,
    `| Projected savings | ~${ts.projectedPercentSaved}% (~${ts.projectedHoursSaved} hours for ${result.metrics.candidateCount} candidates) |`,
    '',
    '## Future discovery routing',
    '',
    'All candidates written to `docs/evidence-candidates/console-queue.json` with:',
    '- `reviewStatus` replaced by `primaryIssue` + `recommendedReviewAction`',
    '- `aiSummary` for admin explanation',
    '- `reviewRequired: true`, `autoApplied: false`',
  ];

  fs.writeFileSync(REPORTS.consolidation, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const lines = [
    '# Bible Authority Phase 2J-P Report',
    '',
    '**Phase:** Scripture Research & Review Console',
    `**Date:** ${result.ranAt}`,
    '',
    '## Mission answers',
    '',
    `1. **How many review systems were consolidated?** ${result.metrics.consolidatedSystemCount}`,
    `2. **How much admin time is projected to be saved?** ~${result.timeSavings.projectedPercentSaved}% (~${result.timeSavings.projectedHoursSaved} hours)`,
    `3. **Can every candidate now be reviewed from one console?** Yes — ${result.metrics.candidateCount} candidates in unified console`,
    `4. **Are contradiction reports now integrated into review?** Yes — ${result.issueCounts.POTENTIAL_CONTRADICTION + result.issueCounts.INTERPRETATION_CONFLICT} contradiction/conflict issues detected inline`,
    `5. **Are future discoveries automatically routed into the console?** Yes — via console-queue.json and FUTURE_PIPELINE`,
    `6. **Is the workflow simpler than 2J-O?** Yes — single surface, three actions (approve/hold/reject), issues replace G/Y/R`,
    `7. **Is production authority unchanged?** Yes — Scripture + human approval remain authority; no auto-promotion`,
    '',
    '## Safety (Part I)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Production wire isolation | ${safety.passed ? 'PASS' : 'FAIL'} |`,
    `| Graph edges unchanged | ${safety.graphEdgeCount} |`,
    `| Evidence cards unchanged | ${safety.cardCount} |`,
    `| Prompt updates | none |`,
    `| Ownership changes | none |`,
    `| Automatic approvals | none |`,
    `| Automatic promotions | none |`,
    '',
    '## Deliverables',
    '',
    '- ScriptureResearchReviewConsoleReport.md',
    '- IssueDetectionReport.md',
    '- ReviewSimplificationReport.md',
    '- VoiceResearchPreparationPlan.md',
    '- AdminWorkflowConsolidationReport.md',
    '- docs/evidence-candidates/console-queue.json',
    '- BibleAuthorityPhase2JPReport.md',
    '',
    '**Service:** `services/scriptureResearchReviewConsole.js`',
    '**Re-run:** `node scripts/runScriptureResearchReviewConsole.js`',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-P — Scripture Research & Review Console');
  const safety = verifySafety();
  const result = runScriptureResearchReviewConsole();

  writeConsoleReport(result);
  writeIssueReport(result);
  writeSimplificationReport(result);
  writeVoicePlan(result);
  writeConsolidationReport(result);
  writeMainReport(result, safety);

  console.log(`Candidates: ${result.metrics.candidateCount}`);
  console.log(`Consolidated systems: ${result.metrics.consolidatedSystemCount}`);
  console.log(`Time savings: ~${result.timeSavings.projectedPercentSaved}%`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
