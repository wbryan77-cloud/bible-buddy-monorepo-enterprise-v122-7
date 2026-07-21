/**
 * Phase 5Q — Grounded Scripture engine regression.
 *
 * Exercises READ, QUOTE, COMPARE, and YES_NO explicit-Scripture modes and
 * confirms every answer is grounded in live retrieved text (never a
 * doctrine-graph directAnswer, never a hand-authored witness list, never
 * fabricated).
 */

const { runBuddy } = require('../../services/buddyBrain');
const { clearActiveConversation } = require('../../services/activeConversationManager');

const cases = [
  {
    id: 'read_bare_reference',
    message: 'John 3:16',
    expectMode: 'READ',
    mustInclude: [/for god so loved the world/i],
  },
  {
    id: 'quote_what_does_it_say',
    message: 'What does Psalm 23 say?',
    expectMode: 'QUOTE',
    mustInclude: [/the lord.{0,10}is my shepherd/i],
  },
  {
    id: 'compare_unsupported_claim',
    message: 'Does Genesis 1:1 say the earth is billions of years old?',
    // "Does X say Y?" is grammatically a yes/no question even without the
    // literal words "yes or no" — see Phase 5R runtime validation.
    expectMode: 'YES_NO',
    mustInclude: [/no/i, /scripture does not explicitly state/i, /in the beginning god created/i],
  },
  {
    id: 'compare_two_references_no_claim',
    message: 'Compare Genesis 1:1 and John 1:1.',
    expectMode: 'COMPARE',
    mustInclude: [/in the beginning god created/i, /in the beginning was the word/i],
  },
  {
    id: 'yes_no_supported_claim',
    message: 'Does Romans 8:1 say there is no condemnation in Christ, yes or no?',
    expectMode: 'YES_NO',
    mustInclude: [/yes/i, /no condemnation/i],
  },
  {
    id: 'yes_no_unsupported_claim',
    message: 'Based on Revelation 1:14-15, does Scripture say Jesus is white with blue eyes and fine straight hair? Yes or no?',
    expectMode: 'YES_NO',
    mustInclude: [/^no/i, /wool/i, /fine brass/i],
  },
  {
    id: 'compare_no_explicit_reference_claim_hint',
    message: 'Give me the Bible verses that say Jesus had white skin, blue eyes, and fine straight hair.',
    expectMode: 'COMPARE',
    // PHASE_5T: a compound physical-description claim contradicted by
    // Scripture's differing description classifies EXPLICITLY_CONTRADICTED
    // ("No.") rather than silence language.
    mustInclude: [/^no\b/i, /opposite/i, /revelation 1:14-15/i],
  },
];

(async () => {
  let failed = 0;

  for (const t of cases) {
    const userId = `phase5q-${t.id}-${Date.now()}`;
    clearActiveConversation(userId);

    const structured = await runBuddy({
      userId,
      message: t.message,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });

    const reply = String(structured.reply || '');
    const route = structured.runtime?.masterRoute || structured.route || null;
    const scriptureMode = structured.runtime?.scriptureMode || null;

    const missing = (t.mustInclude || []).filter((r) => !r.test(reply)).map(String);
    const modeMismatch = t.expectMode && scriptureMode !== t.expectMode;

    const pass = missing.length === 0 && !modeMismatch;

    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${JSON.stringify({
        id: t.id,
        route,
        expectMode: t.expectMode,
        scriptureMode,
        missing,
        reply: reply.slice(0, 300),
      })}`
    );

    if (!pass) failed++;
  }

  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
