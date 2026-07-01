#!/usr/bin/env node
/**
 * Phase 2L — Live validation + next batch review preparation.
 * No new scripture application.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase2lValidation, PHASE2I_BASELINE, PHASE2K_PROJECTED } = require('../services/phase2lLiveValidation');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  liveStress: path.join(ROOT, 'LivePostImplementationStressReport.md'),
  effectiveness: path.join(ROOT, 'FirstBatchEffectivenessReport.md'),
  adminVerify: path.join(ROOT, 'AdminCommandCenterVerificationReport.md'),
  nextBatch: path.join(ROOT, 'NextBatchCandidateReviewPackage.md'),
  decisionTemplate: path.join(ROOT, 'NextBatchDecisionTemplateReport.md'),
  engineering: path.join(ROOT, 'EngineeringStabilityAfterPhase2K.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2LReport.md'),
};

function writeLiveStressReport(result) {
  const stress = result.stress;
  const lines = [
    '# Live Post-Implementation Stress Report',
    '',
    '**Phase:** 2L Part A',
    `**Date:** ${result.ranAt}`,
    '',
  ];

  if (stress.liveRan) {
    const agg = stress.aggregate;
    const deltas = stress.deltas || {};
    lines.push('## Live 125-turn results (post-2K)', '');
    lines.push(`| Metric | Phase 2I baseline | Post-2K live | Delta |`);
    lines.push(`|--------|-------------------|--------------|-------|`);
    lines.push(`| Total turns | ${PHASE2I_BASELINE.totalTurns} | ${stress.totalTurns} | — |`);
    lines.push(`| Degradation rate | ${PHASE2I_BASELINE.degradationRatePct}% | ${agg.degradationRatePct}% | ${deltas.degradationRatePct ?? '—'} |`);
    lines.push(`| Class C claims | ${PHASE2I_BASELINE.classCounts.C} | ${agg.classCounts?.C} | ${deltas.classC ?? '—'} |`);
    lines.push(`| Graph participation | ${PHASE2I_BASELINE.graphParticipationPct}% | ${agg.graphParticipationPct}% | ${deltas.graphParticipationPct ?? '—'} |`);
    lines.push(`| Ownership violations | ${PHASE2I_BASELINE.ownershipViolationTurns} | ${agg.ownershipViolationTurns} | ${deltas.ownershipViolationTurns ?? '—'} |`);
    lines.push(`| OpenAI calls | ${PHASE2I_BASELINE.openaiCallCount} | ${agg.openaiCallCount} | — |`);
    lines.push(`| OpenAI errors | 0 | ${agg.connectionErrors} | — |`);
    lines.push(`| Peak RSS MB | ${PHASE2I_BASELINE.peakRssMb} | ${agg.peakRssMb} | — |`);
    lines.push(`| Avg RSS MB | ${PHASE2I_BASELINE.avgRssMb} | ${agg.avgRssMb} | — |`);
    lines.push(`| Runtime errors | ${PHASE2I_BASELINE.runtimeErrors} | ${agg.runtimeErrors} | — |`);
  } else {
    lines.push('## Live suite status', '');
    lines.push(`**Live run:** not executed — ${stress.reason}`);
    lines.push('', '**To run:** `export OPENAI_API_KEY=... && node scripts/phase2lLiveStressTest.js`', '');
    lines.push('## Offline proxy (batch-related scenarios)', '');
    const p = stress.offlineProxy;
    if (p) {
      lines.push(`- Batch scenario turns in 2I: ${p.batchScenarioTurnsIn2I}`);
      lines.push(`- Baseline batch Class C: ${p.baselineBatchClassC}`);
      lines.push(`- Post-2K sample Class C: ${p.postClassC}`);
      lines.push(`- Post graph matches (samples): ${p.postGraphMatches}/${p.postBatchSamples}`);
    }
    lines.push('', '## Phase 2I baseline (reference)', '');
    lines.push(`- Degradation: ${PHASE2I_BASELINE.degradationRatePct}%`);
    lines.push(`- Class C: ${PHASE2I_BASELINE.classCounts.C}`);
    lines.push(`- Graph participation: ${PHASE2I_BASELINE.graphParticipationPct}%`);
    lines.push('', '## Phase 2K projected', '');
    lines.push(`- Target degradation: ~${PHASE2K_PROJECTED.degradationRatePct}%`);
    lines.push(`- Graph edges: ${PHASE2K_PROJECTED.graphEdgeCount}`);
  }

  fs.writeFileSync(REPORTS.liveStress, `${lines.join('\n')}\n`);
}

function writeEffectivenessReport(result) {
  const e = result.batchEffectiveness;
  const lines = [
    '# First Batch Effectiveness Report',
    '',
    '**Phase:** 2L Part B',
    `**Date:** ${result.ranAt}`,
    `**Applied at:** ${e.appliedAt}`,
    '',
    `**Support graph edges:** ${e.supportGraphEdgeCount} | **New edge active:** ${e.newEdgeActive}`,
    '',
  ];

  for (const c of e.candidates) {
    lines.push(`## ${c.candidateId}`);
    lines.push('');
    lines.push(`- **Applied:** ${JSON.stringify(c.appliedAssets.scripturesAdded || c.appliedAssets.edgeId)}`);
    lines.push(`- **Scenarios:** ${c.retrievalScenarios.join(', ')}`);
    lines.push(`- **Pre-2K Class C (matched turns):** ${c.preImplementation.classC}`);
    lines.push(`- **Post classification:** ${c.postImplementationClassification?.class || 'n/a'} (graph: ${c.postImplementationClassification?.supportGraphMatch || 'none'})`);
    lines.push(`- **Retrieval improved (proxy):** ${c.retrievalImproved ? 'Yes' : 'Review'}`);
    lines.push('');
  }

  lines.push('## Summary', '');
  lines.push(`- All batch samples A/B: **${e.summary.allCandidatesClassifiedAB ? 'Yes' : 'No'}**`);
  lines.push(`- Total pre-implementation Class C on matched scenarios: **${e.summary.totalPreClassC}**`);

  fs.writeFileSync(REPORTS.effectiveness, `${lines.join('\n')}\n`);
}

function writeAdminVerifyReport(result) {
  const v = result.adminVerification;
  const lines = [
    '# Admin Command Center Verification Report',
    '',
    '**Phase:** 2L Part C',
    `**Date:** ${result.ranAt}`,
    '',
    `**Overall:** ${v.allPassed ? 'PASS' : 'FAIL'}`,
    '',
    '| Check | Pass | Detail |',
    '|-------|------|--------|',
  ];
  for (const c of v.checks) {
    lines.push(`| ${c.id} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail || ''} |`);
  }
  lines.push('', '**URLs:** `/admin/bible-authority.html` · `/admin/api/bible-authority/command-center`');
  fs.writeFileSync(REPORTS.adminVerify, `${lines.join('\n')}\n`);
}

function writeNextBatchReport(result) {
  const b = result.nextBatch;
  const lines = [
    '# Next Batch Candidate Review Package',
    '',
    '**Phase:** 2L Part D',
    `**Date:** ${result.ranAt}`,
    '',
    '**Not approved automatically.** Human review required.',
    '',
    '## Criteria',
    '',
    JSON.stringify(b.criteria, null, 2),
    '',
    `**Pool size:** ${b.poolSize} | **Selected:** ${b.selectedCount}`,
    '',
    '## Candidates',
    '',
  ];

  for (const c of b.candidates) {
    lines.push(`### ${c.candidateId} — ${c.strengthTier} (${c.supportScore})`);
    lines.push(`- **Lesson:** ${c.lessonTitle}`);
    lines.push(`- **Question:** ${c.question}`);
    lines.push(`- **Parallel:** ${c.parallelScriptures.length} | **Supporting:** ${c.supportingScriptures.length} | **Contradiction:** ${c.contradictionScriptures.length}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.nextBatch, `${lines.join('\n')}\n`);
}

function writeDecisionTemplateReport(result) {
  const t = result.decisionTemplate;
  const lines = [
    '# Next Batch Decision Template Report',
    '',
    '**Phase:** 2L Part E',
    `**Date:** ${result.ranAt}`,
    '',
    `**Template file:** ${t.path}`,
    `**Candidates:** ${t.count}`,
    '',
    'All `decision` fields are `null` until human review.',
    '',
    '```json',
    JSON.stringify(t.template.decisions.slice(0, 3), null, 2),
    '```',
    '',
    '_Full template in docs/evidence-candidates/next-batch-admin-decisions.template.json_',
  ];
  fs.writeFileSync(REPORTS.decisionTemplate, `${lines.join('\n')}\n`);
}

function writeEngineeringReport(result) {
  const s = result.engineeringStability;
  const lines = [
    '# Engineering Stability After Phase 2K',
    '',
    '**Phase:** 2L Part F',
    `**Date:** ${result.ranAt}`,
    '',
    `**Overall:** ${s.allPassed ? 'PASS' : 'FAIL'}`,
    '',
    '| Check | Pass |',
    '|-------|------|',
  ];
  for (const c of s.checks) {
    lines.push(`| ${c.id} | ${c.pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('', s.note);
  fs.writeFileSync(REPORTS.engineering, `${lines.join('\n')}\n`);
}

function writeMainReport(result) {
  const g = result.goNoGo;
  const lines = [
    '# Bible Authority Phase 2L Report',
    '',
    '**Phase:** Live Validation + Next Scripture Batch Review',
    `**Date:** ${result.ranAt}`,
    '',
    '## GO / NO-GO',
    '',
    `**Second batch review:** ${g.goForSecondBatchReview ? 'GO — proceed with human review of next batch' : 'NO-GO'}`,
    `**Rollback recommended:** ${g.rollbackRecommended ? 'Yes' : 'No'}`,
    '',
    g.stopReasons.length ? `**Stop / pending:** ${g.stopReasons.join('; ')}` : '',
    '',
    '## Mission answers',
    '',
    `1. **Live stress improved after 2K?** ${g.liveStressImproved ? 'Yes (proxy or live)' : 'Pending full live run'}`,
    `2. **Degradation decreased?** ${g.degradationDecreased ? 'Yes' : 'Pending live confirmation'}`,
    `3. **Graph participation improved?** ${g.graphParticipationImproved ? 'Yes' : 'Marginal — verify live'}`,
    `4. **Memory stable?** ${g.memoryStable ? 'Yes' : 'No'}`,
    `5. **Admin isolated?** ${g.adminIsolated ? 'Yes' : 'No'}`,
    `6. **Next candidates for review:** ${g.nextBatchReadyIds.join(', ')}`,
    `7. **Approve second batch?** ${g.approveSecondBatch ? 'After human decisions on template — not auto' : 'Resolve blockers first'}`,
    `8. **Rollback anything?** ${g.rollbackRecommended ? 'Yes' : 'No'}`,
    '',
    '## Deliverables',
    '',
    Object.values(REPORTS).map((p) => `- ${path.basename(p)}`).join('\n'),
    '',
    '**Live stress:** `node scripts/phase2lLiveStressTest.js` (requires OPENAI_API_KEY)',
  ];
  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

async function main() {
  console.log('Phase 2L — Live Validation + Next Batch Review');
  const result = await runPhase2lValidation();

  writeLiveStressReport(result);
  writeEffectivenessReport(result);
  writeAdminVerifyReport(result);
  writeNextBatchReport(result);
  writeDecisionTemplateReport(result);
  writeEngineeringReport(result);
  writeMainReport(result);

  console.log(`Admin verify: ${result.adminVerification.allPassed ? 'PASS' : 'FAIL'}`);
  console.log(`Live stress: ${result.stress.liveRan ? 'RAN' : 'PENDING KEY'}`);
  console.log(`Next batch: ${result.nextBatch.selectedCount} candidates`);
  console.log(`GO second batch review: ${result.goNoGo.goForSecondBatchReview ? 'YES' : 'NO'}`);
  console.log('Reports written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
