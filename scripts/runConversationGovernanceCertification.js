/**
 * GATE 3 — Conversation governance certification (10 Founder scenarios).
 * BUDDY_URL defaults to production-style local or env.
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  const structured = json.reply && typeof json.reply === 'object' ? json.reply : null;
  return {
    reply: String(structured?.reply || json.reply || ''),
    route: structured?.runtime?.masterRoute || json.runtime?.masterRoute || '',
    lane: structured?.runtime?.orchestratorLane || '',
    openAi: structured?.runtime?.openAiCalled,
    ok: json.ok !== false,
  };
}

const results = [];
function record(id, pass, detail = '') {
  results.push({ id, pass, detail: String(detail).slice(0, 280) });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + String(detail).slice(0, 180) : ''}`);
}

const CLARIFICATION_RE =
  /are you asking about a bible passage|i want to make sure i answer the right thing|which book, topic, or passage/i;
const CONNECTION_ERROR_RE = /trouble reaching the ai service|core_connection_error/i;

async function main() {
  console.log(`Conversation governance against ${BASE}\n`);
  const ts = Date.now();

  // 1 — App identity
  {
    const u = `gov-id-${ts}`;
    const r = await ask(u, 'What does the app do?');
    record(
      'G1_app_identity',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        !CONNECTION_ERROR_RE.test(r.reply) &&
        (/bible|companion|scripture|app|help/i.test(r.reply) || /app_identity|phase5l_app_identity/i.test(r.route)),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );

    // 2 — Go deeper after identity
    const g = await ask(u, 'Go deeper.');
    record(
      'G2_identity_go_deeper',
      g.ok &&
        !CLARIFICATION_RE.test(g.reply) &&
        !/john\s*3:16|acts\s*10 makes pork/i.test(g.reply) &&
        (/app|bible|companion|scripture|help|deeper|more/i.test(g.reply) ||
          /identity|revision|app_identity|phase5l/i.test(g.route)),
      `${g.route} | ${g.reply.slice(0, 120)}`,
    );
  }

  // 3 — John 3:16 explicit Scripture
  {
    const u = `gov-j316-${ts}`;
    const r = await ask(u, 'What does John 3:16 say?');
    record(
      'G3_john316_explicit',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        /john\s*3:16|loved the world|only begotten/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // 4 — Acts 10
  {
    const u = `gov-acts10-${ts}`;
    const r = await ask(u, 'Does Acts 10 make pork clean? Yes or no?');
    record(
      'G4_acts10',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        /acts\s*10/i.test(r.reply) &&
        /\bno\b|unclean|not make pork clean|does not make/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // 5 — Remember for later (memory owner)
  {
    const u = `gov-mem-${ts}`;
    const ack = await ask(u, 'Remember this for later: my study focus is the Beatitudes.');
    const bare = await ask(`gov-mem-bare-${ts}`, 'Remember this for later.');
    const q = await ask(u, 'What did I ask you to remember?');
    const ackOk =
      ack.ok && !CLARIFICATION_RE.test(ack.reply) && !CONNECTION_ERROR_RE.test(ack.reply);
    const bareOk =
      bare.ok && !CLARIFICATION_RE.test(bare.reply) && !CONNECTION_ERROR_RE.test(bare.reply);
    const recallOk = /beatitudes/i.test(q.reply) && !/don't have something saved|do not have something saved/i.test(q.reply);
    record(
      'G5_remember_owner',
      ackOk && bareOk && recallOk && /explicit_remember_pin/i.test(q.route),
      `ack=${ack.route} bare=${bare.route} recall=${q.route} | ${q.reply.slice(0, 100)}`,
    );
  }

  // 6 — Continue after Scripture
  {
    const u = `gov-cont-${ts}`;
    await ask(u, 'What does John 3:16 say?');
    const r = await ask(u, 'Continue.');
    record(
      'G6_continue_owner',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        /john|world|believe|son|everlasting|loved/i.test(r.reply) &&
        !/what does the app do/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // 7 — Correction
  {
    const u = `gov-corr-${ts}`;
    await ask(u, 'Does Acts 10 make pork clean? Yes or no?');
    const r = await ask(u, 'No, I meant the previous answer — you did not answer my question about pork.');
    record(
      'G7_correction_owner',
      r.ok &&
        /acts\s*10/i.test(r.reply) &&
        /pork|unclean|swine/i.test(r.reply) &&
        !/ask me the part i missed/i.test(r.reply) &&
        !CLARIFICATION_RE.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // 8 — Multi-part
  {
    const u = `gov-mp-${ts}`;
    const r = await ask(
      u,
      'Two questions: What are the heavens according to Scripture, and what does Scripture say about the second coming?',
    );
    record(
      'G8_multipart',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        /heaven/i.test(r.reply) &&
        (/coming|return|appear|clouds|advent/i.test(r.reply) || /second/i.test(r.reply)),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // 9 — Prayer
  {
    const u = `gov-pray-${ts}`;
    const r = await ask(u, 'Can you pray with me for peace today?');
    record(
      'G9_prayer',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        (/pray|amen|father|lord|peace/i.test(r.reply) || /prayer/i.test(r.route)),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // 10 — Life advice / decision
  {
    const u = `gov-life-${ts}`;
    const r = await ask(u, 'I need help deciding whether to take a new job offer.');
    record(
      'G10_life_advice',
      r.ok &&
        !CLARIFICATION_RE.test(r.reply) &&
        !CONNECTION_ERROR_RE.test(r.reply) &&
        (/job|decision|wisdom|pray|consider|scripture/i.test(r.reply) ||
          /decision|companion|conversation_owner/i.test(r.route)),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  const pass = results.filter((x) => x.pass).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} passed, ${fail} failed.`);
  if (fail) {
    console.error(JSON.stringify(results.filter((x) => !x.pass), null, 2));
    process.exit(1);
  }
  console.log('CONVERSATION_GOVERNANCE PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
