/**
 * Build claim traceability matrix from validation results (v2 — support reasons).
 */

const { validatorDecisionFromClass } = require('./claimSupportVerifier');
const { buildSupportReason } = require('./supportRelationshipEngine');

function buildClaimTraceabilityMatrix({
  question = '',
  claims = [],
  claimResults = [],
  retrievedEvidence = {},
  validation = {},
  approval = {},
} = {}) {
  const approvalDecision =
    approval.decision ||
    approval.status ||
    (validation.passed ? 'approved' : validation.skipped ? 'skipped' : 'rejected');

  const rows = claimResults.map((cr) => ({
    claimId: cr.claimId || 'unknown',
    claim: cr.claim,
    scriptures: cr.supportingScriptures || [],
    supportingScriptures: cr.supportingScriptures || [],
    supportClass: cr.classification || cr.supportClass || null,
    supportReason:
      cr.supportReason ||
      buildSupportReason(
        {
          classification: cr.classification,
          issues: cr.issues,
          supportRelationship: cr.supportRelationship,
          affirmationId: cr.affirmationId,
          citationDenialId: cr.citationDenialId,
          citedRef: cr.citedRef,
          denial: cr.denial,
          forbidden: cr.forbidden,
        },
        cr.claim,
        cr.supportingScriptures
      ),
    supportRelationship: cr.supportRelationship || null,
    confidence: cr.confidence || null,
    derivedFrom: cr.derivedFrom || null,
    validatorDecision: cr.validatorDecision || validatorDecisionFromClass(cr.classification, { denial: cr.denial }),
    approvalDecision,
    issues: cr.issues || [],
    evidenceCardUsed: cr.evidenceCardUsed || retrievedEvidence.cardIds?.[0] || null,
    citationDenialId: cr.citationDenialId || null,
    affirmationId: cr.affirmationId || null,
  }));

  const classCounts = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of rows) {
    const cl = row.supportClass;
    if (classCounts[cl] !== undefined) classCounts[cl] += 1;
  }

  return {
    version: 2,
    question,
    retrievedEvidence,
    matrix: rows,
    summary: {
      totalClaims: rows.length,
      classCounts,
      approved: rows.filter((r) => r.validatorDecision === 'Approved').length,
      rejected: rows.filter((r) => r.validatorDecision === 'Rejected').length,
      unsupportedClaims: validation.unsupportedClaims || [],
      contradictedClaims: validation.contradictedClaims || [],
      validatorResult: validation.validatorResult || (validation.passed ? 'pass' : 'fail'),
      approvalDecision,
      claimDegraded: !!approval.degraded,
      citationWithoutSupport: rows.filter(
        (r) =>
          (r.issues || []).includes('citation_without_verified_support') ||
          (r.issues || []).includes('citation_does_not_support_claim')
      ).length,
      supportAccuracyPct:
        rows.length > 0
          ? Math.round(((classCounts.A + classCounts.B) / rows.length) * 100)
          : null,
    },
  };
}

module.exports = {
  buildClaimTraceabilityMatrix,
};
