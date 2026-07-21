/**
 * Phase 2K — Bible Authority Admin Command Center data layer.
 * Separates Scripture Authority, Engineering Intelligence, Executive Growth.
 */

const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('./scriptureResearchReviewConsole');
const { STRENGTH_TIERS } = require('./scriptureStrengthReview');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { verifyImplementationSafety, APPLIED_LOG } = require('./firstScriptureImplementation');
const { APPLIED_LOG: SECOND_APPLIED_LOG } = require('./secondScriptureImplementation');
const { runTopicApprovalPacks } = require('./topicApprovalPacks');
const { toSimplifiedAdminReview, toSimplifiedTopicPack } = require('./scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');

function loadJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function loadAppliedLogSafe() {
  if (!fs.existsSync(APPLIED_LOG)) return null;
  return loadJson(APPLIED_LOG);
}

function tierSortKey(tier) {
  const order = ['Very Strong', 'Strong', 'Good Support', 'Review Needed', 'Research Needed'];
  return order.indexOf(tier);
}

function buildScriptureAuthorityReview() {
  const consoleResult = runScriptureResearchReviewConsole();
  const reviews = consoleResult.reviews;
  const adminDecisions = loadJson(
    path.join(ROOT, 'docs', 'evidence-candidates', 'admin-decisions.json'),
    { decisions: [] },
  );

  const decisionMap = new Map((adminDecisions.decisions || []).map((d) => [d.candidateId, d]));

  const byTier = {};
  for (const t of STRENGTH_TIERS) byTier[t.label] = [];

  for (const r of reviews) {
    const d = decisionMap.get(r.candidateId);
    const entry = {
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
      scoreExplanation: r.scoreExplanation?.netAssessment || r.reviewNotes || '',
      reviewNotes: r.reviewNotes,
      recommendedAction: r.recommendedAction,
      humanDecision: d?.decision || null,
      reviewedBy: d?.reviewedBy || null,
      reviewRequired: true,
      autoApplied: false,
    };
    if (!byTier[r.strengthTier]) byTier[r.strengthTier] = [];
    byTier[r.strengthTier].push(entry);
  }

  for (const tier of Object.keys(byTier)) {
    byTier[tier].sort((a, b) => b.supportScore - a.supportScore);
  }

  const packs = runTopicApprovalPacks();
  const packDecisions = loadJson(
    path.join(ROOT, 'docs', 'evidence-candidates', 'topic-pack-approval-decisions.json'),
    { packs: [] },
  );
  const packDecisionMap = new Map((packDecisions.packs || []).map((d) => [d.topic, d]));
  const simplifiedCandidates = reviews.map((r) =>
    toSimplifiedAdminReview(r, decisionMap.get(r.candidateId)),
  );
  const simplifiedTopicPacks = packs.topicApprovalPacks.map((p) =>
    toSimplifiedTopicPack(p, packDecisionMap.get(p.topic)),
  );

  return {
    reviewModel: 'scripture_strength',
    retiredModels: ['GREEN', 'YELLOW', 'RED'],
    strengthTiers: STRENGTH_TIERS,
    candidateCount: reviews.length,
    byTier,
    allCandidates: reviews.sort((a, b) => b.supportScore - a.supportScore),
    relationshipGroups: packs.relationshipGroups,
    topicCoverage: packs.topicCoverage,
    implementationReadiness: packs.implementationReadiness,
    topicApprovalPacks: packs.topicApprovalPacks,
    simplifiedCandidates,
    simplifiedTopicPacks,
    packReviewDashboard: packs.packReviewDashboard,
    scriptureAuthorityCoverage: packs.scriptureAuthorityCoverage,
    thirdImplementationPacket: packs.thirdImplementationPacket,
    duplicateReductionSummary: packs.duplicateReduction.estimates,
    consolidationPhase: '2O',
    consolidationRanAt: packs.ranAt,
  };
}

