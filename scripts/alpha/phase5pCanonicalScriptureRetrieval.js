const { runBuddy } = require('../../services/buddyBrain');
const { clearActiveConversation } = require('../../services/activeConversationManager');

const cases = [
  { id: 'john_3_16', message: 'John 3:16', mustInclude: [/for god so loved the world/i], mustNotInclude: [/^The requested Scripture passage is/i] },
  { id: 'genesis_1_1', message: 'Genesis 1:1', mustInclude: [/in the beginning god created/i] },
  { id: 'psalm_23', message: 'Psalm 23', mustInclude: [/the lord.{0,10}is my shepherd/i] },
  { id: 'romans_8_1_4', message: 'Romans 8:1-4', mustInclude: [/no condemnation/i] },
  { id: 'revelation_1_14_15', message: 'Revelation 1:14-15', mustInclude: [/wool/i, /fine brass/i] },
  { id: 'john_99_99_invalid', message: 'John 99:99', mustInclude: [/could not find/i], mustNotInclude: [/for god so loved/i] },
  { id: 'john_3_16_plus_invalid', message: 'John 3:16 and John 99:99', mustInclude: [/for god so loved the world/i, /could not find/i] },
];

(async () => {
  let failed = 0;

  for (const t of cases) {
    const userId = `phase5p-${t.id}-${Date.now()}`;
    clearActiveConversation(userId);

    const structured = await runBuddy({
      userId,
      message: t.message,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });

    const reply = String(structured.reply || '');
    const route = structured.runtime?.masterRoute || structured.route || null;
    const retrievalMode = structured.runtime?.retrievalMode || null;
    const scripture = structured.scripture || [];

    const missing = (t.mustInclude || []).filter((r) => !r.test(reply)).map(String);
    const leaked = (t.mustNotInclude || []).filter((r) => r.test(reply)).map(String);

    const pass = missing.length === 0 && leaked.length === 0;

    console.log(`${pass ? 'PASS' : 'FAIL'} ${JSON.stringify({
      id: t.id,
      route,
      retrievalMode,
      missing,
      leaked,
      scripture,
      reply: reply.slice(0, 400),
    })}`);

    if (!pass) failed++;
  }

  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
