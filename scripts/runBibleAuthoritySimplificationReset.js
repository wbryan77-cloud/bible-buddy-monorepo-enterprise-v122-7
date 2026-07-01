#!/usr/bin/env node
/**
 * Bible Authority Simplification Reset — reports only, no production changes.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runSimplificationReset, REMOVED_LOGIC } = require('../services/bibleAuthoritySimplificationReset');
const { STRENGTH_TIERS } = require('../services/scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  main: path.join(ROOT, 'BibleAuthoritySimplificationResetReport.md'),
  contradiction: path.join(ROOT, 'ContradictionLogicResetReport.md'),
  supportScore: path.join(ROOT, 'SimpleSupportScoreReport.md'),
  adminReview: path.join(ROOT, 'SimplifiedAdminReviewReport.md'),
  implFlow: path.join(ROOT, 'ScriptureImplementationFlowReport.md'),
  topicPacks: path.join(ROOT, 'TopicPackSimplifiedReviewReport.md'),
  batch4: path.join(ROOT, 'Batch4SimpleCandidatePacket.md'),
  batch4Prep: path.join(ROOT, 'Batch4ImplementationPreparation.md'),
};

function writeContradictionReport(data) {
  const lines = [
    '# Contradiction Logic Reset Report',
    '',
    '**Phase:** Simplification Reset Part A',
    `**Date:** ${data.ranAt}`,
    '',
    'Contradiction machinery demoted or removed from automatic admin decision flow.',
    '',
    '| ID | Location | Status |',
    '|----|----------|--------|',
  ];
  for (const r of REMOVED_LOGIC) {
    lines.push(`| ${r.id} | ${r.location} | ${r.status} |`);
  }
  lines.push('', '**Caution scriptures:** visible as informational notes only — no auto-block, no score penalty.', '');
  fs.writeFileSync(REPORTS.contradiction, `${lines.join('\n')}\n`);
}

function writeSupportScoreReport(data) {
  const lines = [
    '# Simple Support Score Report',
    '',
    '**Phase:** Simplification Reset Part B',
    `**Date:** ${data.ranAt}`,
    '',
    'Admin strength tiers (percentage only):',
    '',
  ];
  for (const t of STRENGTH_TIERS) {
    lines.push(`- **${t.min}–${t.max}** = ${t.label}`);
  }
  lines.push(
    '',
    'Score inputs: original chain, Genesis→Revelation chain, parallel, supporting, continuity, approved card/graph alignment.',
    '',
    'Removed from scoring: contradiction penalties, caution penalties, interpretation conflict penalties.',
    '',
    `**Candidates reviewed:** ${data.simplifiedCandidates.length}`,
  );
  fs.writeFileSync(REPORTS.supportScore, `${lines.join('\n')}\n`);
}

function writeAdminReviewReport(data) {
  const lines = [
    '# Simplified Admin Review Report',
    '',
    '**Phase:** Simplification Reset Part C',
    `**Date:** ${data.ranAt}`,
    '',
    'Admin-facing review object (sample top 10 by support score):',
    '',
  ];
  const top = [...data.simplifiedCandidates].sort((a, b) => b.supportScore - a.supportScore).slice(0, 10);
  for (const c of top) {
    lines.push('```json');
    lines.push(JSON.stringify(c, null, 2));
    lines.push('```', '');
  }
  lines.push('**Removed from admin review:** contradiction confidence, blockers, interpretation conflict labels, Green/Yellow/Red, engineering degradation estimates.', '');
  fs.writeFileSync(REPORTS.adminReview, `${lines.join('\n')}\n`);
}

function writeImplFlowReport(data) {
  const lines = [
    '# Scripture Implementation Flow Report',
    '',
    '**Phase:** Simplification Reset Part D',
    `**Date:** ${data.ranAt}`,
    '',
    '## Flow',
    '',
  ];
  for (let i = 0; i < data.implementationFlow.length; i += 1) {
    lines.push(`${i + 1}. ${data.implementationFlow[i]}`);
  }
  lines.push('', '**No automatic approval.** **No automatic promotion.** Human admin is final authority.', '');
  fs.writeFileSync(REPORTS.implFlow, `${lines.join('\n')}\n`);
}

function writeTopicPackReport(data) {
  const lines = [
    '# Topic Pack Simplified Review Report',
    '',
    '**Phase:** Simplification Reset Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Support | Tier | Pending | Decision |',
    '|-------|---------|------|---------|----------|',
  ];
  for (const p of data.simplifiedTopicPacks) {
    lines.push(`| ${p.displayName} | ${p.supportScore} | ${p.strengthTier} | ${(p.pendingScriptures || []).length} | ${p.packDecision || 'pending'} |`);
  }
  lines.push('', '## Review order (pending scriptures + score)', '');
  for (const p of data.topicPacksReviewFirst) {
    lines.push(`- **${p.displayName}** — score ${p.supportScore}, ${(p.pendingScriptures || []).length} pending scripture(s)`);
  }
  fs.writeFileSync(REPORTS.topicPacks, `${lines.join('\n')}\n`);
}

function writeBatch4Packet(data) {
  const pool = data.batch4SimplePool;
  const lines = [
    '# Batch 4 Simple Candidate Packet',
    '',
    '**Phase:** Simplification Reset Part F',
    `**Date:** ${data.ranAt}`,
    '',
    '**Criteria:** support ≥ 90 · G2R chain ≥ 3 · parallel + supporting present · regression eligible · not implemented · caution allowed',
    '',
    `**Pool size:** ${pool.length}`,
    '',
    '| Rank | ID | Topic | Support | Tier | Pending |',
    '|------|-----|-------|---------|------|---------|',
  ];
  pool.forEach((c, i) => {
    lines.push(`| ${i + 1} | ${c.candidateId} | ${c.topic} | ${c.supportScore} | ${c.strengthTier} | ${(c.pendingScriptures || []).length} |`);
  });
  fs.writeFileSync(REPORTS.batch4, `${lines.join('\n')}\n`);
}

function writeBatch4Prep(data) {
  const lines = [
    '# Batch 4 Implementation Preparation',
    '',
    '**Phase:** Simplification Reset Part G',
    `**Date:** ${data.ranAt}`,
    '',
    '**Not implemented** — preparation only. Human approval required before any apply.',
    '',
  ];
  for (const prep of data.batch4Preparation.slice(0, 12)) {
    lines.push(`## ${prep.candidateId} (${prep.topic})`);
    lines.push(`- **Target card:** ${prep.targetCard || 'n/a'}`);
    lines.push(`- **Scriptures to add:** ${(prep.scripturesToAdd || []).join('; ') || 'none'}`);
    lines.push(`- **Graph:** ${prep.supportGraphEdgePreview}`);
    lines.push(`- **Ledger preview:** ${prep.ledgerPreview.implementationType}, candidate ${prep.ledgerPreview.sourceCandidate}`);
    lines.push(`- **Rollback:** remove ${(prep.rollbackPreview.removeScriptures || []).length} scripture ref(s)`, '');
  }
  fs.writeFileSync(REPORTS.batch4Prep, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const topPacks = data.topicPacksReviewFirst.slice(0, 3).map((p) => p.displayName).join(', ');
  const lines = [
    '# Bible Authority Simplification Reset Report',
    '',
    `**Date:** ${data.ranAt}`,
    '',
    '## Summary',
    '',
    `1. **Contradiction/interpretation logic removed or demoted:** ${REMOVED_LOGIC.length} items — see ContradictionLogicResetReport.md`,
    `2. **Green/Yellow/Red retired:** ${data.greenYellowRedRetired ? 'Yes' : 'No'} — scripture_strength percentage tiers only`,
    `3. **Admin review percentage-based:** Yes — ${STRENGTH_TIERS.length} tiers, no color labels`,
    `4. **Caution scriptures informational only:** Yes — no auto-block or score penalty`,
    `5. **Batch 4 candidates after simplification:** ${data.batch4CandidateCount}`,
    `6. **Topic packs to review first:** ${topPacks}`,
    `7. **Ready to continue implementation:** ${data.safety.passed && data.batch4CandidateCount > 0 ? 'Yes — human topic pack review then Batch 4 approval' : 'Review topic packs; Batch 4 pool may need regression pass on candidates'}`,
    '',
    '## Safety',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Doctrine changes | none |`,
    `| Prompt changes | none |`,
    `| Ownership intact | ${data.safety.passed ? 'yes' : 'check'} |`,
    `| Auto-approval | none |`,
    '',
    '## Deliverables',
    '',
  ];
  for (const p of Object.values(REPORTS)) {
    lines.push(`- ${path.basename(p)}`);
  }
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Bible Authority — Simplification Reset');
  const data = runSimplificationReset();
  writeContradictionReport(data);
  writeSupportScoreReport(data);
  writeAdminReviewReport(data);
  writeImplFlowReport(data);
  writeTopicPackReport(data);
  writeBatch4Packet(data);
  writeBatch4Prep(data);
  writeMainReport(data);
  console.log(`Batch 4 simple pool: ${data.batch4CandidateCount}`);
  console.log('Reports written.');
}

main();
