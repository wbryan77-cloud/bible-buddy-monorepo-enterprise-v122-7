/**
 * CORE_COMPANION_RECOVERY — permanent Founder multi-turn regression corpus.
 * Outcome checks (not route-only). Exit 0 = pass.
 *
 * BUDDY_URL overrides base (default localhost:PORT||3000).
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  const reply = json.reply?.reply || json.reply || '';
  return {
    message,
    reply: String(reply),
    route: json.reply?.runtime?.masterRoute || '',
    fallback: json.reply?.runtime?.fallbackErrorCode || null,
    ok: !!json.ok,
  };
}

function fail(id, detail) {
  return { id, pass: false, detail };
}
function pass(id, detail = '') {
  return { id, pass: true, detail };
}

async function main() {
  const results = [];
  const user = `founder-corpus-${Date.now()}`;

  // A — App identity + continuation
  const a1 = await ask(user, 'What does the app do?');
  results.push(
    /biblebuddy|scripture|companion|pray|bible/i.test(a1.reply) &&
      !/ask your question again/i.test(a1.reply)
      ? pass('A1_app_identity', a1.route)
      : fail('A1_app_identity', a1.reply.slice(0, 160)),
  );
  const a2 = await ask(user, 'Tell me more.');
  results.push(
    !/ask your question again|trouble retrieving|core_connection/i.test(a2.reply) &&
      !a2.fallback &&
      /bible|pray|scripture|situation|question/i.test(a2.reply)
      ? pass('A2_tell_me_more', a2.route)
      : fail('A2_tell_me_more', `${a2.route} | ${a2.reply.slice(0, 160)}`),
  );
  const a3 = await ask(user, 'Go deeper.');
  results.push(
    !/ask your question again/i.test(a3.reply) && !a3.fallback
      ? pass('A3_go_deeper', a3.route)
      : fail('A3_go_deeper', a3.reply.slice(0, 160)),
  );

  // B — Multi-part heavens / second coming
  const bUser = `${user}-heavens`;
  const b1 = await ask(
    bUser,
    'How many heavens are there in the Bible and where will we be with Jesus at the second coming?',
  );
  const answersBoth =
    /heaven/i.test(b1.reply) &&
    /(second coming|return|come|cloud|reign|kingdom|earth|air|meet)/i.test(b1.reply) &&
    !/ask your question again/i.test(b1.reply);
  results.push(answersBoth ? pass('B1_multipart_heavens', b1.route) : fail('B1_multipart_heavens', b1.reply.slice(0, 220)));

  // C — Sabbath then current-message wins (resurrection)
  const cUser = `${user}-switch`;
  await ask(cUser, 'What is the Sabbath and how should we keep it?');
  const c2 = await ask(cUser, 'When did Jesus rise according to Matthew 28?');
  const sabbathLeak = /sabbath|seventh day|friday sunset/i.test(c2.reply) && !/matthew\s*28|risen|tomb|women/i.test(c2.reply);
  const onResurrection = /matthew|28|risen|tomb|women|dawn|first day/i.test(c2.reply);
  results.push(
    onResurrection && !sabbathLeak && !/ask your question again/i.test(c2.reply)
      ? pass('C2_current_message_wins', c2.route)
      : fail('C2_current_message_wins', c2.reply.slice(0, 220)),
  );

  // D — Scripture silence / no invented timestamp
  const dUser = `${user}-silence`;
  const d1 = await ask(dUser, 'Does Matthew 28 say the exact moment Jesus rose from the dead? Yes or no?');
  const silenceOk =
    /\bno\b|does not|doesn't|not explicitly|does not state|not say the exact|silence|does not reveal/i.test(d1.reply) &&
    !/ask your question again/i.test(d1.reply);
  results.push(silenceOk ? pass('D1_scripture_silence', d1.route) : fail('D1_scripture_silence', d1.reply.slice(0, 220)));

  // E — Prayer + better prayer
  const eUser = `${user}-prayer`;
  const e1 = await ask(eUser, 'Can you pray with me?');
  results.push(/pray|father|lord|amen/i.test(e1.reply) ? pass('E1_prayer', e1.route) : fail('E1_prayer', e1.reply.slice(0, 120)));
  const e2 = await ask(eUser, 'I need a better prayer');
  results.push(
    /pray|father|lord|amen/i.test(e2.reply) && !/ask your question again/i.test(e2.reply)
      ? pass('E2_better_prayer', e2.route)
      : fail('E2_better_prayer', e2.reply.slice(0, 120)),
  );

  // F — Correction tone (no generic ask-again)
  const fUser = `${user}-corr`;
  await ask(fUser, 'What does Matthew 28 say about the resurrection?');
  const f2 = await ask(fUser, 'That verse does not say the exact time He rose.');
  results.push(
    !/ask your question again in one short sentence/i.test(f2.reply) &&
      /matthew|28|risen|tomb|women|exact|moment|time|does not|doesn't/i.test(f2.reply)
      ? pass('F2_correction_stays_on_topic', f2.route)
      : fail('F2_correction_stays_on_topic', f2.reply.slice(0, 220)),
  );

  // G — Companion presence
  const g1 = await ask(`${user}-nervous`, "I'm nervous about tomorrow.");
  results.push(
    /nervous|hear|with you|breath|weighing/i.test(g1.reply) && !/ask your question again/i.test(g1.reply)
      ? pass('G1_presence', g1.route)
      : fail('G1_presence', g1.reply.slice(0, 120)),
  );

  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.id}${r.detail ? ' — ' + r.detail : ''}`);
  }
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
  if (failed.length) {
    console.error('Failures:', JSON.stringify(failed, null, 2));
    process.exit(1);
  }
  console.log('Founder multi-turn corpus PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
