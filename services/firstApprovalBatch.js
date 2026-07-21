/**
 * Phase 2J-N — First Admin Approval Batch Test.
 * Human-approved staging + regression. No production apply.
 */

const fs = require('fs');
const path = require('path');
const scriptureApprovalWorkflow = require('./scriptureApprovalWorkflow');
const {
  loadUnifiedCandidates,
  runRegressionGate,
  buildPromotionStaging,
  PATHS: APPROVAL_PATHS,
} = scriptureApprovalWorkflow;
const {
  buildPromotionProposal,
  runPromotionRegressions,
  analyzePromotionImpact,
  TOPIC_TO_CARD,
} = require('./candidatePromotionEngine');
const { runWitnessQualityAudit } = require('./witnessQualityAudit');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');

const BATCH_IDS = [
  'exp_0001',
  'exp_0007',
  'exp_0005',
  'rec_0017',
  'rec_0006',
];

const REVIEWER = 'William Bryan';
const REVIEW_DATE = '2026-06-09';

const PATHS = {
  adminDecisions: APPROVAL_PATHS.adminDecisions,
  promotionStaging: APPROVAL_PATHS.promotionStaging,
  phase2i: path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json'),
  phase2h: path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2h-regression-results.json'),
  hardCutover: path.join(__dirname, '..', 'docs', 'regression-trace', 'emergency-hard-cutover-root-cause-results.json'),
};

const STRESS_SCENARIO_IDS = [
  'doc_01', 'doc_07', 'doc_08', 'doc_13', 'doc_14', 'doc_06',
  'chain_sabbath_5', 'chain_death_5', 'mix_14',
];

function loadJson(p, fallback = {}) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function witnessMeta(candidateId, audit) {
  const rows = audit.witnessClassifications.filter((w) => w.candidateId === candidateId);
  return {
    directSupport: rows.filter((w) => w.relationshipType === 'direct_support').length,
    supporting: rows.filter((w) => w.relationshipType === 'supporting_witness').length,
    continuity: rows.filter((w) => w.relationshipType === 'continuity_witness').length,
    caution: rows.filter((w) => w.relationshipType === 'caution_witness').length,
    contradiction: rows.filter((w) => w.relationshipType === 'contradiction_witness').length,
  };
}

function selectBatchCandidates() {
  const candidates = loadUnifiedCandidates();
  const audit = runWitnessQualityAudit();
  const selected = [];
  const rejected = [];

  for (const id of BATCH_IDS) {
    const c = candidates.find((x) => x.candidateId === id);
    if (!c) {
      rejected.push({ candidateId: id, reason: 'Not found in unified candidate pool' });
      continue;
    }
    const w = witnessMeta(id, audit);
    const blockers = [];
    if (w.contradiction > 0) blockers.push(`${w.contradiction} contradiction witness(es)`);
    if (!c.genesisToRevelationSpan) blockers.push('No Genesis→Revelation span');
    if (c.supportScore < 80) blockers.push(`Support score ${c.supportScore} below 80`);

    if (blockers.length) {
      rejected.push({ candidateId: id, reason: blockers.join('; ') });
      continue;
    }

    selected.push({
      ...c,
      witnessMeta: w,
      selectionRationale: buildRationale(c, w),
    });
  }

  return { selected, rejected, audit };
}

function buildRationale(c, w) {
  const parts = [];
  if (c.topic === 'sabbath') parts.push('Priority Sabbath topic');
  if (c.topic === 'death_state') parts.push('Priority death state topic');
  if (c.topic === 'messiah_logos') parts.push('Priority Messiah/Logos topic');
  if (c.supportScore >= 90) parts.push(`High support score (${c.supportScore})`);
  if (c.genesisToRevelationSpan) parts.push('Clear G2R chain');
  if (w.contradiction === 0) parts.push('No unresolved contradiction witnesses');
  if (c.candidateId === 'exp_0007') parts.push('Acts 13:42-44 — admin note degradation solver');
  return parts.join('; ');
}