function buildEngineeringIntelligence() {
  const hardCutover = loadJson(path.join(TRACE, 'emergency-hard-cutover-root-cause-results.json'));
  const phase2i = loadJson(path.join(TRACE, 'phase2i-conversation-stress-results.json'));
  const phase2h = loadJson(path.join(TRACE, 'phase2h-regression-results.json'));
  const post2k = loadJson(path.join(TRACE, 'post-implementation-2k-results.json'));

  const edges = getAllApprovedSupportEdges();
  const cards = getAllApprovedCards();

  const hardFailed = (hardCutover?.results || []).filter((r) => !r.scored?.pass).length;
  const hardTotal = (hardCutover?.results || []).length;

  const stressDegraded = phase2i?.summary?.degradedTurns
    ?? (phase2i?.turns || []).filter((t) => t.degraded).length;
  const stressTotal = phase2i?.summary?.totalTurns ?? (phase2i?.turns || []).length;

  const openaiConfigured = !!process.env.OPENAI_API_KEY;

  return {
    disclaimer: 'Developer/system health only — not used for scripture approval decisions.',
    regression: {
      hardCutover: {
        available: !!hardCutover,
        ranAt: hardCutover?.ranAt,
        passed: hardFailed === 0,
        failed: hardFailed,
        total: hardTotal,
      },
      stressSuite: {
        available: !!phase2i,
        ranAt: phase2i?.ranAt,
        totalTurns: stressTotal,
        degradedTurns: stressDegraded,
        passRate: stressTotal ? Math.round(((stressTotal - stressDegraded) / stressTotal) * 100) : null,
      },
      phase2h: {
        available: !!phase2h,
        classCRemain: phase2h?.classCReplay?.remain,
        classCFixed: phase2h?.classCReplay?.fixed,
        supportEdgeCount: phase2h?.supportEdgeCount,
      },
      postImplementation: post2k || null,
    },
    openai: {
      configured: openaiConfigured,
      status: openaiConfigured ? 'key_present' : 'missing_OPENAI_API_KEY',
    },
    memory: post2k?.memory || phase2h?.memory || {
      note: 'Run post-implementation regression for current memory snapshot',
    },
    ownership: {
      violations: post2k?.ownership?.violations || [],
      passed: post2k?.ownership?.passed ?? (hardFailed === 0),
    },
    supportGraph: {
      edgeCount: edges.length,
      topicCounts: edges.reduce((acc, e) => {
        acc[e.topic] = (acc[e.topic] || 0) + 1;
        return acc;
      }, {}),
    },
    evidenceCards: {
      count: cards.length,
      topics: cards.map((c) => c.topic),
    },
    runtimeErrors: post2k?.runtimeErrors || [],
    retrieval: post2k?.retrieval || { note: 'See stress suite degradation metrics' },
    degradationRate: post2k?.degradationRate ?? (stressTotal
      ? Math.round((stressDegraded / stressTotal) * 1000) / 10
      : null),
  };
}

