const { runBuddy } = require('../../services/buddyBrain');
const { clearActiveConversation } = require('../../services/activeConversationManager');

const forbidden = [
  /divine nature/i,
  /symbolic imagery/i,
  /metaphorical/i,
  /purity and authority/i,
  /spiritual significance/i,
  /specific ethnic identity/i,
  /most scholars/i,
  /tradition says/i,
  /commentators/i,
  /I want to make sure I answer the right thing/i,
  /Bible passage, a life situation, or something you want prayer for/i,
];

const cases = [
  {
    id: 'jesus_not_white_direct',
    message: 'Based on Revelation 1:14-15, does Scripture say Jesus is white with blue eyes and fine straight hair? Yes or no?',
    mustInclude: [/no/i, /Revelation 1:14-15/i, /wool/i, /fine brass/i],
  },
  {
    id: 'no_interpretation_request',
    message: 'Do not interpret. Does Revelation 1:14-15 say this is divine nature, yes or no?',
    // PHASE_5T: "divine nature" is not a physical-attribute claim contradicted
    // by a differing description, so this stays a genuine silence case.
    mustInclude: [/no/i, /does not explicitly state/i],
  },
  {
    id: 'compound_appearance_claim_contradicted',
    message: 'Give me the Bible verses that say Jesus had white skin, blue eyes, and fine straight hair.',
    // PHASE_5T: a compound physical-description claim contradicted by
    // Scripture's own differing description must read as EXPLICITLY
    // CONTRADICTED ("No."), not silence-language ("does not explicitly
    // state") — see Phase 5T non-negotiable rules.
    mustInclude: [/^no\b/i, /opposite/i, /Revelation 1:14-15/i, /wool/i],
  },
  {
    id: 'line_upon_line_request',
    message: 'Stay line upon line. What does Revelation 1:14-15 say about Jesus appearance?',
    mustInclude: [/hair/i, /wool/i, /eyes/i, /fire/i, /fine brass/i],
  },
];

(async () => {
  let failed = 0;

  for (const t of cases) {
    const userId = `scripture-fidelity-${t.id}-${Date.now()}`;
    clearActiveConversation(userId);

    const structured = await runBuddy({
      userId,
      message: t.message,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });

    const reply = String(structured.reply || '');
    const route = structured.runtime?.masterRoute || structured.route || null;

    const missing = (t.mustInclude || []).filter((r) => !r.test(reply)).map(String);
    const leaked = forbidden.filter((r) => r.test(reply)).map(String);

    const pass = missing.length === 0 && leaked.length === 0;

    console.log(`${pass ? 'PASS' : 'FAIL'} ${JSON.stringify({
      id: t.id,
      route,
      missing,
      leaked,
      reply: reply.slice(0, 260),
    })}`);

    if (!pass) failed++;
  }

  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
