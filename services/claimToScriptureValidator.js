/**
 * Claim-to-Scripture validator — classifies doctrine claims A/B/C/D against approved evidence.
 */

const { isDoctrineTurn } = require('./bibleOnlyAuthorityValidator');
const { buildApprovedEvidenceGraph } = require('./approvedEvidenceGraph');
const { normalizeRef, SAFE_DENIAL_RE } = require('./claimNormalizer');
const { refInApprovedList } = require('./scriptureReferenceNormalizer');
const { verifyCitationSupportsClaim, validatorDecisionFromClass } = require('./claimSupportVerifier');
const { analyzeSupportRelationship, buildSupportReason } = require('./supportRelationshipEngine');

const DENIAL_PHRASE = 'Scripture does not state that directly.';

const REGEN_HINT =
  'Revise claims and reply. Remove or correct any doctrine claim not supported by approved evidence. For unsupported claims say exactly: "Scripture does not state that directly." Use only KJV references from the evidence pack.';

const FORBIDDEN_CLAIM_RULES = [
  {
    id: 'third_heaven_destination',
    patterns: [
      /\bbelievers?\s+go\s+to\s+(the\s+)?third\s+heaven\b/i,
      /\b(third heaven|3rd heaven)\b.{0,50}\b(final destination|where believers|we go when we die)\b/i,
      /\b(go|ascend|enter)\b.{0,40}\b(third heaven|3rd heaven)\b.{0,40}\b(at death|when we die|after death)\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_third_heaven_destination',
  },
  {
    id: 'corinthians_58_standalone',
    patterns: [
      /\b2\s*cor(?:inthians)?\s*5:8\b.{0,120}\b(heaven at death|immediate heaven|when we die|go to heaven)\b/i,
      /\babsent from the body\b.{0,80}\b(proves?|means?|shows?)\b.{0,40}\b(heaven|immediate)\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_corinthians_5_8_standalone',
    unless: /\bnot\b.{0,30}\b(alone|standalone|only proof)\b|\bcaution\b|\bsleep in death\b/i,
  },
  {
    id: 'acts_10_pork_clean',
    patterns: [
      /\bacts\s*10\b.{0,100}\b(makes?|made|declares?|all foods clean|pork clean|unclean.*clean|eat any)\b/i,
      /\b(yes|indeed)\b.{0,40}\bacts\s*10\b.{0,60}\b(clean|permitted|allowed)\b/i,
      /\b(all foods|pork|unclean animals?)\b.{0,40}\b(are |is )?(now )?(clean|permitted|allowed)\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_acts_10_pork_clean',
    unless: /\bnot\b|\bscripture does not state\b|\bacts\s*11\b|\bgentiles?\b/i,
  },
  {
    id: 'kingdom_in_heaven_only',
    patterns: [
      /\bkingdom\b.{0,60}\b(is |lies |remains )?(in heaven|only in heaven)\b.{0,60}\b(believers?|go|after death|hope)\b/i,
      /\bbelievers?\b.{0,50}\bgo\b.{0,40}\bheaven\b.{0,40}\b(as the kingdom|for the kingdom|kingdom hope)\b/i,
      /\bkingdom\b.{0,40}\bwhere believers go\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_kingdom_in_heaven',
    unless: /\b(on earth|come down|thy kingdom come|revelation 21)\b/i,
  },
  {
    id: 'heaven_at_death_settled',
    patterns: [
      /\bwhen (you|we) die\b.{0,50}\b(go|enter|ascend)\b.{0,30}\b(heaven|lord's presence)\b/i,
      /\b(soul|spirit)\b.{0,40}\b(goes?|returns?)\b.{0,30}\bto heaven\b.{0,30}\b(at death|when we die|immediately)\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_heaven_at_death',
    unless: /\bnot\b|\bscripture does not state\b|\bsleep in death\b|\bresurrection\b/i,
  },
  {
    id: 'sunday_replaced_sabbath',
    patterns: [
      /\bsunday\b.{0,40}\b(replaced|replaces|is the)\b.{0,30}\bsabbath\b/i,
      /\bchristians?\b.{0,30}\bworship\b.{0,20}\bon sunday\b.{0,40}\b(instead of|replacing)\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_sunday_replaced_sabbath',
  },
  {
    id: 'tradition_without_scripture',
    patterns: [
      /\b(most christians|christian tradition|popular belief|commonly taught)\b.{0,60}\b(as doctrine|as biblical)\b/i,
    ],
    classification: 'C',
    issue: 'unsupported_tradition_framing',
  },
  {
    id: 'john_3_13_ascension_violation',
    patterns: [
      /\bbelievers?\s+have\s+ascended\b/i,
      /\b(men|man|people)\s+have\s+ascended\b.{0,40}\bheaven\b/i,
      /\bascended\b.{0,50}\bheaven\b.{0,50}\b(believers?|except christ|besides christ)\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_john_3_13_no_ascension',
    unless: /\bno man\b|\bjohn 3:13\b|\bexcept the son\b|\bson of man\b/i,
  },
  {
    id: 'cannot_come_permanent_heaven',
    patterns: [
      /\b(join|be with)\s+jesus\b.{0,60}\b(heaven|permanently)\b/i,
      /\bwhere i go\b.{0,80}\b(believers? (go|join)|we (go|join)|join him in heaven)\b/i,
      /\bpermanently\b.{0,50}\b(heaven|with (the )?lord)\b.{0,50}\b(away from earth|without return)\b/i,
      /\bbelievers?\b.{0,40}\bjoin\b.{0,40}\bjesus\b.{0,40}\bheaven\b/i,
    ],
    classification: 'D',
    issue: 'contradicted_cannot_come_yet',
    unless: /\bcannot come\b|\bcome again\b|\bon earth\b|\bresurrection\b|\bscripture does not state\b/i,
  },
];

function refInApproved(ref, approvedRefs = []) {
  return refInApprovedList(ref, approvedRefs);
}

function matchesForbidden(text = '') {
  const hits = [];
  for (const rule of FORBIDDEN_CLAIM_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        if (rule.unless && rule.unless.test(text)) continue;
        hits.push({ id: rule.id, issue: rule.issue, classification: rule.classification });
        break;
      }
    }
  }
  return hits;
}

function isCautionOnly(refs = [], cautions = []) {
  if (!refs.length) return false;
  const strictCautions = cautions.filter((c) => c.strict && c.reference);
  if (!strictCautions.length) return false;
  const cautionTokens = strictCautions.map((c) => normalizeRef(c.reference));
  return refs.every((ref) => {
    const n = normalizeRef(ref);
    return cautionTokens.some((c) => c.includes(n) || n.includes(c));
  });
}

function classifyDoctrineClaim(claim = {}, graph = {}) {
  const text = String(claim.claim || '');
  const refs = claim.supportingScriptures || [];
  const issues = [];

  if (SAFE_DENIAL_RE.test(text)) {
    return { classification: 'A', issues: [], supported: true, denial: true };
  }

  const forbidden = matchesForbidden(text);
  if (forbidden.length) {
    return {
      classification: forbidden[0].classification,
      issues: forbidden.map((f) => f.issue),
      supported: false,
      forbidden: forbidden[0].id,
    };
  }

  if (!graph.hasEvidence) {
    if (refs.length) {
      return { classification: 'C', issues: ['ungrounded_no_evidence_pack'], supported: false };
    }
    return { classification: 'C', issues: ['no_approved_evidence'], supported: false };
  }

  const unapprovedRefs = refs.filter((r) => !refInApproved(r, graph.refs));
  if (unapprovedRefs.length) {
    return {
      classification: 'C',
      issues: ['unsupported_citation'],
      supported: false,
      unapprovedRefs,
    };
  }

  if (refs.length && isCautionOnly(refs, graph.cautionRefs)) {
    return { classification: 'C', issues: ['caution_without_chain'], supported: false };
  }

  if (!refs.length) {
    return { classification: 'C', issues: ['ungrounded_claim'], supported: false, supportRelationship: 'none' };
  }

  const citationSupport = verifyCitationSupportsClaim(text, refs, graph);
  return {
    classification: citationSupport.classification,
    issues: citationSupport.issues,
    supported: citationSupport.supported,
    contradicted: citationSupport.contradicted,
    supportRelationship: citationSupport.supportRelationship,
    citationDenialId: citationSupport.citationDenialId,
    affirmationId: citationSupport.affirmationId,
    citedRef: citationSupport.citedRef,
    supportGraphMatch: citationSupport.supportGraphMatch || null,
  };
}

function scanReplyOrphans(reply = '') {
  const hits = matchesForbidden(reply);
  return hits.map((h) => ({
    claimId: `orphan_${h.id}`,
    claim: h.id,
    type: 'doctrine',
    supportingScriptures: [],
    classification: h.classification,
    issues: [h.issue],
    supported: false,
    orphan: true,
  }));
}

function validateClaimToScripture({
  reply = '',
  claims = [],
  evidencePack = {},
  message = '',
} = {}) {
  if (!isDoctrineTurn(evidencePack)) {
    return {
      passed: true,
      skipped: true,
      validatorResult: 'skipped',
      claimResults: [],
      unsupportedClaims: [],
      contradictedClaims: [],
      regenHint: null,
      graph: null,
    };
  }

  const graph = buildApprovedEvidenceGraph(evidencePack);
  const doctrineClaims = claims.filter((c) => c.type === 'doctrine' || c.type === 'clarification');
  const claimResults = [];

  for (const claim of doctrineClaims) {
    const support = analyzeSupportRelationship({
      claim: claim.claim,
      supportingScriptures: claim.supportingScriptures,
      retrievedEvidence: evidencePack,
      claimId: claim.claimId,
      type: claim.type,
    });
    claimResults.push({
      ...claim,
      classification: support.supportClass,
      supportReason: support.supportReason,
      confidence: support.confidence,
      issues: support.issues,
      supported: support.supported,
      contradicted: support.contradicted,
      supportRelationship: support.supportRelationship || null,
      validatorDecision: support.validatorDecision,
      citationDenialId: support.citationDenialId || null,
      affirmationId: support.affirmationId || null,
      supportGraphMatch: support.supportGraphMatch || null,
      citedRef: support.citedRef || (claim.supportingScriptures || [])[0] || null,
      evidenceCardUsed: graph.cardIds[0] || null,
      evidenceCards: graph.cardIds,
      catalogKeys: graph.catalogKeys,
    });
  }

  const orphans = scanReplyOrphans(reply).filter(
    (o) => !claimResults.some((c) => c.forbidden === o.claim || c.issues?.includes(o.issues[0]))
  );
  for (const orphan of orphans) {
    claimResults.push({
      ...orphan,
      supportReason: buildSupportReason(
        { classification: orphan.classification, issues: orphan.issues, forbidden: orphan.claim },
        orphan.claim,
        []
      ),
      confidence: orphan.classification === 'D' ? 'high' : 'low',
    });
  }

  const unsupportedClaims = claimResults
    .filter((c) => c.classification === 'C' && !c.denial)
    .map((c) => c.claim);
  const contradictedClaims = claimResults
    .filter((c) => c.classification === 'D')
    .map((c) => c.claim);

  const failed = claimResults.filter(
    (c) => (c.classification === 'C' || c.classification === 'D') && !c.denial
  );
  const passed = failed.length === 0;

  return {
    passed,
    skipped: false,
    validatorResult: passed ? 'pass' : 'fail',
    claimResults,
    unsupportedClaims,
    contradictedClaims,
    failedClaimResults: failed,
    regenHint: passed ? null : REGEN_HINT,
    graph,
    userMessage: message || evidencePack.userMessage || '',
  };
}

function applyClaimDegradation(reply = '', validation = {}) {
  let result = String(reply || '').trim();
  const failed = validation.failedClaimResults || [];

  for (const rule of FORBIDDEN_CLAIM_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(result)) {
        if (rule.unless && rule.unless.test(result)) continue;
        result = result.replace(pattern, DENIAL_PHRASE);
      }
    }
  }

  const sentences = result.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept = [];
  for (const sentence of sentences) {
    const forbidden = matchesForbidden(sentence);
    if (forbidden.length && !SAFE_DENIAL_RE.test(sentence)) {
      if (!kept.includes(DENIAL_PHRASE)) kept.push(DENIAL_PHRASE);
      continue;
    }
    kept.push(sentence);
  }
  result = kept.join(' ').replace(/\s+/g, ' ').trim();

  if (failed.length && !SAFE_DENIAL_RE.test(result)) {
    result = `${result} ${DENIAL_PHRASE}`.trim();
  }

  return result;
}

module.exports = {
  DENIAL_PHRASE,
  REGEN_HINT,
  classifyDoctrineClaim,
  FORBIDDEN_CLAIM_RULES,
  validateClaimToScripture,
  classifyDoctrineClaim,
  applyClaimDegradation,
  matchesForbidden,
  refInApproved,
};
