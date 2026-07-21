/**
 * Phase 2J-L — Admin Approval and Scripture Promotion Workflow.
 * Final approval layer between discovery and production. No auto-promotion.
 */

const fs = require('fs');
const path = require('path');
const {
  buildPromotionProposal,
  runPromotionRegressions,
} = require('./candidatePromotionEngine');
const { runWitnessQualityAudit } = require('./witnessQualityAudit');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');

const PATHS = {
  corpusPackage: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'CorpusExpansionAdminReviewPackage.json'),
  recoveryPackage: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'QuestionRecoveryAdminPackage.json'),
  adminDecisions: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'admin-decisions.json'),
  promotionStaging: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'promotion-staging.json'),
};

const DISCOVERY_FEEDS = [
  { id: 'corpus_expansion', phase: '2J-J', package: 'CorpusExpansionAdminReviewPackage.json' },
  { id: 'question_recovery', phase: '2J-H', package: 'QuestionRecoveryAdminReviewPackage.json' },
  { id: 'witness_expansion', phase: '2J-J-D2', package: 'FullScriptureWitnessExpansionReport.md' },
  { id: 'genesis_revelation', phase: '2J-C', package: 'genesis-revelation-review-package.json' },
  { id: 'bulk_discovery', phase: '2J-E', package: 'BulkDiscoveryAdminReviewPackageV2.json' },
  { id: 'future_iog', phase: 'future', package: 'pending_license' },
  { id: 'future_transcript', phase: 'future', package: 'pending_license' },
];

const ACTION_TO_PROMOTION_TYPE = {
  priority_admin_review: 'approve_support_edge',
  admin_review: 'approve_support_edge',
  candidate_review: 'approve_card_ref',
  research_review: 'hold',
  future_research: 'hold',
  hold: 'hold',
  approve: 'approve_support_edge',
  approve_card_ref: 'approve_card_ref',
  approve_support_edge: 'approve_support_edge',
  approve_catalog_chain: 'approve_catalog_chain',
};

function loadJson(p, fallback = {}) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeExpansionCandidate(c) {
  const originalScriptures = (c.scriptures || []).filter((ref) =>
    !(c.parallelRefs || []).includes(ref) || (c.scriptureOrder || []).includes(ref),
  );
  const originals = c.scriptureOrder?.length
    ? c.scriptureOrder.filter((r) => !((c.parallelRefs || []).includes(r) && !(c.scriptures || []).includes(r)))
    : originalScriptures;

  return {
    candidateId: c.candidateId,
    question: c.question,
    topic: c.topic,
    source: c.source || c.discoveryPhase || '2J-J',
    discoveryPhase: c.discoveryPhase || '2J-J',
    originalScriptures: originals.length ? originals : (c.scriptures || []).slice(0, 7),
    scriptureOrder: c.scriptureOrder || c.scriptures || [],
    discoveredWitnesses: c.parallelRefs || [],
    genesisToRevelationChain: c.genesisToRevelationChain || c.scriptureOrder || [],
    genesisToRevelationSpan: c.genesisToRevelationSpan || false,
    supportScore: c.supportScore || 0,
    supportDelta: c.supportDelta || 0,
    recommendedAction: c.recommendedAction || 'hold',
    scripturesCited: c.scriptures || c.scriptureOrder || [],
    scriptureOrderInternal: c.scriptureOrder || c.scriptures || [],
    candidateConclusion: c.conclusion || '',
    reviewRequired: true,
    autoApplied: false,
  };
}

function loadUnifiedCandidates() {
  const corpus = loadJson(PATHS.corpusPackage, { candidates: [] });
  const recovery = loadJson(PATHS.recoveryPackage, { candidates: [] });

  const byId = new Map();
  for (const c of corpus.candidates || []) {
    byId.set(c.candidateId, normalizeExpansionCandidate(c));
  }

  for (const c of recovery.candidates || []) {
    if (c.confidence < 70 || !c.candidateScriptures?.length) continue;
    const id = c.recoveryId || `rec_${c.candidateId}`;
    if (byId.has(id)) continue;
    byId.set(id, normalizeExpansionCandidate({
      candidateId: id,
      question: c.question,
      topic: c.topic,
      scriptures: c.candidateScriptures,
      scriptureOrder: c.candidateOrder,
      genesisToRevelationChain: c.candidateOrder,
      genesisToRevelationSpan: c.genesisToRevelationSpan,
      supportScore: c.confidence,
      conclusion: c.candidateConclusion,
      recommendedAction: c.confidence >= 80 ? 'candidate_review' : 'research_review',
      discoveryPhase: '2J-H',
    }));
  }

  return [...byId.values()];
}

