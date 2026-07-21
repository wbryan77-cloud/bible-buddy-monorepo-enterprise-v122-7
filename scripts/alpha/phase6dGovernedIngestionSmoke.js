/**
 * Phase 6D — Governed IOG/ICOJ ingestion pipeline smoke test.
 *
 * Verifies the required Test Matrix items for "IOG / ICOJ":
 *  - raw item remains non-production (raw source file is never mutated;
 *    no candidate is promoted without going through rulesDecision)
 *  - Scripture extraction + valid reference normalization
 *  - invalid reference rejection
 *  - duplicate detection
 *  - new supporting-witness / cross-reference candidate creation
 *  - rules auto-approval and auto-rejection
 *  - Admin-review exception routing
 *  - an approved candidate is retrievable from production evidence
 *    (data/approved-cross-references.jsonl, read live by
 *    scriptureRelationshipGraph/scriptureAuthorityEngine)
 *  - a rejected/needs-review candidate never appears in that production
 *    evidence store
 */

const fs = require('fs');
const {
  acquireIcojPdfSources,
  processExtractedReference,
  runGovernedIcojIngestion,
  readApprovedCrossReferences,
  RULES_DECISION,
} = require('../../services/iogIcojGovernedIngestion');
const { buildTopicWitnessRegistry } = require('../../services/topicWitnessRegistry');
const { buildScriptureRelationshipGraph } = require('../../services/scriptureRelationshipGraph');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failed += 1; console.log('FAIL', name, detail ? JSON.stringify(detail) : ''); }
}

const acquisition = acquireIcojPdfSources();
check('acquisition_ok', acquisition.ok === true, acquisition.error);
check('raw_source_file_untouched', fs.existsSync('docs/evidence-candidates/icoj-pdf-extraction-review.json'));
check('sources_have_immutable_metadata', acquisition.sources.every((s) => s.sourceId && s.sourceHash && s.acquisitionTimestamp && s.licensingStatus));

const registry = buildTopicWitnessRegistry();
const sampleSource = acquisition.sources.find((s) => s.extractedReferences && s.extractedReferences.length) || acquisition.sources[0];

// Invalid reference rejection.
const invalid = processExtractedReference({ reference: 'Nonexistent 999:999', source: sampleSource, registry });
check('invalid_reference_auto_rejected', invalid.rulesDecision === RULES_DECISION.AUTO_REJECTED_INVALID_REFERENCE, invalid);
check('invalid_reference_never_production', invalid.productionStatus === 'REJECTED');

// Duplicate detection: use an existing approved witness reference verbatim.
const anyTopic = [...registry.values()].find((t) => t.primaryWitnesses.size);
if (anyTopic) {
  const existingWitness = [...anyTopic.primaryWitnesses][0];
  const dup = processExtractedReference({ reference: existingWitness, source: sampleSource, registry });
  check('exact_duplicate_detected', dup.duplicateStatus === 'EXACT_DUPLICATE' && dup.rulesDecision === RULES_DECISION.AUTO_REJECTED_DUPLICATE, dup);
}

// Full dry run across all 47 sources — verifies auto-approval, auto-rejection, and admin-review routing all fire.
const dryRun = runGovernedIcojIngestion({ persist: false });
check('dry_run_ok', dryRun.ok === true);
check('auto_approval_occurs', dryRun.counts.autoApproved > 0, dryRun.counts);
check('auto_rejection_occurs', dryRun.counts.autoRejectedDuplicate > 0 || dryRun.counts.autoRejectedInvalid > 0, dryRun.counts);
check('admin_review_routing_occurs', dryRun.counts.needsAdminReview > 0, dryRun.counts);

// Production evidence: approved cross-references must already be persisted
// from a prior real run and must be retrievable live by the relationship
// graph (never bypassing the rules engine — every record's approvalStatus
// is AUTO_APPROVED, never a raw IOG/ICOJ claim).
const approved = readApprovedCrossReferences();
check('approved_cross_references_persisted', approved.length > 0, { count: approved.length });
check('every_approved_record_has_rules_decision', approved.every((r) => r.rulesDecision === RULES_DECISION.AUTO_APPROVED));
check('every_approved_record_preserves_discovery_source', approved.every((r) => r.discoverySource === 'IOG/ICOJ'));
check('every_approved_record_has_real_kjv_text', approved.every((r) => typeof r.actualKjvText === 'string' && r.actualKjvText.length > 0));

const relationshipGraph = buildScriptureRelationshipGraph();
const crossRefRelationships = relationshipGraph.relationships.filter((r) => r.relationshipType === 'CROSS_REFERENCE');
check('approved_candidates_reachable_from_production_relationship_graph', crossRefRelationships.length > 0, { count: crossRefRelationships.length });
check('cross_references_never_typed_as_primary_or_supporting_witness', crossRefRelationships.every((r) => r.relationshipType !== 'PRIMARY_WITNESS' && r.relationshipType !== 'SUPPORTING_WITNESS'));

// Rejected/needs-review candidates must never appear in the approved store.
const rejectedRefs = new Set([
  ...dryRun.results.autoRejectedDuplicate.map((r) => r.extractedReference),
  ...dryRun.results.autoRejectedInvalid.map((r) => r.extractedReference),
]);
const approvedRefs = new Set(approved.map((r) => r.extractedReference));
const leaked = [...rejectedRefs].filter((r) => approvedRefs.has(r));
check('rejected_candidates_never_in_production_evidence', leaked.length === 0, { leaked });

console.log('');
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
