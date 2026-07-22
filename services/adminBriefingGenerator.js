/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 11: Daily and Weekly Admin Briefings.
 *
 * Composes existing data only:
 *   - services/runtimeHealthMonitor.js (live snapshot + history file for
 *     window-over-window deltas)
 *   - services/adminAlertCenter.js
 *   - services/adminDecisionQueue.js
 *   - services/founderIntelligenceRecommendationStore.js
 *     (computeEffectivenessMetrics, readDecisionsLog)
 *   - services/founderOperationalIntelligenceEngine.js
 *     (buildFounderOperationalIntelligenceReport, computeTrendAnalysis)
 *
 * When there is not yet enough historical data to compute a real
 * window-over-window comparison, this reports the literal string
 * "BASELINE_ESTABLISHING" rather than inventing a percentage — per batch
 * instructions ("Do not invent percentages without a valid prior
 * comparison period").
 */

const { getRuntimeHealthSnapshot, getRuntimeHealthHistory } = require('./runtimeHealthMonitor');
const { listAlerts } = require('./adminAlertCenter');
const { listDecisionQueue } = require('./adminDecisionQueue');
const { computeEffectivenessMetrics, readDecisionsLog } = require('./founderIntelligenceRecommendationStore');

function findHistoryEntryNear(history, targetMs) {
  if (!history.length) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const entry of history) {
    const diff = Math.abs(new Date(entry.at).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  // Only accept a comparison point if it's within a reasonable tolerance
  // of the requested window (half the window itself) — otherwise we do
  // not actually have a valid prior comparison period.
  return { entry: best, diffMs: bestDiff };
}

function computeWindowDelta(hoursAgo) {
  const now = Date.now();
  const targetMs = now - hoursAgo * 60 * 60 * 1000;
  const history = getRuntimeHealthHistory({ limit: 2000 });
  const tolerance = (hoursAgo * 60 * 60 * 1000) / 2;

  const found = findHistoryEntryNear(history, targetMs);
  if (!found || !found.entry || found.diffMs > tolerance) {
    return { status: 'BASELINE_ESTABLISHING', reason: `No runtime-health history sample found within ${hoursAgo}h window tolerance.` };
  }

  const before = found.entry;
  const current = getRuntimeHealthSnapshot();
  return {
    status: 'COMPUTED',
    windowStart: before.at,
    windowEnd: current.at,
    requestsDelta: current.totalRequests - before.totalRequests,
    errorsDelta: current.errors - before.errors,
    timeoutsDelta: current.timeouts - before.timeouts,
    openAiCallsDelta: current.openAiCalls - before.openAiCalls,
    latencyNowMs: current.averageLatencyMs,
    observationDelta: {
      witnessRetrievalCount: (current.observation?.witnessRetrievalCount || 0) - (before.observation?.witnessRetrievalCount || 0),
      prayerUsageCount: (current.observation?.prayerUsageCount || 0) - (before.observation?.prayerUsageCount || 0),
      lessonAlignmentUsageCount: (current.observation?.lessonAlignmentUsageCount || 0) - (before.observation?.lessonAlignmentUsageCount || 0),
      originalLanguageUsedCount: (current.observation?.originalLanguageUsedCount || 0) - (before.observation?.originalLanguageUsedCount || 0),
      historicalContextUsedCount: (current.observation?.historicalContextUsedCount || 0) - (before.observation?.historicalContextUsedCount || 0),
    },
  };
}

function buildDailyBriefing() {
  const snap = getRuntimeHealthSnapshot();
  const alerts = listAlerts({});
  const queue = listDecisionQueue({ limit: 10 });
  const delta = computeWindowDelta(24);
  let intelligence = null;
  try {
    intelligence = require('./founderOperationalIntelligenceEngine').buildFounderOperationalIntelligenceReport();
  } catch (e) {
    intelligence = { error: e.message };
  }

  const recommendedActionsToday = [];
  if ((alerts.counts.Critical || 0) > 0) recommendedActionsToday.push(`Resolve ${alerts.counts.Critical} Critical alert(s) first.`);
  if ((queue.counts.bySeverity?.High || 0) > 0) recommendedActionsToday.push(`Review ${queue.counts.bySeverity.High} High-severity Decision Queue item(s).`);
  if (intelligence && !intelligence.error && (intelligence.knowledgeOpportunities || []).length > 0) {
    recommendedActionsToday.push(`${intelligence.knowledgeOpportunities.length} knowledge opportunity/opportunities identified — review under Founder Intelligence.`);
  }
  if (recommendedActionsToday.length === 0) recommendedActionsToday.push('No urgent items. Routine review recommended.');

  return {
    generatedAt: new Date().toISOString(),
    windowDeltaSinceYesterday: delta,
    systemHealth: {
      liveStatus: snap.memoryPressureLevel,
      totalRequests: snap.totalRequests,
      errors: snap.errors,
      averageLatencyMs: snap.averageLatencyMs,
    },
    activeUsersAndSessions: {
      activeSessions: snap.activeSessions,
      alphaActiveTesters: snap.alphaActiveTesters,
      alphaSessionsToday: snap.alphaSessionsToday,
    },
    importantFeedback: {
      alphaFeedbackCount: snap.alphaFeedbackCount,
      alphaFlaggedDoctrineIssues: snap.alphaFlaggedDoctrineIssues,
    },
    errors: (snap.recentErrors || []).slice(-5),
    recurringQuestions: intelligence && !intelligence.error ? (intelligence.recurringQuestions.topQuestionCategories || []).slice(0, 5) : [],
    responseQualityConcerns: {
      fallbackCount: snap.fallbackCount,
      recentFallbacks: (snap.recentFallbacks || []).slice(-5),
    },
    knowledgeOpportunities: intelligence && !intelligence.error ? intelligence.knowledgeOpportunities.length : null,
    pendingDecisions: queue.total,
    pendingDecisionsBySeverity: queue.counts.bySeverity,
    highPriorityRecommendations: queue.items.filter((i) => i.severity === 'High' || i.severity === 'Critical').slice(0, 10),
    securityIssues: alerts.alerts.filter((a) => a.category === 'Security Concern'),
    recommendedActionsToday,
  };
}

function buildWeeklyBriefing() {
  const delta = computeWindowDelta(24 * 7);
  const effectiveness = computeEffectivenessMetrics();
  const decisions = readDecisionsLog({ limit: 2000 });
  let trend = null;
  try {
    trend = require('./founderOperationalIntelligenceEngine').computeTrendAnalysis({});
  } catch (e) {
    trend = { status: 'BASELINE_ESTABLISHING', error: e.message };
  }
  const alerts = listAlerts({});

  const oneWeekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const decisionsThisWeek = decisions.filter((d) => d.decidedAt >= oneWeekAgoIso);

  return {
    generatedAt: new Date().toISOString(),
    weekOverWeekActivity: delta,
    featureUsageDelta: delta.status === 'COMPUTED' ? delta.observationDelta : 'BASELINE_ESTABLISHING',
    founderTrends: trend,
    recommendationAcceptance: {
      approvalRate: effectiveness.approvalRate,
      approvalRateNote: effectiveness.approvalRateNote,
      byStatus: effectiveness.byStatus,
      byType: effectiveness.byType,
      decisionsRecordedThisWeek: decisionsThisWeek.length,
    },
    operationalIntelligenceAccuracy: {
      falsePositivesFlagged: effectiveness.falsePositivesFlagged,
      duplicatesCollapsed: effectiveness.duplicatesCollapsed,
      governanceEffectiveness: effectiveness.governanceEffectiveness,
    },
    knowledgeGrowth: effectiveness.knowledgeGrowth || { status: 'NOT_TRACKED_THIS_RUN', note: 'Pass a coverage snapshot to computeEffectivenessMetrics to track growth.' },
    governanceActivity: {
      totalDecisionsAllTime: decisions.length,
      decisionsThisWeek: decisionsThisWeek.length,
    },
    runtimeReliabilityThisWeek: delta.status === 'COMPUTED' ? { requestsDelta: delta.requestsDelta, errorsDelta: delta.errorsDelta, timeoutsDelta: delta.timeoutsDelta } : 'BASELINE_ESTABLISHING',
    prioritiesForNextWeek: [
      ...(alerts.counts.Critical ? [`Resolve ${alerts.counts.Critical} Critical alert(s).`] : []),
      ...(alerts.counts.High ? [`Address ${alerts.counts.High} High-severity alert(s).`] : []),
      'Continue reviewing the Decision Queue in severity order.',
    ],
  };
}

module.exports = { buildDailyBriefing, buildWeeklyBriefing, computeWindowDelta };
