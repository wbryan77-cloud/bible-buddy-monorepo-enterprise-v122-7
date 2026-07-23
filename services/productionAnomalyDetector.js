/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — Production Protection (objective 8) +
 * part of Continuous Runtime Analysis (objective 2).
 *
 * Reuses services/operationalMetricsHistory.js (built in Phase 2) as its
 * only data source — no new metrics collection, no new instrumentation.
 * Applies simple, explainable statistical rules (current value vs. a
 * rolling baseline mean, expressed as a percentage deviation) to flag
 * anomalies. Deliberately not a real anomaly-detection model (no z-scores,
 * no seasonality) — with the sparse history any production instance of
 * this app will realistically have for a while, a simple, transparent
 * threshold is more honest than a sophisticated-looking method that would
 * just be noise on so few samples.
 *
 * ALWAYS produces alerts, NEVER takes action. Every alert is advisory.
 */

const { readHistory } = require('./operationalMetricsHistory');

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

const RULES = [
  { field: 'totalRequests', label: 'Total requests', direction: 'ignore' }, // volume, not itself an anomaly signal
  { field: 'failedRequests', label: 'Failed requests', direction: 'increase', thresholdPct: 50, severity: 'HIGH' },
  { field: 'averageLatencyMs', label: 'Average latency', direction: 'increase', thresholdPct: 50, severity: 'MEDIUM' },
  { field: 'totalOpenItems', label: 'Decision Queue open items', direction: 'increase', thresholdPct: 75, severity: 'LOW' },
  { field: 'escalationsPending', label: 'Pending escalations', direction: 'increase', thresholdPct: 75, severity: 'MEDIUM' },
  { field: 'notificationsQueued', label: 'Notifications queued', direction: 'increase', thresholdPct: 100, severity: 'LOW' },
];

function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function detectAnomalies({ lookbackMs = DEFAULT_LOOKBACK_MS } = {}) {
  const points = readHistory({ limit: 5000, sinceMs: lookbackMs });
  const alerts = [];

  if (points.length < 3) {
    return {
      alerts,
      ok: true,
      sampleCount: points.length,
      generatedAt: new Date().toISOString(),
      note: `Only ${points.length} historical sample(s) in the last ${Math.round(lookbackMs / 3600000)}h — too few to detect anomalies confidently. No alerts raised; this is a data-availability limitation, not a clean bill of health.`,
    };
  }

  const current = points[points.length - 1];
  const baseline = points.slice(0, -1); // everything except the current point

  for (const rule of RULES) {
    if (rule.direction === 'ignore') continue;
    const baselineValues = baseline.map((p) => p[rule.field]).filter((v) => typeof v === 'number');
    const currentValue = current[rule.field];
    if (typeof currentValue !== 'number' || baselineValues.length < 2) continue;

    const baselineMean = mean(baselineValues);
    if (baselineMean === null) continue;

    if (baselineMean === 0) {
      // Went from zero to non-zero — always worth flagging if it crosses a
      // minimum absolute floor (avoids alerting on e.g. 0 -> 1 noise).
      if (currentValue >= 3) {
        alerts.push({
          field: rule.field,
          label: rule.label,
          severity: rule.severity,
          detail: `${rule.label} was 0 across the recent baseline and is now ${currentValue}.`,
          baselineMean: 0,
          currentValue,
        });
      }
      continue;
    }

    const pctChange = ((currentValue - baselineMean) / baselineMean) * 100;
    if (rule.direction === 'increase' && pctChange >= rule.thresholdPct) {
      alerts.push({
        field: rule.field,
        label: rule.label,
        severity: rule.severity,
        detail: `${rule.label} is ${pctChange.toFixed(0)}% above its recent baseline (current=${currentValue}, baseline avg=${baselineMean.toFixed(1)}, threshold=${rule.thresholdPct}%).`,
        baselineMean,
        currentValue,
        pctChange: Math.round(pctChange),
      });
    }
  }

  return {
    alerts,
    ok: true,
    sampleCount: points.length,
    generatedAt: new Date().toISOString(),
    requiredApproval: alerts.length > 0,
    note: alerts.length
      ? 'These are advisory alerts only — no automatic remediation is taken. A human must review and decide on any action.'
      : `No anomalies detected against the last ${points.length} operational metrics sample(s).`,
  };
}

module.exports = { detectAnomalies };
