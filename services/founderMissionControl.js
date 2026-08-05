/**
 * BIE v1.3 — Founder Mission Control (executive view over existing BIE owners).
 * Not a second intelligence engine. Shadow aggregation only; no autonomous mutation.
 */

const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');
const { listDecisionQueue } = require('./adminDecisionQueue');
const { listAlerts } = require('./adminAlertCenter');

function safeRequire(path, fn) {
  try {
    const mod = require(path);
    return typeof fn === 'function' ? fn(mod) : mod;
  } catch (e) {
    return { error: e.message };
  }
}

function buildFounderMissionControlDaily() {
  const health = getRuntimeHealthSnapshot();
  const queue = listDecisionQueue({ limit: 25 });
  const alerts = listAlerts({});

  const fel = safeRequire('./founderExperienceDurableStore', (m) => m.getStatus());
  const disc = safeRequire('./discoveryEngine', (m) => m.runDiscoveryPass({ persist: false }));
  const cost = safeRequire('./costLedger', (m) => {
    // buildCostBaseline is async; briefing path stays sync with a sync snapshot fallback
    try {
      const { BUDGET_POLICY } = m;
      return { budgetPolicy: BUDGET_POLICY, status: 'SYNC_SNAPSHOT', qualityReductionForCost: false };
    } catch (e) {
      return { error: e.message };
    }
  });
  const learning = safeRequire('./learningRecordStore', (m) => m.listLearningRecords({ limit: 200 }));

  const discoveries = (!disc.error && disc.discoveries) || [];
  const failures = discoveries
    .filter((d) => /FAILURE|BREAK|GAP|DRIFT/i.test(String(d.discoveryType || '')))
    .sort((a, b) => (b.recurrenceCount || 0) - (a.recurrenceCount || 0));
  const successes = discoveries.filter((d) => /SUCCESS|GAIN/i.test(String(d.discoveryType || '')));

  const records = Array.isArray(learning) ? learning : [];
  const accepted = records.filter((r) => r.founderMark === 'ACCEPTED' || r.adminStatus === 'APPROVED').length;
  const rejected = records.filter((r) => /REJECT|WRONG/i.test(String(r.founderMark || r.adminStatus || ''))).length;

  const topThree = [];
  if (failures[0]) {
    topThree.push({
      priority: 1,
      kind: 'behavior_family',
      title: `Review ${failures[0].behaviorFamily}`,
      reason: `${failures[0].discoveryType} recurrence=${failures[0].recurrenceCount}`,
      evidence: { discoveryId: failures[0].discoveryId, supportingEventIds: (failures[0].supportingEventIds || []).slice(0, 5) },
      requiresAdminDecision: true,
      autoImplement: false,
    });
  }
  if ((queue.counts?.bySeverity?.High || 0) + (queue.counts?.bySeverity?.Critical || 0) > 0) {
    topThree.push({
      priority: 2,
      kind: 'decision_queue',
      title: 'Clear high/critical Decision Queue items',
      reason: `High=${queue.counts?.bySeverity?.High || 0} Critical=${queue.counts?.bySeverity?.Critical || 0}`,
      requiresAdminDecision: true,
      autoImplement: false,
    });
  }
  if ((alerts.counts?.Critical || 0) > 0) {
    topThree.push({
      priority: 3,
      kind: 'alert',
      title: 'Resolve Critical alerts',
      reason: `${alerts.counts.Critical} critical`,
      requiresAdminDecision: true,
      autoImplement: false,
    });
  }
  while (topThree.length < 3) {
    topThree.push({
      priority: topThree.length + 1,
      kind: 'routine',
      title: 'Operate Founder mark → Admin decision → smallest repair → measure',
      reason: 'No urgent automated item; continue governed loop',
      requiresAdminDecision: true,
      autoImplement: false,
    });
  }

  return {
    schemaVersion: 'bie-mission-control-daily-v1',
    generatedAt: new Date().toISOString(),
    mode: 'SHADOW_AGGREGATION',
    productionMutation: false,
    autonomousApproval: false,
    privacy: {
      rawPrivateConversationBrowser: false,
      secretsIncluded: false,
      rawSystemPromptsIncluded: false,
      sensitiveContent: 'redacted_or_summarized_refs_only',
    },
    productionReleaseAndHealth: {
      runtimeHealth: {
        liveStatus: health.memoryPressureLevel,
        totalRequests: health.totalRequests,
        errors: health.errors,
        averageLatencyMs: health.averageLatencyMs,
        activeSessions: health.activeSessions,
      },
      founderExperienceDurable: fel,
    },
    conversations: {
      totalRequests: health.totalRequests,
      evaluatedApprox: records.length,
      acceptedApprox: accepted,
      rejectedApprox: rejected,
      correctedApprox: records.filter((r) => /CORRECT/i.test(String(r.founderMark || ''))).length,
    },
    experience: {
      trustGains: successes.filter((d) => /GAIN/i.test(d.discoveryType)).length,
      trustBreaks: failures.filter((d) => /BREAK/i.test(d.discoveryType)).length,
      strongestCompanionMoment: successes[0]
        ? { behaviorFamily: successes[0].behaviorFamily, discoveryId: successes[0].discoveryId }
        : null,
      highestImpactFailure: failures[0]
        ? {
            behaviorFamily: failures[0].behaviorFamily,
            discoveryId: failures[0].discoveryId,
            recurrenceCount: failures[0].recurrenceCount,
            severity: failures[0].severity,
          }
        : null,
    },
    learning: {
      discoveryCount: disc.discoveryCount || discoveries.length,
      recommendationEligible: disc.recommendationEligible || 0,
      unresolvedAdminDecisions: queue.total,
      pendingBySeverity: queue.counts?.bySeverity || {},
    },
    costLatency: cost.error
      ? { error: cost.error }
      : {
          baseline: cost,
          note: 'Estimates only until provider usage fields are wired',
        },
    topThreeEvidenceBackedPriorities: topThree.slice(0, 3),
    drillDownOwners: [
      'experienceEventLedger',
      'learningRecordStore',
      'discoveryEngine',
      'recommendationIntelligence',
      'adminDecisionQueue',
      'costLedger',
      'founderExperienceDurableStore',
    ],
  };
}

function buildFounderMissionControlWeekly() {
  const daily = buildFounderMissionControlDaily();
  const learning = safeRequire('./learningRecordStore', (m) => m.listLearningRecords({ limit: 400 }));
  const records = Array.isArray(learning) ? learning : [];
  const byStatus = {};
  for (const r of records) {
    const s = r.adminStatus || 'UNKNOWN';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  return {
    schemaVersion: 'bie-mission-control-weekly-v1',
    generatedAt: new Date().toISOString(),
    mode: 'SHADOW_AGGREGATION',
    productionMutation: false,
    dailySnapshot: {
      highestImpactFailure: daily.experience.highestImpactFailure,
      topThree: daily.topThreeEvidenceBackedPriorities,
    },
    qualityTrendByRelease: {
      status: 'BASELINE_ESTABLISHING',
      note: 'Populate from outcome-learning after Admin-approved repairs',
    },
    recommendationOutcomes: {
      byAdminStatus: byStatus,
      rejectedMustStayRejectedUnlessNewEvidence: true,
    },
    recommendedNextOperationalCycle:
      'Founder mark on resurrection chronology family → Admin APPROVE/REJECT → smallest owner repair → same-case measure',
    privacy: daily.privacy,
  };
}

module.exports = {
  buildFounderMissionControlDaily,
  buildFounderMissionControlWeekly,
};
