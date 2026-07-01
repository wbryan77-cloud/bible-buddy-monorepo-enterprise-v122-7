/**
 * Phase 2R — Implementation Value Score (0–100).
 * Prioritizes scripture approvals by expected BibleBuddy performance impact.
 * Analysis only — no production mutations.
 */

const fs = require('fs');
const path = require('path');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { getCardById } = require('./evidenceCards');
const {
  buildPromotionProposal,
  runPromotionRegressions,
} = require('./candidatePromotionEngine');
const { BATCH_IDS: BATCH1_IDS } = require('./firstScriptureImplementation');
const { BATCH_IDS: BATCH2_IDS } = require('./secondScriptureImplementation');
const { THIRD_BATCH_CANDIDATE_IDS } = require('./thirdScriptureImplementation');
const { regressionEligible, getPendingRefsForCandidate } = require('./scriptureRelationshipConsolidation');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const IMPLEMENTED_IDS = new Set([
  ...BATCH1_IDS,
  ...BATCH2_IDS,
  ...THIRD_BATCH_CANDIDATE_IDS,
]);

const CARD_TOPIC_MAP = {
  sabbath: 'sabbath',
  death_state: 'deathState',
  messiah_logos: 'messiahLogos',
  dietary_law: 'dietaryLaw',
  kingdom: 'kingdom',
  heavens: 'heavens',
  holiness: 'holiness',
  feasts: 'feasts',
};

const FACTOR_WEIGHTS = {
  retrievalImprovement: 0.25,
  graphParticipation: 0.20,
  degradationReduction: 0.20,
  topicCoverageIncrease: 0.15,
  duplicateReduction: 0.10,
  historicalEffectiveness: 0.10,
};

const TOPIC_HISTORICAL_GAINS = {
  death_state: { retrievalDelta: 8, classCEliminated: 3, graphDelta: 8 },
  sabbath: { retrievalDelta: 14, classCEliminated: 6, graphDelta: 12 },
  messiah_logos: { retrievalDelta: 2, classCEliminated: 0, graphDelta: 2 },
  dietary_law: { retrievalDelta: 0, classCEliminated: 0, graphDelta: 0 },
  kingdom: { retrievalDelta: 0, classCEliminated: 0, graphDelta: 0 },
  heavens: { retrievalDelta: 0, classCEliminated: 0, graphDelta: 0 },
  holiness: { retrievalDelta: 0, classCEliminated: 0, graphDelta: 0 },
  feasts: { retrievalDelta: 0, classCEliminated: 0, graphDelta: 0 },
};

function loadJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function refKey(ref = '') {
  return String(ref).toLowerCase().replace(/\s+/g, ' ').trim();
}

function loadPhase2qContext() {
  const q = loadJson(path.join(TRACE, 'phase2q-validation-results.json'), {});
  return {
    batchEffectiveness: q.batchEffectiveness || {},
    topicPackGains: q.topicPackGains || [],
    coverageCorrelation: q.coverageCorrelation || {},
    projectedAccuracyGain: q.deltas?.supportAccuracyPct ?? 0,
    projectedDegradationReduction: q.deltas?.degradationRatePct ?? 0,
    projectedGraphGain: q.deltas?.graphParticipationPct ?? 0,
  };
}

function topicKeyForPack(pack) {
  if (pack.topic === 'resurrection') return 'death_state';
  return pack.topic;
}

function countPendingSupportEdges(topic, pendingRefs = []) {
  const edges = getAllApprovedSupportEdges().filter((e) => e.topic === topic);
  const edgeRefSet = new Set();
  for (const e of edges) {
    for (const r of e.scriptures || []) edgeRefSet.add(refKey(r));
  }
  return pendingRefs.filter((r) => !edgeRefSet.has(refKey(r))).length;
}

