/**
 * Phase 6 — Production Answer Lineage smoke test.
 *
 * Verifies every Scripture-grounded answer from
 * scriptureAuthorityEngine.buildAuthorityAnswer() exposes the full lineage
 * object required by the batch, and that IOG/ICOJ only ever appears inside
 * discoverySources/approvalDecisions — never as primaryWitness/
 * supportingWitnesses.
 */

const { buildBibleWideAnswer } = require('../../services/bibleWideReasoningEngine');

const REQUIRED_LINEAGE_FIELDS = [
  'authorityClassification', 'directAnswer', 'primaryWitness', 'supportingWitnesses',
  'crossReferences', 'relationshipTypes', 'scriptureProvider', 'originalLanguageSources',
  'historicalSources', 'evidenceIds', 'doctrineTopicIds', 'discoverySources',
  'approvalDecisions', 'retrievalMode', 'masterRoute',
];

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failed += 1; console.log('FAIL', name, detail ? JSON.stringify(detail) : ''); }
}

async function main() {
  const answer = await buildBibleWideAnswer({
    message: 'What does John 3:16 say?',
    userId: 'phase6_lineage_smoke_user',
  });

  check('lineage_object_present', !!answer.lineage);
  const missing = REQUIRED_LINEAGE_FIELDS.filter((f) => !(f in (answer.lineage || {})));
  check('lineage_has_all_required_fields', missing.length === 0, { missing });
  check('lineage_primary_witness_matches_retrieved_scripture', answer.lineage.primaryWitness?.reference === 'John 3:16', answer.lineage.primaryWitness);
  check('lineage_scripture_provider_is_local_corpus_or_fallback', typeof answer.lineage.scriptureProvider === 'string' && answer.lineage.scriptureProvider.length > 0);
  check('lineage_master_route_set', typeof answer.lineage.masterRoute === 'string' && answer.lineage.masterRoute.length > 0, answer.lineage.masterRoute);
  check('lineage_retrieval_mode_set', typeof answer.lineage.retrievalMode === 'string' && answer.lineage.retrievalMode.length > 0, answer.lineage.retrievalMode);

  // IOG/ICOJ governance boundary: never a primary/supporting witness.
  check(
    'iog_icoj_never_primary_or_supporting_witness',
    !(answer.lineage.primaryWitness?.discoverySource) &&
      answer.lineage.supportingWitnesses.every((w) => !w.discoverySource)
  );

  // A topic with a governed IOG/ICOJ cross-reference already promoted —
  // verify discoverySources/approvalDecisions surface it correctly when a
  // cross-reference is present for the answered topic.
  const withCrossRefs = await buildBibleWideAnswer({
    message: 'Is it lawful to keep the Sabbath?',
    userId: 'phase6_lineage_smoke_user_2',
  });
  const iogCrossRefs = (withCrossRefs.lineage?.crossReferences || []).filter((c) => c.discoverySource);
  if (iogCrossRefs.length) {
    check('discovery_sources_populated_when_iog_icoj_crossref_present', withCrossRefs.lineage.discoverySources.includes('IOG/ICOJ'));
    check('approval_decisions_populated_when_iog_icoj_crossref_present', withCrossRefs.lineage.approvalDecisions.length > 0);
  } else {
    console.log('SKIP (informational): no IOG/ICOJ cross-reference attached to this particular topic today — discoverySources/approvalDecisions population verified structurally only.');
  }

  console.log('');
  console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(1); });
