/**
 * GATE 4 — Scripture Reasoning Certification (production matrix).
 * No doctrine expansion. Outcome checks against BUDDY_URL.
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
    route: structured?.runtime?.masterRoute || '',
    fallback: structured?.runtime?.fallbackErrorCode || null,
    ok: json.ok !== false,
  };
}

const results = [];
const CLARIFY = /are you asking about a bible passage|i want to make sure i answer the right thing|which book, topic, or passage/i;
const ASK_AGAIN = /ask your question again|trouble retrieving|trouble reaching the ai service|core_connection_error/i;

function record(id, pass, detail = '') {
  results.push({ id, pass, detail: String(detail).slice(0, 280) });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
}

function ok(r) {
  return r.ok && r.reply && !ASK_AGAIN.test(r.reply) && !r.fallback && !CLARIFY.test(r.reply);
}

async function main() {
  console.log(`Gate 4 Scripture Reasoning against ${BASE}\n`);
  const ts = Date.now();

  // A — Explicit references
  {
    const cases = [
      ['A_john316', 'What does John 3:16 say?', /john\s*3:16|loved the world|everlasting|eternal/i],
      ['A_genesis11', 'What does Genesis 1:1 say?', /genesis\s*1:1|beginning|created|heaven|earth/i],
      ['A_acts10', 'What happens in Acts 10?', /acts\s*10|peter|cornelius|vision|gentile/i],
      ['A_isaiah66', 'What does Isaiah 66:15-17 say?', /isaiah\s*66|swine|abomination|fire|judgment/i],
      ['A_eccl95', 'What does Ecclesiastes 9:5 say?', /ecclesiastes\s*9:5|dead|know|memory|forgotten/i],
      ['A_rev20', 'What does Revelation 20 say about the millennium and judgment?', /revelation\s*20|thousand|judgment|dead|lake/i],
      ['A_lev23', 'What does Leviticus 23 teach about appointed times?', /leviticus\s*23|sabbath|feast|appointed|holy/i],
      ['A_1cor15', 'What does 1 Corinthians 15 teach about resurrection?', /1\s*corinthians\s*15|resurrection|raised|dead/i],
      ['A_matt1240', 'What does Matthew 12:40 say?', /matthew\s*12:40|three days|three nights|jonas|jonah/i],
      ['A_luke2343', 'What does Luke 23:43 say?', /luke\s*23:43|paradise|today|thief|verily/i],
    ];
    for (const [id, q, re] of cases) {
      const r = await ask(`g4-${id}-${ts}`, q);
      record(id, ok(r) && re.test(r.reply), `${r.route} | ${r.reply.slice(0, 120)}`);
    }
  }

  // B — Resurrection timing (selected)
  {
    const r1 = await ask(`g4-rt1-${ts}`, 'Did Jesus rise Sunday morning?');
    record(
      'B_sunday_morning',
      ok(r1) &&
        /already risen|discovery|does not state|scripture (does not|silent)|first day|not say.*exact/i.test(r1.reply) &&
        !/^yes, jesus rose on sunday morning/i.test(r1.reply.trim()) &&
        !/dead know nothing|sleep until god raises/i.test(r1.reply),
      `${r1.route} | ${r1.reply.slice(0, 140)}`,
    );
    const r2 = await ask(`g4-rt2-${ts}`, 'How can Friday afternoon to Sunday morning be three days and three nights?');
    record(
      'B_three_days',
      ok(r2) && /matthew\s*12:40|three days and three nights/i.test(r2.reply),
      `${r2.route} | ${r2.reply.slice(0, 140)}`,
    );
    const r3 = await ask(
      `g4-rt3-${ts}`,
      'Does the first day describe the resurrection event itself or the discovery of the empty tomb?',
    );
    record(
      'B_discovery_vs_event',
      ok(r3) && /discovery|already risen|empty tomb|first day/i.test(r3.reply),
      `${r3.route} | ${r3.reply.slice(0, 140)}`,
    );
  }

  // C — Acts 10 / dietary
  {
    const u = `g4-acts-${ts}`;
    const c1 = await ask(u, 'Was Peter told to eat unclean animals as food permission? Yes or no?');
    record(
      'C_peter_eat_permission',
      ok(c1) && /\bno\b|vision|gentile|not about|unclean|common/i.test(c1.reply),
      `${c1.route} | ${c1.reply.slice(0, 140)}`,
    );
    const c2 = await ask(u, 'Does Acts 10 abolish the dietary law? Yes or no?');
    record(
      'C_acts10_abolish',
      ok(c2) &&
        /\bno\b|does not|doesn't|not abolish|gentile|people/i.test(c2.reply) &&
        !/\byes\b.*abolish/i.test(c2.reply),
      `${c2.route} | ${c2.reply.slice(0, 140)}`,
    );
    const c3 = await ask(u, 'Compare Acts 10 with Peter’s own explanation of the vision.');
    record(
      'C_peter_interpretation',
      ok(c3) && /acts\s*10|peter|gentile|no respecter|common or unclean/i.test(c3.reply),
      `${c3.route} | ${c3.reply.slice(0, 140)}`,
    );
    const c4 = await ask(u, 'Compare Acts 10 with Isaiah 66:17 about eating swine.');
    record(
      'C_compare_isaiah66',
      ok(c4) && /isaiah|66|swine|acts\s*10/i.test(c4.reply),
      `${c4.route} | ${c4.reply.slice(0, 140)}`,
    );
  }

  // D — Isaiah 66
  {
    const r = await ask(
      `g4-isa-${ts}`,
      'In Isaiah 66:17, is eating swine’s flesh presented as approved or judged? Distinguish Scripture from later history.',
    );
    record(
      'D_isaiah66_judgment',
      ok(r) && /isaiah|66|swine|abomination|consumed|judgment|end/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // E — Sabbath
  {
    const u = `g4-sab-${ts}`;
    const e1 = await ask(u, 'What day is the Sabbath according to Scripture?');
    record(
      'E_sabbath_day',
      ok(e1) && /seventh|sabbath|exodus|genesis/i.test(e1.reply),
      `${e1.route} | ${e1.reply.slice(0, 140)}`,
    );
    const e2 = await ask(u, 'Did Jesus keep the Sabbath according to Scripture?');
    record(
      'E_jesus_sabbath',
      ok(e2) && /sabbath|luke|custom|synagogue|matthew|mark/i.test(e2.reply),
      `${e2.route} | ${e2.reply.slice(0, 140)}`,
    );
    const e3 = await ask(
      u,
      'When was Sunday worship historically elevated, and is that the same as a biblical Sabbath change?',
    );
    record(
      'E_history_vs_scripture',
      ok(e3) &&
        (/histor|tradition|century|constantine|rome|later/i.test(e3.reply) ||
          /scripture|sabbath|seventh/i.test(e3.reply)) &&
        !(/scripture commands sunday as the sabbath/i.test(e3.reply)),
      `${e3.route} | ${e3.reply.slice(0, 160)}`,
    );
  }

  // F — State of the dead (must not be hijacked by Gospel-discovery timing lane)
  {
    const r = await ask(`g4-dead-${ts}`, 'According to Scripture, what is the state of the dead before resurrection?');
    record(
      'F_state_of_dead',
      ok(r) &&
        !/resurrection_timing_source_grounded/i.test(r.route) &&
        /dead|sleep|grave|resurrection/i.test(r.reply) &&
        /(ecclesiastes|know not|know nothing|psalm|asleep|thessalonians|john 11|daniel)/i.test(r.reply) &&
        !/already risen when the first day began|discovery of the empty tomb is not the resurrection event itself/i.test(
          r.reply,
        ),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // G — Prayer
  {
    const u = `g4-pray-${ts}`;
    const g1 = await ask(u, 'How should we pray according to Jesus’ teaching?');
    record(
      'G_how_to_pray',
      ok(g1) && /pray|father|matthew|luke|amen|hallowed/i.test(g1.reply),
      `${g1.route} | ${g1.reply.slice(0, 140)}`,
    );
    const g2 = await ask(u, 'I feel anxious — can you pray with me for peace?');
    record(
      'G_emotional_prayer',
      ok(g2) && /pray|father|peace|amen|lord/i.test(g2.reply),
      `${g2.route} | ${g2.reply.slice(0, 140)}`,
    );
  }

  // H — Original language
  {
    const r = await ask(`g4-ol-${ts}`, 'What does the Greek word agape mean in John 3:16?');
    record(
      'H_agape',
      ok(r) && /agape|ἀγάπη|love|greek/i.test(r.reply) && !/hebrew word agape/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // I — Continuation / correction
  {
    const u = `g4-cont-${ts}`;
    await ask(u, 'What does John 3:16 say?');
    const g = await ask(u, 'Go deeper.');
    record(
      'I_go_deeper',
      ok(g) && /john|world|believe|son|love/i.test(g.reply) && !/acts 10:14 shows peter still refused unclean food/i.test(g.reply),
      `${g.route} | ${g.reply.slice(0, 140)}`,
    );
    const u2 = `g4-corr-${ts}`;
    await ask(u2, 'What does Isaiah 66:17 say?');
    const c = await ask(u2, 'No, I meant Acts 10, not Isaiah 66.');
    record(
      'I_correction_acts_not_isaiah',
      ok(c) && /acts\s*10/i.test(c.reply) && !(/^only isaiah/i.test(c.reply) && !/acts/i.test(c.reply)),
      `${c.route} | ${c.reply.slice(0, 140)}`,
    );
  }

  // J — Multi-part Scripture
  {
    const r = await ask(
      `g4-mp-${ts}`,
      'Two questions: What does Genesis 1:1 say, and what does John 3:16 say?',
    );
    record(
      'J_multipart_two_refs',
      ok(r) &&
        /genesis\s*1:1|beginning|created/i.test(r.reply) &&
        /john\s*3:16|loved the world|everlasting|believ/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 160)}`,
    );
    const r2 = await ask(
      `g4-mp3-${ts}`,
      'Three parts: (1) What day is the Sabbath? (2) What does Ecclesiastes 9:5 say? (3) Does Acts 10 make pork clean?',
    );
    record(
      'J_multipart_three',
      ok(r2) &&
        /sabbath|seventh/i.test(r2.reply) &&
        /ecclesiastes|dead|know/i.test(r2.reply) &&
        /acts\s*10|pork|unclean|gentile/i.test(r2.reply),
      `${r2.route} | ${r2.reply.slice(0, 180)}`,
    );
  }

  const pass = results.filter((x) => x.pass).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} passed, ${fail} failed.`);
  if (fail) {
    console.error(JSON.stringify(results.filter((x) => !x.pass), null, 2));
    process.exit(1);
  }
  console.log('SCRIPTURE_REASONING_CERTIFICATION PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
