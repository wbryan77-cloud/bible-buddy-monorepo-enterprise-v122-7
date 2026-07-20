/**
 * PHASE_6E Part 8 — Knowledge Pipeline TAG stage.
 *
 * The governed IOG/ICOJ pipeline (services/iogIcojGovernedIngestion.js)
 * already carried lightweight tagging (`proposedTopic`, `domain:
 * "BIBLICAL_KNOWLEDGE"` on promoted records) but had no explicit, complete
 * TAG stage producing the full metadata-dimension set this batch requires.
 * This module implements that stage as a pure, deterministic metadata
 * operation over an already-processed candidate/record — it never gates,
 * blocks, or slows ingestion, and it is never invoked from the live chat
 * request path.
 */

const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { OT_BOOK_TO_OSIS, NT_BOOK_TO_N1904 } = require('./originalLanguageProvider');

/**
 * Build the full tag dimension set for a single ingestion-pipeline record
 * (an IOG/ICOJ Scripture-relationship candidate as produced by
 * processExtractedReference, OR a historical-knowledge record from
 * services/historicalKnowledgeProvider.js). Every dimension is derived from
 * a field that already exists on the record — nothing is invented.
 */
function buildKnowledgeTags(record = {}) {
  const reference = record.extractedReference || record.normalizedReference || null;
  const parsed = reference ? parseScriptureRef(reference) : null;
  const bookLower = parsed?.book || null;
  const testament = bookLower
    ? (Object.prototype.hasOwnProperty.call(OT_BOOK_TO_OSIS, bookLower) ? 'OLD' : (Object.prototype.hasOwnProperty.call(NT_BOOK_TO_N1904, bookLower) ? 'NEW' : null))
    : null;
  const originalLanguageAvailable = bookLower
    ? (Object.prototype.hasOwnProperty.call(OT_BOOK_TO_OSIS, bookLower) || Object.prototype.hasOwnProperty.call(NT_BOOK_TO_N1904, bookLower))
    : false;

  return {
    authorityDomain: record.domain || (record.trustTier ? 'HISTORICAL_KNOWLEDGE' : 'BIBLICAL_KNOWLEDGE'),
    biblicalBook: parsed?.book || null,
    testament,
    doctrineTopic: record.proposedTopic || record.topic || (record.relatedTopics || [])[0] || null,
    sourceType: record.sourceType || record.discoverySource || record.source || null,
    relationshipType: record.proposedRelationshipType || record.relationshipType || null,
    historicalPeriod: record.historicalPeriod || null,
    originalLanguageAvailable,
    trustTier: record.trustTier || null,
    approvalState: record.rulesDecision || record.approvalStatus || null,
    productionEligible: record.productionEligible !== undefined ? !!record.productionEligible : record.productionStatus === 'AUTO_APPROVED_CROSS_REFERENCE' || record.productionStatus === 'PRODUCTION',
    discoverySource: record.discoverySource || null,
  };
}

module.exports = { buildKnowledgeTags };
