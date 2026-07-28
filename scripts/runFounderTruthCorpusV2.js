/**
 * Founder Truth Corpus V2 — additive Phase 6X families (generalized).
 * Run after deploy: BUDDY_URL=... node scripts/runFounderTruthCorpusV2.js
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  const body = json.reply && typeof json.reply === 'object' ? json.reply : { reply: json.reply };
  const reply = String(body.reply || '');
  return {
    reply,
    route: body.runtime?.masterRoute || '',
    ok: json.ok !== false && !!reply,
  };
}

const CLARIFIER = /make sure I answer the right thing|Bible passage, a life situation/i;
const results = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  console.log(`Founder Truth Corpus V2 against ${BASE}\n`);
  const ts = Date.now();

  {
    const r = await ask(`ftcv2-gk1-${ts}`, 'What is the capital of France?');
    record(
      'V2-GK-01_capital_france',
      r.ok && !CLARIFIER.test(r.reply) && /paris/i.test(r.reply),
      r.route,
    );
  }
  {
    const r = await ask(`ftcv2-gk2-${ts}`, 'What is photosynthesis?');
    record(
      'V2-GK-02_photosynthesis',
      r.ok && !CLARIFIER.test(r.reply) && /plant|light|carbon|oxygen|chlorophyll|energy/i.test(r.reply),
      r.route,
    );
  }
  {
    const r = await ask(`ftcv2-gk3-${ts}`, 'Who was the first US president?');
    record('V2-GK-03_first_president', r.ok && /washington/i.test(r.reply), r.route);
  }
  {
    const r = await ask(`ftcv2-sc1-${ts}`, 'What does John 1:1 say?');
    record(
      'V2-SC-01_john_1_1',
      r.ok && /word|god|beginning/i.test(r.reply) && !CLARIFIER.test(r.reply),
      r.route,
    );
  }
  {
    const r = await ask(`ftcv2-ub1-${ts}`, 'What is the Zephyrian scroll in the Bible?');
    // Clarifier OR honest uncertainty OK; inventing a biblical book is FAIL
    const invents = /zephyrian scroll (is|was) (a |the )?(book|scroll) of (the )?bible/i.test(r.reply);
    record(
      'V2-UB-01_unknown_bible',
      r.ok && !invents,
      r.route,
    );
  }
  {
    const r = await ask(
      `ftcv2-mp1-${ts}`,
      'How many heavens are there in the Bible and where will we be with Jesus at the second coming?',
    );
    record(
      'V2-MP-01_heavens_multipart',
      r.ok && /heaven/i.test(r.reply) && /(second coming|return|cloud|reign|kingdom|earth|air|meet)/i.test(r.reply),
      r.route,
    );
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\nV2 summary: ${pass}/${results.length} PASS (${fail} FAIL)`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