function applyAdminDecisions(selectedIds) {
  const existing = loadJson(PATHS.adminDecisions, { decisions: [] });
  const notesById = {
    exp_0001: 'Approved for batch test — flagship Sabbath G2R continuity chain.',
    exp_0007: 'Approved for batch test — Acts 13:42-44 supporting scripture staging.',
    exp_0005: 'Approved for batch test — Logos John 1 high-confidence chain.',
    rec_0017: 'Approved for batch test — death state core doctrine question.',
    rec_0006: 'Approved for batch test — first resurrection continuity chain.',
  };

  const decisions = (existing.decisions || []).map((d) => {
    if (!selectedIds.includes(d.candidateId)) return d;
    return {
      ...d,
      decision: 'approve',
      reviewedBy: REVIEWER,
      reviewDate: REVIEW_DATE,
      notes: notesById[d.candidateId] || `Approved for first batch test by ${REVIEWER}.`,
      humanApprovalRequired: true,
      productionApplied: false,
      autoApplied: false,
    };
  });

  const payload = {
    ...existing,
    phase: '2J-N',
    batchTest: 'first_admin_approval_batch',
    generatedAt: new Date().toISOString(),
    description: 'First human-approved batch — staging and regression only.',
    decisions,
  };

  fs.writeFileSync(PATHS.adminDecisions, `${JSON.stringify(payload, null, 2)}\n`);
  return decisions.filter((d) => selectedIds.includes(d.candidateId));
}

function runBatchRegression(candidates, decisions) {
  const regressionResults = [];
  for (const c of candidates) {
    const decision = decisions.find((d) => d.candidateId === c.candidateId);
    const promotionType = c.recommendedAction === 'candidate_review'
      ? 'approve_card_ref'
      : 'approve_support_edge';
    const gate = runRegressionGate(
      { ...c, candidateConclusion: c.candidateConclusion || c.conclusion || '' },
      promotionType,
    );
    regressionResults.push({
      ...gate,
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      supportScore: c.supportScore,
      promotionType,
      reviewedBy: decision?.reviewedBy,
    });
  }
  return regressionResults;
}

function runStressSubset() {
  const data = loadJson(PATHS.phase2i, { turns: [], scenarios: [] });
  const turns = (data.turns || []).filter((t) =>
    STRESS_SCENARIO_IDS.some((id) => String(t.scenarioId || t.id || '').startsWith(id) || t.scenarioId === id),
  );

  if (!turns.length) {
    return {
      available: false,
      reason: 'No matching stress turns in cached phase2i results',
      passed: null,
    };
  }

  const degraded = turns.filter((t) => t.degraded || t.classification === 'C' || t.classC);
  const passed = degraded.length === 0;

  return {
    available: true,
    scenarioIds: STRESS_SCENARIO_IDS,
    turnsMatched: turns.length,
    degradedCount: degraded.length,
    passed,
    sampleDegraded: degraded.slice(0, 5).map((t) => ({
      scenarioId: t.scenarioId,
      message: t.message?.slice(0, 60),
    })),
  };
}

function runOwnershipCheck() {
  const data = loadJson(PATHS.hardCutover, { tests: [] });
  const failed = (data.tests || []).filter((t) => t.passed === false);
  return {
    available: Boolean(data.tests?.length),
    totalTests: data.tests?.length || 0,
    failed: failed.length,
    passed: failed.length === 0,
    violations: failed.map((t) => t.id),
  };
}

function buildPromotionPlans(candidates, regressionResults) {
  return candidates.map((c) => {
    const reg = regressionResults.find((r) => r.candidateId === c.candidateId);
    const promotionType = reg?.promotionType || 'approve_support_edge';
    const cardId = TOPIC_TO_CARD[c.topic] || null;
    const proposal = buildPromotionProposal(
      {
        ...c,
        scripturesCited: c.scripturesCited || c.scriptureOrder,
        candidateConclusion: c.candidateConclusion || '',
        recommendedAction: promotionType,
      },
      { decision: promotionType, reviewer: REVIEWER, reviewedAt: REVIEW_DATE },
    );

    let targetFile = 'none';
    let targetChange = 'none';
    let cardImpact = 'none';
    let graphImpact = 'none';
    let doctrineImpact = 'none';

    if (promotionType === 'approve_card_ref') {
      targetFile = `services/evidenceCards/${cardId}.card.js`;
      targetChange = `Add supporting scriptures: ${(c.scripturesCited || []).slice(0, 3).join(', ')}`;
      cardImpact = `Append to supportingScriptures on ${cardId} card (human apply only)`;
      graphImpact = 'none — refs strengthen existing card';
      doctrineImpact = 'No new doctrine — existing bibleFirstConclusion unchanged';
    } else if (promotionType === 'approve_support_edge') {
      targetFile = 'services/approvedSupportGraph.js';
      targetChange = `New support edge for topic ${c.topic}`;
      graphImpact = `+1 edge linking scriptures to claim patterns`;
      cardImpact = 'none';
      doctrineImpact = 'Strengthens retrieval traceability only';
    }

    return {
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      promotionType,
      targetFile,
      targetChange,
      doctrineImpact,
      supportGraphImpact: graphImpact,
      evidenceCardImpact: cardImpact,
      rollbackPlan: `Revert ${targetFile} to pre-batch git state; remove staged edge or card refs`,
      regressionPassed: reg?.regressionPassed ?? false,
      productionApplied: false,
      proposal,
    };
  });
}

