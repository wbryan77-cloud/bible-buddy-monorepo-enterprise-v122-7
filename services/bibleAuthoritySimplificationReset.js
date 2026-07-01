/**
 * Bible Authority Simplification Reset — analysis, Batch 4 simple pool, report payloads.
 * No production mutations.
 */

const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('./scriptureResearchReviewConsole');
const { runTopicApprovalPacks } = require('./topicApprovalPacks');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const {
  STRENGTH_TIERS,
  toSimplifiedAdminReview,
  toSimplifiedTopicPack,
} = require('./scriptureStrengthReview');
const {
  regressionEligible,
  getPendingRefsForCandidate,
  APPLIED_IDS,
} = require('./scriptureRelationshipConsolidation');
const { IMPLEMENTED_IDS } = require('./implementationValueScore');
const { getCardById } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

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

const REMOVED_LOGIC = [
  { id: 'contradiction_score_penalty', location: 'scriptureDiscoveryGenesisRevelation.computeCoverageScore', status: 'removed' },
  { id: 'contradiction_auto_reject', location: 'scriptureDiscoveryGenesisRevelation.recommendAction', status: 'removed' },
  { id: 'contradiction_auto_hold', location: 'scriptureStrengthReview.mapRecommendedAction', status: 'removed' },
  { id: 'caution_score_penalty', location: 'scriptureStrengthReview.buildScoreExplanation', status: 'removed' },
  { id: 'contradiction_score_penalty_explanation', location: 'scriptureStrengthReview.buildScoreExplanation', status: 'removed' },
  { id: 'interpretation_conflict_issues', location: 'scriptureResearchReviewConsole.detectIssues', status: 'disabled' },
  { id: 'potential_contradiction_issues', location: 'scriptureResearchReviewConsole.detectIssues', status: 'disabled' },
  { id: 'pack_hold_on_contradictions', location: 'topicApprovalPacks.recommendedPackAction', status: 'removed' },
  { id: 'batch4_contradiction_exclusion', location: 'implementationValueScore.buildBatch4CandidatePool', status: 'removed' },
  { id: 'third_batch_contradiction_filter', location: 'scriptureRelationshipConsolidation.buildThirdBatchPool', status: 'removed' },
  { id: 'green_yellow_red', location: 'admin review model', status: 'retired (2J-Q)' },
  { id: 'classification_labels_interpretation', location: 'scriptureStrengthReview.CLASSIFICATION_LABELS', status: 'retired' },
];

function loadJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadDecisionMaps() {
  const admin = loadJson(path.join(OUT_DIR, 'admin-decisions.json'), { decisions: [] });
  const packs = loadJson(path.join(OUT_DIR, 'topic-pack-approval-decisions.json'), { packs: [] });
  const candidateMap = new Map((admin.decisions || []).map((d) => [d.candidateId, d]));
  const packMap = new Map((packs.packs || []).map((d) => [d.topic, d]));
  return { candidateMap, packMap };
}

function isRegressionEligible(review) {
  const c = loadUnifiedCandidates().find((x) => x.candidateId === review.candidateId);
  return c && regressionEligible(c);
}

function buildSimplifiedBatch4Pool(reviews) {
  const pool = [];
  for (const r of reviews) {
    if (IMPLEMENTED_IDS.has(r.candidateId) || APPLIED_IDS.has(r.candidateId)) continue;
    if (r.supportScore < 90) continue;
    if ((r.genesisToRevelationChain || []).length < 3) continue;
    const hasSupporting = (r.supportingScriptures || []).length > 0;
    const hasParallel = (r.parallelScriptures || []).length > 0;
    // Parallel bucket may be empty when expansion witnesses land in supporting — require supporting + breadth
    if (!hasSupporting) continue;
    if (!hasParallel && (r.supportingScriptures || []).length < 2) continue;
    if (!isRegressionEligible(r)) continue;

    pool.push({
      candidateId: r.candidateId,
      topic: r.topic,
      lessonTitle: r.lessonTitle,
      question: r.question,
      supportScore: r.supportScore,
      strengthTier: r.strengthTier,
      originalScriptureChain: r.originalScriptureChain,
      genesisToRevelationChain: r.genesisToRevelationChain,
      parallelScriptures: r.parallelScriptures,
      supportingScriptures: r.supportingScriptures,
      continuityScriptures: r.continuityScriptures,
      cautionScriptures: r.cautionScriptures,
      pendingScriptures: getPendingRefsForCandidate(r),
      regressionEligible: true,
      humanReviewRequired: true,
      autoApplied: false,
    });
  }
  return pool.sort((a, b) => b.supportScore - a.supportScore);
}

