/**
 * Architecture Verification & Knowledge Completion — Part 7.
 *
 * Rule-based approval engine for pending knowledge candidates (currently the
 * Support Graph Candidate Queue — `services/supportGraphCandidateQueue.js`).
 *
 * This module NEVER writes to production doctrine/Scripture answer paths
 * (`bibleConceptGraph.js`, `bibleConceptConcordance.js`, `approvedSupportGraph.js`,
 * evidence cards, etc.). It only classifies a candidate record so an admin
 * reviewer can act faster. "Auto-approve" here means the candidate is marked
 * ready for admin merge — it never bypasses human review of what actually
 * ships in an answer. This preserves the existing, explicit contract already
 * stated at the top of `supportGraphCandidateQueue.js`:
 *   "Never auto-promotes; never alters final answers or approved doctrine."
 *
 * Rules engine runs first, always. Human review is only required when the
 * rules cannot confidently classify a candidate (NEEDS_HUMAN_REVIEW).
 */

const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');

const CLASSIFICATION = {
  AUTO_APPROVE: 'AUTO_APPROVE',
  NEEDS_HUMAN_REVIEW: 'NEEDS_HUMAN_REVIEW',
  REJECT: 'REJECT',
};

// Internal generator names already produced by the live runtime. Anything
// outside this list (e.g. raw external scrape output) cannot be
// auto-approved — it must go to human review regardless of other scores.
const TRUSTED_SOURCES = new Set([
  'support_relationship_engine',
  'claim_to_scripture_validator',
  'scripture_authority_engine',
]);

const KNOWN_RELATIONSHIP_TYPES = new Set([
  'unverified_support',
  'direct',
  'chain',
  'limits',
  'unverified',
  'contradicted',
]);

function normalizeTopic(topic) {
  return String(topic || '').trim().toLowerCase();
}

function ruleDuplicateContent(candidate) {
  const topic = normalizeTopic(candidate.topic);
  const claim = String(candidate.proposedClaim || '').trim().toLowerCase();
  if (!topic || !claim) {
    return { pass: null, detail: 'No topic/claim to compare — skipped.' };
  }
  const edges = getAllApprovedSupportEdges();
  const duplicate = edges.find(
    (edge) => normalizeTopic(edge.topic) === topic
      && Array.isArray(edge.claimPatterns)
      && edge.claimPatterns.some((pattern) => pattern.test(claim))
  );
  if (duplicate) {
    return {
      pass: false,
      blocking: true,
      detail: `Matches existing approved support edge "${duplicate.id}" — already covered.`,
    };
  }
  return { pass: true, detail: 'No duplicate approved support edge found for this topic/claim.' };
}

function ruleTrustedSource(candidate) {
  const source = String(candidate.source || '').trim();
  if (!source) return { pass: false, detail: 'No source attributed.' };
  if (TRUSTED_SOURCES.has(source)) {
    return { pass: true, detail: `Source "${source}" is an internal, trusted generator.` };
  }
  return { pass: false, detail: `Source "${source}" is not on the trusted-source allowlist — human review required.` };
}

function ruleSourcePriority(candidate) {
  const source = String(candidate.source || '').trim();
  return TRUSTED_SOURCES.has(source)
    ? { pass: true, detail: 'Internal runtime source outranks unverified external sources.' }
    : { pass: null, detail: 'No source-priority ranking available for external/unknown sources.' };
}

function ruleScriptureValidation(candidate) {
  const refs = Array.isArray(candidate.scriptures) ? candidate.scriptures : [];
  if (!refs.length) return { pass: false, blocking: true, detail: 'No Scripture references supplied.' };
  const invalid = refs.filter((ref) => !parseScriptureRef(ref) || !verifyKjvReference(ref).valid);
  if (invalid.length) {
    return {
      pass: false,
      blocking: true,
      detail: `Not a recognized canonical KJV book/reference: ${invalid.join(', ')}`,
    };
  }
  return { pass: true, detail: `All ${refs.length} Scripture reference(s) resolve to a canonical KJV book.` };
}

function ruleMetadataCompleteness(candidate) {
  const required = ['topic', 'proposedClaim', 'scriptures', 'reason', 'source'];
  const missing = required.filter((field) => {
    const val = candidate[field];
    return val == null || (Array.isArray(val) ? val.length === 0 : String(val).trim() === '');
  });
  if (missing.length) {
    return { pass: false, detail: `Missing metadata field(s): ${missing.join(', ')}` };
  }
  return { pass: true, detail: 'All required metadata fields present.' };
}

