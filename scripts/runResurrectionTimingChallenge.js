/**
 * CERTIFICATION_V5 — Resurrection timing deep challenge + Founder acceptance probes.
 * Run against BUDDY_URL (production preferred).
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  return {
    message,
    reply: String(json.reply?.reply || json.reply || ''),
    route: json.reply?.runtime?.masterRoute || '',
    ok: json.ok !== false,
  };
}

const results = [];
function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + detail.slice(0, 160) : ''}`);
}

function has(r, re) {
  return re.test(r.reply);
}
function badDeathSleep(r) {
  return /dead know nothing|sleep until god raises|1 corinthians 15; 1 thessalonians 4:13-16; daniel 12:2; john 11:25/i.test(
    r.reply,
  );
}

async function main() {
  console.log(`Resurrection / Founder challenge against ${BASE}\n`);
  const ts = Date.now();

  {
    const r = await ask(`v5-rt-1-${ts}`, 'Was the resurrection on Sunday, or was Jesus already risen before the first day came?');
    record(
      'RT1_sunday_vs_already_risen',
      r.ok &&
        !badDeathSleep(r) &&
        has(r, /already risen|discovery|first day/i) &&
        has(r, /matthew\s*28|mark\s*16|luke\s*24|john\s*20/i) &&
        !has(r, /yes, jesus rose on the first day of the week, which is commonly understood as sunday/i),
      `${r.route} | ${r.reply.slice(0, 200)}`,
    );
  }

  {
    const r = await ask(`v5-rt-2-${ts}`, 'Did Jesus rise Sunday morning?');
    record(
      'RT2_sunday_morning',
      r.ok &&
        !badDeathSleep(r) &&
        has(r, /already risen|discovery|does not state|scripture (does not|silent)|first day/i) &&
        !/^yes, jesus rose on sunday morning/i.test(r.reply.trim()),
      `${r.route} | ${r.reply.slice(0, 200)}`,
    );
  }

  {
    const r = await ask(`v5-rt-3-${ts}`, 'Was he already risen when Mary reached the tomb?');
    record(
      'RT3_already_risen_at_discovery',
      r.ok && has(r, /\byes\b|already risen/i) && !has(r, /was not yet risen when mary reached/i) && !badDeathSleep(r),
      `${r.route} | ${r.reply.slice(0, 200)}`,
    );
  }

  {
    const r = await ask(
      `v5-rt-4-${ts}`,
      'Does the first day describe the resurrection or the discovery of the empty tomb?',
    );
    record(
      'RT4_discovery_vs_event',
      r.ok && has(r, /discovery/i) && !badDeathSleep(r),
      `${r.route} | ${r.reply.slice(0, 200)}`,
    );
  }

  {
    const r = await ask(`v5-rt-5-${ts}`, 'How can Friday afternoon to Sunday morning be three days and three nights?');
    record(
      'RT5_three_days',
      r.ok && has(r, /matthew\s*12:40|three days and three nights/i) && !badDeathSleep(r),
      `${r.route} | ${r.reply.slice(0, 200)}`,
    );
  }

  // Multi-turn memory + contradiction
  {
    const u = `v5-rt-seq-${ts}`;
    await ask(u, 'Was the resurrection on Sunday, or was Jesus already risen before the first day came?');
    const c = await ask(u, 'You just said he was already risen, so why are you also saying he rose Sunday?');
    record(
      'RT6_contradiction_challenge',
      c.ok && !/ask me the part i missed|ask your question again/i.test(c.reply) && !badDeathSleep(c),
      `${c.route} | ${c.reply.slice(0, 200)}`,
    );
    const g = await ask(u, 'Go deeper.');
    record(
      'RT7_go_deeper_stays',
      g.ok &&
        !/acts 10:14 shows peter still refused unclean food/i.test(g.reply) &&
        /risen|tomb|matthew|discovery|first day|scripture/i.test(g.reply),
      `${g.route} | ${g.reply.slice(0, 200)}`,
    );
  }

  // John 3:16 go deeper must not dump Acts 10
  {
    const u = `v5-jd-${ts}`;
    await ask(u, 'What does John 3:16 say?');
    const g = await ask(u, 'Go deeper.');
    record(
      'JD1_go_deeper_not_acts10',
      g.ok && !/acts 10:14 shows peter still refused unclean food/i.test(g.reply),
      `${g.route} | ${g.reply.slice(0, 200)}`,
    );
  }

  const pass = results.filter((x) => x.pass).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} passed, ${fail} failed.`);
  if (fail) {
    console.error(JSON.stringify(results.filter((x) => !x.pass), null, 2));
    process.exit(1);
  }
  console.log('RESURRECTION_TIMING_CHALLENGE PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
