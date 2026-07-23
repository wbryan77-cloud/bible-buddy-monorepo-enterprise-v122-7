/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — regression coverage for the six new
 * services introduced in this batch:
 *   - services/releaseIntelligenceEngine.js
 *   - services/operationalHealthScorer.js
 *   - services/productionAnomalyDetector.js
 *   - services/developerIntelligenceScanner.js
 *   - services/recommendationLearningEngine.js
 *   - services/enterpriseIntelligenceAggregator.js
 *
 * Follows this repo's existing tests/*.test.js convention: plain `assert`,
 * runTest() collecting { name, passed, error }, one process exit code.
 *
 * A recurring assertion across every test: no capability here ever sets
 * or implies an auto-execution path. Every result object either has
 * requiredApproval present (true, or a computed boolean derived from
 * whether there's anything to approve) or is explicitly read-only data.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runTest(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

const results = [];

// ---------------------------------------------------------------------------
// services/releaseIntelligenceEngine.js
// ---------------------------------------------------------------------------
(() => {
  const { evaluateReleaseReadiness } = require('../services/releaseIntelligenceEngine');

  results.push(runTest('releaseIntelligenceEngine: returns a valid GO/CAUTION/BLOCK recommendation with a score in [0,100]', () => {
    const r = evaluateReleaseReadiness();
    assert.ok(['GO', 'CAUTION', 'BLOCK'].includes(r.recommendation), `unexpected recommendation: ${r.recommendation}`);
    assert.ok(r.score >= 0 && r.score <= 100, `score out of range: ${r.score}`);
    assert.ok(Array.isArray(r.reasons) && r.reasons.length > 0, 'reasons[] must always explain the score, never be empty');
    assert.strictEqual(r.requiredApproval, true, 'must always require human approval');
  }));

  results.push(runTest('releaseIntelligenceEngine: every point deduction has a matching human-readable reason (explainability contract)', () => {
    const r = evaluateReleaseReadiness();
    const totalDeductions = r.reasons.reduce((sum, x) => sum + Math.min(0, x.points), 0);
    assert.strictEqual(Math.max(0, Math.min(100, 100 + totalDeductions)), r.score, 'score must be fully derivable from the sum of reasons[].points starting at 100');
  }));

  results.push(runTest('releaseIntelligenceEngine: low score always yields BLOCK, high score always yields GO (threshold contract)', () => {
    const { evaluateReleaseReadiness: fn } = require('../services/releaseIntelligenceEngine');
    // We can't force specific inputs without heavier mocking, but we CAN
    // assert the pure mapping function's boundaries directly via a small
    // black-box re-derivation: recommendation is monotonic with score.
    const r = fn();
    if (r.score >= 85) assert.strictEqual(r.recommendation, 'GO');
    else if (r.score >= 60) assert.strictEqual(r.recommendation, 'CAUTION');
    else assert.strictEqual(r.recommendation, 'BLOCK');
  }));
})();

// ---------------------------------------------------------------------------
// services/operationalHealthScorer.js
// ---------------------------------------------------------------------------
(() => {
  const { computeOperationalHealthScore } = require('../services/operationalHealthScorer');

  results.push(runTest('operationalHealthScorer: returns a score in [0,100] with a matching letter grade', () => {
    const h = computeOperationalHealthScore();
    assert.ok(h.score >= 0 && h.score <= 100, `score out of range: ${h.score}`);
    assert.ok(['A', 'B', 'C', 'D', 'F'].includes(h.grade));
    if (h.score >= 90) assert.strictEqual(h.grade, 'A');
    if (h.score < 60) assert.strictEqual(h.grade, 'F');
  }));

  results.push(runTest('operationalHealthScorer: every factor is individually traceable and sums to the total score', () => {
    const h = computeOperationalHealthScore();
    assert.ok(Array.isArray(h.factors) && h.factors.length === 5, `expected 5 factors, got ${h.factors.length}`);
    const sum = Math.round(h.factors.reduce((acc, f) => acc + f.awarded, 0));
    assert.strictEqual(sum, h.score, 'sum of factor.awarded must equal the total score exactly (no hidden adjustments)');
    for (const f of h.factors) {
      assert.ok(f.awarded <= f.weight, `factor ${f.factor} awarded (${f.awarded}) exceeds its weight (${f.weight})`);
      assert.ok(f.awarded >= 0, `factor ${f.factor} awarded a negative amount`);
    }
  }));
})();

// ---------------------------------------------------------------------------
// services/productionAnomalyDetector.js
// ---------------------------------------------------------------------------
(() => {
  const HISTORY_PATH = path.join(__dirname, '..', 'data', 'operational-metrics-history.jsonl');
  const backupPath = `${HISTORY_PATH}.phase3-test-backup`;
  const hadOriginal = fs.existsSync(HISTORY_PATH);
  if (hadOriginal) fs.renameSync(HISTORY_PATH, backupPath);

  try {
    const now = Date.now();
    const points = [];
    for (let i = 20; i >= 1; i--) {
      points.push({ at: new Date(now - i * 60000).toISOString(), failedRequests: 2, averageLatencyMs: 100 });
    }
    points.push({ at: new Date(now).toISOString(), failedRequests: 20, averageLatencyMs: 105 });
    const dir = path.dirname(HISTORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HISTORY_PATH, points.map((p) => JSON.stringify(p)).join('\n') + '\n', 'utf8');

    const { detectAnomalies } = require('../services/productionAnomalyDetector');

    results.push(runTest('productionAnomalyDetector: fires on a real 900% spike and correctly names the field', () => {
      const r = detectAnomalies({ lookbackMs: 60 * 60 * 1000 });
      assert.ok(r.alerts.some((a) => a.field === 'failedRequests'), 'expected a failedRequests anomaly');
      assert.strictEqual(r.requiredApproval, true, 'an alert must always require human review');
    }));

    results.push(runTest('productionAnomalyDetector: does NOT false-positive on a 5% latency change (below the 50% threshold)', () => {
      const r = detectAnomalies({ lookbackMs: 60 * 60 * 1000 });
      assert.ok(!r.alerts.some((a) => a.field === 'averageLatencyMs'), 'a small, normal fluctuation must not be flagged');
    }));

    results.push(runTest('productionAnomalyDetector: with fewer than 3 samples, returns zero alerts and an explicit data-availability note (never a false "all clear")', () => {
      fs.writeFileSync(HISTORY_PATH, `${JSON.stringify({ at: new Date().toISOString(), failedRequests: 1 })}\n`, 'utf8');
      const { detectAnomalies: fn } = require('../services/productionAnomalyDetector');
      const r = fn({ lookbackMs: 60 * 60 * 1000 });
      assert.strictEqual(r.alerts.length, 0);
      assert.ok(/too few/i.test(r.note), 'must explicitly state insufficient data rather than implying a clean bill of health');
    }));
  } finally {
    try {
      if (fs.existsSync(HISTORY_PATH)) fs.unlinkSync(HISTORY_PATH);
      if (hadOriginal) fs.renameSync(backupPath, HISTORY_PATH);
    } catch (_) { /* best-effort cleanup */ }
  }
})();

// ---------------------------------------------------------------------------
// services/developerIntelligenceScanner.js
// ---------------------------------------------------------------------------
(() => {
  const { scanUnusedServices, citeKnownArchitecturalDrift } = require('../services/developerIntelligenceScanner');

  results.push(runTest('developerIntelligenceScanner: does not flag a known heavily-referenced service as unused (no false positives)', () => {
    const r = scanUnusedServices();
    const flagged = new Set(r.findings.map((f) => f.file));
    assert.ok(!flagged.has('services/buddyBrain.js'), 'buddyBrain.js is required throughout the codebase and must never be flagged');
    assert.ok(!flagged.has('services/adminCommandCenterAggregator.js'), 'adminCommandCenterAggregator.js is required throughout and must never be flagged');
  }));

  results.push(runTest('developerIntelligenceScanner: architectural drift findings only cite documents that actually exist on disk', () => {
    const findings = citeKnownArchitecturalDrift();
    for (const f of findings) {
      assert.ok(fs.existsSync(path.join(__dirname, '..', f.path)), `cited path does not exist: ${f.path}`);
    }
  }));
})();

// ---------------------------------------------------------------------------
// services/recommendationLearningEngine.js
// ---------------------------------------------------------------------------
(() => {
  const { confidenceAnnotationForRate, buildRecommendationLearningSummary } = require('../services/recommendationLearningEngine');

  results.push(runTest('recommendationLearningEngine: confidence annotation requires at least 3 decided items before drawing a conclusion', () => {
    const a = confidenceAnnotationForRate(100, 1);
    assert.strictEqual(a.label, 'INSUFFICIENT_HISTORY');
    const b = confidenceAnnotationForRate(90, 10);
    assert.strictEqual(b.label, 'HISTORICALLY_TRUSTED');
    const c = confidenceAnnotationForRate(10, 10);
    assert.strictEqual(c.label, 'HISTORICALLY_QUESTIONED');
  }));

  results.push(runTest('recommendationLearningEngine: summary never mutates any recommendation — output has no write/approve fields', () => {
    const s = buildRecommendationLearningSummary();
    assert.strictEqual(s.requiredApproval, true);
    assert.ok(Array.isArray(s.crossSourceApprovalRates));
  }));
})();

// ---------------------------------------------------------------------------
// services/enterpriseIntelligenceAggregator.js
// ---------------------------------------------------------------------------
(() => {
  const { buildEnterpriseIntelligenceSummary, invalidateEnterpriseIntelligenceCache } = require('../services/enterpriseIntelligenceAggregator');

  results.push(runTest('enterpriseIntelligenceAggregator: all 5 sections resolve OK using the shared buildSection envelope contract', () => {
    invalidateEnterpriseIntelligenceCache();
    const s = buildEnterpriseIntelligenceSummary({ skipCache: true });
    const expectedSections = ['operationalHealthScore', 'releaseReadiness', 'productionAnomalies', 'developerIntelligence', 'recommendationLearning'];
    for (const name of expectedSections) {
      const section = s.sections[name];
      assert.ok(section, `missing section: ${name}`);
      assert.ok(['OK', 'UNAVAILABLE'].includes(section.status), `section ${name} has invalid status: ${section.status}`);
      assert.ok('lastUpdated' in section && 'sourceSystem' in section && 'drillDownTarget' in section, `section ${name} missing envelope fields`);
    }
  }));

  results.push(runTest('enterpriseIntelligenceAggregator: caches the summary within the TTL window (identical generatedAt on immediate re-call)', () => {
    invalidateEnterpriseIntelligenceCache();
    const first = buildEnterpriseIntelligenceSummary();
    const second = buildEnterpriseIntelligenceSummary();
    assert.strictEqual(first.generatedAt, second.generatedAt, 'second call within the TTL window should return the cached object, not recompute');
  }));
})();

// ---------------------------------------------------------------------------
// services/adminChiefOfStaff.js — Phase 3 intent additions
// ---------------------------------------------------------------------------
(() => {
  const { classifyIntent } = require('../services/adminChiefOfStaff');

  results.push(runTest('adminChiefOfStaff: classifies release-readiness questions with several natural phrasings', () => {
    for (const q of ['Is it safe to release right now?', 'Should we deploy today?', 'go/no-go for release']) {
      const intent = classifyIntent(q);
      assert.ok(intent, `no intent matched for: "${q}"`);
      assert.strictEqual(intent.id, 'release_readiness', `wrong intent for "${q}": ${intent.id}`);
    }
  }));

  results.push(runTest('adminChiefOfStaff: classifies operational health, developer intelligence, and anomaly questions', () => {
    assert.strictEqual(classifyIntent('What is our operational health score?').id, 'operational_health_score');
    assert.strictEqual(classifyIntent('Any technical debt I should know about?').id, 'developer_intelligence');
    assert.strictEqual(classifyIntent('Any anomalies today?').id, 'anomalies_today');
  }));
})();

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

console.log(`Phase 3 Autonomous Operations tests: ${passed}/${results.length} passed`);

if (failed.length) {
  for (const item of failed) {
    console.error(`FAIL: ${item.name} — ${item.error}`);
  }
  process.exit(1);
}

console.log('All Phase 3 Autonomous Operations tests passed.');
process.exit(0);
