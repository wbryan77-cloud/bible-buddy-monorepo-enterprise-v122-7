/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 2/3: Admin Aggregation and
 * Orchestration Layer + Executive Overview data source.
 *
 * This is a THIN composition layer. Every section below calls an existing,
 * already-tested service function and normalizes its output into one
 * stable envelope:
 *
 *   { status, lastUpdated, sourceSystem, dataFreshness, errors, drillDownTarget, data }
 *
 * status: 'OK' | 'DEGRADED' | 'UNAVAILABLE'
 * dataFreshness: 'LIVE' (computed this request) | 'CACHED' (read from a
 *   precomputed snapshot/file) | 'UNKNOWN'
 *
 * No business logic is duplicated here — if a section needs a number that
 * an existing service does not expose, that number is reported as
 * unavailable (with a documented reason) rather than recomputed or
 * estimated in this file. One subsystem failing NEVER throws for the
 * whole aggregator — buildSection() catches internally and the caller
 * always gets a full envelope for every key.
 */

const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');
const { getFounderConsoleStatus, getBuildIdentity } = require('./founderAdminConsoleStatus');
const { readAllSnapshots } = require('./knowledgeAnalyticsSnapshotStore');
const { readLessonAlignmentSubmissions } = require('./lessonScriptureAlignmentAnalyzer');
const { readSupportGraphCandidates } = require('./supportGraphCandidateQueue');
const { listDecisionQueue } = require('./adminDecisionQueue');
const { listAlerts } = require('./adminAlertCenter');
const { readAdminAuditTrail } = require('./adminAuditTrail');

const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function buildSection({ sourceSystem, drillDownTarget, dataFreshness, fn }) {
  const lastUpdated = new Date().toISOString();
  try {
    const data = fn();
    return { status: 'OK', lastUpdated, sourceSystem, dataFreshness, errors: [], drillDownTarget, data };
  } catch (e) {
    return {
      status: 'UNAVAILABLE',
      lastUpdated,
      sourceSystem,
      dataFreshness,
      errors: [String(e && e.message ? e.message : e)],
      drillDownTarget,
      data: null,
    };
  }
}

function buildSystemHealthSection() {
  return buildSection({
    sourceSystem: 'runtimeHealthMonitor',
    drillDownTarget: '#operations',
    dataFreshness: 'LIVE',
    fn: () => {
      const snap = getRuntimeHealthSnapshot();
      const build = getBuildIdentity();
      const adminTokenConfigured = !!(process.env.BIBLE_AUTHORITY_ADMIN_TOKEN || process.env.ALPHA_ADMIN_TOKEN || process.env.BETA_REVIEW_TOKEN);
      return {
        liveStatus: snap.memoryPressureLevel === 'critical' ? 'CRITICAL' : snap.memoryPressureLevel === 'warning' ? 'WARNING' : 'HEALTHY',
        deploymentCommit: build.commit,
        deploymentBranch: build.branch,
        workingTreeDirty: build.dirty,
        uptimeMs: snap.uptimeMs,
        averageLatencyMs: snap.averageLatencyMs,
        maxLatencyMs: snap.maxLatencyMs,
        totalRequests: snap.totalRequests,
        failedRequests: snap.errors,
        timeouts: snap.timeouts,
        fallbackCount: snap.fallbackCount,
        recentErrors: (snap.recentErrors || []).slice(-10),
        memoryPressureLevel: snap.memoryPressureLevel,
        rssMB: snap.rssMB,
        heapUsedMB: snap.heapUsedMB,
        openAiConfigured: snap.openAiConfigured,
        openAiDisabled: snap.openAiDisabled,
        securityStatus: adminTokenConfigured ? 'ADMIN_TOKEN_CONFIGURED' : 'ADMIN_TOKEN_MISSING',
      };
    },
  });
}