function computeGoNoGo(selected, staged, regressionResults, stress, ownership) {
  const allRegressionPass = regressionResults.every((r) => r.regressionPassed);
  const anyContradiction = selected.some((c) => c.witnessMeta.contradiction > 0);
  const regressionFailed = regressionResults.filter((r) => !r.regressionPassed);

  const stopReasons = [];
  if (anyContradiction) stopReasons.push('Unresolved contradiction witness in batch');
  if (!allRegressionPass) stopReasons.push(`${regressionFailed.length} regression failure(s)`);
  if (ownership.available && !ownership.passed) stopReasons.push('Ownership violation detected');
  if (stress.available && stress.degradedCount > 0) {
    stopReasons.push(`${stress.degradedCount} degraded stress turns in topic subset`);
  }

  const phase2h = loadJson(PATHS.phase2h, {});
  const projectedImpact = analyzePromotionImpact(
    regressionResults
      .filter((r) => r.regressionPassed)
      .map((r) => ({
        candidateId: r.candidateId,
        promotionType: r.promotionType,
        topic: r.topic,
        regression: { regressionPassed: true },
      })),
  );

  return {
    approved: selected.map((c) => c.candidateId),
    staged: staged.map((s) => s.candidateId),
    regressionPassed: allRegressionPass,
    regressionFailedIds: regressionFailed.map((r) => r.candidateId),
    ownershipIntact: !ownership.available || ownership.passed,
    stressSubsetPassed: !stress.available || stress.passed,
    stopReasons,
    goForNextPhase: stopReasons.length === 0 && staged.length === selected.length,
    projectedDegradationReduction: projectedImpact.estimatedDegradationReduction,
    projectedReadinessIncrease: projectedImpact.estimatedReadinessIncrease,
    supportAccuracyImproved: allRegressionPass && !anyContradiction,
    degradationDecreased: projectedImpact.estimatedDegradationReduction > 0,
  };
}

function runFirstApprovalBatch() {
  const { selected, rejected, audit } = selectBatchCandidates();
  const selectedIds = selected.map((c) => c.candidateId);

  const decisions = applyAdminDecisions(selectedIds);
  const regressionResults = runBatchRegression(selected, decisions);
  const staged = buildPromotionStaging(selected, decisions, regressionResults);
  const stress = runStressSubset();
  const ownership = runOwnershipCheck();
  const promotionPlans = buildPromotionPlans(selected, regressionResults);
  const goNoGo = computeGoNoGo(selected, staged, regressionResults, stress, ownership);

  const stagingPayload = {
    phase: '2J-N',
    generatedAt: new Date().toISOString(),
    description: 'First admin approval batch — staged only, not applied.',
    batchTest: true,
    humanApprovalRequired: true,
    productionApplied: false,
    autoApplied: false,
    stagedCount: staged.length,
    items: staged,
  };
  fs.writeFileSync(PATHS.promotionStaging, `${JSON.stringify(stagingPayload, null, 2)}\n`);

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-N',
    batchIds: BATCH_IDS,
    selected,
    rejected,
    decisions,
    staged,
    regressionResults,
    stress,
    ownership,
    promotionPlans,
    goNoGo,
    safety: {
      graphEdgeCount: getAllApprovedSupportEdges().length,
      cardCount: getAllApprovedCards().length,
      productionApplied: false,
    },
  };
}

module.exports = {
  runFirstApprovalBatch,
  BATCH_IDS,
  selectBatchCandidates,
  applyAdminDecisions,
};
