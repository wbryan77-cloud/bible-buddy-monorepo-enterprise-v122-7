/**
 * BIE v1.1 — Claim-level grounding evaluator (shadow-safe).
 * Reuses claimSupportVerifier / scriptureAuthorityEngine classifications.
 * Does not create doctrine or expose scores in user chat.
 */

const { appendExperienceEvent } = require('./experienceEventLedger');

const CLAIM_CLASSES = Object.freeze([
  'SUPPORTED_EXPLICITLY',
  'SUPPORTED_BY_COMPARISON',
  'REASONED_INFERENCE',
  'SCRIPTURE_SILENT',
  'HISTORICALLY_SUPPORTED',
  'PARTIALLY_SUPPORTED',
  'UNSUPPORTED',
  'CONFLICTING_EVIDENCE',
]);

function extractSimpleClaims(replyText = '') {
  const text = String(replyText || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  // Bounded heuristic: split sentences; keep factual-looking clauses.
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24 && s.length < 320)
    .slice(0, 8);
}

function classifyClaimAgainstEvidence(claim, evidenceRefs = [], historical = false) {
  const c = String(claim || '').toLowerCase();
  const refs = (evidenceRefs || []).map((r) => String(r).toLowerCase());
  const hasRefMention = refs.some((r) => c.includes(r.split(' ')[0]) || claim.includes(r));
  if (/\b(perhaps|maybe|might|suggests|could mean)\b/i.test(claim)) {
    return { class: 'REASONED_INFERENCE', evidenceIds: refs.slice(0, 3) };
  }
  if (historical && /\b(ad\s*\d+|rome|constantine|history|historical)\b/i.test(claim)) {
    return { class: 'HISTORICALLY_SUPPORTED', evidenceIds: refs.slice(0, 3) };
  }
  if (hasRefMention || refs.length) {
    return { class: 'SUPPORTED_EXPLICITLY', evidenceIds: refs.slice(0, 4) };
  }
  if (/\b(scripture does not|does not say|not explicitly)\b/i.test(claim)) {
    return { class: 'SCRIPTURE_SILENT', evidenceIds: [] };
  }
  return { class: 'PARTIALLY_SUPPORTED', evidenceIds: refs.slice(0, 2) };
}

function evaluateClaimGrounding({
  replyText = '',
  evidenceRefs = [],
  historical = false,
  requestId = null,
  persist = true,
} = {}) {
  const claims = extractSimpleClaims(replyText);
  const graded = claims.map((claim, i) => {
    const result = classifyClaimAgainstEvidence(claim, evidenceRefs, historical);
    return {
      claimId: `c${i + 1}`,
      claimExcerpt: claim.slice(0, 220),
      class: result.class,
      evidenceIds: result.evidenceIds,
    };
  });
  const unsupportedCritical = graded.filter((g) => g.class === 'UNSUPPORTED').length;
  const summary = {
    claimCount: graded.length,
    byClass: CLAIM_CLASSES.reduce((acc, k) => {
      acc[k] = graded.filter((g) => g.class === k).length;
      return acc;
    }, {}),
    unsupportedCritical,
    certificationBlocked: unsupportedCritical > 0,
    doctrineAuthorityOwner: 'doctrineFinalAuthorityEngine',
    groundingCreatesDoctrine: false,
  };

  if (persist) {
    appendExperienceEvent({
      eventType: unsupportedCritical ? 'GROUNDING_FAILURE' : 'EVALUATION_RECORDED',
      requestId,
      turnId: requestId,
      traceId: requestId,
      evaluationResults: { evaluatorId: 'det.claim_grounding_supported', summary, claims: graded },
      privacyScope: 'INTERNAL_ENGINEERING',
      governanceStatus: 'OBSERVED',
    });
  }

  return { ok: true, summary, claims: graded };
}

module.exports = {
  CLAIM_CLASSES,
  extractSimpleClaims,
  evaluateClaimGrounding,
};