function buildUsersAndSessionsSection() {
  return buildSection({
    sourceSystem: 'runtimeHealthMonitor.observation',
    drillDownTarget: '#users-sessions',
    dataFreshness: 'LIVE',
    fn: () => {
      const snap = getRuntimeHealthSnapshot();
      const obs = snap.observation || {};
      return {
        activeSessions: snap.activeSessions,
        activeDoctrineStates: snap.activeDoctrineStates,
        alphaActiveTesters: snap.alphaActiveTesters,
        alphaSessionsToday: snap.alphaSessionsToday,
        alphaFeedbackCount: snap.alphaFeedbackCount,
        alphaFallbackCount: snap.alphaFallbackCount,
        alphaAverageLatency: snap.alphaAverageLatency,
        mostUsedFeatures: Object.entries(obs.questionCategoryCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ category: k, count: v })),
        featureUsageCounters: {
          witnessRetrievalCount: obs.witnessRetrievalCount || 0,
          historicalContextUsedCount: obs.historicalContextUsedCount || 0,
          originalLanguageUsedCount: obs.originalLanguageUsedCount || 0,
          prayerUsageCount: obs.prayerUsageCount || 0,
          lessonAlignmentUsageCount: obs.lessonAlignmentUsageCount || 0,
          continuationUsageCount: obs.continuationUsageCount || 0,
        },
        categoryTransitionCounts: obs.categoryTransitionCounts || {},
      };
    },
  });
}

function buildExperienceQualitySection() {
  return buildSection({
    sourceSystem: 'runtimeHealthMonitor + founderIntelligence',
    drillDownTarget: '#users-sessions',
    dataFreshness: 'LIVE',
    fn: () => {
      const snap = getRuntimeHealthSnapshot();
      let evidenceLineageNote = 'primaryWitness/supportingWitnesses/crossReferences/coreDebug are attached to every /buddy/chat reply (see routes/buddy.js) — not duplicated here.';
      return {
        alphaFlaggedDoctrineIssues: snap.alphaFlaggedDoctrineIssues,
        fallbackCount: snap.fallbackCount,
        totalRequests: snap.totalRequests,
        fallbackRate: snap.totalRequests > 0 ? Number((snap.fallbackCount / snap.totalRequests).toFixed(4)) : null,
        contractClarifiers: snap.contractClarifiers,
        recentFallbacks: (snap.recentFallbacks || []).slice(-10),
        evidenceLineageNote,
      };
    },
  });
}

function buildScriptureAndKnowledgeSection() {
  return buildSection({
    sourceSystem: 'knowledgeAnalyticsSnapshotStore',
    drillDownTarget: '#scripture-review',
    dataFreshness: 'CACHED',
    fn: () => {
      const snapshots = readAllSnapshots({ maxAgeMs: SNAPSHOT_MAX_AGE_MS });
      const staleOrMissing = Object.entries(snapshots).filter(([, s]) => !s.ok || s.stale).map(([name]) => name);
      const book = snapshots.BibleBookCoverage.data;
      const doctrine = snapshots.DoctrineTopicCoverage.data;
      const originalLanguage = snapshots.OriginalLanguageCoverage.data;
      const historical = snapshots.HistoricalCoverage.data;
      const queue = snapshots.AdminQueueDiagnostics.data;
      let observationObs = null;
      try {
        observationObs = getRuntimeHealthSnapshot().observation;
      } catch (_) { /* optional */ }

      return {
        staleOrMissing,
        booksCoveredTotal: book ? book.books.length : null,
        booksByStatus: book ? book.summary.byStatus : null,
        doctrineTopicsTotal: doctrine ? doctrine.summary.totalTopics : null,
        doctrineTopicsNoPrimaryWitness: doctrine ? doctrine.summary.noPrimaryWitness.length : null,
        originalLanguageBooksWithDataset: originalLanguage ? originalLanguage.summary.totalBooksWithAnyDataset : null,
        originalLanguageUsageCount: observationObs ? observationObs.originalLanguageUsedCount : null,
        historicalContextRecords: historical ? historical.summary.totalRecords : null,
        historicalContextApproved: historical ? historical.summary.approvedCount : null,
        historicalContextUsageCount: observationObs ? observationObs.historicalContextUsedCount : null,
        pendingCandidatesTotal: queue ? queue.summary.totalPending : null,
        recurringScriptureTopics: observationObs ? Object.entries(observationObs.questionCategoryCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ category: k, count: v })) : [],
      };
    },
  });
}

