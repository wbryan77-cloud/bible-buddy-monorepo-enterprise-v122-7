/**
 * Support Relationship Engine — claim → support verification (not citation alone).
 * Reuses frozen validator rules; does not add doctrine.
 */

const { buildApprovedEvidenceGraph } = require('./approvedEvidenceGraph');
const { validatorDecisionFromClass } = require('./claimSupportVerifier');

function getClassifyDoctrineClaim() {
  return require('./claimToScriptureValidator').classifyDoctrineClaim;
}

const REASON_BY_ISSUE = {
  citation_does_not_support_claim: 'The cited verse is named but does not support this assertion; the claim is stronger than the verse allows.',
  citation_without_verified_support: 'The citation mentions a related topic but lacks verified affirmation under frozen binding rules.',
  ungrounded_claim: 'No supporting scriptures were mapped to this claim.',
  unsupported_citation: 'The citation is not in the approved evidence graph for this turn.',
  ungrounded_no_evidence_pack: 'Scripture was cited but no approved evidence pack is available.',
  no_approved_evidence: 'No approved evidence card applies to verify this claim.',
  caution_without_chain: 'Only caution passages were cited without an approved teaching chain.',
  contradicted_third_heaven_destination: 'The claim contradicts approved evidence on third heaven destination.',
  contradicted_corinthians_5_8_standalone: 'The claim misuses 2 Corinthians 5:8 as standalone heaven-at-death proof.',
  contradicted_acts_10_pork_clean: 'The claim contradicts approved dietary evidence on Acts 10 and pork.',
  contradicted_kingdom_in_heaven: 'The claim places the kingdom hope in heaven contrary to approved binding rules.',
  contradicted_heaven_at_death: 'The claim asserts immediate heaven at death contrary to approved death-state evidence.',
  contradicted_sunday_replaced_sabbath: 'The claim asserts Sunday replaced the Sabbath without Scripture support.',
  contradicted_john_3_13_no_ascension: 'The claim violates John 3:13 — no man hath ascended except the Son of man.',
  contradicted_cannot_come_yet: 'The claim contradicts John 13:33 — believers cannot come where Jesus went yet.',
  unsupported_tradition_framing: 'The claim frames tradition as doctrine without Scripture support.',
};

const REASON_BY_RELATIONSHIP = {
  direct: 'The cited verse explicitly affirms the claim under frozen citation-support rules.',
  binding_rule: 'The claim aligns with a frozen binding rule on the retrieved evidence card.',
  chain: 'The citation appears in the approved teaching order; support is indirect (line upon line).',
  contradicted: 'The cited verse contradicts or denies the claim under frozen rules.',
  unverified: 'The citation is present but support could not be verified against approved evidence.',
  none: 'No support relationship could be established.',
};

function confidenceFromClass(supportClass = 'C') {
  switch (String(supportClass).toUpperCase()) {
    case 'A':
      return 'high';
    case 'B':
      return 'medium';
    case 'D':
      return 'high';
    default:
      return 'low';
  }
}

function buildSupportReason(result = {}, claimText = '', refs = []) {
  if (result.denial) {
    return 'Safe denial phrase — claim defers to what Scripture states directly.';
  }
  if (result.supportGraphMatch?.id) {
    const m = result.supportGraphMatch;
    const typeLabel = m.supportType || 'directly_affirms';
    return `Approved support graph match (${typeLabel}: ${m.id}, source: ${m.source || 'approved'}, ref: ${result.citedRef || refs[0] || 'n/a'}).`;
  }
  if (result.affirmationId) {
    return `${REASON_BY_RELATIONSHIP.direct} (rule: ${result.affirmationId}, ref: ${result.citedRef || refs[0] || 'n/a'}).`;
  }
  if (result.citationDenialId) {
    return `${REASON_BY_RELATIONSHIP.contradicted} (denial: ${result.citationDenialId}, ref: ${result.citedRef || refs[0] || 'n/a'}).`;
  }
  if (result.supportRelationship === 'binding_rule') {
    return `${REASON_BY_RELATIONSHIP.binding_rule} (ref: ${result.citedRef || refs[0] || 'n/a'}).`;
  }
  if (result.supportRelationship === 'chain') {
    return `${REASON_BY_RELATIONSHIP.chain} (ref: ${result.citedRef || refs[0] || 'n/a'}).`;
  }
  const primaryIssue = (result.issues || [])[0];
  if (primaryIssue && REASON_BY_ISSUE[primaryIssue]) {
    return REASON_BY_ISSUE[primaryIssue];
  }
  if (result.forbidden) {
    return REASON_BY_ISSUE[primaryIssue] || `Forbidden claim pattern detected (${result.forbidden}).`;
  }
  if (result.supportRelationship && REASON_BY_RELATIONSHIP[result.supportRelationship]) {
    return REASON_BY_RELATIONSHIP[result.supportRelationship];
  }
  if (!refs.length) {
    return REASON_BY_ISSUE.ungrounded_claim;
  }
  return 'Support could not be verified against retrieved approved evidence.';
}

/**
 * Analyze whether supporting scriptures actually support a doctrine claim.
 * @param {{ claim?: string, supportingScriptures?: string[], retrievedEvidence?: object, claimId?: string, type?: string }} input
 */
function analyzeSupportRelationship({
  claim = '',
  supportingScriptures = [],
  retrievedEvidence = {},
  claimId = null,
  type = 'doctrine',
} = {}) {
  const graph = buildApprovedEvidenceGraph(retrievedEvidence || {});
  const refs = (supportingScriptures || []).map((r) => String(r || '').trim()).filter(Boolean);
  const claimText = String(claim || '').trim();

  const classification = getClassifyDoctrineClaim()(
    { claimId, claim: claimText, supportingScriptures: refs, type },
    graph
  );

  const supportClass = classification.classification || 'C';
  const supportReason = buildSupportReason(classification, claimText, refs);

  return {
    claimId,
    claim: claimText,
    supportingScriptures: refs,
    supportClass,
    supportReason,
    confidence: confidenceFromClass(supportClass),
    supportRelationship: classification.supportRelationship || null,
    validatorDecision: validatorDecisionFromClass(supportClass, { denial: classification.denial }),
    issues: classification.issues || [],
    affirmationId: classification.affirmationId || null,
    citationDenialId: classification.citationDenialId || null,
    supportGraphMatch: classification.supportGraphMatch || null,
    citedRef: classification.citedRef || refs[0] || null,
    supported: !!classification.supported,
    contradicted: !!classification.contradicted,
  };
}

/**
 * Analyze all doctrine claims for a turn.
 */
function analyzeTurnSupportRelationships({ claims = [], retrievedEvidence = {} } = {}) {
  const doctrineClaims = (claims || []).filter(
    (c) => c.type === 'doctrine' || c.type === 'clarification' || !c.type
  );
  return doctrineClaims.map((c) =>
    analyzeSupportRelationship({
      claim: c.claim,
      supportingScriptures: c.supportingScriptures,
      retrievedEvidence,
      claimId: c.claimId,
      type: c.type || 'doctrine',
    })
  );
}

module.exports = {
  analyzeSupportRelationship,
  analyzeTurnSupportRelationships,
  buildSupportReason,
  confidenceFromClass,
  REASON_BY_ISSUE,
  REASON_BY_RELATIONSHIP,
};
