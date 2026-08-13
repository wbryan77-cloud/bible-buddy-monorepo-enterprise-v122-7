/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — Enterprise Operations AI (objective 1):
 * "operational health scoring." No prior service computes a single
 * numeric health score in this codebase — confirmed during exploration.
 * `runtimeHealthMonitor.js` exposes raw counters; `adminCommandCenterAggregator.js`
 * exposes per-section OK/UNAVAILABLE status; neither collapses to one
 * explainable number. This does, and shows exactly how it got there.
 *
 * Deliberately a documented, deterministic weighted heuristic — NOT a
 * machine-learned model — so every point lost is traceable to a specific,
 * named factor. Consistent with "the AI recommends... human approval
 * remains authoritative": this score informs a human, it does not act.
 *
 * Rounding contract (post-Sprint-C reconciliation): each factor awards an
 * integer point value. That same integer is both (a) recorded in
 * factors[].awarded and (b) added into the total. The displayed factors
 * therefore always sum exactly to score — no hidden fractional remainder.
 */

const WEIGHTS = {
  errorRate: 30,
  latencyTrend: 20,
  memoryPressure: 15,
  decisionQueueBacklog: 20,
  escalationsPending: 15,
};

function awardPoints(raw) {
  return Math.round(Math.max(0, raw));
}

function scoreErrorRate(snap, factors) {
  const totalRequests = snap.totalRequests || 0;
  const errors = snap.errors || 0;
  if (totalRequests < 10) {
    factors.push({ factor: 'errorRate', weight: WEIGHTS.errorRate, awarded: WEIGHTS.errorRate, detail: 'Insufficient traffic to measure (< 10 requests) — full credit given, not penalized for low volume.' });
    return WEIGHTS.errorRate;
  }
  const errorRate = errors / totalRequests;
  const awarded = awardPoints(WEIGHTS.errorRate * (1 - Math.min(errorRate / 0.2, 1)));
  factors.push({ factor: 'errorRate', weight: WEIGHTS.errorRate, awarded, detail: `${(errorRate * 100).toFixed(1)}% error rate over ${totalRequests} requests (0% = full credit, 20%+ = zero credit).` });
  return awarded;
}

function scoreLatencyTrend(factors) {
  try {
    const { summarizeTrend } = require('./operationalMetricsHistory');
    const trend = summarizeTrend('averageLatencyMs', { sinceMs: 24 * 60 * 60 * 1000 });
    if (trend.sampleCount < 2 || !trend.first) {
      factors.push({ factor: 'latencyTrend', weight: WEIGHTS.latencyTrend, awarded: WEIGHTS.latencyTrend, detail: 'Insufficient history to establish a trend yet — full credit given by default.' });
      return WEIGHTS.latencyTrend;
    }
    const pctChange = trend.first > 0 ? (trend.last - trend.first) / trend.first : 0;
    // Latency getting worse (positive % change) costs credit; improving or flat costs nothing.
    const awarded = awardPoints(WEIGHTS.latencyTrend * (1 - Math.min(Math.max(pctChange, 0) / 0.5, 1)));
    factors.push({ factor: 'latencyTrend', weight: WEIGHTS.latencyTrend, awarded, detail: `Average latency changed ${(pctChange * 100).toFixed(0)}% over the last 24h (first=${trend.first}ms, last=${trend.last}ms).` });
    return awarded;
  } catch (e) {
    factors.push({ factor: 'latencyTrend', weight: WEIGHTS.latencyTrend, awarded: WEIGHTS.latencyTrend, detail: `History unavailable (${e.message}) — full credit given by default rather than penalizing for a missing signal.` });
    return WEIGHTS.latencyTrend;
  }
}

function scoreMemoryPressure(snap, factors) {
  const level = snap.memoryPressureLevel || 'normal';
  const awarded = awardPoints(level === 'critical' ? 0 : level === 'warn' ? WEIGHTS.memoryPressure * 0.4 : WEIGHTS.memoryPressure);
  factors.push({ factor: 'memoryPressure', weight: WEIGHTS.memoryPressure, awarded, detail: `Memory pressure level: ${level}.` });
  return awarded;
}