function buildLessonAlignmentSection() {
  return buildSection({
    sourceSystem: 'lessonScriptureAlignmentAnalyzer',
    drillDownTarget: '#lesson-alignment',
    dataFreshness: 'LIVE',
    fn: () => {
      const submissions = readLessonAlignmentSubmissions({ limit: 25 });
      const totals = submissions.reduce((acc, s) => {
        const sum = s.summary || {};
        acc.matchesKjv += sum.matchesKjv || 0;
        acc.misquotes += sum.misquotes || 0;
        acc.referenceOnlyNoQuote += sum.referenceOnlyNoQuote || 0;
        acc.unresolvedReferences += sum.unresolvedReferences || 0;
        return acc;
      }, { matchesKjv: 0, misquotes: 0, referenceOnlyNoQuote: 0, unresolvedReferences: 0 });
      const needingReview = submissions.filter((s) => (s.summary?.misquotes || 0) > 0 || (s.summary?.unresolvedReferences || 0) > 0);
      return {
        recentSubmissionCount: submissions.length,
        totals,
        pendingReviewCount: needingReview.length,
        highConfidenceMatches: totals.matchesKjv,
        conflictingClaims: totals.misquotes,
        possibleUnresolvedReferences: totals.unresolvedReferences,
        recentSubmissions: submissions.slice(0, 5).map((s) => ({ at: s.at, sourceLabel: s.sourceLabel, summary: s.summary })),
      };
    },
  });
}

function buildFounderIntelligenceSection() {
  return buildSection({
    sourceSystem: 'founderOperationalIntelligenceEngine',
    drillDownTarget: '#intelligence',
    dataFreshness: 'LIVE',
    fn: () => {
      const { buildFounderOperationalIntelligenceReport } = require('./founderOperationalIntelligenceEngine');
      const report = buildFounderOperationalIntelligenceReport();
      return {
        generatedAt: report.generatedAt,
        narrative: report.dailyOperationalSummary.narrative,
        totalRecommendations: report.dailyOperationalSummary.totalRecommendations,
        recommendationsByType: report.dailyOperationalSummary.recommendationsByType,
        recommendationsByPriority: report.dailyOperationalSummary.recommendationsByPriority,
        knowledgeOpportunities: report.knowledgeOpportunities.length,
        possibleExistingSolutions: report.possibleExistingSolutions.length,
        potentialDuplicateEvidence: report.potentialDuplicateEvidence.length,
        founderTrendsStatus: report.founderTrends.status,
        topQuestionCategories: (report.recurringQuestions.topQuestionCategories || []).slice(0, 8),
      };
    },
  });
}

function buildRecommendationsSection() {
  return buildSection({
    sourceSystem: 'adminDecisionQueue',
    drillDownTarget: '#decisions',
    dataFreshness: 'LIVE',
    fn: () => {
      const queue = listDecisionQueue({ limit: 10 });
      return {
        totalOpenItems: queue.total,
        bySeverity: queue.counts.bySeverity,
        byStatus: queue.counts.byStatus,
        byCategory: queue.counts.byCategory,
        topItems: queue.items.map((i) => ({ id: i.id, title: i.title, severity: i.severity, category: i.category, status: i.status })),
      };
    },
  });
}

function buildApprovalsSection() {
  return buildSection({
    sourceSystem: 'founderIntelligenceRecommendationStore + supportGraphCandidateQueue',
    drillDownTarget: '#decisions',
    dataFreshness: 'LIVE',
    fn: () => {
      const candidates = readSupportGraphCandidates({ limit: 1000 });
      const pending = candidates.filter((c) => c.status === 'pending_review').length;
      const approved = candidates.filter((c) => c.status === 'approved').length;
      const rejected = candidates.filter((c) => c.status === 'rejected').length;
      return {
        reviewQueue: { pending, approved, rejected, total: candidates.length },
      };
    },
  });
}

function buildSecuritySection() {
  return buildSection({
    sourceSystem: 'checkAdminAuth + runtimeHealthMonitor',
    drillDownTarget: '#operations',
    dataFreshness: 'LIVE',
    fn: () => {
      const adminTokenConfigured = !!(process.env.BIBLE_AUTHORITY_ADMIN_TOKEN || process.env.ALPHA_ADMIN_TOKEN || process.env.BETA_REVIEW_TOKEN);
      return {
        adminTokenConfigured,
        tokenSource: process.env.BIBLE_AUTHORITY_ADMIN_TOKEN ? 'BIBLE_AUTHORITY_ADMIN_TOKEN' : process.env.ALPHA_ADMIN_TOKEN ? 'ALPHA_ADMIN_TOKEN' : process.env.BETA_REVIEW_TOKEN ? 'BETA_REVIEW_TOKEN' : null,
        status: adminTokenConfigured ? 'PROTECTED' : 'OPEN_NO_TOKEN_CONFIGURED',
      };
    },
  });
}

