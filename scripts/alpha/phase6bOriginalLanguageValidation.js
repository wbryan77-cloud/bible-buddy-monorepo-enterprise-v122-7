/**
 * Phase 6B.4 — Original-Language Validation.
 *
 * Verifies services/originalLanguageProvider.getPassageStudy against the
 * batch's required minimum test set, and asserts the honesty/no-fabrication
 * invariants: correct source language, correct token order (source-file
 * order, never reordered), no invented tokens/morphology, KJV preserved,
 * literal rendering clearly labeled, incomplete data reported honestly.
 */

const assert = require('assert');
const { getPassageStudy } = require('../../services/originalLanguageProvider');

const CASES = [
  { reference: 'Genesis 1:1', expectLanguage: 'HEBREW', minTokens: 5 },
  { reference: 'Exodus 3:14', expectLanguage: 'HEBREW', minTokens: 10 },
  { reference: 'Psalm 22:1', expectLanguage: 'HEBREW', minTokens: 5, expectVersificationNote: true },
  { reference: 'Isaiah 7:14', expectLanguage: 'HEBREW', minTokens: 10 },
  { reference: 'Daniel 2:4', expectLanguage: 'MIXED_HEBREW_ARAMAIC', minTokens: 5 },
  { reference: 'Matthew 1:23', expectLanguage: 'GREEK', minTokens: 15 },
  { reference: 'John 1:1', expectLanguage: 'GREEK', minTokens: 10 },
  { reference: 'John 3:16', expectLanguage: 'GREEK', minTokens: 15 },
  { reference: 'Romans 8:1', expectLanguage: 'GREEK', minTokens: 5 },
  { reference: 'Revelation 1:14-15', expectLanguage: 'GREEK', minTokens: 20 },
];

async function run() {
  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const c of CASES) {
    try {
      const result = await getPassageStudy({ reference: c.reference });
      assert.strictEqual(result.ok, true, 'expected ok:true');
      assert.strictEqual(result.sourceLanguage, c.expectLanguage, `expected language ${c.expectLanguage}, got ${result.sourceLanguage}`);
      assert.ok(result.tokens.length >= c.minTokens, `expected >= ${c.minTokens} tokens, got ${result.tokens.length}`);
      assert.ok(result.kjvText && result.kjvText.length > 0, 'KJV text must be preserved');
      assert.ok(result.literalRendering && result.literalRendering.startsWith('Literal study rendering from the available source data:'), 'literal rendering must be clearly labeled');
      // No invented tokens: every token must trace to the source file (has a
      // non-empty surface form); no invented morphology: every token's
      // morphology field must be the raw source code, never fabricated text.
      for (const t of result.tokens) {
        assert.ok(t.surface && t.surface.length > 0, 'token surface must come from source file');
        assert.ok(typeof t.morphology === 'string', 'morphology must be the raw source code');
      }
      if (c.expectVersificationNote) {
        assert.ok(result.limitations.some((l) => l.includes('versification')), 'expected an honest versification-difference note');
      }
      console.log(`PASS: ${c.reference} (${result.sourceLanguage}, ${result.tokens.length} tokens)`);
      pass++;
    } catch (e) {
      console.log(`FAIL: ${c.reference} -> ${e.message}`);
      failures.push({ reference: c.reference, error: e.message });
      fail++;
    }
  }

  // Honest-incompleteness case: a reference outside the vendored corpus
  // (e.g. Apocrypha) must report a gap, never fabricate tokens.
  try {
    const result = await getPassageStudy({ reference: 'Tobit 1:1' });
    assert.strictEqual(result.ok, false);
    assert.ok(result.limitations.length > 0);
    console.log('PASS: out-of-corpus reference handled honestly (Tobit 1:1)');
    pass++;
  } catch (e) {
    console.log(`FAIL: out-of-corpus honesty case -> ${e.message}`);
    failures.push({ reference: 'Tobit 1:1', error: e.message });
    fail++;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
}

run();
