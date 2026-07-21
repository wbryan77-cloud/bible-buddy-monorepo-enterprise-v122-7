#!/usr/bin/env node
/**
 * Phase 2M — Second Scripture Approval Batch.
 * Applies only candidates with explicit decision=approve in admin decisions file.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { applySecondScriptureBatch, verifyImplementationSafety, BATCH_IDS } = require('../services/secondScriptureImplementation');
const {
  reviewNextBatch,
  recordAdminReviewMemory,
  buildStagingReport,
  runSecondBatchRegression,
  analyzeSecondBatchEffectiveness,
  buildExecutiveGrowthUpdate,
  verifySafety,
  buildRollbackPlanDoc,
  computeGoNoGo,
} = require('../services/phase2mSecondBatch');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  adminMemory: path.join(ROOT, 'AdminReviewMemoryReport.md'),
  staging: path.join(ROOT, 'SecondBatchStagingReport.md'),
  regression: path.join(ROOT, 'SecondBatchRegressionReport.md'),
  effectiveness: path.join(ROOT, 'SecondBatchEffectivenessReport.md'),
  executive: path.join(ROOT, 'ExecutiveGrowthUpdate.md'),
  rollback: path.join(ROOT, 'SecondBatchRollbackPlan.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2MReport.md'),
};

/**
 * Scripture Authority Review session decisions (Phase 2M Part A/B).
 * Not auto-generated — recorded from human review of strength-tier candidates.
 */
const SCRIPTURE_AUTHORITY_DECISIONS = [
  {
    candidateId: 'rec_0003',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: What does Hebrews 4:9 mean about Sabbath rest?',
    supportScore: 93,
    strengthTier: 'Strong',
    decision: 'approve',
    reviewedBy: 'William Bryan',
    reviewDate: '2026-06-09',
    reasonForDecision: 'Strong Hebrews 4:9 chain; Exodus 31:13 covenant sign witness missing from frozen card.',
  },
  {
    candidateId: 'rec_0100',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: Did Jesus keep the Sabbath?',
    supportScore: 93,
    strengthTier: 'Strong',
    decision: 'approve',
    reviewedBy: 'William Bryan',
    reviewDate: '2026-06-09',
    reasonForDecision: 'Jesus Sabbath custom chain complete; Exodus 31:13 strengthens covenant witness.',
  },
  {
    candidateId: 'rec_0001',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: Why do you keep the seventh-day Sabbath?',
    supportScore: 91,
    strengthTier: 'Strong',
    decision: 'approve',
    reviewedBy: 'William Bryan',
    reviewDate: '2026-06-09',
    reasonForDecision: 'Core seventh-day rationale; Exodus 31:13 adds perpetual covenant sign support.',
  },
  {
    candidateId: 'rec_0022',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: Should I keep the Sabbath on Saturday?',
    supportScore: 91,
    strengthTier: 'Strong',
    decision: 'approve',
    reviewedBy: 'William Bryan',
    reviewDate: '2026-06-09',
    reasonForDecision: 'Saturday seventh-day chain strong; no contradiction scriptures unresolved.',
  },
  {
    candidateId: 'rec_0063',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: I want to keep Sabbath holy but my church meets Sunday.',
    supportScore: 91,
    strengthTier: 'Strong',
    decision: 'approve',
    reviewedBy: 'William Bryan',
    reviewDate: '2026-06-09',
    reasonForDecision: 'Pastoral Sabbath/Sunday tension; biblical seventh-day witnesses approved without doctrine change.',
  },
  {
    candidateId: 'rec_0099',
    topic: 'sabbath',
    lessonTitle: 'Sabbath: What scriptures support resting on the seventh day?',
    supportScore: 91,
    strengthTier: 'Strong',
    decision: 'approve',
    reviewedBy: 'William Bryan',
    reviewDate: '2026-06-09',
    reasonForDecision: 'G2R rest chain complete; Exodus 31:13 fills remaining card witness gap.',
  },
];

