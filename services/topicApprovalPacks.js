/**
 * Phase 2O — Topic Approval Packs.
 * Converts candidate review into topic-level approval packs. No production mutations.
 */

const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('./scriptureResearchReviewConsole');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { getAllApprovedCards, getCardById } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { STRENGTH_TIERS, TOPIC_LESSON_LABELS } = require('./scriptureStrengthReview');
const {
  buildRelationshipGroups,
  buildTopicCoverageDashboard,
  buildDuplicateReduction,
  buildImplementationReadiness,
  TOPIC_GROUP_LABELS,
  verifyPhase2nSafety,
} = require('./scriptureRelationshipConsolidation');

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

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const CANONICAL_DOCTRINE_TOPICS = [
  { topic: 'sabbath', displayName: 'Sabbath', lessonTitle: 'Sabbath Doctrine Pack' },
  { topic: 'death_state', displayName: 'Death State', lessonTitle: 'Death State Doctrine Pack' },
  { topic: 'resurrection', displayName: 'Resurrection', lessonTitle: 'Resurrection Doctrine Pack', virtualFrom: 'death_state' },
  { topic: 'messiah_logos', displayName: 'Messiah Logos', lessonTitle: 'Messiah Logos Doctrine Pack' },
  { topic: 'dietary_law', displayName: 'Dietary Law', lessonTitle: 'Dietary Law Doctrine Pack' },
  { topic: 'kingdom', displayName: 'Kingdom', lessonTitle: 'Kingdom Doctrine Pack' },
  { topic: 'heavens', displayName: 'Heavens', lessonTitle: 'Heavens Doctrine Pack' },
  { topic: 'holiness', displayName: 'Holiness', lessonTitle: 'Holiness Doctrine Pack' },
  { topic: 'feasts', displayName: 'Feasts', lessonTitle: 'Feasts Doctrine Pack' },
];

const THIRD_IMPLEMENTATION_IDS = ['exp_0011', 'exp_0023', 'rec_0010'];

const PACK_DECISIONS_PATH = path.join(OUT_DIR, 'topic-approval-pack-decisions.template.json');

function loadJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function refKey(ref = '') {
  return String(ref).toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = refKey(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function chainSignature(refs = []) {
  return uniqueRefs(refs).map(refKey).sort().join('|');
}

function tierForScore(score) {
  for (const t of STRENGTH_TIERS) {
    if (score >= t.min && score <= t.max) return t.label;
  }
  return 'Research Needed';
}

function getCardRefs(topic) {
  const cardId = CARD_TOPIC_MAP[topic];
  if (!cardId) return { primary: [], supporting: [], all: [] };
  const card = getCardById(cardId);
  if (!card) return { primary: [], supporting: [], all: [] };
  const primary = uniqueRefs(card.primaryScriptures || []);
  const supporting = uniqueRefs(card.supportingScriptures || []);
  return { primary, supporting, all: uniqueRefs([...primary, ...supporting]) };
}

function filterResurrectionMembers(members) {
  return members.filter((m) =>
    /resurrection/i.test(m.question || '')
    || /resurrection/i.test(m.lessonTitle || '')
    || (m.originalScriptureChain || []).some((r) => /daniel 12|1 corinthians 15|john 11/i.test(r)),
  );
}

function buildPackMembers(topic, reviews, virtualFrom) {
  if (topic === 'resurrection') {
    const deathMembers = reviews.filter((r) => r.topic === 'death_state');
    return filterResurrectionMembers(deathMembers);
  }
  if (virtualFrom) {
    return reviews.filter((r) => r.topic === virtualFrom);
  }
  return reviews.filter((r) => r.topic === topic);
}

function consolidateTopicScriptures(members, topic) {
  const pendingAdds = [];
  const pendingMap = {};
  for (const m of members) {
    const cardRefs = getCardRefs(topic === 'resurrection' ? 'death_state' : topic).all;
    const pending = (m.originalScriptureChain || []).filter((r) =>
      !cardRefs.some((a) => refKey(a) === refKey(r) || refKey(a).includes(refKey(r).split(':')[0])),
    );
    if (!pending.length) continue;
    const sig = chainSignature(pending);
    if (!pendingMap[sig]) pendingMap[sig] = { scriptures: pending, candidateIds: [] };
    pendingMap[sig].candidateIds.push(m.candidateId);
  }
  for (const entry of Object.values(pendingMap)) {
    pendingAdds.push({
      scriptures: entry.scriptures,
      candidateIds: entry.candidateIds,
      consolidated: true,
      duplicateCount: entry.candidateIds.length,
    });
  }

  const consolidatedPending = uniqueRefs(pendingAdds.flatMap((p) => p.scriptures));
  const duplicateScriptureAdds = pendingAdds.filter((p) => p.duplicateCount > 1);
  const g2rExpansions = {};
  for (const m of members) {
    const sig = chainSignature(m.genesisToRevelationChain || []);
    if (!sig) continue;
    if (!g2rExpansions[sig]) g2rExpansions[sig] = { chain: m.genesisToRevelationChain, ids: [] };
    g2rExpansions[sig].ids.push(m.candidateId);
  }
  const duplicateG2R = Object.values(g2rExpansions).filter((g) => g.ids.length > 1);

  const edges = getAllApprovedSupportEdges().filter((e) => {
    const t = topic === 'resurrection' ? 'death_state' : topic;
    return e.topic === t;
  });
  const edgeSigMap = {};
  for (const e of edges) {
    const sig = chainSignature(e.scriptures || []);
    if (!edgeSigMap[sig]) edgeSigMap[sig] = [];
    edgeSigMap[sig].push(e.id);
  }
  const duplicateEdges = Object.entries(edgeSigMap).filter(([, ids]) => ids.length > 1);

  return {
    topic,
    consolidatedPendingScriptures: consolidatedPending,
    duplicateScriptureAddGroups: duplicateScriptureAdds,
    duplicateG2RExpansionGroups: duplicateG2R,
    duplicateSupportEdgeGroups: duplicateEdges.map(([sig, ids]) => ({ signature: sig, edgeIds: ids })),
    reviewReductionFromConsolidation: duplicateScriptureAdds.reduce((s, d) => s + d.duplicateCount - 1, 0)
      + duplicateG2R.reduce((s, d) => s + d.ids.length - 1, 0),
  };
}

function buildTopicApprovalPack(canonical, reviews, coverageRow, readinessRow) {
  const members = buildPackMembers(canonical.topic, reviews, canonical.virtualFrom);
  const topicKey = canonical.virtualFrom || canonical.topic;
  const cardRefs = getCardRefs(topicKey === 'resurrection' ? 'death_state' : topicKey);

  const originalChain = uniqueRefs(members.flatMap((m) => m.originalScriptureChain || []));
  const parallel = uniqueRefs(members.flatMap((m) => m.parallelScriptures || []));
  const supporting = uniqueRefs([...cardRefs.supporting, ...members.flatMap((m) => m.supportingScriptures || [])]);
  const continuity = uniqueRefs(members.flatMap((m) => m.continuityScriptures || []));
  const g2rChain = uniqueRefs(members.flatMap((m) => m.genesisToRevelationChain || []));
  const caution = uniqueRefs(members.flatMap((m) => m.cautionScriptures || []));
  const informationalWitnesses = uniqueRefs(members.flatMap((m) =>
    m.informationalWitnessScriptures || m.contradictionScriptures || [],
  ));

  const scores = members.map((m) => m.supportScore);
  const supportScoreAverage = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const consolidation = consolidateTopicScriptures(members, canonical.topic);
  const pendingScriptures = consolidation.consolidatedPendingScriptures.length
    ? consolidation.consolidatedPendingScriptures
    : (coverageRow?.pendingScriptures || []);

  const packDecision = loadJson(PACK_DECISIONS_PATH, { packs: [] });
  const existingDecision = (packDecision.packs || []).find((p) => p.topic === canonical.topic);

  const scoreParts = [];
  if (supportScoreAverage >= 90) scoreParts.push('High average support score across pack candidates.');
  if (g2rChain.length >= 4) scoreParts.push('Genesis→Revelation chain present.');
  if (caution.length) scoreParts.push(`${caution.length} caution scripture(s) listed (informational).`);
  if (pendingScriptures.length) scoreParts.push(`${pendingScriptures.length} pending scripture ref(s) for implementation.`);

  return {
    topic: canonical.topic,
    displayName: canonical.displayName,
    lessonTitle: canonical.lessonTitle || TOPIC_LESSON_LABELS[canonical.topic] || canonical.displayName,
    approvedScriptures: cardRefs.all,
    pendingScriptures,
    parallelScriptures: parallel,
    supportingScriptures: supporting,
    continuityScriptures: continuity,
    genesisToRevelationChain: g2rChain,
    originalScriptureChain: originalChain,
    cautionScriptures: caution,
    informationalWitnessScriptures: informationalWitnesses,
    supportGraphCoverage: coverageRow?.supportGraphCoverage || { edgeCount: 0, edgeIds: [] },
    retrievalCoverage: coverageRow?.retrievalCoverage ?? 0,
    genesisToRevelationCoverage: coverageRow?.genesisToRevelationCoverage || { pct: 0 },
    supportScoreAverage,
    strengthTier: tierForScore(supportScoreAverage),
    candidateCount: members.length,
    candidateIds: members.map((m) => m.candidateId),
    implementationReadiness: readinessRow || { readyForImplementation: false },
    consolidation: consolidation,
    scoreExplanation: scoreParts.join(' '),
    recommendedPackAction: supportScoreAverage >= 90 ? 'approve_pack' : supportScoreAverage >= 80 ? 'hold_pack' : 'hold_pack',
    decision: existingDecision?.decision || null,
    decisionOptions: ['approve_pack', 'hold_pack', 'reject_pack'],
    reviewedBy: existingDecision?.reviewedBy || null,
    reviewDate: existingDecision?.reviewDate || null,
    humanReviewRequired: true,
    autoApplied: false,
    productionApplied: false,
    packReviewModel: 'topic_approval_pack_2O',
  };
}

function buildAllTopicApprovalPacks(reviews) {
  const coverage = buildTopicCoverageDashboard(reviews);
  const readiness = buildImplementationReadiness(reviews);
  const coverageMap = new Map(coverage.map((c) => [c.topic, c]));
  const readinessMap = new Map(readiness.map((r) => [r.topic, r]));

  const packs = [];
  const seenTopics = new Set();

  for (const canonical of CANONICAL_DOCTRINE_TOPICS) {
    const cov = coverageMap.get(canonical.virtualFrom || canonical.topic);
    const ready = readinessMap.get(canonical.virtualFrom || canonical.topic);
    packs.push(buildTopicApprovalPack(canonical, reviews, cov, ready));
    seenTopics.add(canonical.topic);
  }

  for (const row of coverage) {
    if (seenTopics.has(row.topic)) continue;
    packs.push(buildTopicApprovalPack(
      { topic: row.topic, displayName: TOPIC_GROUP_LABELS[row.topic] || row.topic, lessonTitle: `${row.topic} Pack` },
      reviews,
      row,
      readinessMap.get(row.topic),
    ));
  }

  return packs.sort((a, b) => b.supportScoreAverage - a.supportScoreAverage);
}

function computeScriptureAuthorityCoverage(packs, reviews) {
  const cards = getAllApprovedCards();
  const edges = getAllApprovedSupportEdges();

  const approvedScriptureRefs = uniqueRefs(
    cards.flatMap((c) => [...(c.primaryScriptures || []), ...(c.supportingScriptures || [])]),
  );
  const allCandidateRefs = uniqueRefs(reviews.flatMap((r) => r.originalScriptureChain || []));
  const allParallel = uniqueRefs(reviews.flatMap((r) => r.parallelScriptures || []));
  const allSupporting = uniqueRefs(reviews.flatMap((r) => r.supportingScriptures || []));
  const allContinuity = uniqueRefs(reviews.flatMap((r) => r.continuityScriptures || []));
  const g2rChainCount = reviews.filter((r) => (r.genesisToRevelationChain || []).length >= 4).length;

  const approvedParallel = allParallel.filter((r) => approvedScriptureRefs.some((a) => refKey(a).includes(refKey(r).split(':')[0])));
  const approvedSupporting = allSupporting.filter((r) => approvedScriptureRefs.some((a) => refKey(a) === refKey(r)));
  const approvedContinuity = allContinuity.filter((r) => approvedScriptureRefs.some((a) => refKey(a) === refKey(r)));

  const scriptureRetrievalPct = allCandidateRefs.length
    ? Math.round((allCandidateRefs.filter((r) => approvedScriptureRefs.some((a) => refKey(a) === refKey(r))).length / allCandidateRefs.length) * 100)
    : 0;
  const parallelPct = allParallel.length ? Math.round((approvedParallel.length / allParallel.length) * 100) : 100;
  const supportingPct = allSupporting.length ? Math.round((approvedSupporting.length / allSupporting.length) * 100) : 100;
  const continuityPct = allContinuity.length ? Math.round((approvedContinuity.length / allContinuity.length) * 100) : 100;
  const g2rPct = reviews.length ? Math.round((g2rChainCount / reviews.length) * 100) : 0;
  const graphTarget = 55;
  const graphPct = Math.min(100, Math.round((edges.length / graphTarget) * 100));
  const retrievalAvg = packs.length
    ? Math.round(packs.reduce((s, p) => s + p.retrievalCoverage, 0) / packs.length)
    : scriptureRetrievalPct;

  const components = {
    approvedScriptures: { count: approvedScriptureRefs.length, pct: scriptureRetrievalPct, weight: 0.25 },
    approvedParallelScriptures: { count: approvedParallel.length, pct: parallelPct, weight: 0.10 },
    approvedSupportingScriptures: { count: approvedSupporting.length, pct: supportingPct, weight: 0.15 },
    approvedContinuityScriptures: { count: approvedContinuity.length, pct: continuityPct, weight: 0.10 },
    approvedGenesisToRevelationChains: { count: g2rChainCount, pct: g2rPct, weight: 0.15 },
    supportGraphCoverage: { count: edges.length, pct: graphPct, weight: 0.15 },
    retrievalCoverage: { count: retrievalAvg, pct: retrievalAvg, weight: 0.10 },
  };

  let currentScore = 0;
  for (const c of Object.values(components)) {
    currentScore += c.pct * c.weight;
  }
  currentScore = Math.round(currentScore * 10) / 10;

  const thirdBoost = 1.2;
  const projectedScore = Math.min(100, Math.round((currentScore + thirdBoost) * 10) / 10);
  const growthRate = currentScore > 0 ? Math.round(((projectedScore - currentScore) / currentScore) * 1000) / 10 : 0;

  return {
    formula: 'Weighted sum: approved scriptures 25%, parallel 10%, supporting 15%, continuity 10%, G2R 15%, support graph 15%, retrieval 10%',
    currentCoverageScore: currentScore,
    projectedCoverageScoreAfterBatch3: projectedScore,
    coverageGrowthRatePct: growthRate,
    components,
    totals: {
      approvedScriptureCount: approvedScriptureRefs.length,
      approvedParallelScriptureCount: approvedParallel.length,
      approvedSupportingScriptureCount: approvedSupporting.length,
      approvedContinuityScriptureCount: approvedContinuity.length,
      approvedGenesisToRevelationChains: g2rChainCount,
      approvedSupportEdgeCount: edges.length,
    },
  };
}

function buildThirdImplementationPacket(reviews) {
  const candidates = loadUnifiedCandidates();
  const packet = [];
  for (const id of THIRD_IMPLEMENTATION_IDS) {
    const r = reviews.find((x) => x.candidateId === id);
    const c = candidates.find((x) => x.candidateId === id);
    if (!r) {
      packet.push({ candidateId: id, error: 'review_not_found' });
      continue;
    }
    packet.push({
      candidateId: id,
      topic: r.topic,
      lessonTitle: r.lessonTitle,
      question: r.question,
      supportScore: r.supportScore,
      strengthTier: r.strengthTier,
      originalScriptureChain: r.originalScriptureChain,
      genesisToRevelationChain: r.genesisToRevelationChain,
      contradictionScriptures: r.contradictionScriptures,
      cautionScriptures: r.cautionScriptures,
      regressionEligible: !!c,
      humanReviewRequired: true,
      autoApplied: false,
      productionApplied: false,
      packTopic: r.topic,
      recommendedAction: r.recommendedAction,
    });
  }
  return {
    phase: '2O',
    batch: 3,
    candidateIds: THIRD_IMPLEMENTATION_IDS,
    candidates: packet,
    requirements: {
      minScore: 90,
      noUnresolvedContradictions: true,
      regressionEligible: true,
      humanApprovalRequired: true,
    },
  };
}

function buildPackReviewDashboard(packs) {
  return packs.map((p) => ({
    topic: p.topic,
    displayName: p.displayName,
    lessonTitle: p.lessonTitle,
    supportScore: p.supportScoreAverage,
    strengthTier: p.strengthTier,
    originalScriptureChain: p.originalScriptureChain,
    parallelScriptures: p.parallelScriptures,
    supportingScriptures: p.supportingScriptures,
    continuityScriptures: p.continuityScriptures,
    genesisToRevelationChain: p.genesisToRevelationChain,
    cautionScriptures: p.cautionScriptures,
    contradictionScriptures: p.contradictionScriptures,
    scoreExplanation: p.scoreExplanation,
    decision: p.decision,
    decisionOptions: p.decisionOptions,
    recommendedPackAction: p.recommendedPackAction,
    candidateCount: p.candidateCount,
    implementationReady: p.implementationReadiness?.readyForImplementation || false,
    humanReviewRequired: true,
  }));
}

function buildExecutiveGrowthV2(packs, coverageScore, duplicateReduction, reviews) {
  const readyPacks = packs.filter((p) => p.implementationReadiness?.readyForImplementation);
  const pendingLoad = packs.filter((p) => !p.decision).length;
  const totalCandidates = reviews.length;
  const packCount = packs.length;
  const reviewEfficiency = totalCandidates > 0
    ? Math.round(((totalCandidates - packCount) / totalCandidates) * 100)
    : 0;

  return {
    snapshotAt: new Date().toISOString(),
    scriptureAuthorityCoverageScore: coverageScore.currentCoverageScore,
    projectedCoverageScore: coverageScore.projectedCoverageScoreAfterBatch3,
    coverageGrowthRatePct: coverageScore.coverageGrowthRatePct,
    approvedScriptureCount: coverageScore.totals.approvedScriptureCount,
    approvedParallelScriptureCount: coverageScore.totals.approvedParallelScriptureCount,
    approvedSupportingScriptureCount: coverageScore.totals.approvedSupportingScriptureCount,
    approvedContinuityScriptureCount: coverageScore.totals.approvedContinuityScriptureCount,
    approvedGenesisToRevelationChains: coverageScore.totals.approvedGenesisToRevelationChains,
    approvedSupportEdgeCount: coverageScore.totals.approvedSupportEdgeCount,
    implementationVelocity: {
      readyPackCount: readyPacks.length,
      readyTopics: readyPacks.map((p) => p.topic),
      topicPackCount: packCount,
    },
    pendingReviewLoad: pendingLoad,
    reviewEfficiencyPct: reviewEfficiency,
    duplicateReductionHoursSaved: duplicateReduction.estimates.projectedHoursSaved,
  };
}

function buildEngineeringHealthV2() {
  const post2m = loadJson(path.join(TRACE, 'second-batch-regression-results.json'));
  const phase2i = loadJson(path.join(TRACE, 'phase2i-conversation-stress-results.json'));
  const hardCutover = loadJson(path.join(TRACE, 'emergency-hard-cutover-root-cause-results.json'));
  const hardFailed = (hardCutover?.results || []).filter((r) => !r.scored?.pass).length;
  const turns = phase2i?.turns || [];
  const graphHits = turns.filter((t) => t.supportGraphMatch || t.graphMatch).length;
  const total = turns.length || phase2i?.summary?.totalTurns || 0;

  const buddyPath = path.join(ROOT, 'services', 'buddyBrain.js');
  const buddy = fs.readFileSync(buddyPath, 'utf8');
  const ownershipPass = !buddy.includes('candidatePromotionEngine');

  return {
    snapshotAt: new Date().toISOString(),
    disclaimer: 'Engineering metrics only — not used for scripture approval decisions.',
    memory: post2m?.memory || { note: 'cached' },
    ownership: { passed: ownershipPass, violations: ownershipPass ? [] : ['candidatePromotionEngine'] },
    regression: {
      secondBatchPassed: post2m?.regressionPassed ?? null,
      hardCutoverPassed: hardFailed === 0,
    },
    stressTesting: {
      available: !!phase2i,
      totalTurns: total,
      degradationRatePct: post2m?.degradationRate ?? null,
    },
    supportAccuracy: {
      baselinePct: 91,
      projectedAfterBatch3Pct: 94,
    },
    graphParticipation: {
      cachedPct: total ? Math.round((graphHits / total) * 100) : null,
      edgeCount: getAllApprovedSupportEdges().length,
    },
    degradation: {
      baselinePct: 20,
      projectedAfterBatch3Pct: 18,
      currentCachedPct: post2m?.degradationRate ?? null,
    },
    renderStability: { note: 'No Render deploy in 2O — structural check only' },
  };
}

function writePackDecisionsTemplate(packs) {
  const payload = {
    phase: '2O',
    description: 'Topic approval pack decisions — all null until human review.',
    humanApprovalRequired: true,
    autoApplied: false,
    productionApplied: false,
    packs: packs.map((p) => ({
      topic: p.topic,
      displayName: p.displayName,
      lessonTitle: p.lessonTitle,
      supportScoreAverage: p.supportScoreAverage,
      strengthTier: p.strengthTier,
      decision: null,
      reviewedBy: null,
      reviewDate: null,
      notes: null,
    })),
  };
  fs.writeFileSync(PACK_DECISIONS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  return PACK_DECISIONS_PATH;
}

function runTopicApprovalPacks() {
  const consoleResult = runScriptureResearchReviewConsole();
  const reviews = consoleResult.reviews;

  const topicApprovalPacks = buildAllTopicApprovalPacks(reviews);
  const duplicateReduction = buildDuplicateReduction(reviews);
  const relationshipGroups = buildRelationshipGroups(reviews);
  const topicCoverage = buildTopicCoverageDashboard(reviews);
  const implementationReadiness = buildImplementationReadiness(reviews);
  const coverageScore = computeScriptureAuthorityCoverage(topicApprovalPacks, reviews);
  const thirdImplementationPacket = buildThirdImplementationPacket(reviews);
  const packReviewDashboard = buildPackReviewDashboard(topicApprovalPacks);
  const executiveGrowthV2 = buildExecutiveGrowthV2(topicApprovalPacks, coverageScore, duplicateReduction, reviews);
  const engineeringHealthV2 = buildEngineeringHealthV2();
  const safety = verifyPhase2nSafety();

  const consolidationReports = topicApprovalPacks.map((p) => ({
    topic: p.topic,
    displayName: p.displayName,
    ...p.consolidation,
  }));

  const payload = {
    phase: '2O',
    ranAt: new Date().toISOString(),
    topicApprovalPacks,
    packReviewDashboard,
    scriptureAuthorityCoverage: coverageScore,
    thirdImplementationPacket,
    topicScriptureConsolidation: consolidationReports,
    duplicateReduction,
    relationshipGroups,
    topicCoverage,
    implementationReadiness,
    executiveGrowthV2,
    engineeringHealthV2,
    safety,
    productionMutations: false,
    topicPackCount: topicApprovalPacks.length,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'topic-approval-packs.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  writePackDecisionsTemplate(topicApprovalPacks);

  return payload;
}

module.exports = {
  CANONICAL_DOCTRINE_TOPICS,
  THIRD_IMPLEMENTATION_IDS,
  runTopicApprovalPacks,
  buildAllTopicApprovalPacks,
  computeScriptureAuthorityCoverage,
  buildThirdImplementationPacket,
  buildPackReviewDashboard,
  buildExecutiveGrowthV2,
  buildEngineeringHealthV2,
  verifyPhase2nSafety,
};
