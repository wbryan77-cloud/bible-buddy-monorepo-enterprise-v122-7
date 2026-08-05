/**
 * BIE v1.1A — Bounded causal hypotheses (correlation ≠ causation).
 * Generates experiments, never automatic code changes.
 */

const crypto = require('crypto');
const { runDiscoveryPass } = require('./discoveryEngine');
const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');

function hypothesisId(discoveryId, mechanism) {
  return `hyp_${crypto.createHash('sha256').update(`${discoveryId}|${mechanism}`).digest('hex').slice(0, 16)}`;
}

function buildHypothesesFromDiscoveries(discoveries = []) {
  const out = [];
  for (const d of discoveries) {
    if (!d.recommendationEligibility && d.recurrenceCount < 2) continue;
    const mechanism =
      d.discoveryType === 'MEMORY_PATTERN'
        ? 'Burden memory unavailable or not selected at prayer/follow-up time'
        : d.behaviorFamily.includes('history') || d.discoveryType === 'RETRIEVAL_GAP_PATTERN'
          ? 'Doctrine keyword persistence may override current-message history lane'
          : d.discoveryType === 'TRUST_BREAK_PATTERN'
            ? 'Companion posture / warmth path not engaged for emotional turns'
            : 'Route or evidence selection fails to honor current-message constraints';

    out.push({
      hypothesisId: hypothesisId(d.discoveryId, mechanism),
      discoveryId: d.discoveryId,
      proposedCausalChain: [
        { step: 1, claim: `Observed pattern ${d.discoveryType} on ${d.behaviorFamily}` },
        { step: 2, claim: mechanism },
        { step: 3, claim: 'User-visible answer misses Founder expectation' },
      ],
      supportingTraces: (d.supportingEventIds || []).slice(0, 12),
      contradictingTraces: [],
      alternativeExplanations: d.alternativeExplanations || [
        'stale memory selection',
        'route confidence threshold',
        'missing evidence',
        'final response mutation',
      ],
      affectedOwner: d.suspectedOwner || null,
      confidence: 'low', // untested
      requiredExperiment: {
        kind: 'shadow_replay',
        description: `Replay ${d.behaviorFamily} paraphrases; hold route constants; observe whether current-message lane wins`,
      },
      expectedResult: 'Current-message lane selected; Founder mark improves on replay sample',
      falsificationCondition: 'Pattern persists when suspected owner is bypassed in shadow replay',
      privacyRisk: 'low',
      governanceRisk: 'low',
      adminStatus: 'SHADOW',
      experimentOutcome: null,
      autoCodeChange: false,
      createdAt: new Date().toISOString(),
    });
  }
  return out;
}

function runHypothesisPass({ persist = true } = {}) {
  const disc = runDiscoveryPass({ persist: false });
  const hypotheses = buildHypothesesFromDiscoveries(disc.discoveries || []);
  if (persist) {
    for (const h of hypotheses) {
      upsertById(DOC.hypotheses, 'hypothesisId', h, MAX.hypotheses).catch(() => {});
    }
  }
  return {
    ok: true,
    mode: 'SHADOW',
    productionMutation: false,
    hypothesisCount: hypotheses.length,
    hypotheses,
  };
}

module.exports = {
  buildHypothesesFromDiscoveries,
  runHypothesisPass,
  hypothesisId,
};
