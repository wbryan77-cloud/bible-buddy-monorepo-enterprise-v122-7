/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 12: Alerts and Escalation.
 *
 * Deterministic, read-only alert detection over EXISTING data (runtime
 * health metrics/history, Founder Intelligence recommendations, build
 * identity, security token configuration). No new external SMS/email
 * integrations are added — see the `futureIntegrationPoints` export for
 * documented, unimplemented next steps.
 *
 * Every alert is grouped/deduplicated by a stable `groupKey` so repeated
 * occurrences of the same underlying condition increment `occurrenceCount`
 * instead of producing a new alert row each time.
 */

const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');
const { getBuildIdentity } = require('./founderAdminConsoleStatus');

const SEVERITY = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

function groupErrorsBySignature(entries = []) {
  const groups = new Map();
  for (const e of entries) {
    const key = `${e.route || e.routeOwner || 'unknown_route'}::${(e.errorCode || e.error || e.type || 'error').slice(0, 60)}`;
    if (!groups.has(key)) groups.set(key, { key, entries: [] });
    groups.get(key).entries.push(e);
  }
  return [...groups.values()];
}

function buildAlerts() {
  const alerts = [];
  const snap = getRuntimeHealthSnapshot();
  const build = (() => {
    try {
      return getBuildIdentity();
    } catch {
      return null;
    }
  })();

  // --- Critical Runtime Failure: memory pressure ---
  if (snap.memoryPressureLevel && snap.memoryPressureLevel !== 'normal') {
    alerts.push({
      groupKey: 'critical_runtime_memory_pressure',
      category: 'Critical Runtime Failure',
      severity: snap.memoryPressureLevel === 'critical' ? SEVERITY.CRITICAL : SEVERITY.HIGH,
      summary: `Memory pressure level is "${snap.memoryPressureLevel}" (RSS ${snap.rssMB}MB, warn>=${snap.memoryWarnMb}MB, critical>=${snap.memoryCriticalMb}MB).`,
      firstDetected: snap.at,
      lastDetected: snap.at,
      occurrenceCount: 1,
      affectedSystem: 'runtime-health',
      supportingEvidence: [`heapUsedMB=${snap.heapUsedMB}`, `rssMB=${snap.rssMB}`],
      suggestedAction: 'Automatic mitigation (state TTL cleanup, session cache trim) already runs on this condition. Monitor for recurrence; consider a process restart if it persists.',
      status: 'OPEN',
    });
  }

  // --- High Error Rate ---
  if (snap.totalRequests >= 20) {
    const errorRate = snap.errors / snap.totalRequests;
    if (errorRate > 0.05) {
      alerts.push({
        groupKey: 'high_error_rate',
        category: 'High Error Rate',
        severity: errorRate > 0.15 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
        summary: `Error rate is ${(errorRate * 100).toFixed(1)}% (${snap.errors} of ${snap.totalRequests} requests) since process start.`,
        firstDetected: snap.at,
        lastDetected: snap.at,
        occurrenceCount: snap.errors,
        affectedSystem: 'runtime-health',
        supportingEvidence: (snap.recentErrors || []).slice(-5),
        suggestedAction: 'Review recent errors in Operations & Health for a common route/cause.',
        status: 'OPEN',
      });
    }
  }

  // --- Repeated Response Failure / Repeated Bland/Fallback Response (grouped) ---
  for (const group of groupErrorsBySignature(snap.recentErrors || [])) {
    if (group.entries.length < 3) continue; // avoid noisy one-off alerts
    alerts.push({
      groupKey: `repeated_response_failure:${group.key}`,
      category: 'Repeated Response Failure',
      severity: group.entries.length >= 8 ? SEVERITY.HIGH : SEVERITY.MEDIUM,
      summary: `The same error signature ("${group.key}") has recurred ${group.entries.length} time(s) in the recent error window.`,
      firstDetected: group.entries[0].at,
      lastDetected: group.entries[group.entries.length - 1].at,
      occurrenceCount: group.entries.length,
      affectedSystem: 'runtime-health',
      supportingEvidence: group.entries.slice(-3),
      suggestedAction: 'Investigate this specific route/error signature before it accumulates further.',
      status: 'OPEN',
    });
  }

  if (snap.totalRequests >= 20 && snap.fallbackCount / snap.totalRequests > 0.1) {
    alerts.push({
      groupKey: 'repeated_fallback_response',
      category: 'Repeated Bland/Fallback Response',
      severity: SEVERITY.MEDIUM,
      summary: `${snap.fallbackCount} of ${snap.totalRequests} requests (${((snap.fallbackCount / snap.totalRequests) * 100).toFixed(1)}%) fell back to a guaranteed/emergency response.`,
      firstDetected: snap.at,
      lastDetected: snap.at,
      occurrenceCount: snap.fallbackCount,
      affectedSystem: 'runtime-health',
      supportingEvidence: (snap.recentFallbacks || []).slice(-5),
      suggestedAction: 'Review recentFallbacks for a common trigger route/category.',
      status: 'OPEN',
    });
  }

  // --- Security Concern: admin auth disabled ---
  const adminTokenConfigured = !!(process.env.BIBLE_AUTHORITY_ADMIN_TOKEN || process.env.ALPHA_ADMIN_TOKEN || process.env.BETA_REVIEW_TOKEN);
  if (!adminTokenConfigured) {
    alerts.push({
      groupKey: 'security_admin_token_missing',
      category: 'Security Concern',
      severity: SEVERITY.CRITICAL,
      summary: 'No BIBLE_AUTHORITY_ADMIN_TOKEN (or fallback token) is configured — Admin API routes are currently open/unauthenticated.',
      firstDetected: snap.at,
      lastDetected: snap.at,
      occurrenceCount: 1,
      affectedSystem: 'security',
      supportingEvidence: ['checkAdminAuth() returns true unconditionally when no token env var is set.'],
      suggestedAction: 'Set BIBLE_AUTHORITY_ADMIN_TOKEN in the deployment environment immediately.',
      status: 'OPEN',
    });
  }

  // --- Deployment Drift: dirty working tree at runtime ---
  if (build && build.dirty) {
    alerts.push({
      groupKey: 'deployment_drift_dirty_tree',
      category: 'Deployment Drift',
      severity: SEVERITY.LOW,
      summary: 'The running process reports uncommitted local changes relative to its own git working tree.',
      firstDetected: snap.at,
      lastDetected: snap.at,
      occurrenceCount: 1,
      affectedSystem: 'build-identity',
      supportingEvidence: [`commit=${build.commit}`, `branch=${build.branch}`],
      suggestedAction: 'Confirm this is expected for the current environment (e.g. local dev); production should always deploy from a clean commit.',
      status: 'OPEN',
    });
  }

  // --- Knowledge Conflict: potential duplicate evidence (best-effort, tolerant of failure) ---
  try {
    const { buildFounderOperationalIntelligenceReport } = require('./founderOperationalIntelligenceEngine');
    const report = buildFounderOperationalIntelligenceReport();
    if ((report.potentialDuplicateEvidence || []).length > 0) {
      alerts.push({
        groupKey: 'knowledge_conflict_duplicate_evidence',
        category: 'Knowledge Conflict',
        severity: SEVERITY.LOW,
        summary: `${report.potentialDuplicateEvidence.length} potential duplicate-evidence recommendation(s) detected by Founder Intelligence.`,
        firstDetected: report.generatedAt,
        lastDetected: report.generatedAt,
        occurrenceCount: report.potentialDuplicateEvidence.length,
        affectedSystem: 'founder-intelligence',
        supportingEvidence: report.potentialDuplicateEvidence.slice(0, 3).map((r) => r.title),
        suggestedAction: 'Review in the Decision Queue under category "Evidence Candidate".',
        status: 'OPEN',
      });
    }
    if ((report.suggestedTestCases || []).length >= 3) {
      alerts.push({
        groupKey: 'lesson_alignment_concern_recurring_misquotes',
        category: 'Lesson Alignment Concern',
        severity: SEVERITY.MEDIUM,
        summary: `${report.suggestedTestCases.length} recurring misquote pattern(s) identified across Lesson Alignment submissions.`,
        firstDetected: report.generatedAt,
        lastDetected: report.generatedAt,
        occurrenceCount: report.suggestedTestCases.length,
        affectedSystem: 'lesson-alignment',
        supportingEvidence: report.suggestedTestCases.slice(0, 3).map((r) => r.title),
        suggestedAction: 'Review in the Decision Queue under category "Lesson Alignment".',
        status: 'OPEN',
      });
    }
  } catch (e) {
    alerts.push({
      groupKey: 'governance_issue_intelligence_unavailable',
      category: 'Governance Issue',
      severity: SEVERITY.LOW,
      summary: 'Founder Intelligence report could not be generated for alert scanning.',
      firstDetected: snap.at,
      lastDetected: snap.at,
      occurrenceCount: 1,
      affectedSystem: 'founder-intelligence',
      supportingEvidence: [String(e.message || e)],
      suggestedAction: 'Check server logs for the underlying cause.',
      status: 'OPEN',
    });
  }

  return alerts;
}

const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function listAlerts({ severity = null, category = null } = {}) {
  let alerts = buildAlerts();
  if (severity) alerts = alerts.filter((a) => a.severity === severity);
  if (category) alerts = alerts.filter((a) => a.category === category);
  alerts.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    total: alerts.length,
    counts: alerts.reduce((acc, a) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; }, {}),
    alerts,
  };
}

// Documented, NOT implemented in this batch (per instructions: do not add
// external integrations unless already supported and safely configurable).
const futureIntegrationPoints = [
  { channel: 'SMS', provider: 'Twilio', status: 'NOT_CONFIGURED', note: 'services/alphaTesterManager.js references SMS invitations conceptually; no Twilio credentials configured in this environment.' },
  { channel: 'Email', provider: 'Resend', status: 'NOT_CONFIGURED', note: 'No RESEND_API_KEY configured in this environment.' },
  { channel: 'Webhook', provider: 'Generic', status: 'NOT_BUILT', note: 'No outbound webhook dispatcher exists today; would be the natural extension point for Critical/High severity alerts.' },
];

module.exports = { SEVERITY, listAlerts, futureIntegrationPoints };