function ruleFormatValidity(candidate) {
  const validId = typeof candidate.id === 'string' && candidate.id.length > 0;
  const validClaim = typeof candidate.proposedClaim === 'string';
  const validScriptures = Array.isArray(candidate.scriptures);
  const pass = validId && validClaim && validScriptures;
  return {
    pass,
    detail: pass ? 'Record shape matches the support-graph-candidate schema.' : 'Record shape does not match the expected candidate schema.',
  };
}

function ruleLicensing(candidate) {
  // Internal-generation candidates (Scripture references + a claim derived from
  // the running conversation) carry no third-party licensing concern. This
  // rule is a placeholder gate for a future external-teaching ingestion queue
  // (see IOGIngestionPilotPlan.md) where licensing MUST be evaluated before
  // any promotion — never bypass that when this engine is later pointed at
  // that queue.
  return { pass: true, detail: 'No third-party licensed content in this candidate type (internal Scripture-only claim).' };
}

function ruleIndexCompatibility(candidate) {
  const type = candidate.relationshipType || 'unknown';
  const pass = KNOWN_RELATIONSHIP_TYPES.has(type) || type === 'unknown';
  return {
    pass,
    detail: pass
      ? `relationshipType "${type}" is compatible with the approved-support-graph index shape.`
      : `relationshipType "${type}" is not a recognized index category.`,
  };
}

function computeConfidenceScore(ruleResults) {
  const scored = Object.values(ruleResults).filter((r) => r.pass !== null);
  if (!scored.length) return 0;
  const passed = scored.filter((r) => r.pass).length;
  return Math.round((passed / scored.length) * 100) / 100;
}

/**
 * Evaluate a single pending candidate (as produced by
 * `supportGraphCandidateQueue.enqueueSupportGraphCandidate`) against every
 * rule category. Returns a classification plus the full rule trace so an
 * admin reviewer can see exactly why.
 */
function evaluateCandidate(candidate = {}) {
  const ruleResults = {
    duplicateContent: ruleDuplicateContent(candidate),
    trustedSource: ruleTrustedSource(candidate),
    sourcePriority: ruleSourcePriority(candidate),
    scriptureValidation: ruleScriptureValidation(candidate),
    metadataCompleteness: ruleMetadataCompleteness(candidate),
    formatValidity: ruleFormatValidity(candidate),
    licensing: ruleLicensing(candidate),
    indexCompatibility: ruleIndexCompatibility(candidate),
  };

  const blockingFailure = Object.entries(ruleResults).find(([, r]) => r.blocking && r.pass === false);
  const confidenceScore = computeConfidenceScore(ruleResults);

  let classification;
  let reasons = [];

  if (blockingFailure) {
    classification = CLASSIFICATION.REJECT;
    reasons = [blockingFailure[1].detail];
  } else {
    const hardFailures = Object.entries(ruleResults).filter(([, r]) => r.pass === false);
    if (hardFailures.length === 0 && confidenceScore >= 0.85) {
      classification = CLASSIFICATION.AUTO_APPROVE;
      reasons = ['All rules passed with high confidence.'];
    } else {
      classification = CLASSIFICATION.NEEDS_HUMAN_REVIEW;
      reasons = hardFailures.length
        ? hardFailures.map(([name, r]) => `${name}: ${r.detail}`)
        : ['Confidence below auto-approve threshold.'];
    }
  }

  return {
    candidateId: candidate.id || null,
    classification,
    confidenceScore,
    reasons,
    ruleResults,
    recommendation:
      classification === CLASSIFICATION.AUTO_APPROVE
        ? 'Mark ready for admin merge into the approved support graph.'
        : classification === CLASSIFICATION.REJECT
        ? 'Reject — duplicate or invalid Scripture reference(s).'
        : 'Route to Admin Review — rules could not confidently classify.',
  };
}

function evaluateCandidates(candidates = []) {
  return candidates.map((candidate) => ({
    candidate,
    evaluation: evaluateCandidate(candidate),
  }));
}

module.exports = {
  CLASSIFICATION,
  evaluateCandidate,
  evaluateCandidates,
};
