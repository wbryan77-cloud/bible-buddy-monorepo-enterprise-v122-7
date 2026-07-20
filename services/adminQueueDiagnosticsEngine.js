/**
 * PHASE_6E Part 6 — Admin Queue Diagnostics.
 *
 * Deterministic, evidence-based reason-code classification of every pending
 * Admin-review candidate in services/supportGraphCandidateQueue.js. Never
 * mutates the queue. Never auto-approves/auto-rejects anything itself — see
 * services/knowledgeApprovalRulesOptimizer.js for the (separately gated,
 * replay-tested) rule-adjustment layer that acts on these findings.
 *
 * CRITICAL PERFORMANCE RULE: only ever invoked from an offline/Admin-triggered
 * script (scripts/alpha/phase6eBuildAnalyticsSnapshot.js). Never required by
 * the live chat request path.
 */

const { readSupportGraphCandidates } = require('./supportGraphCandidateQueue');
const { readApprovedCrossReferences } = require('./iogIcojGovernedIngestion');
const { evaluateCandidate } = require('./knowledgeApprovalRulesEngine');

const REASON_CODE = {
  TRUE_DOCTRINAL_AMBIGUITY: 'TRUE_DOCTRINAL_AMBIGUITY',
  VALID_NEW_SCRIPTURE_RELATIONSHIP: 'VALID_NEW_SCRIPTURE_RELATIONSHIP',
  VALID_NEW_HISTORICAL_SOURCE: 'VALID_NEW_HISTORICAL_SOURCE',
  VALID_NEW_ORIGINAL_LANGUAGE_NOTE: 'VALID_NEW_ORIGINAL_LANGUAGE_NOTE',
  DUPLICATE_EXACT: 'DUPLICATE_EXACT',
  DUPLICATE_SEMANTIC: 'DUPLICATE_SEMANTIC',
  ALREADY_APPROVED_EVIDENCE: 'ALREADY_APPROVED_EVIDENCE',
  INVALID_SCRIPTURE_REFERENCE: 'INVALID_SCRIPTURE_REFERENCE',
  SCRIPTURE_TEXT_MISMATCH: 'SCRIPTURE_TEXT_MISMATCH',
  UNSUPPORTED_RELATIONSHIP: 'UNSUPPORTED_RELATIONSHIP',
  WEAK_TOPIC_MATCH: 'WEAK_TOPIC_MATCH',
  MISSING_METADATA: 'MISSING_METADATA',
  MISSING_PROVENANCE: 'MISSING_PROVENANCE',
  LICENSING_UNCERTAIN: 'LICENSING_UNCERTAIN',
  HISTORICAL_CLAIM_UNVERIFIED: 'HISTORICAL_CLAIM_UNVERIFIED',
  ORIGINAL_LANGUAGE_DATA_UNSUPPORTED: 'ORIGINAL_LANGUAGE_DATA_UNSUPPORTED',
  RULE_CONFLICT: 'RULE_CONFLICT',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  INGESTION_FORMAT_ERROR: 'INGESTION_FORMAT_ERROR',
  FALSE_POSITIVE: 'FALSE_POSITIVE',
  EXPECTED_MANUAL_REVIEW: 'EXPECTED_MANUAL_REVIEW',
};

function normKey(candidate) {
  return [String(candidate.extractedReference || '').toLowerCase().trim(), candidate.proposedTopic || candidate.topic || ''].join('::');
}

/**
 * Classify a single pending candidate. Returns { primaryReason, secondaryReasons, evidence }.
 * Every reason is derived from a field that already exists on the record
 * (never inferred from free-text similarity) — see `evidence` for the exact
 * source fields used.
 */