function witnessCountsForCandidate(candidateId, witnessClassifications) {
  const rows = witnessClassifications.filter((w) => w.candidateId === candidateId);
  const count = (type) => rows.filter((w) => w.relationshipType === type).length;
  return {
    directSupportCount: count('direct_support'),
    supportingWitnessCount: count('supporting_witness'),
    confirmingWitnessCount: count('confirming_witness'),
    continuityWitnessCount: count('continuity_witness'),
    cautionWitnessCount: count('caution_witness'),
    contradictionWitnessCount: count('contradiction_witness'),
    totalWitnessCount: rows.length,
  };
}

function buildReviewRecords(candidates, witnessClassifications, readinessMap) {
  return candidates.map((c) => {
    const counts = witnessCountsForCandidate(c.candidateId, witnessClassifications);
    const readiness = readinessMap.get(c.candidateId);
    return {
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      discoveryPhase: c.discoveryPhase,
      originalScriptures: c.originalScriptures,
      scriptureOrder: c.scriptureOrder,
      discoveredWitnesses: c.discoveredWitnesses,
      genesisToRevelationChain: c.genesisToRevelationChain,
      genesisToRevelationSpan: c.genesisToRevelationSpan,
      supportScore: c.supportScore,
      ...counts,
      recommendedAction: c.recommendedAction,
      promotionReadiness: readiness?.promotionStatus || 'needsReview',
      reviewRequired: true,
      autoApplied: false,
    };
  });
}

function buildAdminDecisions(candidates, existingDecisions = {}) {
  const decisions = [];
  for (const c of candidates) {
    const existing = existingDecisions[c.candidateId];
    decisions.push({
      candidateId: c.candidateId,
      decision: existing?.decision ?? null,
      reviewedBy: existing?.reviewedBy ?? null,
      reviewDate: existing?.reviewDate ?? existing?.reviewedAt ?? null,
      notes: existing?.notes || `Awaiting admin review. Recommended: ${c.recommendedAction}. Score: ${c.supportScore}.`,
      question: c.question,
      topic: c.topic,
      supportScore: c.supportScore,
      recommendedAction: c.recommendedAction,
      humanApprovalRequired: true,
      productionApplied: false,
      autoApplied: false,
    });
  }
  return decisions;
}

function mapDecisionToPromotionType(decision, recommendedAction) {
  if (!decision || decision === 'hold' || decision === 'reject') return null;
  if (decision === 'approve') {
    return ACTION_TO_PROMOTION_TYPE[recommendedAction] || 'approve_support_edge';
  }
  return ACTION_TO_PROMOTION_TYPE[decision] || null;
}

function runRegressionGate(candidate, promotionType) {
  const proposal = buildPromotionProposal(
    {
      ...candidate,
      scripturesCited: candidate.scripturesCited,
      scriptureOrder: candidate.scriptureOrderInternal,
      candidateConclusion: candidate.candidateConclusion,
      recommendedAction: promotionType || 'hold',
    },
    { decision: promotionType || 'hold' },
  );

  const regression = runPromotionRegressions(proposal);
  const checks = regression.checks || {};

  return {
    candidateId: candidate.candidateId,
    regressionPassed: regression.regressionPassed,
    promotionReadinessScore: regression.promotionReadinessScore,
    approvalGatePassed: checks.approvalGate?.passed ?? false,
    ownershipPassed: checks.ownership?.passed ?? false,
    memoryPassed: checks.memory?.passed ?? false,
    supportPassed: checks.support?.passed ?? false,
    traceabilityPassed: checks.traceability?.passed ?? false,
    checks: {
      support: checks.support,
      traceability: checks.traceability,
      approvalGate: checks.approvalGate,
      ownership: checks.ownership,
      memory: checks.memory,
    },
    requiresRegression: true,
    productionApplied: false,
  };
}

function buildPromotionStaging(candidates, decisions, regressionResults) {
  const decisionMap = new Map(decisions.map((d) => [d.candidateId, d]));
  const regressionMap = new Map(regressionResults.map((r) => [r.candidateId, r]));
  const staged = [];

  for (const c of candidates) {
    const decision = decisionMap.get(c.candidateId);
    if (!decision || decision.decision !== 'approve') continue;

    const promotionType = mapDecisionToPromotionType(decision.decision, c.recommendedAction);
    const regression = regressionMap.get(c.candidateId);

    staged.push({
      candidateId: c.candidateId,
      question: c.question,
      topic: c.topic,
      promotionType,
      supportScore: c.supportScore,
      approvalMetadata: {
        reviewedBy: decision.reviewedBy,
        reviewDate: decision.reviewDate,
        notes: decision.notes,
        recommendedAction: c.recommendedAction,
        discoveryPhase: c.discoveryPhase,
      },
      regression: regression || null,
      requiresRegression: true,
      regressionPassed: regression?.regressionPassed ?? false,
      productionApplied: false,
      humanApprovalRequired: true,
      autoApplied: false,
      stagedAt: null,
    });
  }

  return staged;
}

