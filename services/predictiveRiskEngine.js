/**
 * BIE v1.1A — Conservative predictive risk (SHADOW only).
 * No unsupported percentages until calibration history exists.
 */

const crypto = require('crypto');
const { runDiscoveryPass } = require('./discoveryEngine');
const { listLearningRecords } = require('./learningRecordStore');
const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');

function predictionId(changeKey, family) {
  return `pred_${crypto.createHash('sha256').update(`${changeKey}|${family}`).digest('hex').slice(0, 16)}`;
}

function runPredictiveRiskPass({
  proposedChange = { kind: 'release', label: 'next_governed_change' },
  persist = true,
} = {}) {
  const discoveries = runDiscoveryPass({ persist: false }).discoveries || [];
  const learning = listLearningRecords({ limit: 200 });
  const predictions = [];

  for (const d of discoveries.filter((x) => x.discoveryType === 'RECURRING_FAILURE' || x.discoveryType === 'POSSIBLE_REGRESSION')) {
    const relatedRejected = learning.filter(
      (lr) => lr.behaviorFamily === d.behaviorFamily && lr.adminStatus === 'REJECTED',
    ).length;
    predictions.push({
      predictionId: predictionId(proposedChange.label || 'change', d.behaviorFamily),
      proposedChange,
      affectedAssets: {
        behaviorFamily: d.behaviorFamily,
        discoveryId: d.discoveryId,
        suspectedOwner: d.suspectedOwner,
      },
      supportingHistoricalOutcomes: (d.supportingEventIds || []).slice(0, 10),
      method: 'deterministic_recurrence_projection',
      confidence: d.recurrenceCount >= 5 ? 'medium' : 'low',
      // Numeric probability withheld until calibration — use ordinal band only.
      probabilityBand: d.recurrenceCount >= 5 ? 'elevated' : 'possible',
      numericProbabilityShown: false,
      uncertainty: 'Insufficient calibrated outcome labels for numeric probability',
      falsePositiveHistory: [],
      falseNegativeHistory: [],
      requiredVerificationTests: [
        `replay family ${d.behaviorFamily}`,
        'phase1dDeterministicVlpComposition',
        'bieV11FounderExperienceLoop',
      ],
      expiration: new Date(Date.now() + 14 * 86400000).toISOString(),
      actualOutcome: null,
      rejectedRecommendationCollisionRisk: relatedRejected > 0,
      mode: 'SHADOW',
      createdAt: new Date().toISOString(),
    });
  }

  if (persist) {
    for (const p of predictions) {
      upsertById(DOC.predictions, 'predictionId', p, MAX.predictions).catch(() => {});
    }
  }

  return {
    ok: true,
    mode: 'SHADOW',
    productionMutation: false,
    predictionCount: predictions.length,
    numericProbabilitiesDisplayed: false,
    predictions,
  };
}

module.exports = {
  runPredictiveRiskPass,
  predictionId,
};