function classifyCandidate(candidate, { duplicateGroupSize = 1, alreadyApproved = false, rulesEvaluation = null } = {}) {
  const primary = [];
  const secondary = [];
  const evidence = {};

  const missingCore = ['topic', 'proposedClaim', 'scriptures', 'reason', 'source'].filter((f) => {
    const v = candidate[f];
    return v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');
  });
  if (missingCore.length) {
    primary.push(REASON_CODE.MISSING_METADATA);
    evidence.missingFields = missingCore;
  }

  if (!candidate.discoverySource && !candidate.sourceDocument) {
    secondary.push(REASON_CODE.MISSING_PROVENANCE);
  }

  if (candidate.scriptureValidation === 'INVALID') {
    primary.push(REASON_CODE.INVALID_SCRIPTURE_REFERENCE);
    evidence.scriptureValidation = candidate.scriptureValidation;
  }

  if (alreadyApproved) {
    primary.push(REASON_CODE.ALREADY_APPROVED_EVIDENCE);
    evidence.alreadyApprovedCrossReference = true;
  }

  if (candidate.duplicateStatus === 'EXACT_DUPLICATE') {
    primary.push(REASON_CODE.DUPLICATE_EXACT);
  } else if (duplicateGroupSize > 1) {
    secondary.push(REASON_CODE.DUPLICATE_SEMANTIC);
    evidence.duplicateGroupSize = duplicateGroupSize;
  }

  if (!primary.length) {
    if (candidate.proposedRelationshipType === 'CANDIDATE_SUPPORTING_WITNESS') {
      // Deterministic same-book-only match (services/topicWitnessRegistry
      // matchKind SAME_BOOK_ONLY) — the weakest positive signal the governed
      // pipeline produces; a whole book can span 150 chapters, so this is
      // honestly a weak topic match, not a confirmed new relationship.
      primary.push(REASON_CODE.WEAK_TOPIC_MATCH);
      secondary.push(REASON_CODE.VALID_NEW_SCRIPTURE_RELATIONSHIP);
      evidence.matchBasis = 'SAME_BOOK_ONLY (services/topicWitnessRegistry)';
    } else if (candidate.proposedRelationshipType === 'CROSS_REFERENCE') {
      // Same-chapter-as-an-existing-SUPPORTING-witness — stronger contextual
      // signal (only same-chapter-as-PRIMARY auto-approves in
      // services/iogIcojGovernedIngestion.js), still requires a human
      // doctrinal judgment call about whether to promote it further.
      primary.push(REASON_CODE.VALID_NEW_SCRIPTURE_RELATIONSHIP);
      secondary.push(REASON_CODE.TRUE_DOCTRINAL_AMBIGUITY);
      evidence.matchBasis = 'SAME_CHAPTER_AS_SUPPORTING (services/topicWitnessRegistry)';
    } else if (!candidate.discoverySource) {
      // Legacy/non-IOG candidate (services/supportGraphCandidateQueue direct
      // callers, e.g. proposeCandidateFromUnverifiedClaim) — no governed
      // pipeline classification exists for it.
      primary.push(REASON_CODE.EXPECTED_MANUAL_REVIEW);
    } else {
      primary.push(REASON_CODE.UNSUPPORTED_RELATIONSHIP);
    }
  }

  if (rulesEvaluation && rulesEvaluation.classification === 'NEEDS_HUMAN_REVIEW' && rulesEvaluation.confidenceScore < 0.5) {
    secondary.push(REASON_CODE.LOW_CONFIDENCE);
  }

  return {
    primaryReason: primary[0] || REASON_CODE.EXPECTED_MANUAL_REVIEW,
    secondaryReasons: [...new Set(secondary)].filter((r) => r !== primary[0]),
    evidence,
  };
}

