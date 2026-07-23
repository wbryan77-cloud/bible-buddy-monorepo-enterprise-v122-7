/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Operational Intelligence (objective 4).
 *
 * The Phase 1B v2.0 Operational Observability slice
 * (services/adminCommandCenterAggregator.js :: buildOperationalMetricsSummary)
 * is point-in-time only — every read is "right now," with no way to see a
 * trend. This module adds exactly one capability: periodically snapshot
 * that same summary to a rolling, bounded JSONL log (the same append-only
 * pattern already used by every other history log in this codebase —
 * services/adminAuditTrail.js, services/alphaNotificationScheduler.js's
 * history, etc.) and read it back as a trend.
 *
 * Deliberately NOT a new metrics-collection engine: `recordMetricsSnapshot`
 * calls the existing `buildOperationalMetricsSummary()` and writes exactly
 * what it returns, trimmed to the numeric fields worth trending. Zero new
 * instrumentation anywhere else in the codebase.
 *
 * MULTI-INSTANCE NOTE: if this snapshotter runs on more than one instance,
 * each instance appends its OWN snapshot on its own schedule — safe (JSONL
 * append is atomic, see storageAdapter.js's header for why) but redundant:
 * you get roughly N times the snapshot density with N instances, each
 * reflecting that instance's own in-process runtime counters (which
 * legitimately differ per instance — see runtimeHealthMonitor.js). This is
 * a data-volume/precision nuisance, not a correctness bug, and is bounded
 * by the same size-based rotation every other JSONL log in this codebase
 * already uses (services/safeJsonlWriter.js).
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const HISTORY_PATH = path.join(__dirname, '..', 'data', 'operational-metrics-history.jsonl');
const MAX_READ_LINES = 5000;

function ensureDir() {
  const dir = path.dirname(HISTORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Trims a full buildOperationalMetricsSummary() payload down to the numeric
 * fields worth charting — avoids growing the history log with the full
 * (non-numeric, already-available-live) shape every snapshot.
 */
function extractTrendPoint(metrics) {
  const rt = metrics.runtimeMetrics || {};
  const q = metrics.queueMetrics || {};
  const rec = metrics.recommendationMetrics || {};
  const ua = metrics.userAssistanceMetrics || {};
  const notif = metrics.notificationMetrics || {};
  return {
    at: metrics.generatedAt || new Date().toISOString(),
    overallStatus: metrics.overallStatus || null,
    uptimeMs: rt.uptimeMs ?? null,
    totalRequests: rt.totalRequests ?? null,
    failedRequests: rt.failedRequests ?? null,
    averageLatencyMs: rt.averageLatencyMs ?? null,
    totalOpenItems: q.totalOpenItems ?? null,
    totalRecommendations: rec.totalRecommendations ?? null,
    escalationsPending: ua.escalationsPending ?? null,
    notificationsQueued: notif.queuedCounts
      ? Object.values(notif.queuedCounts).reduce((a, b) => a + (Number(b) || 0), 0)
      : null,
  };
}

function recordMetricsSnapshot() {
  try {
    ensureDir();
    // Lazy required to avoid a require cycle (adminCommandCenterAggregator
    // does not require this module, so this is one-directional, but lazy
    // require keeps that invariant obviously true rather than assumed).
    const { buildOperationalMetricsSummary } = require('./adminCommandCenterAggregator');
    const metrics = buildOperationalMetricsSummary();
    const point = extractTrendPoint(metrics);
    appendJsonlSafe(HISTORY_PATH, point);
    return point;
  } catch (e) {
    console.warn('[operationalMetricsHistory] snapshot failed:', e.message);
    return null;
  }
}

function readHistory({ limit = 200, sinceMs = null } = {}) {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return [];
    const raw = fs.readFileSync(HISTORY_PATH, 'utf8').trim();
    if (!raw) return [];
    let points = raw
      .split('\n')
      .slice(-MAX_READ_LINES)
      .map((line) => {
        try { return JSON.parse(line); } catch (_) { return null; }
      })
      .filter(Boolean);
    if (sinceMs) {
      const cutoff = Date.now() - sinceMs;
      points = points.filter((p) => Date.parse(p.at || 0) >= cutoff);
    }
    return points.slice(-Math.min(Number(limit) || 200, MAX_READ_LINES));
  } catch (e) {
    console.warn('[operationalMetricsHistory] read failed:', e.message);
    return [];
  }
}

/**
 * Simple, honest trend summary for one numeric field: first value, last
 * value, delta, and direction. No forecasting/smoothing — a Phase 3
 * concern if ever needed, not fabricated here.
 */
function summarizeTrend(field, { sinceMs = 24 * 60 * 60 * 1000 } = {}) {
  const points = readHistory({ limit: MAX_READ_LINES, sinceMs }).filter((p) => typeof p[field] === 'number');
  if (points.length < 2) {
    return { field, sampleCount: points.length, first: points[0]?.[field] ?? null, last: points[0]?.[field] ?? null, delta: 0, direction: 'FLAT' };
  }
  const first = points[0][field];
  const last = points[points.length - 1][field];
  const delta = last - first;
  return {
    field,
    sampleCount: points.length,
    first,
    last,
    delta,
    direction: delta > 0 ? 'UP' : delta < 0 ? 'DOWN' : 'FLAT',
  };
}

let snapshotTimer = null;

/** Same "start once, unref so it never keeps the process alive" pattern as
 * services/stateTtlCleanup.js's scheduleStateTtlCleanup(). */
function scheduleMetricsSnapshots(intervalMs = Number(process.env.BIBLEBUDDY_METRICS_SNAPSHOT_INTERVAL_MS || 15 * 60 * 1000)) {
  if (snapshotTimer) return;
  recordMetricsSnapshot();
  snapshotTimer = setInterval(recordMetricsSnapshot, intervalMs);
  if (snapshotTimer.unref) snapshotTimer.unref();
}

module.exports = {
  HISTORY_PATH,
  recordMetricsSnapshot,
  readHistory,
  summarizeTrend,
  scheduleMetricsSnapshots,
};