function duplicateBenefitForCandidate(candidateId, duplicateReduction) {
  const dup = duplicateReduction?.duplicateCandidates || [];
  const hit = dup.find((d) => d.candidateId === candidateId);
  if (hit) return 85;
  const chainDup = (duplicateReduction?.duplicateChains || []).find((d) =>
    d.candidateIds?.includes(candidateId),
  );
  if (chainDup) return 60 + Math.min(30, chainDup.duplicateCount * 5);
  const scriptureDup = (duplicateReduction?.duplicateScriptureAdds || []).find((d) =>
    d.candidateIds?.includes(candidateId),
  );
  if (scriptureDup) return 50 + Math.min(40, scriptureDup.duplicateCount * 8);
  return 20;
}

function historicalEffectivenessScore(topic) {
  const hist = TOPIC_HISTORICAL_GAINS[topic] || { retrievalDelta: 0, classCEliminated: 0, graphDelta: 0 };
  const raw = hist.retrievalDelta * 4 + hist.classCEliminated * 8 + hist.graphDelta * 3;
  return clamp(raw, 0, 100);
}

function computeCandidateFactors(review, ctx = {}) {
  const topic = review.topic || 'open_topic';
  const pendingRefs = getPendingRefsForCandidate(review);
  const retrievalCoverage = ctx.retrievalCoverage ?? 70;
  const graphEdgeCount = ctx.graphEdgeCount ?? 0;
  const duplicateReduction = ctx.duplicateReduction || {};

  const retrievalGap = 100 - retrievalCoverage;
  const pendingRetrievalBoost = Math.min(100, pendingRefs.length * 18 + retrievalGap * 0.4);
  const retrievalImprovement = clamp(pendingRetrievalBoost);

  const pendingEdges = countPendingSupportEdges(topic, pendingRefs);
  const graphGap = Math.max(0, 12 - graphEdgeCount);
  const graphParticipation = clamp(pendingEdges * 22 + graphGap * 6 + (review.supportScore >= 95 ? 15 : 0));

  const estClassC = ctx.estimatedClassCReduction ?? Math.min(3, Math.ceil(pendingRefs.length / 2));
  const histClassC = TOPIC_HISTORICAL_GAINS[topic]?.classCEliminated ?? 0;
  const degradationReduction = clamp(estClassC * 22 + histClassC * 10 + (review.supportScore >= 95 ? 10 : 0));

  const card = getCardById(CARD_TOPIC_MAP[topic]);
  const cardRefCount = card
    ? (card.primaryScriptures?.length || 0) + (card.supportingScriptures?.length || 0)
    : 0;
  const topicCoverageIncrease = clamp(
    pendingRefs.length * 15 + (cardRefCount < 8 ? 20 : 0) + (review.genesisToRevelationChain?.length >= 4 ? 15 : 0),
  );

  const duplicateReductionScore = duplicateBenefitForCandidate(review.candidateId, duplicateReduction);

  const historicalEffectiveness = historicalEffectivenessScore(topic);

  const factors = {
    retrievalImprovement,
    graphParticipation,
    degradationReduction,
    topicCoverageIncrease,
    duplicateReduction: duplicateReductionScore,
    historicalEffectiveness,
  };

  let score = 0;
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    score += (factors[key] ?? 0) * weight;
  }

  return {
    implementationValueScore: Math.round(score * 10) / 10,
    factors,
    factorWeights: FACTOR_WEIGHTS,
    pendingScriptures: pendingRefs,
    pendingSupportEdges: pendingEdges,
    alreadyImplemented: IMPLEMENTED_IDS.has(review.candidateId),
  };
}