function buildAlertsSection() {
  return buildSection({
    sourceSystem: 'adminAlertCenter',
    drillDownTarget: '#alerts',
    dataFreshness: 'LIVE',
    fn: () => {
      const result = listAlerts({});
      return { total: result.total, counts: result.counts, topAlerts: result.alerts.slice(0, 10) };
    },
  });
}

function buildAuditSection() {
  return buildSection({
    sourceSystem: 'adminAuditTrail',
    drillDownTarget: '#decisions',
    dataFreshness: 'LIVE',
    fn: () => {
      const trail = readAdminAuditTrail({ limit: 10 });
      return { totalRecent: trail.total, recentEntries: trail.entries };
    },
  });
}

function buildBuildSection() {
  return buildSection({
    sourceSystem: 'founderAdminConsoleStatus.getBuildIdentity',
    drillDownTarget: '#operations',
    dataFreshness: 'LIVE',
    fn: () => getBuildIdentity(),
  });
}

function computeExecutiveSummary(sections) {
  const health = sections.systemHealth.data;
  const alerts = sections.alerts.data;
  const security = sections.security.data;
  const recs = sections.recommendations.data;

  const overallHealthy = sections.systemHealth.status === 'OK' && health && health.liveStatus === 'HEALTHY';
  const criticalAlertCount = alerts ? (alerts.counts.Critical || 0) : 0;
  const highAlertCount = alerts ? (alerts.counts.High || 0) : 0;

  const answers = {
    isHealthy: overallHealthy && criticalAlertCount === 0 ? 'YES' : criticalAlertCount > 0 ? 'NO' : 'DEGRADED',
    usersEncounteringProblems: health && health.failedRequests > 0 ? `${health.failedRequests} failed request(s) recorded since process start.` : 'No failed requests recorded since process start.',
    responsesAccurateAndAligned: sections.experienceQuality.status === 'OK'
      ? `${sections.experienceQuality.data.alphaFlaggedDoctrineIssues || 0} flagged doctrine issue(s); fallback rate ${sections.experienceQuality.data.fallbackRate != null ? (sections.experienceQuality.data.fallbackRate * 100).toFixed(1) + '%' : 'unknown'}.`
      : 'Unavailable this request.',
    decisionsRequiringAttention: recs ? `${recs.totalOpenItems} item(s) in the Decision Queue (${recs.bySeverity.Critical || 0} Critical, ${recs.bySeverity.High || 0} High).` : 'Unavailable this request.',
    recommendedActionToday: criticalAlertCount > 0
      ? 'Resolve Critical alerts first (see Alerts).'
      : (recs && (recs.bySeverity.High || 0) > 0)
        ? 'Review High-severity Decision Queue items.'
        : 'No urgent action required — review the daily briefing for routine items.',
  };

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: answers.isHealthy,
    criticalAlertCount,
    highAlertCount,
    securityStatus: security ? security.status : 'UNKNOWN',
    answers,
  };
}

/**
 * Build the full unified Admin summary contract. Each section tolerates
 * its own subsystem being unavailable — the whole response never throws.
 */
function buildAdminCommandCenterSummary() {
  const sections = {
    build: buildBuildSection(),
    systemHealth: buildSystemHealthSection(),
    usersAndSessions: buildUsersAndSessionsSection(),
    experienceQuality: buildExperienceQualitySection(),
    scriptureAndKnowledge: buildScriptureAndKnowledgeSection(),
    lessonAlignment: buildLessonAlignmentSection(),
    founderIntelligence: buildFounderIntelligenceSection(),
    recommendations: buildRecommendationsSection(),
    approvals: buildApprovalsSection(),
    security: buildSecuritySection(),
    alerts: buildAlertsSection(),
    audit: buildAuditSection(),
  };
  const executiveSummary = computeExecutiveSummary(sections);
  const overallStatus = Object.values(sections).some((s) => s.status === 'UNAVAILABLE')
    ? (Object.values(sections).every((s) => s.status === 'UNAVAILABLE') ? 'UNAVAILABLE' : 'DEGRADED')
    : 'OK';

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    overallStatus,
    ...sections,
    executiveSummary,
  };
}

module.exports = { buildAdminCommandCenterSummary };
