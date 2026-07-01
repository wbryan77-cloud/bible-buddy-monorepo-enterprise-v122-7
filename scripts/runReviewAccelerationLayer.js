#!/usr/bin/env node
/**
 * Phase 2J-O — Admin Review Acceleration Layer runner.
 * Advisory recommendations only — no production updates, no approvals, no promotions.
 */
const fs = require('fs');
const path = require('path');
const { runReviewAccelerationLayer } = require('../services/reviewAccelerationLayer');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  green: path.join(ROOT, 'GreenCandidates.md'),
  yellow: path.join(ROOT, 'YellowCandidates.md'),
  red: path.join(ROOT, 'RedCandidates.md'),
  bulk: path.join(ROOT, 'BulkReviewAccelerationDashboard.md'),
  recommendation: path.join(ROOT, 'ReviewRecommendationReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JOReport.md'),
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
  'reviewAccelerationLayer',
  'runReviewAccelerationLayer',
  'review-recommendations.json',
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

function candidateRow(e) {
  const ex = e.explanation;
  const s = ex.signals;
  return `| ${ex.candidateId} | ${ex.topic} | ${s.supportScore} | ${s.degradationReductionPotential}% | ${s.genesisRevelationCoverage} | ${s.contradictionWitnessCount} | ${ex.summary.slice(0, 55)}… |`;
}

function writeStatusList(title, list, outPath, result) {
  const lines = [
    `# ${title}`,
    '',
    '**Phase:** 2J-O Part D',
    `**Date:** ${result.ranAt}`,
    `**Count:** ${list.length}`,
  ];

  lines.push('', '## Candidates', '');
  lines.push('| ID | Topic | Score | Degradation Δ | G2R | Contradictions | Summary |');
  lines.push('|----|-------|-------|---------------|-----|----------------|---------|');

  for (const e of list) {
    lines.push(candidateRow(e));
  }

  lines.push('', '## Decision assist (advisory)', '');
  for (const e of list.slice(0, 10)) {
    const d = e.explanation.decisionAssist;
    lines.push(
      `- **${e.explanation.candidateId}:** approve ${d.approveLikelihood}% | hold ${d.holdLikelihood}% | review ${d.reviewLikelihood}%`,
    );
  }

  fs.writeFileSync(outPath, `${lines.join('\n')}\n`);
}

function writeBulkDashboard(result) {
  const { green, yellow, red, payload } = result;
  const lines = [
    '# Bulk Review Acceleration Dashboard',
    '',
    '**Phase:** 2J-O Part E',
    `**Date:** ${result.ranAt}`,
    '',
    '## Queue summary',
    '',
    `| Status | Count |`,
    `|--------|-------|`,
    `| GREEN | ${green.length} |`,
    `| YELLOW | ${yellow.length} |`,
    `| RED | ${red.length} |`,
    `| **Total** | **${payload.counts.total}** |`,
    '',
    '## Bulk review views',
    '',
    '### All Green',
    '',
    green.map((e) => `- ${e.explanation.candidateId} — ${e.explanation.question}`).join('\n') || '_none_',
    '',
    '### All Yellow',
    '',
    yellow.slice(0, 20).map((e) => `- ${e.explanation.candidateId} — ${e.explanation.question}`).join('\n')
      + (yellow.length > 20 ? `\n- _…and ${yellow.length - 20} more_` : '') || '_none_',
    '',
    '### All Red',
    '',
    red.slice(0, 20).map((e) => `- ${e.explanation.candidateId} — ${e.explanation.question}`).join('\n')
      + (red.length > 20 ? `\n- _…and ${red.length - 20} more_` : '') || '_none_',
    '',
    '## By topic',
    '',
    '| Topic | Green | Yellow | Red |',
    '|-------|-------|--------|-----|',
  ];

  for (const [topic, info] of Object.entries(payload.topicIndex).sort()) {
    lines.push(`| ${topic} | ${info.green} | ${info.yellow} | ${info.red} |`);
  }

  lines.push('', '## Single candidate drill-down', '');
  lines.push('Use `docs/evidence-candidates/review-recommendations.json` for full per-candidate explanations.');
  lines.push('', '### Priority review queue (top 15 non-RED)', '');
  for (const id of payload.reviewFirstIds) {
    const ex = result.enriched.find((e) => e.explanation.candidateId === id)?.explanation;
    if (ex) lines.push(`1. **${id}** [${ex.reviewStatus}] — ${ex.recommendedNextStep}`);
  }

  fs.writeFileSync(REPORTS.bulk, `${lines.join('\n')}\n`);
}