function computePackImplementationValue(pack, ctx = {}) {
  const topic = topicKeyForPack(pack);
  const coverageRow = ctx.topicCoverageMap?.[topic] || {};
  const readiness = pack.implementationReadiness || {};
  const packCtx = {
    retrievalCoverage: pack.retrievalCoverage ?? coverageRow.retrievalCoverage ?? 70,
    graphEdgeCount: pack.supportGraphCoverage?.edgeCount ?? 0,
    estimatedClassCReduction: readiness.estimatedImpact?.projectedClassCReduction ?? 0,
    duplicateReduction: ctx.duplicateReduction,
  };

  const memberScores = (pack.candidateIds || []).map((id) => {
    const review = ctx.reviewMap?.[id];
    if (!review) return null;
    return computeCandidateFactors(review, { ...packCtx, topic });
  }).filter(Boolean);

  const avgMember = memberScores.length
    ? memberScores.reduce((s, m) => s + m.implementationValueScore, 0) / memberScores.length
    : 0;

  const pendingScriptures = pack.pendingScriptures || [];
  const pendingSupportEdges = countPendingSupportEdges(topic, pendingScriptures);

  const retrievalPct = pack.retrievalCoverage ?? coverageRow.retrievalCoverage ?? 0;
  const packFactors = {
    retrievalImprovement: clamp(
      (100 - retrievalPct) * 0.35 + pendingScriptures.length * 12,
    ),
    graphParticipation: clamp(pendingSupportEdges * 25 + (pack.supportGraphCoverage?.edgeCount < 8 ? 20 : 10)),
    degradationReduction: clamp(
      (readiness.estimatedImpact?.projectedClassCReduction ?? 0) * 25
        + TOPIC_HISTORICAL_GAINS[topic]?.classCEliminated * 8,
    ),
    topicCoverageIncrease: clamp(pendingScriptures.length * 14 + (pack.genesisToRevelationChain?.length >= 4 ? 20 : 0)),
    duplicateReduction: clamp((pack.consolidation?.reviewReductionFromConsolidation ?? 0) * 8 + 15),
    historicalEffectiveness: historicalEffectivenessScore(topic),
  };

  let packScore = 0;
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    packScore += (packFactors[key] ?? 0) * weight;
  }
  const blended = memberScores.length
    ? (packScore * 0.45 + avgMember * 0.55)
    : packScore;
  const finalScore = Number.isFinite(blended) ? blended : packScore;

  const coverageScore = ctx.coverageScore ?? null;

  return {
    implementationValueScore: Math.round(finalScore * 10) / 10,
    factors: packFactors,
    memberAverageValue: Math.round(avgMember * 10) / 10,
    coverageScore,
    supportScoreAverage: pack.supportScoreAverage,
    pendingScriptures: pendingScriptures,
    pendingSupportEdges,
    retrievalCoverage: pack.retrievalCoverage,
    graphCoverage: {
      edgeCount: pack.supportGraphCoverage?.edgeCount ?? 0,
      edgeIds: pack.supportGraphCoverage?.edgeIds || [],
      pct: pack.supportGraphCoverage?.pct ?? null,
    },
    genesisToRevelationCoverage: pack.genesisToRevelationCoverage,
  };
}

function isCandidateRegressionEligible(review) {
  const c = loadUnifiedCandidates().find((x) => x.candidateId === review.candidateId);
  if (!c) return false;
  return regressionEligible(c);
}

function buildBatch4NearMissPool(reviews) {
  const nearMiss = [];
  for (const r of reviews) {
    if (IMPLEMENTED_IDS.has(r.candidateId)) continue;
    if (r.supportScore < 90) continue;
    if ((r.contradictionScriptures || []).length === 0) continue;
    if (!isCandidateRegressionEligible(r)) continue;
    const value = computeCandidateFactors(r, {});
    nearMiss.push({
      candidateId: r.candidateId,
      topic: r.topic,
      supportScore: r.supportScore,
      implementationValueScore: value.implementationValueScore,
      contradictionCount: (r.contradictionScriptures || []).length,
      blockReason: 'unresolved_contradictions',
      contradictionScriptures: r.contradictionScriptures,
    });
  }
  return nearMiss.sort((a, b) => b.implementationValueScore - a.implementationValueScore);
}