function scoreBuckets(candidates) {
  return {
    above95: candidates.filter((c) => c.supportScore >= 95).length,
    above90: candidates.filter((c) => c.supportScore >= 90).length,
    above80: candidates.filter((c) => c.supportScore >= 80).length,
    above70: candidates.filter((c) => c.supportScore >= 70).length,
    below70: candidates.filter((c) => c.supportScore < 70).length,
  };
}

function readinessTracking(decisions, staged, regressionResults) {
  const approved = decisions.filter((d) => d.decision === 'approve').length;
  const held = decisions.filter((d) => d.decision === 'hold').length;
  const rejected = decisions.filter((d) => d.decision === 'reject').length;
  const awaiting = decisions.filter((d) => !d.decision).length;
  const regressionPassed = regressionResults.filter((r) => r.regressionPassed).length;

  return {
    awaitingReview: awaiting,
    approvedCandidates: approved,
    heldCandidates: held,
    rejectedCandidates: rejected,
    stagedCandidates: staged.length,
    regressionPassedCandidates: regressionPassed,
    totalCandidates: decisions.length,
  };
}

function runScriptureApprovalWorkflow(options = {}) {
  const audit = runWitnessQualityAudit();
  const candidates = loadUnifiedCandidates();
  const witnessClassifications = audit.witnessClassifications;
  const readinessMap = new Map(audit.promotionReadiness.map((r) => [r.candidateId, r]));

  const reviewRecords = buildReviewRecords(candidates, witnessClassifications, readinessMap);

  const existingFile = loadJson(PATHS.adminDecisions, {});
  const existingById = {};
  for (const d of existingFile.decisions || []) {
    existingById[d.candidateId] = d;
  }

  const decisions = buildAdminDecisions(candidates, existingById);

  const regressionResults = candidates.map((c) => {
    const promotionType = mapDecisionToPromotionType('approve', c.recommendedAction);
    return runRegressionGate(c, promotionType);
  });

  const staged = buildPromotionStaging(candidates, decisions, regressionResults);
  const buckets = scoreBuckets(candidates);
  const readiness = readinessTracking(decisions, staged, regressionResults);

  const pipeline = {
    stages: ['Discovery', 'Review', 'Approval', 'Regression', 'Promotion Package', 'Production'],
    feeds: DISCOVERY_FEEDS,
    rule: 'Never Discovery → Production directly',
    compatibility: {
      questionRecovery: true,
      genesisRevelationExpansion: true,
      witnessExpansion: true,
      corpusExpansion: true,
      futureIogDiscovery: true,
      futureTranscriptDiscovery: true,
    },
  };

  const corpusCount = candidates.filter((c) => c.discoveryPhase === '2J-J').length;
  const recoveryCount = candidates.filter((c) => c.discoveryPhase === '2J-H').length;

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-L',
    candidates,
    reviewRecords,
    decisions,
    regressionResults,
    staged,
    buckets,
    readiness,
    pipeline,
    feedCounts: { corpusExpansion: corpusCount, questionRecovery: recoveryCount },
    metrics: {
      ...readiness,
      ...buckets,
      corpusExpansionCandidates: corpusCount,
      questionRecoveryCandidates: recoveryCount,
      workflowReady: true,
    },
  };
}

function persistWorkflowOutputs(result) {
  fs.mkdirSync(path.dirname(PATHS.adminDecisions), { recursive: true });

  fs.writeFileSync(PATHS.adminDecisions, `${JSON.stringify({
    phase: '2J-L',
    generatedAt: result.ranAt,
    description: 'Admin decision storage — approve | reject | hold. No automatic actions.',
    allowedDecisions: ['approve', 'reject', 'hold'],
    humanApprovalRequired: true,
    productionApplied: false,
    autoApplied: false,
    decisions: result.decisions,
  }, null, 2)}\n`);

  fs.writeFileSync(PATHS.promotionStaging, `${JSON.stringify({
    phase: '2J-L',
    generatedAt: result.ranAt,
    description: 'Promotion staging queue — approved candidates only. Not applied to production.',
    humanApprovalRequired: true,
    productionApplied: false,
    autoApplied: false,
    stagedCount: result.staged.length,
    items: result.staged,
  }, null, 2)}\n`);
}

module.exports = {
  runScriptureApprovalWorkflow,
  persistWorkflowOutputs,
  loadUnifiedCandidates,
  buildReviewRecords,
  buildAdminDecisions,
  runRegressionGate,
  buildPromotionStaging,
  DISCOVERY_FEEDS,
  PATHS,
};
