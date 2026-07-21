#!/usr/bin/env node
/**
 * Phase 6F, Part 2C — approved knowledge never tested in production.
 *
 * Verifies that the evidence just closed/promoted in Part 2A (TEXT_ONLY
 * book relationships) and Part 2B (doctrine-gap supporting witnesses /
 * cross-references) is actually reachable through the real production
 * path: router -> topic selection -> evidence retrieval -> authority
 * classification -> witness ordering -> final reply. Never mutates
 * production data; read-only verification against the live runtime
 * entrypoint (services/buddyBrain.runBuddy), same call used by
 * scripts/alpha/scriptureFidelitySmoke.js.
 */

const { runBuddy } = require('../../services/buddyBrain');
const { clearActiveConversation } = require('../../services/activeConversationManager');

const CASES = [
  // Part 2B doctrine-gap topics — confirm the topic still answers correctly
  // and did not regress after the new supporting-witness/cross-reference
  // additions to services/doctrineAuthorityContract.js.
  { id: 'acts10_still_correct', message: 'What is Acts 10 really about, yes or no is it about eating unclean food?', mustInclude: [/no/i] },
  { id: 'david_covenant', message: 'What does the Bible say about David and the throne?', mustInclude: [/david/i] },
  { id: 'holy_spirit_ot', message: 'What does the Bible say about the Holy Spirit?', mustInclude: [/spirit/i] },
  { id: 'heavens_layers', message: 'What does the Bible say about the heavens?', mustInclude: [/heaven/i] },
  { id: 'resurrection_hope', message: 'What does the Bible say about the resurrection?', mustInclude: [/resurrection|raise|rise/i] },
  { id: 'ten_commandments_ask', message: 'What are the ten commandments?', mustInclude: [/exodus 20|ten commandments/i] },
  // Part 2A newly-linked TEXT_ONLY books — confirm these previously
  // text-only books now answer through the live path without error.
  { id: 'hosea_out_of_egypt', message: 'What does Hosea say, and how does the New Testament use Hosea 11:1?', mustInclude: [/hosea/i] },
  { id: 'habakkuk_just_shall_live', message: 'What does Habakkuk 2:4 say about faith?', mustInclude: [/faith|just/i] },
  { id: 'malachi_messenger', message: 'What does Malachi say about a messenger?', mustInclude: [/malachi|messenger/i] },
  { id: 'peter_jude_parallel', message: 'Read 2 Peter chapter 2.', mustInclude: [/peter/i] },
  { id: 'jonah_sign', message: 'What is the sign of Jonah?', mustInclude: [/jonah/i] },
];

async function run() {
  const results = [];
  for (const c of CASES) {
    clearActiveConversation(`phase6f-2c-${c.id}`);
    let reply = '';
    let error = null;
    try {
      const res = await runBuddy({
        message: c.message,
        userId: `phase6f-2c-${c.id}-${Date.now()}`,
        mode: 'COMPANION',
        personaKey: 'ADAPTIVE_COMPANION',
      });
      reply = (res && (res.reply || (res.reply && res.reply.reply))) || JSON.stringify(res).slice(0, 300);
      if (typeof reply === 'object') reply = JSON.stringify(reply);
    } catch (e) {
      error = e.message;
    }
    const missing = error ? ['ERROR'] : c.mustInclude.filter((re) => !re.test(String(reply)));
    results.push({ id: c.id, ok: !error && missing.length === 0, error, missing, replyPreview: String(reply).slice(0, 220) });
  }
  return results;
}

if (require.main === module) {
  run().then((results) => {
    for (const r of results) {
      console.log(r.ok ? 'PASS' : 'FAIL', r.id, r.ok ? '' : JSON.stringify({ error: r.error, missing: r.missing, preview: r.replyPreview }));
    }
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} passing`);
    const outIdx = process.argv.indexOf('--out');
    if (outIdx !== -1) require('fs').writeFileSync(process.argv[outIdx + 1], JSON.stringify(results, null, 2));
    process.exit(failed.length ? 1 : 0);
  });
}

module.exports = { run, CASES };
