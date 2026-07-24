/**
 * GATE 5 regression — forbidden-claim unless-clauses must not span sentences.
 */
const assert = require('assert');
const {
  validateClaimToScripture,
  applyClaimDegradation,
  matchesForbidden,
} = require('../services/claimToScriptureValidator');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');

function run() {
  const mixed =
    'Ecclesiastes 9:5 says the dead know not any thing. When you die you go to heaven immediately.';
  assert.ok(
    matchesForbidden(mixed).some((h) => h.id === 'heaven_at_death_settled'),
    'mixed reply must detect heaven-at-death orphan despite "know not"',
  );

  const pack = buildRetrievalEvidencePack({
    message: 'What is the state of the dead?',
    routingHintsOnly: true,
  });
  const v = validateClaimToScripture({
    reply: mixed,
    claims: [
      {
        claimId: 'c1',
        claim: 'Ecclesiastes 9:5 says the dead know not any thing.',
        type: 'doctrine',
        supportingScriptures: ['Ecclesiastes 9:5'],
      },
    ],
    evidencePack: pack,
    message: 'What is the state of the dead?',
  });
  assert.strictEqual(v.passed, false);
  const degraded = applyClaimDegradation(mixed, v);
  assert.ok(!/when you die you go to heaven immediately/i.test(degraded));
  assert.ok(/ecclesiastes 9:5|dead know not/i.test(degraded));

  const goodOnly = 'Ecclesiastes 9:5 says the dead know not any thing.';
  const v2 = validateClaimToScripture({
    reply: goodOnly,
    claims: [
      {
        claimId: 'c1',
        claim: goodOnly,
        type: 'doctrine',
        supportingScriptures: ['Ecclesiastes 9:5'],
      },
    ],
    evidencePack: pack,
    message: 'What is the state of the dead?',
  });
  assert.strictEqual(v2.passed, true);
  console.log('gate5ClaimOrphanSentenceScope.test.js PASS');
}

run();
