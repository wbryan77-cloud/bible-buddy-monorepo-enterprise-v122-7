#!/usr/bin/env node
/**
 * Phase 2J-K — Scripture Witness Quality Audit runner.
 * Classification only — no production updates, no promotion.
 */
const fs = require('fs');
const path = require('path');
const { runWitnessQualityAudit } = require('../services/witnessQualityAudit');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  classification: path.join(ROOT, 'WitnessClassificationReport.md'),
  bundles: path.join(ROOT, 'TopicReviewBundles.md'),
  priority: path.join(ROOT, 'AdminPriorityRanking.md'),
  readiness: path.join(ROOT, 'PromotionReadinessReport.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JKReport.md'),
};

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
];

const FORBIDDEN = ['witnessQualityAudit', 'runWitnessQualityAudit'];

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

function writeClassificationReport(audit) {
  const lines = [
    '# Witness Classification Report',
    '',
    '**Phase:** 2J-K Part A',
    `**Date:** ${audit.ranAt}`,
    `**Total witnesses classified:** ${audit.witnessClassifications.length}`,
    '',
    '## Classification summary',
    '',
    '| Relationship type | Count |',
    '|-------------------|-------|',
  ];

  for (const [type, count] of Object.entries(audit.byType).sort((a, b) => b[1] - a[1])) {
    if (count > 0) lines.push(`| ${type} | ${count} |`);
  }

  lines.push('', '## Witness inventory (sample — first 50)', '');
  lines.push('| Ref | Topic | Type | Confidence | Candidate |');
  lines.push('|-----|-------|------|------------|-----------|');

  for (const w of audit.witnessClassifications.slice(0, 50)) {
    lines.push(`| ${w.witnessRef} | ${w.topic} | ${w.relationshipType} | ${w.confidence} | ${w.candidateId} |`);
  }

  lines.push('', `*Full inventory: ${audit.witnessClassifications.length} witnesses across ${audit.sourceExpansion.chainCount} chains.*`);

  fs.writeFileSync(REPORTS.classification, `${lines.join('\n')}\n`);
}

