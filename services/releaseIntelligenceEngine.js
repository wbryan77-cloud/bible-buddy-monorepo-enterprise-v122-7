/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — Release Intelligence (objective 5).
 *
 * No prior service in this codebase produces a unified GO/CAUTION/BLOCK
 * release recommendation (confirmed by exploration before writing this:
 * the closest things are per-batch `computeGoNoGo` helpers scattered across
 * historical phase scripts, and a knowledge-readiness scorer that answers a
 * different question). This is genuinely net-new, not a duplicate.
 *
 * Deterministic and explainable by design — every point deducted from the
 * score has a corresponding human-readable reason in `reasons[]`. This is
 * a heuristic decision-support tool, not a black-box model, consistent
 * with "The AI recommends... human approval remains authoritative."
 *
 * Inputs (all already-existing, read-only signals — no new instrumentation):
 *   - The most recent Founder Alpha Readiness report
 *     (docs/alpha/founder-readiness/<timestamp>/FounderReadinessReport.json,
 *     written by scripts/founderAlphaReadinessValidator.js).
 *   - Live runtime health (services/runtimeHealthMonitor.js).
 *   - Decision Queue backlog (services/adminDecisionQueue.js).
 *
 * NEVER deploys, never blocks a deploy by itself — it only returns a
 * recommendation object for a human to read before deciding.
 */

const fs = require('fs');
const path = require('path');

const FOUNDER_READINESS_DIR = path.join(__dirname, '..', 'docs', 'alpha', 'founder-readiness');
const STALE_REPORT_MS = Number(process.env.BIBLEBUDDY_RELEASE_INTEL_STALE_MS || 24 * 60 * 60 * 1000);

