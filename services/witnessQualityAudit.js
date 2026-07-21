/**
 * Phase 2J-K — Scripture Witness Quality Audit.
 * Classifies witness roles from Phase 2J-J discoveries. No promotion.
 */

const { runCorpusExpansionDiscovery } = require('./corpusExpansionDiscovery');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const { refMatchesApproved, refInApprovedList } = require('./scriptureReferenceNormalizer');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const RELATIONSHIP_TYPES = [
  'direct_support',
  'supporting_witness',
  'confirming_witness',
  'continuity_witness',
  'caution_witness',
  'limiting_witness',
  'contradiction_witness',
  'unclassified',
];

const CONFIDENCE_BY_TYPE = {
  direct_support: 85,
  supporting_witness: 72,
  confirming_witness: 80,
  continuity_witness: 75,
  caution_witness: 62,
  limiting_witness: 58,
  contradiction_witness: 52,
  unclassified: 45,
};

function refKey(ref = '') {
  return String(ref).toLowerCase().trim();
}

function refInList(ref, list = []) {
  return list.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
}

function graphRelationshipForRef(ref, topic) {
  const norm = normalizeTopic(topic) || topic;
  const edges = getAllApprovedSupportEdges().filter((e) => e.topic === norm);
  for (const edge of edges) {
    if (!(edge.scriptures || []).some((s) => refMatchesApproved(ref, s))) continue;
    if (edge.supportType === 'contradicts') return 'contradiction_witness';
    if (edge.supportType === 'cautions_against') return 'caution_witness';
    if (['limits_claim', 'scripture_silent'].includes(edge.supportType)) return 'limiting_witness';
    if (['directly_affirms', 'indirectly_supports', 'supports', 'confirms', 'establishes'].includes(edge.supportType)) {
      return 'confirming_witness';
    }
  }
  return null;
}

function classifyWitnessesFromExpansion(witnessExpansion, candidate) {
  const topic = normalizeTopic(witnessExpansion.topic) || witnessExpansion.topic || candidate.topic;
  const classified = [];
  const seen = new Set();

  const addWitness = (ref, relationshipType, extra = {}) => {
    const key = `${refKey(ref)}::${relationshipType}`;
    if (!ref || seen.has(key)) return;
    seen.add(key);
    const kjv = verifyKjvReference(ref);
    let confidence = CONFIDENCE_BY_TYPE[relationshipType] || 45;
    if (relationshipType === 'direct_support' && kjv.valid) confidence = 88;
    if (!kjv.valid) confidence = Math.max(30, confidence - 20);

    classified.push({
      witnessRef: ref,
      topic,
      candidateId: candidate.candidateId,
      question: witnessExpansion.question,
      relationshipType,
      confidence,
      kjvValid: kjv.valid,
      ...extra,
    });
  };

  for (const ref of witnessExpansion.originalScriptures || []) {
    addWitness(ref, 'direct_support', { source: 'original_chain' });
  }

  for (const ref of witnessExpansion.supportingWitnesses || []) {
    const graphRel = graphRelationshipForRef(ref, topic);
    addWitness(ref, graphRel || 'supporting_witness', { source: graphRel ? 'support_graph' : 'card_or_g2r' });
  }

  for (const ref of witnessExpansion.confirmingWitnesses || []) {
    addWitness(ref, 'confirming_witness', { source: 'support_graph' });
  }

  for (const ref of witnessExpansion.continuityWitnesses || []) {
    addWitness(ref, 'continuity_witness', { source: 'continuity_chain' });
  }

  for (const ref of witnessExpansion.cautionWitnesses || []) {
    addWitness(ref, 'caution_witness', { source: 'card_or_graph' });
  }

  for (const ref of witnessExpansion.limitingWitnesses || []) {
    addWitness(ref, 'limiting_witness', { source: 'support_graph' });
  }

  for (const ref of witnessExpansion.contradictionWitnesses || []) {
    addWitness(ref, 'contradiction_witness', { source: 'support_graph' });
  }

  for (const ref of witnessExpansion.concordanceWitnesses || []) {
    if (!refInList(ref, witnessExpansion.originalScriptures)) {
      addWitness(ref, 'supporting_witness', { source: 'concordance' });
    }
  }

  const allKnown = new Set(classified.map((w) => refKey(w.witnessRef)));
  for (const ref of candidate.parallelRefs || []) {
    if (!allKnown.has(refKey(ref))) {
      addWitness(ref, 'continuity_witness', { source: 'parallel_discovery' });
    }
  }

  for (const ref of candidate.scriptures || []) {
    if (!allKnown.has(refKey(ref)) && !refInList(ref, witnessExpansion.originalScriptures)) {
      addWitness(ref, 'unclassified', { source: 'expanded_chain' });
    }
  }

  return classified;
}

