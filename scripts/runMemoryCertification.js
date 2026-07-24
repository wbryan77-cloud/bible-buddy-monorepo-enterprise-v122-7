/**
 * GATE 2 — Memory certification matrix.
 * BUDDY_URL defaults to localhost. MEMORY_MAX_TURNS defaults to 100.
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;
const MAX_TURNS = Number(process.env.MEMORY_MAX_TURNS || 100);

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  return {
    reply: String(json.reply?.reply || json.reply || ''),
    route: json.reply?.runtime?.masterRoute || '',
    ok: json.ok !== false,
  };
}

const results = [];
function record(id, pass, detail = '') {
  results.push({ id, pass, detail: String(detail).slice(0, 240) });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
}

function inventedHistory(reply) {
  return /Turn\s+\d+\.?["']?\s*$/i.test(reply) || /the marker you gave.{0,40}Turn\s+\d+/i.test(reply);
}

async function main() {
  console.log(`Memory certification against ${BASE} (maxTurns=${MAX_TURNS})\n`);
  const ts = Date.now();

  // M1 — previous assistant / user / go deeper / continue
  {
    const u = `mem-imm-${ts}`;
    await ask(u, 'What does John 3:16 say?');
    const priorUser = await ask(u, 'What was my last question?');
    record(
      'M1_prior_user_question',
      /john\s*3:16|what does john/i.test(priorUser.reply),
      priorUser.route,
    );
    const priorAsst = await ask(u, 'What was the verse we just discussed?');
    record('M1_prior_assistant_reply', /john\s*3:16|loved the world/i.test(priorAsst.reply), priorAsst.route);
    const g = await ask(u, 'Go deeper.');
    record(
      'M1_go_deeper',
      g.ok && !/acts 10:14 shows peter still refused unclean food/i.test(g.reply),
      g.route,
    );
    const c = await ask(u, 'Continue.');
    record(
      'M1_continue',
      c.ok && /john|world|believe|everlasting|son/i.test(c.reply) && !/acts 10 makes pork/i.test(c.reply),
      c.route,
    );
  }

  // M2 — correction continuity
  {
    const u = `mem-corr-${ts}`;
    await ask(u, 'Does Acts 10 make pork clean? Yes or no?');
    const r = await ask(u, 'You did not answer my question about pork.');
    record(
      'M2_correction_continuity',
      /acts\s*10/i.test(r.reply) && /pork|unclean|swine/i.test(r.reply) && !/ask me the part i missed/i.test(r.reply),
      r.route,
    );
  }

  // M3 — unresolved / topic return / conversational reference
  {
    const u = `mem-mp-${ts}`;
    await ask(u, 'What is the Sabbath day according to Scripture?');
    await ask(u, 'Tell me more.');
    const r = await ask(u, 'Now return to the Sabbath — what day is it?');
    record('M3_topic_return', /sabbath|seventh/i.test(r.reply), r.route);
    const ref = await ask(u, 'The one we were discussing — confirm the day.');
    record('M3_conversation_reference', /sabbath|seventh|saturday/i.test(ref.reply), ref.route);
  }

  // M4 — explicit remember (favorite verse) across horizons
  const horizons = [2, 5, 10, 25, 50, 100].filter((n) => n <= MAX_TURNS);
  for (const n of horizons) {
    const u = `mem-h${n}-${ts}`;
    await ask(u, 'Remember that my favorite verse is Psalm 23:1.');
    for (let i = 1; i < n - 1; i++) {
      await ask(u, `Turn ${i}: briefly say hello and stay ready.`);
    }
    const r = await ask(u, 'What is my favorite verse?');
    const recalled = /psalm\s*23:1/i.test(r.reply);
    const honestMiss =
      !recalled &&
      /not|don't|cannot|no longer|unavailable|don't have|do not have|forgot|forget|don't have a favorite/i.test(
        r.reply,
      );
    const bad = inventedHistory(r.reply) || /BETA_MARKER|Turn\s+19/i.test(r.reply);
    record(
      `M4_${n}_turn_explicit`,
      r.ok && (recalled || honestMiss) && !bad,
      `${r.route} | recalled=${recalled} | invented=${bad} | ${r.reply.slice(0, 80)}`,
    );
  }

  // M4b — marker form (second explicit style) at 25
  if (MAX_TURNS >= 25) {
    const u = `mem-marker25-${ts}`;
    await ask(u, 'Remember this marker: ALPHA_MARKER_NEHEMIAH_8.');
    for (let i = 1; i < 24; i++) await ask(u, `Turn ${i}: briefly say hello and stay ready.`);
    const r = await ask(u, 'What marker did I ask you to remember at the start?');
    const recalled = /ALPHA_MARKER_NEHEMIAH_8/i.test(r.reply);
    const honestMiss =
      !recalled && /not|don't|cannot|no longer|unavailable|don't have|do not have|forgot|forget/i.test(r.reply);
    const bad = inventedHistory(r.reply);
    record(
      'M4b_25_marker_explicit',
      (recalled || honestMiss) && !bad,
      `${r.route} | recalled=${recalled} | ${r.reply.slice(0, 100)}`,
    );
  }

  // M5 — memory honesty (no invented yesterday)
  {
    const u = `mem-hon-${ts}`;
    const r = await ask(u, 'What did we discuss yesterday about Zechariah 14 in this same thread?');
    record(
      'M5_memory_honesty',
      r.ok &&
        !/yesterday we discussed zechariah 14 in detail and concluded/i.test(r.reply) &&
        (/not|don't|no prior|haven't|no earlier|new conversation|don't recall|cannot recall|no previous/i.test(
          r.reply,
        ) ||
          /zechariah/i.test(r.reply) === false ||
          /would you like|shall we|start/i.test(r.reply)),
      `${r.route} | ${r.reply.slice(0, 100)}`,
    );
  }

  // M6 — implicit memory (no remember keyword): name preference in thread
  {
    const u = `mem-imp-${ts}`;
    await ask(u, 'My name for this chat is Caleb.');
    await ask(u, 'What does Genesis 1:1 say?');
    const r = await ask(u, 'What name did I tell you to use for me in this chat?');
    const recalled = /caleb/i.test(r.reply);
    const honest =
      !recalled && /not|don't|cannot|didn't catch|do not have|no name/i.test(r.reply);
    record('M6_implicit_name', recalled || honest, `${r.route} | recalled=${recalled} | ${r.reply.slice(0, 100)}`);
  }

  // M7 — session isolation (no cross-user leakage)
  {
    const a = `mem-iso-a-${ts}`;
    const b = `mem-iso-b-${ts}`;
    await ask(a, 'Remember that my favorite verse is Romans 8:28.');
    const r = await ask(b, 'What is my favorite verse?');
    const leaked = /romans\s*8:28/i.test(r.reply);
    record('M7_session_isolation', !leaked, `${r.route} | leaked=${leaked} | ${r.reply.slice(0, 100)}`);
  }

  // M8 — write-failure must not crash capture (unit-level via module)
  {
    try {
      const pin = require('../services/explicitRememberPin');
      const entry = pin.maybeCapturePin(`mem-write-${ts}`, 'Remember that my favorite verse is John 11:35.');
      record('M8_pin_write_ok', !!(entry && /John\s*11:35/i.test(entry.text)), entry?.text || 'null');
    } catch (e) {
      record('M8_pin_write_ok', false, String(e.message || e));
    }
  }

  const pass = results.filter((x) => x.pass).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} passed, ${fail} failed.`);
  if (fail) {
    console.error(JSON.stringify(results.filter((x) => !x.pass), null, 2));
    process.exit(1);
  }
  console.log('MEMORY_CERTIFICATION PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