function findLatestFounderReadinessReport() {
  try {
    if (!fs.existsSync(FOUNDER_READINESS_DIR)) return null;
    const dirs = fs
      .readdirSync(FOUNDER_READINESS_DIR)
      .filter((d) => fs.statSync(path.join(FOUNDER_READINESS_DIR, d)).isDirectory())
      .sort(); // ISO-timestamp directory names sort chronologically
    if (!dirs.length) return null;
    const latest = dirs[dirs.length - 1];
    const reportPath = path.join(FOUNDER_READINESS_DIR, latest, 'FounderReadinessReport.json');
    if (!fs.existsSync(reportPath)) return null;
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (e) {
    console.warn('[releaseIntelligenceEngine] could not read founder readiness report:', e.message);
    return null;
  }
}

function scoreFounderReadiness(report, reasons) {
  if (!report) {
    reasons.push({ points: -25, reason: 'No Founder Alpha Readiness report found — run `npm run founder-alpha:validate` before releasing.' });
    return -25;
  }
  const ageMs = Date.now() - Date.parse(report.timestamp || 0);
  let delta = 0;
  if (!Number.isFinite(ageMs) || ageMs > STALE_REPORT_MS) {
    reasons.push({ points: -15, reason: `Latest readiness report is stale (age ${Math.round(ageMs / 60000)} min, threshold ${Math.round(STALE_REPORT_MS / 60000)} min) — recommendation is based on outdated evidence.` });
    delta -= 15;
  }
  const criticalFailures = report.criticalFailures || [];
  if (criticalFailures.length) {
    reasons.push({ points: -40, reason: `${criticalFailures.length} critical failure(s) in the latest readiness report: ${criticalFailures.map((f) => f.check).join(', ')}.` });
    delta -= 40;
  }
  const counts = report.testCounts || {};
  const fail = counts.fail || 0;
  if (fail > 0 && !criticalFailures.length) {
    // Non-critical failures still matter, but distinctly less than critical ones.
    reasons.push({ points: -Math.min(fail * 3, 15), reason: `${fail} non-critical check(s) failing in the latest readiness report.` });
    delta -= Math.min(fail * 3, 15);
  }
  if (report.status === 'READY' || (fail === 0 && !criticalFailures.length)) {
    reasons.push({ points: 0, reason: 'Latest readiness report has zero failures.' });
  }
  return delta;
}

function scoreRuntimeHealth(reasons) {
  let delta = 0;
  try {
    const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');
    const snap = getRuntimeHealthSnapshot();
    const totalRequests = snap.totalRequests || 0;
    const errors = snap.errors || 0;
    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;
    if (totalRequests >= 10 && errorRate > 0.05) {
      const points = errorRate > 0.15 ? -30 : -12;
      reasons.push({ points, reason: `Live error rate is ${(errorRate * 100).toFixed(1)}% over ${totalRequests} requests (threshold 5%).` });
      delta += points;
    }
    // Exact values from services/runtimeHealthMonitor.js: 'normal' | 'warn' | 'critical'.
    if (snap.memoryPressureLevel === 'warn' || snap.memoryPressureLevel === 'critical') {
      const points = snap.memoryPressureLevel === 'critical' ? -20 : -10;
      reasons.push({ points, reason: `Memory pressure level is ${snap.memoryPressureLevel}.` });
      delta += points;
    }
  } catch (e) {
    reasons.push({ points: -5, reason: `Runtime health snapshot unavailable: ${e.message}.` });
    delta -= 5;
  }
  return delta;
}

function scoreDecisionQueueBacklog(reasons) {
  let delta = 0;
  try {
    const { listDecisionQueue } = require('./adminDecisionQueue');
    const queue = listDecisionQueue({ limit: 1 }); // counts are computed over the full set regardless of page size
    const critical = queue.counts?.bySeverity?.Critical || 0;
    const highNew = (queue.counts?.byStatus?.New || 0) + (queue.counts?.byStatus?.['Ready for Decision'] || 0);
    if (critical > 0) {
      reasons.push({ points: -20, reason: `${critical} Critical-severity Decision Queue item(s) currently unresolved.` });
      delta -= 20;
    }
    if (highNew > 20) {
      reasons.push({ points: -8, reason: `Decision Queue backlog is large (${highNew} items New or Ready for Decision).` });
      delta -= 8;
    }
  } catch (e) {
    reasons.push({ points: -3, reason: `Decision Queue backlog unavailable: ${e.message}.` });
    delta -= 3;
  }
  return delta;
}

function recommendationForScore(score) {
  if (score >= 85) return 'GO';
  if (score >= 60) return 'CAUTION';
  return 'BLOCK';
}

/**
 * Returns { recommendation, score, confidence, reasons[], generatedAt,
 * inputsUsed }. `confidence` is deliberately lower whenever an input signal
 * was missing/stale — this recommendation is only as good as its inputs,
 * and that is surfaced rather than hidden.
 */
function evaluateReleaseReadiness() {
  const reasons = [];
  let score = 100;

  const report = findLatestFounderReadinessReport();
  score += scoreFounderReadiness(report, reasons);
  score += scoreRuntimeHealth(reasons);
  score += scoreDecisionQueueBacklog(reasons);

  score = Math.max(0, Math.min(100, score));
  const recommendation = recommendationForScore(score);

  const missingSignals = reasons.filter((r) => /unavailable|No Founder Alpha Readiness report/.test(r.reason)).length;
  const confidence = missingSignals === 0 ? 'HIGH' : missingSignals === 1 ? 'MEDIUM' : 'LOW';

  return {
    recommendation,
    score,
    confidence,
    reasons: reasons.length ? reasons : [{ points: 0, reason: 'No risk factors detected in any available signal.' }],
    generatedAt: new Date().toISOString(),
    inputsUsed: {
      founderReadinessReport: report ? { timestamp: report.timestamp, status: report.status, criticalFailureCount: (report.criticalFailures || []).length } : null,
      runtimeHealthChecked: true,
      decisionQueueBacklogChecked: true,
    },
    requiredApproval: true,
    note: 'This is a decision-support recommendation only. It never deploys, blocks a deploy, or takes any action — a human retains full release authority.',
  };
}

module.exports = { evaluateReleaseReadiness, findLatestFounderReadinessReport };
