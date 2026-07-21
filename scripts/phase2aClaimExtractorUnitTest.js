#!/usr/bin/env node
/**
 * Offline unit smoke test for claimExtractor — no OpenAI.
 */
const assert = require('assert');
const { extractClaims, segmentSentences, extractRefsFromText } = require('../services/claimExtractor');
const { buildDoctrineConclusion } = require('../services/doctrineConclusionBuilder');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');

const reply =
  'No, Acts 10 does not make pork clean. The vision in Acts 10 is about Gentiles, not dietary law. Leviticus 11:7 lists swine as unclean.';
const scripture = [
  {
    reference: 'Acts 10:14',
    text: '',
    reason: 'Peter was told not to call unclean what God cleansed — referring to people, not pork.',
  },
  { reference: 'Leviticus 11:7', text: '', reason: 'Swine is unclean because it does not chew the cud.' },
];

const pack = buildRetrievalEvidencePack({
  userId: 'unit-test',
  message: 'Does Acts 10 make pork clean?',
  routingHintsOnly: true,
});

const claims = extractClaims({ reply, scripture, evidencePack: pack });
assert(claims.length >= 2, 'expected at least 2 claims');
assert(!claims.some((c) => c.claimId === 'c_inferred'), 'c_inferred must not appear');
assert(claims.some((c) => (c.supportingScriptures || []).length > 0), 'expected mapped refs');
assert(claims.every((c) => c.sourceSentence), 'expected sourceSentence on claims');

const conclusion = buildDoctrineConclusion(claims, { reply });
assert(conclusion.length > 10, 'expected doctrine conclusion');

assert(segmentSentences('First sentence here. Second sentence here! Third sentence here?').length === 3);
assert(extractRefsFromText('See John 1:1 and 2 Corinthians 12:2').length >= 2);

console.log(JSON.stringify({ ok: true, claims: claims.length, conclusion: conclusion.slice(0, 80) }, null, 2));
