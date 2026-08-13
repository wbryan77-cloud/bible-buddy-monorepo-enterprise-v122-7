/**
 * Regression: operational health factor.awarded must sum exactly to score.
 * Reproduces the post-Sprint-C 86≠87 anomaly (fractional escalation award
 * accumulated unrounded while factors[] stored a rounded display value).
 */
const assert = require('assert');
const path = require('path');

function clearScorerCaches() {
  const keys = [
    path.join(__dirname, '..', 'services', 'operationalHealthScorer.js'),
    path.join(__dirname, '..', 'services', 'userAssistanceEscalationStore.js'),
    path.join(__dirname, '..', 'services', 'runtimeHealthMonitor.js'),
    path.join(__dirname, '..', 'services', 'adminDecisionQueue.js'),
    path.join(__dirname, '..', 'services', 'operationalMetricsHistory.js'),
  ];
  for (const k of keys) {
    try {
      delete require.cache[require.resolve(k)];
    } catch (_) {}
  }
}

function withMockedEscalations(pending, fn) {
  clearScorerCaches();
  const escPath = require.resolve('../services/userAssistanceEscalationStore');
  // Load real module first so Decision Queue / other consumers keep full exports.
  const real = require('../services/userAssistanceEscalationStore');
  const original = require.cache[escPath];
  require.cache[escPath] = {
    id: escPath,
    filename: escPath,
    loaded: true,
    exports: {
      ...real,
      getStats: () => ({ pending, open: pending, resolved: 0 }),
    },
  };
  try {
    return fn();
  } finally {
    if (original) require.cache[escPath] = original;
    else delete require.cache[escPath];
    clearScorerCaches();
  }
}

function main() {
  // Exact arithmetic that previously produced score 87 vs sum-of-awards 86:
  // 18 pending → 15 * (1 - 18/20) = 1.5 fractional contribution.
  withMockedEscalations(18, () => {
    const { computeOperationalHealthScore } = require('../services/operationalHealthScorer');
    const h = computeOperationalHealthScore();
    assert.equal(h.factors.length, 5);
    const esc = h.factors.find((f) => f.factor === 'escalationsPending');
    assert.ok(esc, 'escalationsPending factor present');
    assert.equal(typeof esc.awarded, 'number');
    assert.equal(esc.awarded, Math.round(esc.awarded), 'awarded must be integer');
    const sum = h.factors.reduce((acc, f) => acc + f.awarded, 0);
    assert.strictEqual(sum, h.score, `factors must sum to score (sum=${sum} score=${h.score})`);
    // With other factors typically full credit locally, expected integer path:
    // 30+15+20+20+round(1.5)=30+15+20+20+2 = 87 when those are full.
    assert.ok(esc.detail.includes('18 pending'), esc.detail);
  });

  // Boundary: 0 pending = full credit; 20 pending = zero.
  withMockedEscalations(0, () => {
    const { computeOperationalHealthScore } = require('../services/operationalHealthScorer');
    const h = computeOperationalHealthScore();
    const esc = h.factors.find((f) => f.factor === 'escalationsPending');
    assert.equal(esc.awarded, 15);
    assert.strictEqual(
      h.factors.reduce((a, f) => a + f.awarded, 0),
      h.score
    );
  });

  withMockedEscalations(20, () => {
    const { computeOperationalHealthScore } = require('../services/operationalHealthScorer');
    const h = computeOperationalHealthScore();
    const esc = h.factors.find((f) => f.factor === 'escalationsPending');
    assert.equal(esc.awarded, 0);
    assert.strictEqual(
      h.factors.reduce((a, f) => a + f.awarded, 0),
      h.score
    );
  });

  const { awardPoints } = require('../services/operationalHealthScorer');
  assert.equal(awardPoints(1.5), 2);
  assert.equal(awardPoints(0), 0);
  assert.equal(awardPoints(15), 15);

  console.log('PASS operationalHealthScoreTraceability');
}

main();