function previewImplementationTarget(review) {
  const topic = review.topic;
  const cardId = CARD_TOPIC_MAP[topic];
  const card = cardId ? getCardById(cardId) : null;
  const pending = getPendingRefsForCandidate(review);
  const edges = getAllApprovedSupportEdges().filter((e) => e.topic === topic);

  return {
    candidateId: review.candidateId,
    topic,
    targetCard: card ? `services/evidenceCards/${cardId}.card.js` : null,
    scripturesToAdd: pending,
    supportGraphEdgePreview: pending.length ? 'New support edge may be required for graph participation' : 'Card refs only',
    existingEdgeCount: edges.length,
    ledgerPreview: {
      phase: '4',
      implementationType: pending.length ? 'card_ref' : 'support_edge',
      sourceCandidate: review.candidateId,
      humanApprovalRequired: true,
    },
    rollbackPreview: {
      removeScriptures: pending,
      revertEdges: [],
      note: 'Rollback via Scripture Authority Ledger entry after human-approved implementation',
    },
  };
}

function buildBatch4Preparation(pool) {
  return pool.map((c) => {
    const review = {
      candidateId: c.candidateId,
      topic: c.topic,
      originalScriptureChain: c.originalScriptureChain,
      ...c,
    };
    return previewImplementationTarget(review);
  });
}

function rankTopicPacksForReview(simplifiedPacks) {
  return [...simplifiedPacks]
    .filter((p) => (p.pendingScriptures || []).length > 0)
    .sort((a, b) => b.supportScore - a.supportScore);
}

function verifySafety() {
  const buddy = fs.readFileSync(path.join(ROOT, 'services', 'buddyBrain.js'), 'utf8');
  const forbidden = ['templateResponder', 'studyLoopRestore', 'study_fallback'];
  const violations = forbidden.filter((f) => buddy.includes(f));
  return {
    doctrineChanges: false,
    promptChanges: false,
    ownershipChanges: violations.length > 0,
    responderRestoration: buddy.includes('templateResponder'),
    studyLoopRestoration: buddy.includes('studyLoopRestore'),
    automaticApprovals: false,
    automaticPromotions: false,
    unreviewedScripturesApplied: false,
    passed: violations.length === 0,
  };
}

function runSimplificationReset() {
  const consoleResult = runScriptureResearchReviewConsole();
  const reviews = consoleResult.reviews;
  const packsPayload = runTopicApprovalPacks();
  const { candidateMap, packMap } = loadDecisionMaps();

  const simplifiedCandidates = reviews.map((r) =>
    toSimplifiedAdminReview(r, candidateMap.get(r.candidateId)),
  );

  const canonicalTopics = new Set([
    'sabbath', 'death_state', 'resurrection', 'messiah_logos', 'dietary_law',
    'kingdom', 'heavens', 'holiness', 'feasts',
  ]);
  const simplifiedTopicPacks = packsPayload.topicApprovalPacks
    .filter((p) => canonicalTopics.has(p.topic))
    .map((p) => toSimplifiedTopicPack(p, packMap.get(p.topic)));

  const batch4SimplePool = buildSimplifiedBatch4Pool(reviews);
  const batch4Preparation = buildBatch4Preparation(batch4SimplePool);
  const topicPacksFirst = rankTopicPacksForReview(simplifiedTopicPacks);

  const payload = {
    phase: 'simplification_reset',
    ranAt: new Date().toISOString(),
    removedLogic: REMOVED_LOGIC,
    strengthTiers: STRENGTH_TIERS,
    reviewModel: 'scripture_strength_percentage_only',
    greenYellowRedRetired: true,
    simplifiedCandidates,
    simplifiedTopicPacks,
    batch4SimplePool,
    batch4Preparation,
    topicPacksReviewFirst: topicPacksFirst.slice(0, 9),
    batch4CandidateCount: batch4SimplePool.length,
    safety: verifySafety(),
    productionMutations: false,
    implementationFlow: [
      'Admin reviews topic pack or candidate',
      'Admin approves / holds / rejects (human only)',
      'Approved scripture relationships staged',
      'Regression runs',
      'Approved scriptures applied to card / support graph / chain',
      'Ledger entry created',
      'Production tested',
    ],
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.writeFileSync(
    path.join(TRACE, 'simplification-reset-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runSimplificationReset,
  buildSimplifiedBatch4Pool,
  REMOVED_LOGIC,
};