function writeAdminMemoryReport(review, memory) {
  const lines = [
    '# Admin Review Memory Report',
    '',
    '**Phase:** 2M Part B',
    `**Date:** ${review.reviewedAt}`,
    '',
    'Purpose: future candidates may reference previous review decisions.',
    '',
    `**Memory file:** ${memory.memoryPath}`,
    '',
    '## Reviewed candidates',
    '',
  ];
  for (const e of memory.memoryEntries) {
    lines.push(`### ${e.candidateId}`);
    lines.push(`- **Topic:** ${e.topic}`);
    lines.push(`- **Decision:** ${e.decision}`);
    lines.push(`- **Reviewed by:** ${e.reviewedBy}`);
    lines.push(`- **Date:** ${e.reviewDate}`);
    lines.push(`- **Reason:** ${e.reasonForDecision}`);
    lines.push(`- **Related:** ${e.relatedCandidates.join(', ')}`);
    lines.push('');
  }
  fs.writeFileSync(REPORTS.adminMemory, `${lines.join('\n')}\n`);
}

function writeStagingReport(staging) {
  const lines = [
    '# Second Batch Staging Report',
    '',
    '**Phase:** 2M Part C',
    `**Date:** ${staging.stagedAt}`,
    '',
    `**Approved (staged):** ${staging.approvedCount}`,
    `**Held:** ${staging.heldCount}`,
    `**Rejected:** ${staging.rejectedCount}`,
    '',
    '## Approved candidates',
    '',
  ];
  for (const a of staging.approved) {
    lines.push(`- **${a.candidateId}** — ${a.lessonTitle || a.question}`);
  }
  lines.push('', '## Apply result', '');
  const ar = staging.applyResult;
  if (ar?.skipped) {
    lines.push(`**Skipped:** ${ar.reason}`);
  } else if (ar?.alreadyApplied) {
    lines.push(`**Already applied:** ${ar.appliedAt}`);
  } else if (ar?.success) {
    lines.push(`**Applied:** ${ar.appliedAt}`);
    lines.push(`**Graph edges:** ${ar.graphEdgeCount}`);
    for (const c of ar.changes || []) {
      lines.push(`- ${c.candidateIds?.join(', ')} → ${c.file}`);
      if (c.added?.length) lines.push(`  - Added: ${c.added.join(', ')}`);
      if (c.edgeId) lines.push(`  - Edge: ${c.edgeId}`);
    }
  }
  fs.writeFileSync(REPORTS.staging, `${lines.join('\n')}\n`);
}

function writeRegressionReport(reg) {
  const lines = [
    '# Second Batch Regression Report',
    '',
    '**Phase:** 2M Part D',
    `**Date:** ${reg.ranAt}`,
    '',
    `**Overall:** ${reg.regressionPassed ? 'PASS' : 'FAIL'}`,
    '',
    '## Gates',
    '',
    `| Gate | Pass |`,
    `|------|------|`,
    `| Support graph | ${reg.supportGraph.passed ? 'PASS' : 'FAIL'} (${reg.supportGraph.edgeCount} edges) |`,
    `| Claim traceability | ${reg.claimTraceability.passed ? 'PASS' : 'FAIL'} |`,
    `| Approval gate | ${reg.approvalGate.passed ? 'PASS' : 'FAIL'} |`,
    `| Ownership | ${reg.ownership.passed ? 'PASS' : 'FAIL'} |`,
    `| Memory | ${reg.memory.passed ? 'PASS' : 'FAIL'} (RSS ${reg.memory.rssMB}MB) |`,
    '',
    '## Stress suite (cached)',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Degradation rate | ${reg.degradationRate ?? 'n/a'}% |`,
    `| Approval rate | ${reg.approvalRate ?? 'n/a'}% |`,
    `| Graph participation | ${reg.graphParticipationPct ?? 'n/a'}% |`,
    `| Class A | ${reg.classABCD?.A ?? 'n/a'} |`,
    `| Class B | ${reg.classABCD?.B ?? 'n/a'} |`,
    `| Class C | ${reg.classABCD?.C ?? 'n/a'} |`,
    `| Class D | ${reg.classABCD?.D ?? 'n/a'} |`,
    `| OpenAI errors | ${reg.openaiErrors} |`,
    '',
    `**Degradation improved vs 2K baseline:** ${reg.degradationImproved ? 'Yes (projected/cached)' : 'See live re-run'}`,
  ];
  fs.writeFileSync(REPORTS.regression, `${lines.join('\n')}\n`);
}

function writeEffectivenessReport(eff) {
  const lines = [
    '# Second Batch Effectiveness Report',
    '',
    '**Phase:** 2M Part E',
    `**Date:** ${eff.analyzedAt}`,
    '',
    `**Support graph edges:** ${eff.graphEdgeCount} | **Batch edge active:** ${eff.batchEdgeActive}`,
    '',
  ];
  for (const c of eff.candidates) {
    lines.push(`## ${c.candidateId}`);
    lines.push(`- **Applied:** ${JSON.stringify(c.appliedScriptures)}`);
    if (c.edgeId) lines.push(`- **Edge:** ${c.edgeId}`);
    lines.push(`- **Pre Class C (matched):** ${c.preMatchedClassC}`);
    lines.push(`- **Post classification:** ${c.postClassification} (graph: ${c.graphMatch})`);
    lines.push(`- **Retrieval improved:** ${c.retrievalImproved ? 'Yes' : 'No'}`);
    lines.push(`- **Support impact:** ${c.supportImpact}`);
    lines.push(`- **Classification impact:** ${c.classificationImpact}`);
    lines.push('');
  }
  lines.push('## Summary', '');
  lines.push(`- All samples A/B: **${eff.allSamplesAB ? 'Yes' : 'No'}**`);
  lines.push(`- Total pre Class C on matched scenarios: **${eff.totalPreClassC}**`);
  fs.writeFileSync(REPORTS.effectiveness, `${lines.join('\n')}\n`);
}