function scoreDecisionQueueBacklog(factors) {
  try {
    const { listDecisionQueue } = require('./adminDecisionQueue');
    const queue = listDecisionQueue({ limit: 1 });
    const critical = queue.counts?.bySeverity?.Critical || 0;
    const high = queue.counts?.bySeverity?.High || 0;
    // Each open Critical costs 5 points (up to the full weight), each High costs 1.
    const penalty = Math.min(WEIGHTS.decisionQueueBacklog, critical * 5 + high * 1);
    const awarded = awardPoints(WEIGHTS.decisionQueueBacklog - penalty);
    factors.push({ factor: 'decisionQueueBacklog', weight: WEIGHTS.decisionQueueBacklog, awarded, detail: `${critical} Critical, ${high} High severity item(s) open in the Decision Queue.` });
    return awarded;
  } catch (e) {
    factors.push({ factor: 'decisionQueueBacklog', weight: WEIGHTS.decisionQueueBacklog, awarded: WEIGHTS.decisionQueueBacklog, detail: `Decision Queue unavailable (${e.message}) — full credit given by default.` });
    return WEIGHTS.decisionQueueBacklog;
  }
}

function scoreEscalationsPending(factors) {
  try {
    const { getStats } = require('./userAssistanceEscalationStore');
    const stats = getStats();
    const pending = stats.pending || 0;
    // 0 pending = full credit; 20+ pending = zero credit; linear between.
    const awarded = awardPoints(WEIGHTS.escalationsPending * (1 - Math.min(pending / 20, 1)));
    factors.push({ factor: 'escalationsPending', weight: WEIGHTS.escalationsPending, awarded, detail: `${pending} pending User Assistance escalation(s) awaiting an admin.` });
    return awarded;
  } catch (e) {
    factors.push({ factor: 'escalationsPending', weight: WEIGHTS.escalationsPending, awarded: WEIGHTS.escalationsPending, detail: `Escalation store unavailable (${e.message}) — full credit given by default.` });
    return WEIGHTS.escalationsPending;
  }
}

function gradeForScore(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function computeOperationalHealthScore() {
  const factors = [];
  let total = 0;
  try {
    const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');
    const snap = getRuntimeHealthSnapshot();
    total += scoreErrorRate(snap, factors);
    total += scoreMemoryPressure(snap, factors);
  } catch (e) {
    factors.push({ factor: 'errorRate', weight: WEIGHTS.errorRate, awarded: WEIGHTS.errorRate, detail: `Runtime health unavailable (${e.message}) — full credit given by default.` });
    factors.push({ factor: 'memoryPressure', weight: WEIGHTS.memoryPressure, awarded: WEIGHTS.memoryPressure, detail: 'Runtime health unavailable — full credit given by default.' });
    total += WEIGHTS.errorRate + WEIGHTS.memoryPressure;
  }
  total += scoreLatencyTrend(factors);
  total += scoreDecisionQueueBacklog(factors);
  total += scoreEscalationsPending(factors);

  const score = Math.max(0, Math.min(100, total));
  const weakestFactors = [...factors].sort((a, b) => (a.awarded / a.weight) - (b.awarded / b.weight)).slice(0, 2);

  return {
    score,
    grade: gradeForScore(score),
    factors,
    topConcerns: weakestFactors.filter((f) => f.awarded < f.weight).map((f) => f.detail),
    generatedAt: new Date().toISOString(),
    methodology: 'Deterministic weighted heuristic across 5 factors (error rate, latency trend, memory pressure, Decision Queue backlog, pending escalations). Not a machine-learned model — every point is traceable to factors[] above.',
  };
}

module.exports = { computeOperationalHealthScore, awardPoints, WEIGHTS };