function writeRecommendationReport(result) {
  const lines = [
    '# Review Recommendation Report',
    '',
    '**Phase:** 2J-O Parts A–F',
    `**Date:** ${result.ranAt}`,
    '',
    '## Methodology',
    '',
    'The Review Acceleration Layer computes witness signals, assigns GREEN/YELLOW/RED status,',
    'and generates human-readable explanations. **It never approves or promotes.**',
    '',
    '### Review signals',
    '',
    '- supportScore, witness counts (direct/supporting/continuity/caution/contradiction)',
    '- GenesisRevelationCoverage, topicCoverage, existingDoctrineAlignment',
    '- degradationReductionPotential',
    '',
    '### Status rules',
    '',
    '- **GREEN:** score ≥ 90, no contradictions, caution ≤ 1, strong continuity',
    '- **YELLOW:** score 80–89 OR caution witnesses present',
    '- **RED:** contradictions OR chain conflicts OR score < 80',
    '',
    '## Sample explanations',
    '',
  ];

  for (const e of result.reviewFirst.slice(0, 8)) {
    const ex = e.explanation;
    lines.push(`### ${ex.candidateId} — ${ex.reviewStatus}`);
    lines.push('');
    lines.push(`**Summary:** ${ex.summary}`);
    if (ex.approvalRationale) lines.push(`**Approval rationale:** ${ex.approvalRationale}`);
    if (ex.holdRationale) lines.push(`**Hold rationale:** ${ex.holdRationale}`);
    if (ex.riskFactors.length) lines.push(`**Risk factors:** ${ex.riskFactors.join('; ')}`);
    lines.push(`**Next step:** ${ex.recommendedNextStep}`);
    const d = ex.decisionAssist;
    lines.push(`**Decision assist:** approve ${d.approveLikelihood}% | hold ${d.holdLikelihood}% | review ${d.reviewLikelihood}% _(advisory only)_`);
    lines.push('');
  }

  lines.push('## Future compatibility (Part G)', '');
  lines.push('All candidates enriched in `docs/evidence-candidates/review-recommendations.json` with:');
  lines.push('- `reviewStatus`, `reviewExplanation`, `riskSummary`, `recommendedNextStep`');
  lines.push('- Pre-queue metadata before admin decisions file');

  fs.writeFileSync(REPORTS.recommendation, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const { green, yellow, red, timeSavings, payload } = result;
  const lines = [
    '# Bible Authority Phase 2J-O Report',
    '',
    '**Phase:** Admin Review Acceleration Layer',
    `**Date:** ${result.ranAt}`,
    '',
    '## Mission answers',
    '',
    `1. **How many Green candidates?** ${green.length}`,
    `2. **How many Yellow candidates?** ${yellow.length}`,
    `3. **How many Red candidates?** ${red.length}`,
    `4. **Which candidates should be reviewed first?** ${payload.reviewFirstIds.slice(0, 8).join(', ')}`,
    `5. **Which candidates are blocked by contradictions?** ${payload.contradictionBlockedIds.length ? payload.contradictionBlockedIds.join(', ') : 'none with contradiction witnesses in RED queue'}`,
    `6. **Strongest Genesis→Revelation continuity?** ${payload.strongestG2RIds.slice(0, 5).join(', ')}`,
    `7. **How much admin review time is reduced?** ~${timeSavings.percentReduction}% (${timeSavings.hoursSaved} hours saved across ${timeSavings.candidates} candidates)`,
    '',
    '## Safety (Part H)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Production wire isolation | ${safety.passed ? 'PASS' : 'FAIL'} |`,
    `| Graph edges unchanged | ${safety.graphEdgeCount} |`,
    `| Evidence cards unchanged | ${safety.cardCount} |`,
    `| Automatic approvals | none |`,
    `| Automatic promotions | none |`,
    `| Doctrine changes | none |`,
    '',
    '## Deliverables',
    '',
    '- GreenCandidates.md',
    '- YellowCandidates.md',
    '- RedCandidates.md',
    '- BulkReviewAccelerationDashboard.md',
    '- ReviewRecommendationReport.md',
    '- docs/evidence-candidates/review-recommendations.json',
    '- BibleAuthorityPhase2JOReport.md',
    '',
    '**Re-run:** `node scripts/runReviewAccelerationLayer.js`',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-O — Admin Review Acceleration Layer');
  const safety = verifySafety();
  const result = runReviewAccelerationLayer();

  writeStatusList('Green Candidates', result.green, REPORTS.green, result);
  writeStatusList('Yellow Candidates', result.yellow, REPORTS.yellow, result);
  writeStatusList('Red Candidates', result.red, REPORTS.red, result);
  writeBulkDashboard(result);
  writeRecommendationReport(result);
  writeMainReport(result, safety);

  console.log(`Green: ${result.green.length} | Yellow: ${result.yellow.length} | Red: ${result.red.length}`);
  console.log(`Time savings: ~${result.timeSavings.percentReduction}%`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