function buildTopicReviewBundles(candidates, witnessClassifications, questions) {
  const topicMap = new Map();
  const approvedTopics = new Set(getAllApprovedCards().map((c) => c.topic));

  for (const c of candidates) {
    const topic = normalizeTopic(c.topic) || c.topic || 'open_topic';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        topic,
        questionCount: 0,
        originalChains: [],
        witnessCount: 0,
        directSupportCount: 0,
        supportingCount: 0,
        confirmingCount: 0,
        continuityCount: 0,
        cautionCount: 0,
        limitationCount: 0,
        contradictionCount: 0,
        unclassifiedCount: 0,
        candidateIds: [],
        supportScores: [],
        supportDeltas: [],
        hasApprovedCard: approvedTopics.has(topic),
      });
    }
    const bundle = topicMap.get(topic);
    bundle.questionCount += 1;
    bundle.originalChains.push(c.question);
    bundle.candidateIds.push(c.candidateId);
    bundle.supportScores.push(c.supportScore);
    bundle.supportDeltas.push(c.supportDelta || 0);
  }

  for (const w of witnessClassifications) {
    const topic = w.topic || 'open_topic';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        topic,
        questionCount: 0,
        originalChains: [],
        witnessCount: 0,
        directSupportCount: 0,
        supportingCount: 0,
        confirmingCount: 0,
        continuityCount: 0,
        cautionCount: 0,
        limitationCount: 0,
        contradictionCount: 0,
        unclassifiedCount: 0,
        candidateIds: [],
        supportScores: [],
        supportDeltas: [],
        hasApprovedCard: approvedTopics.has(topic),
      });
    }
    const bundle = topicMap.get(topic);
    bundle.witnessCount += 1;
    switch (w.relationshipType) {
      case 'direct_support': bundle.directSupportCount += 1; break;
      case 'supporting_witness': bundle.supportingCount += 1; break;
      case 'confirming_witness': bundle.confirmingCount += 1; break;
      case 'continuity_witness': bundle.continuityCount += 1; break;
      case 'caution_witness': bundle.cautionCount += 1; break;
      case 'limiting_witness': bundle.limitationCount += 1; break;
      case 'contradiction_witness': bundle.contradictionCount += 1; break;
      default: bundle.unclassifiedCount += 1;
    }
  }

  const qByTopic = {};
  for (const q of questions) {
    const t = normalizeTopic(q.topic) || q.topic || 'open_topic';
    qByTopic[t] = (qByTopic[t] || 0) + (q.frequency || 1);
  }

  return [...topicMap.values()].map((b) => {
    const avgScore = b.supportScores.length
      ? Math.round(b.supportScores.reduce((s, v) => s + v, 0) / b.supportScores.length)
      : 0;
    const avgDelta = b.supportDeltas.length
      ? Math.round(b.supportDeltas.reduce((s, v) => s + v, 0) / b.supportDeltas.length)
      : 0;
    const degradationReduction = Math.min(15, Math.round((avgScore / 100) * 8 + avgDelta * 0.1));
    const impactScore = Math.round(avgScore * 0.4 + b.witnessCount * 0.3 + b.directSupportCount * 2 + degradationReduction * 3);

    return {
      ...b,
      registryQuestionCount: qByTopic[b.topic] || b.questionCount,
      confidenceScore: avgScore,
      avgSupportDelta: avgDelta,
      degradationReductionPotential: degradationReduction,
      impactScore,
      reviewRequired: true,
      autoApplied: false,
    };
  }).sort((a, b) => b.impactScore - a.impactScore);
}

function determinePromotionReadiness(candidate, witnessExpansion, topicBundle) {
  const score = candidate.supportScore;
  const hasContradiction = (witnessExpansion.contradictionWitnesses || []).length > 0
    || (witnessExpansion.contradictions || []).length > 0;
  const hasCaution = (witnessExpansion.cautionWitnesses || []).length > 0;
  const hasApprovedCard = topicBundle?.hasApprovedCard ?? getAllApprovedCards().some((c) => c.topic === candidate.topic);
  const kjvIssues = (candidate.scriptures || []).some((r) => !verifyKjvReference(r).valid);

  if (kjvIssues || hasContradiction) {
    return {
      status: 'hold',
      reason: hasContradiction ? 'Contradiction witnesses present — admin hold required.' : 'KJV validation issues on scripture refs.',
    };
  }

  if (!hasApprovedCard && score < 80) {
    return {
      status: 'futureResearch',
      reason: 'Novel topic without approved card; score below strong-candidate threshold.',
    };
  }

  if (score >= 95 && hasApprovedCard && !hasCaution && !hasContradiction && (candidate.supportDelta || 0) >= 0) {
    return {
      status: 'promotionReady',
      reason: 'High confidence, approved topic, no caution/contradiction witnesses — ready for admin promotion review (not auto-applied).',
    };
  }

  if (score >= 95 && hasApprovedCard && !hasContradiction) {
    return {
      status: 'needsReview',
      reason: 'High confidence with caution witnesses — admin must review before any promotion.',
    };
  }

  if (score >= 70 || hasCaution) {
    return {
      status: 'needsReview',
      reason: hasCaution
        ? 'Caution witnesses require admin review before any promotion.'
        : 'Moderate confidence — standard admin review queue.',
    };
  }

  if (score >= 60) {
    return { status: 'hold', reason: 'Research band — hold pending additional witness development.' };
  }

  return { status: 'futureResearch', reason: 'Below research threshold — future discovery work.' };
}