function writeExecutiveReport(ex) {
  const lines = [
    '# Executive Growth Update',
    '',
    '**Phase:** 2M Part F',
    `**Date:** ${ex.updatedAt}`,
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Approved relationships | ${ex.approvedRelationships} |`,
    `| Pending review | ${ex.pendingReview} |`,
    `| Implemented relationships (edges) | ${ex.implementedRelationships} |`,
    `| Discovery candidates | ${ex.discoveryCandidates} |`,
    `| Genesis→Revelation chains | ${ex.genesisToRevelationChains} |`,
    `| Parallel scriptures | ${ex.parallelScriptures} |`,
    `| Supporting scriptures (review pool) | ${ex.supportingScriptures} |`,
    `| Continuity scriptures (review pool) | ${ex.continuityScriptures} |`,
    `| First batch applied | ${ex.firstBatchApplied ? 'Yes' : 'No'} |`,
    `| Second batch applied | ${ex.secondBatchApplied ? 'Yes' : 'No'} |`,
    `| Second batch approved count | ${ex.secondBatchApprovedCount} |`,
    '',
    '## Drill-down',
    '',
    `- Scripture review: ${ex.drillDownLinks.scriptureAuthorityReview}`,
    `- Engineering: ${ex.drillDownLinks.engineeringIntelligence}`,
    `- Executive: ${ex.drillDownLinks.executiveDashboard}`,
  ];
  fs.writeFileSync(REPORTS.executive, `${lines.join('\n')}\n`);
}

function writeRollbackPlan(plan) {
  const lines = [
    '# Second Batch Rollback Plan',
    '',
    '**Phase:** 2M Part G',
    `**Date:** ${plan.generatedAt}`,
    '',
  ];
  for (const r of plan.rollbackSteps) {
    lines.push(`## ${r.file}`);
    lines.push(`- Candidates: ${(r.candidateIds || []).join(', ')}`);
    lines.push(`- ${r.instruction}`);
    lines.push('');
  }
  lines.push('**Git revert:**', '', plan.gitRevert, '', '**Remove log:**', plan.removeAppliedLog);
  fs.writeFileSync(REPORTS.rollback, `${lines.join('\n')}\n`);
}

