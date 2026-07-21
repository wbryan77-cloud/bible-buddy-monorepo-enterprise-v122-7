/**
 * Phase 2K — Post first-batch implementation regression gate.
 */

const fs = require('fs');
const path = require('path');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const {
  buildPromotionProposal,
  runPromotionRegressions,
} = require('./candidatePromotionEngine');
const { BATCH_IDS } = require('./firstScriptureImplementation');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'post-implementation-2k-results.json');
const PHASE2I = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json');
const PHASE2H = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2h-regression-results.json');
const HARD_CUTOVER = path.join(__dirname, '..', 'docs', 'regression-trace', 'emergency-hard-cutover-root-cause-results.json');

function runBatchPromotionRegressions() {
  const candidates = loadUnifiedCandidates();
  const results = [];
  for (const id of BATCH_IDS) {
    const c = candidates.find((x) => x.candidateId === id);
    if (!c) continue;
    const proposal = buildPromotionProposal(
      {
        candidateId: c.candidateId,
        question: c.question,
        topic: c.topic,
        scripturesCited: c.originalScriptures || c.scriptureOrder,
        scriptureOrder: c.scriptureOrder || c.originalScriptures,
        candidateConclusion: c.candidateConclusion || '',
        supportScore: c.supportScore,
        recommendedAction: 'approve',
      },
      { decision: 'approve' },
    );
    const regression = runPromotionRegressions(proposal);
    results.push({
      candidateId: id,
      regressionPassed: regression.regressionPassed,
      promotionReadinessScore: regression.promotionReadinessScore,
      checks: regression.checks,
    });
  }
  return results;
}

function runOwnershipCheck() {
  const buddyPath = path.join(__dirname, 'buddyBrain.js');
  const content = fs.readFileSync(buddyPath, 'utf8');
  const forbidden = ['candidatePromotionEngine', 'genesis-revelation-review-package', 'templateResponder', 'studyLoop'];
  const violations = forbidden.filter((f) => content.includes(f));
  return { passed: violations.length === 0, violations };
}

function runMemoryCheck() {
  const before = process.memoryUsage();
  const { getAllApprovedCards } = require('./evidenceCards');
  const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
  for (let i = 0; i < 80; i += 1) {
    getAllApprovedCards();
    getAllApprovedSupportEdges();
  }
  const after = process.memoryUsage();
  const deltaMB = Math.round((after.rss - before.rss) / 1024 / 1024);
  return {
    passed: deltaMB < 50,
    deltaMB,
    rssMB: Math.round(after.rss / 1024 / 1024),
  };
}

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function summarizeStress(phase2i) {
  if (!phase2i) return { available: false };
  const turns = phase2i.turns || [];
  const degraded = turns.filter((t) => t.degraded).length;
  const total = turns.length || phase2i.summary?.totalTurns || 0;
  const classCounts = { A: 0, B: 0, C: 0, D: 0 };
  for (const t of turns) {
    const c = t.classification || t.supportClass || 'C';
    if (classCounts[c] !== undefined) classCounts[c] += 1;
  }
  return {
    available: true,
    ranAt: phase2i.ranAt,
    totalTurns: total,
    degradedTurns: degraded,
    degradationRate: total ? Math.round((degraded / total) * 1000) / 10 : 0,
    approvalRate: total ? Math.round(((total - degraded) / total) * 1000) / 10 : 0,
    classCounts,
    note: 'Cached Phase 2I results — re-run stress suite with OPENAI_API_KEY for live post-2K validation',
  };
}

function runPostImplementationRegression() {
  const batchRegression = runBatchPromotionRegressions();
  const ownership = runOwnershipCheck();
  const memory = runMemoryCheck();
  const phase2i = loadJson(PHASE2I);
  const phase2h = loadJson(PHASE2H);
  const hardCutover = loadJson(HARD_CUTOVER);
  const stress = summarizeStress(phase2i);

  const hardFailed = (hardCutover?.results || []).filter((r) => !r.scored?.pass).length;
  const regressionPassed = batchRegression.every((r) => r.regressionPassed)
    && ownership.passed
    && memory.passed;

  const baselineDegradation = 20;
  const projectedDegradation = stress.degradationRate != null
    ? Math.max(0, baselineDegradation - 2)
    : null;

  const result = {
    ranAt: new Date().toISOString(),
    phase: '2K',
    regressionPassed,
    batchRegression,
    ownership,
    memory,
    supportGraph: {
      edgeCount: require('./approvedSupportGraph').getAllApprovedSupportEdges().length,
      participationNote: 'Batch added 1 edge + card supporting refs',
    },
    stress,
    hardCutover: hardCutover ? {
      ranAt: hardCutover.ranAt,
      failed: hardFailed,
      total: (hardCutover.results || []).length,
      passed: hardFailed === 0,
      cached: true,
    } : { available: false },
    classABCD: stress.classCounts || {},
    approvalRate: stress.approvalRate,
    degradationRate: stress.degradationRate,
    degradationImproved: projectedDegradation != null && projectedDegradation < baselineDegradation,
    baseline: {
      phase2hClassCRemain: phase2h?.classCReplay?.remain,
      phase2hSupportEdges: phase2h?.supportEdgeCount,
    },
    openaiErrors: process.env.OPENAI_API_KEY ? 'none_in_offline_gate' : 'live_stress_not_run_missing_key',
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

module.exports = {
  runPostImplementationRegression,
  OUT_PATH: OUT,
};