function buildAdminPriorityRanking(topicBundles, candidates) {
  const byConfidence = [...topicBundles].sort((a, b) => b.confidenceScore - a.confidenceScore);
  const byImpact = [...topicBundles].sort((a, b) => b.impactScore - a.impactScore);
  const byDegradation = [...topicBundles].sort((a, b) => b.degradationReductionPotential - a.degradationReductionPotential);
  const bySupportIncrease = [...topicBundles].sort((a, b) => b.avgSupportDelta - a.avgSupportDelta);

  const candidateByScore = [...candidates].sort((a, b) => b.supportScore - a.supportScore);
  const candidateByDelta = [...candidates].sort((a, b) => (b.supportDelta || 0) - (a.supportDelta || 0));

  return {
    highestConfidenceTopics: byConfidence.slice(0, 10),
    highestImpactTopics: byImpact.slice(0, 10),
    largestDegradationReductionTopics: byDegradation.slice(0, 10),
    largestSupportIncreaseTopics: bySupportIncrease.slice(0, 10),
    topCandidatesByScore: candidateByScore.slice(0, 10),
    topCandidatesByDelta: candidateByDelta.slice(0, 10),
    reviewFirstTopics: byImpact.slice(0, 5).map((t) => t.topic),
  };
}

function runWitnessQualityAudit() {
  const expansion = runCorpusExpansionDiscovery();
  const { candidates, witnessExpansions, questions } = expansion;

  const witnessClassifications = [];
  const promotionReadiness = [];

  const topicBundles = buildTopicReviewBundles(candidates, [], questions);
  const bundleByTopic = new Map(topicBundles.map((b) => [b.topic, b]));

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const witnessExpansion = witnessExpansions[i];
    const classified = classifyWitnessesFromExpansion(witnessExpansion, candidate);
    witnessClassifications.push(...classified);

    const topic = normalizeTopic(candidate.topic) || candidate.topic;
    const bundle = bundleByTopic.get(topic);
    const readiness = determinePromotionReadiness(candidate, witnessExpansion, bundle);

    promotionReadiness.push({
      candidateId: candidate.candidateId,
      question: candidate.question,
      topic,
      supportScore: candidate.supportScore,
      supportDelta: candidate.supportDelta,
      promotionStatus: readiness.status,
      reason: readiness.reason,
      witnessCount: classified.length,
      cautionCount: classified.filter((w) => w.relationshipType === 'caution_witness').length,
      contradictionCount: classified.filter((w) => w.relationshipType === 'contradiction_witness').length,
      reviewRequired: true,
      autoApplied: false,
    });
  }

  const finalTopicBundles = buildTopicReviewBundles(candidates, witnessClassifications, questions);
  const priorityRanking = buildAdminPriorityRanking(finalTopicBundles, candidates);

  const byType = {};
  for (const t of RELATIONSHIP_TYPES) byType[t] = 0;
  for (const w of witnessClassifications) {
    byType[w.relationshipType] = (byType[w.relationshipType] || 0) + 1;
  }

  const readinessCounts = {
    promotionReady: promotionReadiness.filter((p) => p.promotionStatus === 'promotionReady').length,
    needsReview: promotionReadiness.filter((p) => p.promotionStatus === 'needsReview').length,
    hold: promotionReadiness.filter((p) => p.promotionStatus === 'hold').length,
    futureResearch: promotionReadiness.filter((p) => p.promotionStatus === 'futureResearch').length,
  };

  const strongestTopics = [...finalTopicBundles]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 8);

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-K',
    witnessClassifications,
    topicBundles: finalTopicBundles,
    priorityRanking,
    promotionReadiness,
    byType,
    readinessCounts,
    strongestTopics,
    sourceExpansion: {
      chainCount: candidates.length,
      witnessCount: witnessClassifications.length,
      topicCount: finalTopicBundles.length,
    },
    metrics: {
      totalWitnesses: witnessClassifications.length,
      byType,
      readinessCounts,
      strongestTopics: strongestTopics.map((t) => t.topic),
      reviewFirstTopics: priorityRanking.reviewFirstTopics,
    },
  };
}

module.exports = {
  runWitnessQualityAudit,
  classifyWitnessesFromExpansion,
  buildTopicReviewBundles,
  determinePromotionReadiness,
  RELATIONSHIP_TYPES,
};