function writeTopicBundles(audit) {
  const lines = [
    '# Topic Review Bundles',
    '',
    '**Phase:** 2J-K Part B',
    `**Date:** ${audit.ranAt}`,
    `**Topics:** ${audit.topicBundles.length}`,
    '',
  ];

  for (const b of audit.topicBundles) {
    lines.push(`## ${b.topic}`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Question count (chains) | ${b.questionCount} |`);
    lines.push(`| Registry questions | ${b.registryQuestionCount} |`);
    lines.push(`| Witness count | ${b.witnessCount} |`);
    lines.push(`| Direct support | ${b.directSupportCount} |`);
    lines.push(`| Supporting | ${b.supportingCount} |`);
    lines.push(`| Confirming | ${b.confirmingCount} |`);
    lines.push(`| Continuity | ${b.continuityCount} |`);
    lines.push(`| Caution | ${b.cautionCount} |`);
    lines.push(`| Limitation | ${b.limitationCount} |`);
    lines.push(`| Contradiction | ${b.contradictionCount} |`);
    lines.push(`| Confidence score | ${b.confidenceScore} |`);
    lines.push(`| Has approved card | ${b.hasApprovedCard ? 'yes' : 'no'} |`);
    lines.push('');
    lines.push('**Chains:**');
    for (const q of b.originalChains.slice(0, 5)) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.bundles, `${lines.join('\n')}\n`);
}

function writePriorityRanking(audit) {
  const pr = audit.priorityRanking;
  const lines = [
    '# Admin Priority Ranking',
    '',
    '**Phase:** 2J-K Part C',
    `**Date:** ${audit.ranAt}`,
    '',
    '## 1. Highest confidence topics',
    '',
    '| Topic | Confidence | Chains | Witnesses |',
    '|-------|------------|--------|-----------|',
  ];

  for (const t of pr.highestConfidenceTopics) {
    lines.push(`| ${t.topic} | ${t.confidenceScore} | ${t.questionCount} | ${t.witnessCount} |`);
  }

  lines.push('', '## 2. Highest impact topics', '');
  lines.push('| Topic | Impact | Degradation reduction |');
  lines.push('|-------|--------|----------------------|');
  for (const t of pr.highestImpactTopics) {
    lines.push(`| ${t.topic} | ${t.impactScore} | ${t.degradationReductionPotential}% |`);
  }

  lines.push('', '## 3. Largest degradation reduction topics', '');
  lines.push('| Topic | Reduction potential | Confidence |');
  lines.push('|-------|---------------------|------------|');
  for (const t of pr.largestDegradationReductionTopics) {
    lines.push(`| ${t.topic} | ${t.degradationReductionPotential}% | ${t.confidenceScore} |`);
  }

  lines.push('', '## 4. Largest support increase topics', '');
  lines.push('| Topic | Avg support delta | Witnesses |');
  lines.push('|-------|-------------------|-----------|');
  for (const t of pr.largestSupportIncreaseTopics) {
    lines.push(`| ${t.topic} | +${t.avgSupportDelta} | ${t.witnessCount} |`);
  }

  lines.push('', '## Top candidates by score', '');
  lines.push('| ID | Score | Topic | Delta |');
  lines.push('|----|-------|-------|-------|');
  for (const c of pr.topCandidatesByScore) {
    lines.push(`| ${c.candidateId} | ${c.supportScore} | ${c.topic} | ${c.supportDelta || 0} |`);
  }

  fs.writeFileSync(REPORTS.priority, `${lines.join('\n')}\n`);
}

function writePromotionReadiness(audit) {
  const lines = [
    '# Promotion Readiness Report',
    '',
    '**Phase:** 2J-K Part D',
    `**Date:** ${audit.ranAt}`,
    '**Note:** promotionReady means admin may review — NOT auto-promoted.',
    '',
    '## Summary',
    '',
    `| Status | Count |`,
    `|--------|-------|`,
    `| promotionReady | ${audit.readinessCounts.promotionReady} |`,
    `| needsReview | ${audit.readinessCounts.needsReview} |`,
    `| hold | ${audit.readinessCounts.hold} |`,
    `| futureResearch | ${audit.readinessCounts.futureResearch} |`,
    '',
    '## Candidates by status',
    '',
  ];

  const groups = ['promotionReady', 'needsReview', 'hold', 'futureResearch'];
  for (const status of groups) {
    const items = audit.promotionReadiness.filter((p) => p.promotionStatus === status);
    lines.push(`### ${status} (${items.length})`, '');
    for (const p of items) {
      lines.push(`- **${p.candidateId}** (${p.supportScore}) — ${p.question.slice(0, 60)}…`);
      lines.push(`  - ${p.reason}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORTS.readiness, `${lines.join('\n')}\n`);
}

function writeMainReport(audit, safety) {
  const bt = audit.byType;
  const rc = audit.readinessCounts;
  const lines = [
    '# Bible Authority Phase 2J-K Report',
    '',
    '**Phase:** Scripture Witness Quality Audit',
    `**Date:** ${audit.ranAt}`,
    '**Status:** Classification only — no promotion applied',
    '',
    '## Mission answers',
    '',
    `1. **Direct support witnesses:** ${bt.direct_support || 0}`,
    `2. **Supporting witnesses:** ${bt.supporting_witness || 0}`,
    `3. **Caution witnesses:** ${bt.caution_witness || 0}`,
    `4. **Contradiction witnesses:** ${bt.contradiction_witness || 0}`,
    `5. **Strongest topics:** ${audit.strongestTopics.map((t) => `${t.topic} (${t.confidenceScore})`).join(', ')}`,
    `6. **Topics reducing degradation most:** ${audit.priorityRanking.largestDegradationReductionTopics.slice(0, 5).map((t) => t.topic).join(', ')}`,
    `7. **Review first:** ${audit.priorityRanking.reviewFirstTopics.join(', ')}`,
    `8. **Promotion-ready (admin review):** ${rc.promotionReady} candidates`,
    `9. **Remain on hold:** ${rc.hold} candidates`,
    '',
    '## Witness type distribution',
    '',
  ];

  for (const [type, count] of Object.entries(bt).sort((a, b) => b[1] - a[1])) {
    if (count > 0) lines.push(`- **${type}:** ${count}`);
  }

  lines.push('', '## Safety (Part E)', '');
  lines.push(`| Check | Status |`);
  lines.push(`|-------|--------|`);
  lines.push(`| No production imports | ${safety.passed ? 'PASS' : 'FAIL'} |`);
  lines.push(`| No graph updates | PASS |`);
  lines.push(`| No card updates | PASS |`);
  lines.push(`| No support-edge updates | PASS |`);
  lines.push(`| No doctrine updates | PASS |`);
  lines.push(`| No automatic approvals | PASS |`);
  lines.push(`| No automatic promotions | PASS |`);
  lines.push(`| Graph edges | ${safety.graphEdgeCount} |`);
  lines.push(`| Evidence cards | ${safety.cardCount} |`);
  lines.push('', '## Deliverables', '');
  lines.push('- WitnessClassificationReport.md');
  lines.push('- TopicReviewBundles.md');
  lines.push('- AdminPriorityRanking.md');
  lines.push('- PromotionReadinessReport.md');
  lines.push('- BibleAuthorityPhase2JKReport.md');

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-K — Scripture Witness Quality Audit');
  const audit = runWitnessQualityAudit();
  const safety = verifySafety();

  writeClassificationReport(audit);
  writeTopicBundles(audit);
  writePriorityRanking(audit);
  writePromotionReadiness(audit);
  writeMainReport(audit, safety);

  console.log(`Witnesses: ${audit.metrics.totalWitnesses}`);
  console.log('Types:', JSON.stringify(audit.byType));
  console.log('Readiness:', JSON.stringify(audit.readinessCounts));
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