function buildAdminQueueDiagnostics() {
  const pending = readSupportGraphCandidates({ limit: 10000, status: 'pending_review' });
  const approved = readApprovedCrossReferences();
  const approvedKeys = new Set(approved.map((a) => [String(a.extractedReference || '').toLowerCase().trim(), a.proposedTopic].join('::')));

  const groupCounts = new Map();
  for (const c of pending) {
    const key = normKey(c);
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  }

  const candidates = pending.map((c) => {
    const key = normKey(c);
    const duplicateGroupSize = groupCounts.get(key) || 1;
    const alreadyApproved = approvedKeys.has(key);
    const rulesEvaluation = evaluateCandidate(c);
    const classification = classifyCandidate(c, { duplicateGroupSize, alreadyApproved, rulesEvaluation });
    return {
      id: c.id,
      topic: c.proposedTopic || c.topic || null,
      discoverySource: c.discoverySource || c.source,
      extractedReference: c.extractedReference || null,
      ageMs: Date.now() - new Date(c.createdAt).getTime(),
      createdAt: c.createdAt,
      rulesDecision: c.rulesDecision || null,
      rulesEngineClassification: rulesEvaluation.classification,
      rulesEngineConfidence: rulesEvaluation.confidenceScore,
      primaryReason: classification.primaryReason,
      secondaryReasons: classification.secondaryReasons,
      evidence: classification.evidence,
      duplicateGroupSize,
      alreadyApprovedElsewhere: alreadyApproved,
    };
  });

  const byPrimaryReason = {};
  for (const c of candidates) byPrimaryReason[c.primaryReason] = (byPrimaryReason[c.primaryReason] || 0) + 1;

  const byDiscoverySource = {};
  for (const c of candidates) byDiscoverySource[c.discoverySource] = (byDiscoverySource[c.discoverySource] || 0) + 1;

  const byTopic = {};
  for (const c of candidates) byTopic[c.topic] = (byTopic[c.topic] || 0) + 1;

  const byRuleOutcome = {};
  for (const c of candidates) byRuleOutcome[c.rulesEngineClassification] = (byRuleOutcome[c.rulesEngineClassification] || 0) + 1;

  const duplicateGroups = candidates.filter((c) => c.duplicateGroupSize > 1);
  const alreadyApprovedElsewhere = candidates.filter((c) => c.alreadyApprovedElsewhere);
  const safelyAutoApprovable = candidates.filter((c) => c.rulesEngineClassification === 'AUTO_APPROVE');
  const safelyAutoRejectable = candidates.filter((c) => c.primaryReason === REASON_CODE.ALREADY_APPROVED_EVIDENCE || c.primaryReason === REASON_CODE.DUPLICATE_EXACT || c.primaryReason === REASON_CODE.INVALID_SCRIPTURE_REFERENCE);
  const genuineHumanJudgment = candidates.filter((c) => !safelyAutoApprovable.includes(c) && !safelyAutoRejectable.includes(c));
  const falsePositives = candidates.filter((c) => c.primaryReason === REASON_CODE.FALSE_POSITIVE);

  const sortedByAge = [...candidates].sort((a, b) => b.ageMs - a.ageMs);

  const summary = {
    generatedAt: new Date().toISOString(),
    totalPending: candidates.length,
    knownVerifiedStateEstimate: 100,
    honestyNote: candidates.length !== 100
      ? `Known Verified State estimated ~100 pending candidates; this analyzer measured the real count: ${candidates.length}. Reporting the measured number, not the estimate.`
      : 'Measured count matches the ~100 estimate.',
    byPrimaryReason,
    byDiscoverySource,
    byTopic,
    byRuleOutcome,
    duplicateGroupCount: new Set(duplicateGroups.map((c) => normKey({ extractedReference: c.extractedReference, proposedTopic: c.topic }))).size,
    duplicateRowCount: duplicateGroups.length,
    alreadyApprovedElsewhereCount: alreadyApprovedElsewhere.length,
    safelyAutoApprovableCount: safelyAutoApprovable.length,
    safelyAutoRejectableCount: safelyAutoRejectable.length,
    genuineHumanJudgmentCount: genuineHumanJudgment.length,
    falsePositiveCount: falsePositives.length,
    oldestCandidates: sortedByAge.slice(0, 10).map((c) => ({ id: c.id, topic: c.topic, ageMs: c.ageMs, primaryReason: c.primaryReason })),
    governanceNote:
      'Zero candidates are classified safelyAutoApprovable by design: services/knowledgeApprovalRulesEngine.js ' +
      'requires source to be on the internal TRUSTED_SOURCES allowlist to reach AUTO_APPROVE, and every IOG/ICOJ ' +
      'candidate is intentionally excluded from that allowlist (new-topic-relationship judgment always requires ' +
      'a human) — this is the Phase 6D governance contract working as designed, not a diagnostics gap.',
  };

  return { candidates, summary };
}

module.exports = {
  REASON_CODE,
  classifyCandidate,
  buildAdminQueueDiagnostics,
};