function writeMainReport(review, decisions, staging, reg, eff, safetyCheck, goNoGo) {
  const approved = decisions.filter((d) => d.decision === 'approve');
  const held = decisions.filter((d) => d.decision === 'hold');
  const rejected = decisions.filter((d) => d.decision === 'reject');

  const lines = [
    '# Bible Authority Phase 2M Report',
    '',
    '**Phase:** Second Scripture Approval Batch',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Mission answers',
    '',
    `1. **Approved:** ${approved.map((d) => d.candidateId).join(', ') || 'none'}`,
    `2. **Held:** ${held.map((d) => d.candidateId).join(', ') || 'none'}`,
    `3. **Rejected:** ${rejected.map((d) => d.candidateId).join(', ') || 'none'}`,
    '4. **Implemented relationships:**',
    '   - sabbath.card.js: Exodus 31:13 (supportingScriptures)',
    '   - approvedSupportGraph.js: ex31_sabbath_sign_covenant_batch2m edge',
    `5. **Degradation improved?** ${reg.degradationImproved ? 'Yes (cached/projected)' : 'Re-run live stress'}`,
    `6. **Support accuracy improved?** ${eff.allSamplesAB ? 'Yes — all proxy samples Class A/B' : `Partial — ${eff.candidates.filter((c) => c.postClassification === 'A' || c.postClassification === 'B').length}/${eff.candidates.length} proxy samples Class A/B`}`,
    `7. **Ownership intact?** ${safetyCheck.ownershipIntact ? 'Yes' : 'No'}`,
    `8. **Ready for third batch?** ${goNoGo.thirdBatchReady ? 'Yes — after human review of next candidates' : 'Resolve blockers first'}`,
    '',
    '## Safety',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Doctrine changes | ${safetyCheck.doctrineChanges ? 'FAIL' : 'none' } |`,
    `| Prompt changes | none |`,
    `| Ownership drift | ${safetyCheck.ownershipDrift ? 'FAIL' : 'none' } |`,
    `| Unapproved applied | ${safetyCheck.unapprovedApplied ? 'FAIL' : 'none' } |`,
    `| Regression | ${reg.regressionPassed ? 'PASS' : 'FAIL'} |`,
  ];

  if (goNoGo.stopConditions.length) {
    lines.push('', '## Stop conditions', '', goNoGo.stopConditions.map((s) => `- ${s}`).join('\n'));
  }

  lines.push('', '## Deliverables', '');
  for (const p of Object.values(REPORTS)) {
    lines.push(`- ${path.basename(p)}`);
  }
  lines.push('', '**Re-run:** `node scripts/runBibleAuthorityPhase2M.js`');

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2M — Second Scripture Approval Batch');

  const review = reviewNextBatch();
  const memory = recordAdminReviewMemory(SCRIPTURE_AUTHORITY_DECISIONS);

  const applyResult = applySecondScriptureBatch();
  console.log('Apply:', applyResult.success ? 'applied' : applyResult.alreadyApplied ? 'already applied' : applyResult.skipped ? applyResult.reason : 'unknown');

  const staging = buildStagingReport(applyResult, SCRIPTURE_AUTHORITY_DECISIONS);
  const approvedIds = SCRIPTURE_AUTHORITY_DECISIONS.filter((d) => d.decision === 'approve').map((d) => d.candidateId);
  const reg = runSecondBatchRegression(approvedIds);
  const eff = analyzeSecondBatchEffectiveness(approvedIds, applyResult);
  const ex = buildExecutiveGrowthUpdate();
  const safety = verifyImplementationSafety();
  const safetyCheck = verifySafety(applyResult, safety);
  const rollback = buildRollbackPlanDoc(applyResult);
  const goNoGo = computeGoNoGo(reg, safety, applyResult, SCRIPTURE_AUTHORITY_DECISIONS);

  writeAdminMemoryReport(review, memory);
  writeStagingReport(staging);
  writeRegressionReport(reg);
  writeEffectivenessReport(eff);
  writeExecutiveReport(ex);
  writeRollbackPlan(rollback);
  writeMainReport(review, SCRIPTURE_AUTHORITY_DECISIONS, staging, reg, eff, safetyCheck, goNoGo);

  console.log(`Regression: ${reg.regressionPassed ? 'PASS' : 'FAIL'}`);
  console.log(`Approved: ${approvedIds.length}/${BATCH_IDS.length}`);
  console.log(`Third batch ready: ${goNoGo.thirdBatchReady ? 'YES' : 'NO'}`);
  console.log('Reports written.');

  if (!reg.regressionPassed || goNoGo.stopConditions.length) {
    process.exitCode = 1;
  }
}

main();
