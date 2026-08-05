/**
 * BIE v1.1A — Recommendation ranking + outcome learning for Decision Queue.
 * Rejected recommendations must not return unchanged.
 */

const crypto = require('crypto');
const { runDiscoveryPass } = require('./discoveryEngine');
const { runHypothesisPass } = require('./causalHypothesisEngine');
const { listLearningRecords } = require('./learningRecordStore');
const { upsertById, readItems, DOC, MAX } = require('./founderExperienceDurableStore');
const { createLearningRecord } = require('./learningRecordStore');

function scoreRecommendation(factors = {}) {
  const w = {
    userImpact: 3,
    founderImpact: 3,
    recurrence: 2,
    severity: 2,
    confidence: 1,
    reversibility: 1,
    evidenceCompleteness: 1,
  };
  const impact = { high: 3, medium: 2, low: 1 }[factors.severity] || 1;
  const conf = { high: 3, medium: 2, low: 1 }[factors.confidence] || 1;
  const recurrence = Math.min(5, Number(factors.recurrenceCount || 0));
  return (
    impact * w.severity +
    conf * w.confidence +
    recurrence * w.recurrence +
    (factors.reversibility ? w.reversibility : 0) +
    Math.min(3, Number(factors.evidenceCoverage || 0)) * w.evidenceCompleteness
  );
}

function fingerprintPackage(pkg) {
  return crypto
    .createHash('sha256')
    .update(
      [pkg.behaviorFamily, pkg.smallestProposedRepair, pkg.discoveryId, pkg.expectedBehaviorChange]
        .map((x) => String(x || ''))
        .join('|'),
    )
    .digest('hex')
    .slice(0, 20);
}

/** Reconstruct the same fingerprint used for package identity / rejection suppression. */
function fingerprintFromLearningRecord(lr = {}) {
  if (lr.packageFingerprint) return lr.packageFingerprint;
  const discoveryId =
    lr.discoveryId ||
    (Array.isArray(lr.evidence) && lr.evidence.find((e) => e && e.discoveryId)?.discoveryId) ||
    null;
  return fingerprintPackage({
    behaviorFamily: lr.behaviorFamily,
    smallestProposedRepair: lr.candidateRepair,
    discoveryId,
    expectedBehaviorChange: lr.expectedBehavior,
  });
}

function collectRejectedFingerprints(learning, priorTransitions) {
  const rejected = new Set();
  for (const lr of learning.filter((x) => x.adminStatus === 'REJECTED')) {
    rejected.add(fingerprintFromLearningRecord(lr));
  }
  for (const t of priorTransitions.items || []) {
    if (t.toStatus === 'REJECTED' && t.packageFingerprint) {
      rejected.add(t.packageFingerprint);
    }
  }
  return rejected;
}

async function buildRankedRecommendations({ persist = true } = {}) {
  const discoveries = runDiscoveryPass({ persist: false }).discoveries || [];
  const hypotheses = runHypothesisPass({ persist: false }).hypotheses || [];
  const learning = listLearningRecords({ limit: 300 });
  const priorTransitions = await readItems(DOC.recommendationTransitions);
  const rejectedFingerprints = collectRejectedFingerprints(learning, priorTransitions);

  const packages = [];
  for (const d of discoveries.filter((x) => x.recommendationEligibility)) {
    const hyp = hypotheses.find((h) => h.discoveryId === d.discoveryId);
    const smallestRepair =
      d.suspectedMechanism ||
      `Investigate ${d.behaviorFamily} current-message / evidence selection path; smallest governed repair only`;
    const pkg = {
      recommendationId: `rec_${d.discoveryId}`,
      discoveryId: d.discoveryId,
      hypothesisId: hyp?.hypothesisId || null,
      behaviorFamily: d.behaviorFamily,
      affectedOwner: d.suspectedOwner,
      smallestProposedRepair: smallestRepair,
      expectedBehaviorChange: `Reduce ${d.discoveryType} recurrence on ${d.behaviorFamily}`,
      expectedMetricChange: ['founder_acceptance', 'current_question_accuracy'],
      exactTests: ['bieV11FounderExperienceLoop', 'phase1dDeterministicVlpComposition', 'replay family'],
      costImpact: 'neutral_to_small_async_overhead',
      latencyImpact: 'no_sync_path_change_intended',
      privacyImpact: 'none_beyond_existing_telemetry',
      governanceImpact: 'requires_admin_approval_before_implementation',
      historicalAttemptedRepairs: learning
        .filter((lr) => lr.behaviorFamily === d.behaviorFamily)
        .map((lr) => ({
          learningRecordId: lr.learningRecordId,
          adminStatus: lr.adminStatus,
          outcome: lr.measuredOutcome,
        })),
      reasonsPreviousRepairsSucceededOrFailed: priorTransitions.items
        .filter((t) => t.toStatus === 'REJECTED' || t.toStatus === 'APPROVED')
        .slice(-5),
      rolloutPlan: ['shadow', 'founder_only_test', 'admin_approve', 'implement', 'validate', 'deploy'],
      rollback: 'revert implementing commit; learning record retained',
      outcomeMeasurementPeriodDays: 14,
      score: scoreRecommendation({
        severity: d.severity,
        confidence: d.confidence,
        recurrenceCount: d.recurrenceCount,
        evidenceCoverage: d.evidenceCoverage,
        reversibility: true,
      }),
      requiredApproval: true,
      autoImplement: false,
      mode: 'SHADOW',
    };
    pkg.packageFingerprint = fingerprintPackage(pkg);
    if (rejectedFingerprints.has(pkg.packageFingerprint)) {
      pkg.suppressedAsUnchangedRejection = true;
      pkg.adminStatus = 'SUPPRESSED_DUPLICATE_REJECTION';
    } else {
      pkg.suppressedAsUnchangedRejection = false;
      pkg.adminStatus = 'READY_FOR_ADMIN_REVIEW';
      // Ensure a learning-record candidate exists for Decision Queue.
      createLearningRecord({
        behaviorFamily: d.behaviorFamily,
        failurePattern: d.discoveryType,
        expectedBehavior: pkg.expectedBehaviorChange,
        affectedOwner: d.suspectedOwner,
        candidateRepair: smallestRepair,
        discoveryId: d.discoveryId,
        packageFingerprint: pkg.packageFingerprint,
        evidence: [{ kind: 'discovery', discoveryId: d.discoveryId }],
        confidence: d.confidence,
        sourceEventIds: d.supportingEventIds || [],
      });
    }
    packages.push(pkg);
  }

  packages.sort((a, b) => b.score - a.score);

  if (persist) {
    for (const p of packages) {
      upsertById(DOC.recommendations, 'recommendationId', p, MAX.recommendations).catch(() => {});
    }
  }

  return {
    ok: true,
    recommendationCount: packages.length,
    suppressedUnchangedRejections: packages.filter((p) => p.suppressedAsUnchangedRejection).length,
    ranked: packages,
  };
}

module.exports = {
  scoreRecommendation,
  buildRankedRecommendations,
  fingerprintPackage,
  fingerprintFromLearningRecord,
  collectRejectedFingerprints,
};
