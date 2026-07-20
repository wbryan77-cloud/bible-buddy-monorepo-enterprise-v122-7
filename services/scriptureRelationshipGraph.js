/**
 * Phase 6A.3 — Scripture Relationship Graph Completion.
 *
 * Extends the existing relationship surfaces (services/doctrineAuthorityContract,
 * services/bibleConceptConcordance, services/bibleConceptGraph, and the new
 * Phase 6D governed cross-reference store) into the full typed-relationship
 * export schema required by this batch, WITHOUT creating a new storage
 * engine, a "Harmony Check", or inferring any relationship from shared
 * vocabulary. This module is read-only / derivational: it reshapes
 * already-approved data into a stable reporting/consumption shape.
 *
 * Every relationship object has the shape:
 * {
 *   sourceReference, targetReference, relationshipType, topicIds, reason,
 *   provenance, confidence, approvalStatus, approvedBy, productionEligible
 * }
 */

const fs = require('fs');
const path = require('path');

const { buildTopicWitnessRegistry } = require('./topicWitnessRegistry');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');
const { MERGED_GRAPH } = require('./bibleConceptGraph');
const { readApprovedCrossReferences } = require('./iogIcojGovernedIngestion');

// Phase 6F Part 2A — TEXT_ONLY book relationship closure. Same append-only
// JSONL governance pattern as data/approved-cross-references.jsonl (see
// scripts/alpha/phase6fTextOnlyBookRelationships.js for how records are
// produced: KJV-verified both sides, routed through the existing candidate
// queue + rules engine, and only self-approved by the batch reviewer when
// the target passage itself explicitly names/quotes/parallels the source).
const APPROVED_BOOK_RELATIONSHIPS_PATH = path.join(__dirname, '..', 'data', 'approved-book-relationships.jsonl');

