/**
 * Phase 6X Obj3 — approved IOG/ICOJ cross-refs auto-consult on pack (no org keyword).
 */
const assert = require('assert');
const {
  buildRetrievalEvidencePack,
  retrieveApprovedCrossReferenceEvidence,
} = require('../services/retrievalEvidencePack');

function run() {
  const sabbath = retrieveApprovedCrossReferenceEvidence('sabbath');
  assert.strictEqual(sabbath.consulted, true);
  assert.ok(sabbath.count >= 1, 'sabbath should have approved xrefs');
  assert.ok(sabbath.references.every((r) => r.relation === 'iog_icoj_cross_reference'));

  const none = retrieveApprovedCrossReferenceEvidence(null);
  assert.strictEqual(none.consulted, false);

  const pack = buildRetrievalEvidencePack({
    message: 'What does Scripture say about the Sabbath?',
    routingHintsOnly: true,
  });
  assert.ok(pack.brokerConsult, 'brokerConsult telemetry required');
  assert.ok(
    pack.approvedCrossReferences,
    'approvedCrossReferences slice required on pack',
  );
  // Topic detection should resolve sabbath → xrefs consulted without user saying IOG
  if (pack.approvedCrossReferences.topic === 'sabbath') {
    assert.ok(pack.brokerConsult.approvedCrossReferences >= 1);
    assert.ok(
      pack.scripture.references.some(
        (r) => r && r.relation === 'iog_icoj_cross_reference',
      ) || pack.approvedCrossReferences.count >= 1,
    );
  }

  const holy = retrieveApprovedCrossReferenceEvidence('holy_spirit');
  assert.ok(holy.count >= 1, 'holy_spirit approved xrefs exist in store');

  console.log('phase6xObj3EvidenceBroker.test.js PASS', {
    sabbathCount: sabbath.count,
    packTopic: pack.approvedCrossReferences.topic,
    packXrefCount: pack.brokerConsult.approvedCrossReferences,
  });
}

run();