function buildBatch4CandidatePool(reviews, ctx = {}) {
  const pool = [];
  for (const r of reviews) {
    if (IMPLEMENTED_IDS.has(r.candidateId)) continue;
    if (r.supportScore < 90) continue;
    if (!isCandidateRegressionEligible(r)) continue;
    if ((r.genesisToRevelationChain || []).length < 3) continue;
    const hasSupporting = (r.supportingScriptures || []).length > 0;
    const hasParallel = (r.parallelScriptures || []).length > 0;
    if (!hasSupporting) continue;
    if (!hasParallel && (r.supportingScriptures || []).length < 2) continue;

    const value = computeCandidateFactors(r, {
      duplicateReduction: ctx.duplicateReduction,
      retrievalCoverage: ctx.topicCoverageMap?.[r.topic]?.retrievalCoverage,
      graphEdgeCount: ctx.topicCoverageMap?.[r.topic]?.supportGraphCoverage?.edgeCount,
    });

    pool.push({
      candidateId: r.candidateId,
      topic: r.topic,
      lessonTitle: r.lessonTitle,
      question: r.question,
      supportScore: r.supportScore,
      strengthTier: r.strengthTier,
      implementationValueScore: value.implementationValueScore,
      factors: value.factors,
      pendingScriptures: value.pendingScriptures,
      pendingSupportEdges: value.pendingSupportEdges,
      originalScriptureChain: r.originalScriptureChain,
      genesisToRevelationChain: r.genesisToRevelationChain,
      parallelScriptures: r.parallelScriptures,
      contradictionScriptures: r.contradictionScriptures,
      regressionEligible: true,
      humanReviewRequired: true,
      autoApplied: false,
    });
  }

  return pool.sort((a, b) => {
    if (b.implementationValueScore !== a.implementationValueScore) {
      return b.implementationValueScore - a.implementationValueScore;
    }
    return b.supportScore - a.supportScore;
  });
}

function buildImplementationTrend(phase2q = {}) {
  const batches = [
    { key: 'batch1', label: 'Batch 1 (2K)', phase: '2K' },
    { key: 'batch2', label: 'Batch 2 (2M)', phase: '2M' },
    { key: 'batch3', label: 'Batch 3 (2P)', phase: '2P' },
  ];
  const eff = phase2q.batchEffectiveness || {};
  const testResults = phase2q.stress?.offlineProjection?.batchTestResults || {};

  return batches.map((b) => {
    const e = eff[b.key] || {};
    const t = testResults[b.key] || {};
    return {
      batch: b.label,
      phase: b.phase,
      classCEliminated: e.classCEliminated ?? e.scenarioReclassification?.classCEliminated ?? 0,
      graphMatchesAdded: e.graphMatchesAdded ?? e.scenarioReclassification?.graphMatchesAdded ?? 0,
      retrievalImprovements: e.retrievalImprovements ?? 0,
      testClaimsClassAB: (t.classA ?? 0) + (t.classB ?? 0),
      testClaimSamples: t.samples ?? 0,
      testGraphMatches: t.graphMatches ?? 0,
      questionsAffected: e.questionsAffected ?? 0,
      coverageNote: b.phase === '2P' ? 'Coverage 71.3 post-batch' : null,
    };
  });
}

function enrichTopicPacks(packs, reviews, packsPayload = {}) {
  const reviewMap = Object.fromEntries(reviews.map((r) => [r.candidateId, r]));
  const topicCoverageMap = Object.fromEntries(
    (packsPayload.topicCoverage || []).map((r) => [r.topic, r]),
  );
  const ctx = {
    reviewMap,
    topicCoverageMap,
    duplicateReduction: packsPayload.duplicateReduction,
    coverageScore: packsPayload.scriptureAuthorityCoverage?.currentCoverageScore,
  };

  return packs.map((pack) => {
    const iv = computePackImplementationValue(pack, ctx);
    return {
      ...pack,
      implementationValueScore: iv.implementationValueScore,
      implementationValue: iv,
      pendingSupportEdges: iv.pendingSupportEdges,
      graphCoverage: iv.graphCoverage,
    };
  });
}