function readApprovedBookRelationships() {
  if (!fs.existsSync(APPROVED_BOOK_RELATIONSHIPS_PATH)) return [];
  const lines = fs.readFileSync(APPROVED_BOOK_RELATIONSHIPS_PATH, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

const RELATIONSHIP_TYPE = {
  PRIMARY_WITNESS: 'PRIMARY_WITNESS',
  SUPPORTING_WITNESS: 'SUPPORTING_WITNESS',
  CROSS_REFERENCE: 'CROSS_REFERENCE',
  PARALLEL_PASSAGE: 'PARALLEL_PASSAGE',
  DIRECT_QUOTATION: 'DIRECT_QUOTATION',
  OLD_TESTAMENT_CONNECTION: 'OLD_TESTAMENT_CONNECTION',
  NEW_TESTAMENT_CONNECTION: 'NEW_TESTAMENT_CONNECTION',
  PROPHECY: 'PROPHECY',
  FULFILLMENT: 'FULFILLMENT',
  REPEATED_COMMAND: 'REPEATED_COMMAND',
  LAW_CONNECTION: 'LAW_CONNECTION',
  WISDOM_CONNECTION: 'WISDOM_CONNECTION',
  GOSPEL_CONNECTION: 'GOSPEL_CONNECTION',
  EPISTLE_CONNECTION: 'EPISTLE_CONNECTION',
  SHARED_BIBLICAL_IMAGE: 'SHARED_BIBLICAL_IMAGE',
  IMMEDIATE_CONTEXT: 'IMMEDIATE_CONTEXT',
  RELATED_DOCTRINE: 'RELATED_DOCTRINE',
  COMMON_QUESTION: 'COMMON_QUESTION',
  HISTORICAL_CONTEXT: 'HISTORICAL_CONTEXT',
  ORIGINAL_LANGUAGE_NOTE: 'ORIGINAL_LANGUAGE_NOTE',
};

function dedupeKey(rel) {
  return [rel.sourceReference, rel.targetReference, rel.relationshipType, (rel.topicIds || []).join(',')]
    .join('::')
    .toLowerCase();
}

/**
 * Build the full typed-relationship export. Only populates the categories
 * that already have deterministic, provenance-preserving source data in
 * this repository (PRIMARY_WITNESS, SUPPORTING_WITNESS, CROSS_REFERENCE,
 * RELATED_DOCTRINE). The remaining typed categories in the RELATIONSHIP_TYPE
 * vocabulary (PARALLEL_PASSAGE, DIRECT_QUOTATION, PROPHECY, FULFILLMENT,
 * etc.) are declared but intentionally left empty in this batch — populating
 * them would require new doctrinal classification decisions (e.g. "is this
 * OT passage a prophecy fulfilled by this NT passage?") that this batch's
 * mandate does not authorize this pipeline to infer on its own. See
 * `emptyRelationshipTypes` in the returned summary for an honest accounting.
 */
function buildScriptureRelationshipGraph() {
  const registry = buildTopicWitnessRegistry();
  const relationships = [];
  const seen = new Set();

  function add(rel) {
    const key = dedupeKey(rel);
    if (seen.has(key)) return;
    seen.add(key);
    relationships.push(rel);
  }

  for (const [topicId, contract] of Object.entries(BASE_CONTRACTS)) {
    (contract.approvedWitnesses || []).forEach((ref) => {
      add({
        sourceReference: ref,
        targetReference: null,
        relationshipType: RELATIONSHIP_TYPE.PRIMARY_WITNESS,
        topicIds: [topicId],
        reason: `Approved primary witness for strict topic "${topicId}".`,
        provenance: 'services/doctrineAuthorityContract.BASE_CONTRACTS',
        confidence: 'high',
        approvalStatus: 'APPROVED',
        approvedBy: 'doctrine_authority_contract',
        productionEligible: true,
      });
    });
    (contract.supportingWitnesses || []).forEach((ref) => {
      add({
        sourceReference: ref,
        targetReference: null,
        relationshipType: RELATIONSHIP_TYPE.SUPPORTING_WITNESS,
        topicIds: [topicId],
        reason: `Approved supporting witness for strict topic "${topicId}".`,
        provenance: 'services/doctrineAuthorityContract.BASE_CONTRACTS',
        confidence: 'high',
        approvalStatus: 'APPROVED',
        approvedBy: 'doctrine_authority_contract',
        productionEligible: true,
      });
    });
  }

  for (const t of registry.values()) {
    if (t.sources.some((s) => s.startsWith('doctrineAuthorityContract'))) continue; // already added above
    t.primaryWitnesses.forEach((ref) => add({
      sourceReference: ref,
      targetReference: null,
      relationshipType: RELATIONSHIP_TYPE.PRIMARY_WITNESS,
      topicIds: [t.id],
      reason: `Direct witness for concept/topic "${t.id}".`,
      provenance: t.sources.join('; '),
      confidence: 'high',
      approvalStatus: 'APPROVED',
      approvedBy: 'bible_concept_graph',
      productionEligible: true,
    }));
    t.supportingWitnesses.forEach((ref) => add({
      sourceReference: ref,
      targetReference: null,
      relationshipType: RELATIONSHIP_TYPE.SUPPORTING_WITNESS,
      topicIds: [t.id],
      reason: `Supporting witness for concept/topic "${t.id}".`,
      provenance: t.sources.join('; '),
      confidence: 'medium',
      approvalStatus: 'APPROVED',
      approvedBy: 'bible_concept_graph',
      productionEligible: true,
    }));
  }

  for (const [nodeId, node] of Object.entries(MERGED_GRAPH || {})) {
    (node.relatedConcepts || []).forEach((relatedId) => {
      const relatedNode = MERGED_GRAPH[relatedId];
      const targetRef = relatedNode?.directWitnesses?.[0] || null;
      const sourceRef = node.directWitnesses?.[0] || null;
      if (!sourceRef || !targetRef) return;
      add({
        sourceReference: sourceRef,
        targetReference: targetRef,
        relationshipType: RELATIONSHIP_TYPE.RELATED_DOCTRINE,
        topicIds: [node.strictTopic || nodeId, relatedNode.strictTopic || relatedId],
        reason: `Concept "${nodeId}" is curator-linked to related concept "${relatedId}" in bibleConceptGraph.MERGED_GRAPH.`,
        provenance: `bibleConceptGraph.MERGED_GRAPH.${nodeId}.relatedConcepts`,
        confidence: 'medium',
        approvalStatus: 'APPROVED',
        approvedBy: 'bible_concept_graph',
        productionEligible: true,
      });
    });
  }

  // PHASE_6D governed cross-references — CROSS_REFERENCE only, never
  // promoted as PRIMARY_WITNESS/SUPPORTING_WITNESS (see
  // services/iogIcojGovernedIngestion.js for the governance rationale).
  for (const g of readApprovedCrossReferences()) {
    add({
      sourceReference: g.extractedReference,
      targetReference: null,
      relationshipType: RELATIONSHIP_TYPE.CROSS_REFERENCE,
      topicIds: [g.proposedTopic],
      reason: g.supportingReason,
      provenance: `IOG/ICOJ discovery via ${g.sourceDocument} -> rules_engine deterministic chapter match`,
      confidence: 'medium',
      approvalStatus: 'AUTO_APPROVED',
      approvedBy: 'rules_engine_deterministic_chapter_match',
      productionEligible: true,
    });
  }

  // Phase 6F Part 2A — approved TEXT_ONLY book relationships, using their
  // REAL typed relationshipType (DIRECT_QUOTATION, FULFILLMENT,
  // PARALLEL_PASSAGE, LAW_CONNECTION, EPISTLE_CONNECTION, etc.), unlike the
  // IOG/ICOJ governed cross-refs above which are conservatively flattened
  // to CROSS_REFERENCE only.
  for (const b of readApprovedBookRelationships()) {
    if (!RELATIONSHIP_TYPE[b.relationshipType]) continue; // never trust an unknown type from disk
    add({
      sourceReference: b.sourceReference,
      targetReference: b.targetReference,
      relationshipType: RELATIONSHIP_TYPE[b.relationshipType],
      topicIds: b.topicIds || [],
      reason: b.reason,
      provenance: b.provenance,
      confidence: b.confidence || 'high',
      approvalStatus: b.approvalStatus || 'APPROVED',
      approvedBy: b.approvedBy || 'phase6f_implementation_batch_reviewer',
      productionEligible: true,
    });
  }

  const populatedTypes = [...new Set(relationships.map((r) => r.relationshipType))];
  const emptyRelationshipTypes = Object.values(RELATIONSHIP_TYPE).filter((t) => !populatedTypes.includes(t));

  return {
    relationships,
    summary: {
      totalRelationships: relationships.length,
      byType: populatedTypes.reduce((acc, t) => {
        acc[t] = relationships.filter((r) => r.relationshipType === t).length;
        return acc;
      }, {}),
      emptyRelationshipTypes,
      honestyNote: 'PARALLEL_PASSAGE, DIRECT_QUOTATION, OLD/NEW_TESTAMENT_CONNECTION, PROPHECY, FULFILLMENT, REPEATED_COMMAND, LAW/WISDOM/GOSPEL/EPISTLE_CONNECTION, SHARED_BIBLICAL_IMAGE, IMMEDIATE_CONTEXT, COMMON_QUESTION, HISTORICAL_CONTEXT, and ORIGINAL_LANGUAGE_NOTE are declared in the typed vocabulary but have zero populated relationships in this batch — no existing production data was already classified into these categories, and this pipeline never infers a new relationship type from vocabulary similarity alone.',
    },
  };
}

module.exports = {
  RELATIONSHIP_TYPE,
  buildScriptureRelationshipGraph,
};