function buildExecutiveGrowthDashboard() {
  const candidates = loadUnifiedCandidates();
  const reviews = runScriptureResearchReviewConsole().reviews;
  const adminDecisions = loadJson(
    path.join(ROOT, 'docs', 'evidence-candidates', 'admin-decisions.json'),
    { decisions: [] },
  );
  const applied = loadAppliedLogSafe();
  const secondApplied = loadJson(SECOND_APPLIED_LOG);
  const packsData = loadJson(path.join(ROOT, 'docs', 'evidence-candidates', 'topic-approval-packs.json'));
  const simplification = loadJson(path.join(TRACE, 'simplification-reset-results.json'));
  const engineering = buildEngineeringIntelligence();
  const coverage = packsData?.scriptureAuthorityCoverage;
  const execV2 = packsData?.executiveGrowthV2;

  const decisions = adminDecisions.decisions || [];
  const approved = decisions.filter((d) => d.decision === 'approve').length;
  const held = decisions.filter((d) => d.decision === 'hold').length;
  const rejected = decisions.filter((d) => d.decision === 'reject').length;
  const awaiting = decisions.filter((d) => !d.decision).length;

  const topics = new Set(candidates.map((c) => c.topic));
  const g2rChains = reviews.filter((r) => r.genesisToRevelationChain?.length >= 4).length;
  const parallelTotal = reviews.reduce((s, r) => s + r.parallelScriptures.length, 0);
  const approvedRelationships = getAllApprovedSupportEdges().length
    + applied?.changes?.reduce((s, c) => s + (c.added?.length || 0), 0);

  const tierCounts = {};
  for (const r of reviews) {
    tierCounts[r.strengthTier] = (tierCounts[r.strengthTier] || 0) + 1;
  }

  return {
    questionsDiscovered: candidates.length,
    topicsDiscovered: topics.size,
    scriptureChainsDiscovered: candidates.length,
    genesisToRevelationChains: g2rChains,
    parallelScripturesFound: parallelTotal,
    candidatesAwaitingReview: awaiting,
    approvedScriptureRelationships: approvedRelationships,
    approvedCandidates: approved,
    heldCandidates: held,
    rejectedCandidates: rejected,
    strengthTierCounts: tierCounts,
    firstBatchApplied: applied?.productionApplied || false,
    secondBatchApplied: secondApplied?.productionApplied || false,
    secondBatchApprovedCount: secondApplied?.approvedIds?.length || 0,
    scriptureAuthorityCoverageScore: coverage?.currentCoverageScore ?? null,
    batch4SimpleCandidateCount: simplification?.batch4CandidateCount ?? null,
    reviewModel: 'scripture_strength_percentage_only',
    projectedCoverageScore: coverage?.projectedCoverageScoreAfterBatch3 ?? null,
    coverageGrowthRatePct: coverage?.coverageGrowthRatePct ?? null,
    approvedScriptureCount: coverage?.totals?.approvedScriptureCount ?? null,
    approvedParallelScriptureCount: coverage?.totals?.approvedParallelScriptureCount ?? null,
    approvedSupportingScriptureCount: coverage?.totals?.approvedSupportingScriptureCount ?? null,
    approvedContinuityScriptureCount: coverage?.totals?.approvedContinuityScriptureCount ?? null,
    implementationVelocity: execV2?.implementationVelocity ?? null,
    pendingReviewLoad: execV2?.pendingReviewLoad ?? awaiting,
    bibleCoverageGrowth: {
      baselinePct: 71.7,
      projectedPct: 75.4,
      note: 'From Phase 2J corpus expansion audit — executive estimate',
    },
    doctrineCoverageGrowth: {
      evidenceCards: getAllApprovedCards().length,
      supportEdges: getAllApprovedSupportEdges().length,
    },
    systemHealthSummary: {
      hardCutoverPass: engineering.regression.hardCutover.passed,
      stressPassRate: engineering.regression.stressSuite.passRate,
      openaiConfigured: engineering.openai.configured,
      ownershipIntact: engineering.ownership.passed,
    },
    drillDownLinks: {
      scriptureAuthorityReview: '/admin/bible-authority.html#scripture-review',
      engineeringIntelligence: '/admin/bible-authority.html#engineering',
      executiveDashboard: '/admin/bible-authority.html#executive',
    },
  };
}

function buildNotificationPlan() {
  return {
    enabledByDefault: false,
    status: 'design_only',
    optionalChannels: ['email', 'admin_dashboard_badge', 'weekly_digest'],
    futureTriggers: [
      { id: 'candidates_above_95', description: 'New candidates with support score ≥ 95', defaultEnabled: false },
      { id: 'regression_failed', description: 'Regression gate failure', defaultEnabled: false },
      { id: 'render_memory_warning', description: 'Render/memory threshold warning', defaultEnabled: false },
      { id: 'openai_connection', description: 'OpenAI connection issue', defaultEnabled: false },
      { id: 'awaiting_review', description: 'Candidates awaiting human review', defaultEnabled: false },
      { id: 'weekly_digest', description: 'Weekly admin digest', defaultEnabled: false },
    ],
    note: 'No notifications sent in Phase 2K unless explicitly configured later.',
  };
}

function getAdminCommandCenter() {
  return {
    ranAt: new Date().toISOString(),
    phase: 'simplification_reset',
    areas: {
      scriptureAuthorityReview: buildScriptureAuthorityReview(),
      engineeringIntelligence: buildEngineeringIntelligence(),
      executiveGrowthDashboard: buildExecutiveGrowthDashboard(),
    },
    notifications: buildNotificationPlan(),
    implementation: verifyImplementationSafety(),
    links: {
      commandCenter: '/admin/bible-authority.html',
      legacyAdmin: '/admin',
    },
  };
}

module.exports = {
  getAdminCommandCenter,
  buildScriptureAuthorityReview,
  buildEngineeringIntelligence,
  buildExecutiveGrowthDashboard,
  buildNotificationPlan,
};