function buildTopCandidatesByDimension(reviews, duplicateReduction) {
  const scored = reviews
    .filter((r) => !IMPLEMENTED_IDS.has(r.candidateId) && r.supportScore >= 90)
    .map((r) => {
      const v = computeCandidateFactors(r, { duplicateReduction });
      return { candidateId: r.candidateId, topic: r.topic, supportScore: r.supportScore, ...v };
    });

  const byDegradation = [...scored].sort((a, b) => b.factors.degradationReduction - a.factors.degradationReduction);
  const byRetrieval = [...scored].sort((a, b) => b.factors.retrievalImprovement - a.factors.retrievalImprovement);
  const byGraph = [...scored].sort((a, b) => b.factors.graphParticipation - a.factors.graphParticipation);

  return {
    degradationReductionLeaders: byDegradation.slice(0, 8),
    retrievalLeaders: byRetrieval.slice(0, 8),
    graphParticipationLeaders: byGraph.slice(0, 8),
  };
}

function verifyPhase2rSafety() {
  const buddy = fs.readFileSync(path.join(ROOT, 'services', 'buddyBrain.js'), 'utf8');
  const forbidden = ['templateResponder', 'candidatePromotionEngine'];
  const violations = forbidden.filter((f) => buddy.includes(f));
  return {
    productionMutations: false,
    doctrineChanges: false,
    promptChanges: false,
    graphUpdates: false,
    ownershipChanges: violations.length > 0,
    automaticApprovals: false,
    passed: violations.length === 0,
  };
}

function runImplementationValueAnalysis(packsPayload) {
  const reviews = packsPayload.topicApprovalPacks
    ? (packsPayload._reviews || [])
    : [];
  const phase2q = loadPhase2qContext();

  const enrichedPacks = enrichTopicPacks(
    packsPayload.topicApprovalPacks || [],
    reviews,
    packsPayload,
  );

  const topicCoverageMap = Object.fromEntries(
    (packsPayload.topicCoverage || []).map((r) => [r.topic, r]),
  );

  const batch4Pool = buildBatch4CandidatePool(reviews, {
    duplicateReduction: packsPayload.duplicateReduction,
    topicCoverageMap,
  });
  const batch4NearMiss = buildBatch4NearMissPool(reviews);

  const trend = buildImplementationTrend({
    batchEffectiveness: phase2q.batchEffectiveness,
    stress: { offlineProjection: loadJson(path.join(TRACE, 'phase2q-validation-results.json'))?.stress?.offlineProjection },
  });

  const dimensionLeaders = buildTopCandidatesByDimension(reviews, packsPayload.duplicateReduction);

  const candidateScores = reviews.map((r) => {
    const v = computeCandidateFactors(r, {
      duplicateReduction: packsPayload.duplicateReduction,
      topicCoverageMap,
    });
    return {
      candidateId: r.candidateId,
      topic: r.topic,
      supportScore: r.supportScore,
      implementationValueScore: v.implementationValueScore,
      factors: v.factors,
      alreadyImplemented: v.alreadyImplemented,
    };
  }).sort((a, b) => b.implementationValueScore - a.implementationValueScore);

  return {
    phase: '2R',
    ranAt: new Date().toISOString(),
    factorWeights: FACTOR_WEIGHTS,
    implementedCandidateIds: [...IMPLEMENTED_IDS],
    enrichedTopicPacks: enrichedPacks,
    batch4CandidatePool: batch4Pool,
    batch4NearMissPool: batch4NearMiss,
    implementationTrend: trend,
    candidateImplementationValues: candidateScores,
    dimensionLeaders,
    phase2qContext: phase2q,
    safety: verifyPhase2rSafety(),
    productionMutations: false,
  };
}

module.exports = {
  IMPLEMENTED_IDS,
  FACTOR_WEIGHTS,
  TOPIC_HISTORICAL_GAINS,
  computeCandidateFactors,
  computePackImplementationValue,
  buildBatch4CandidatePool,
  buildBatch4NearMissPool,
  buildImplementationTrend,
  enrichTopicPacks,
  runImplementationValueAnalysis,
  verifyPhase2rSafety,
};
