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
// ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — Observability (item 7):
// operational metrics for the two new Phase 1B platforms, reusing their
// existing stats functions (no new analytics computed here).
const { getQueueReport: getNotificationQueueReport } = require('./alphaNotificationScheduler');
const { getStats: getEscalationStats } = require('./userAssistanceEscalationStore');

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

  let notificationSummary = null;
  try {
    notificationSummary = getNotificationQueueReport();
  } catch (e) {
    notificationSummary = { error: e.message };
  }
  let userAssistanceSummary = null;
  try {
    userAssistanceSummary = getEscalationStats();
  } catch (e) {
    userAssistanceSummary = { error: e.message };
  }

  const recommendedActionsToday = [];
  if ((alerts.counts.Critical || 0) > 0) recommendedActionsToday.push(`Resolve ${alerts.counts.Critical} Critical alert(s) first.`);
  if ((queue.counts.bySeverity?.High || 0) > 0) recommendedActionsToday.push(`Review ${queue.counts.bySeverity.High} High-severity Decision Queue item(s).`);
  if (intelligence && !intelligence.error && (intelligence.knowledgeOpportunities || []).length > 0) {
    recommendedActionsToday.push(`${intelligence.knowledgeOpportunities.length} knowledge opportunity/opportunities identified — review under Founder Intelligence.`);
  }
  if (userAssistanceSummary && !userAssistanceSummary.error && userAssistanceSummary.pending > 0) {
    recommendedActionsToday.push(`${userAssistanceSummary.pending} User Assistance question(s) awaiting a reply.`);
  }
  if (recommendedActionsToday.length === 0) recommendedActionsToday.push('No urgent items. Routine review recommended.');

  let founderExperience = null;
  try {
    const { runDiscoveryPass } = require('./discoveryEngine');
    const { buildRankedRecommendations } = require('./recommendationIntelligence');
    const { getStatus } = require('./founderExperienceDurableStore');
    const disc = runDiscoveryPass({ persist: false });
    // sync ranking without awaiting durable writes for briefing speed
    const topFailures = (disc.discoveries || [])
      .filter((d) => String(d.discoveryType).includes('FAILURE') || String(d.discoveryType).includes('BREAK'))
      .sort((a, b) => b.recurrenceCount - a.recurrenceCount)
      .slice(0, 5);
    const successes = (disc.discoveries || [])
      .filter((d) => String(d.discoveryType).includes('SUCCESS') || String(d.discoveryType).includes('GAIN'))
      .slice(0, 5);
    if (topFailures.length) {
      recommendedActionsToday.unshift(
        `Founder Experience: review ${topFailures.length} recurring failure pattern(s); top=${topFailures[0].behaviorFamily}`,
      );
    }
    founderExperience = {
      durable: getStatus(),
      discoveryCount: disc.discoveryCount,
      recommendationEligible: disc.recommendationEligible,
      highestImpactFailures: topFailures,
      strongestAnswers: successes,
      topThreeRecommendedActions: recommendedActionsToday.slice(0, 3),
      mode: 'SHADOW',
      productionMutation: false,
    };
    // Fire-and-forget ranked package refresh for Admin queue
    buildRankedRecommendations({ persist: true }).catch(() => {});
  } catch (e) {
    founderExperience = { error: e.message };
  }

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
    notificationSummary,
    userAssistanceSummary,
    founderExperience,
    founderMissionControl: (() => {
      try {
        return require('./founderMissionControl').buildFounderMissionControlDaily();
      } catch (e) {
        return { error: e.message };
      }
    })(),
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
      'Review Founder Experience discoveries and suppress unchanged rejected recommendations.',
    ],
    founderExperienceLearning: (() => {
      try {
        const { runDiscoveryPass } = require('./discoveryEngine');
        const { listLearningRecords } = require('./learningRecordStore');
        const disc = runDiscoveryPass({ persist: false });
        const records = listLearningRecords({ limit: 200 });
        return {
          discoveryCount: disc.discoveryCount,
          learningRecords: records.length,
          rejectedPreserved: records.filter((r) => r.adminStatus === 'REJECTED').length,
          approved: records.filter((r) => r.adminStatus === 'APPROVED').length,
          recommendationEligible: disc.recommendationEligible,
        };
      } catch (e) {
        return { error: e.message };
      }
    })(),
    founderMissionControlWeekly: (() => {
      try {
        return require('./founderMissionControl').buildFounderMissionControlWeekly();
      } catch (e) {
        return { error: e.message };
      }
    })(),
  };
}

module.exports = { buildDailyBriefing, buildWeeklyBriefing, computeWindowDelta };
