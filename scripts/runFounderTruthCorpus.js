/**
 * PERMANENT FOUNDER TRUTH CORPUS — Release Candidate v4.0
 *
 * Outcome checks against production (or BUDDY_URL). Not route-only.
 * Covers recovery families + Founder Manual Guide / historical failure families.
 */
const BASE = process.env.BUDDY_URL || `http://localhost:${process.env.PORT || 3000}`;

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  const reply = String(json.reply?.reply || json.reply || '');
  return {
    message,
    reply,
    route: json.reply?.runtime?.masterRoute || '',
    fallback: json.reply?.runtime?.fallbackErrorCode || null,
    ok: json.ok !== false,
  };
}

const ASK_AGAIN = /ask your question again|trouble retrieving|which bible topic/i;
const results = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + detail : ''}`);
}

function okReply(r) {
  return r.ok && r.reply && !ASK_AGAIN.test(r.reply) && !r.fallback;
}

async function main() {
  console.log(`Founder Truth Corpus against ${BASE}\n`);
  const ts = Date.now();

  // --- A Identity / continuation ---
  {
    const u = `ftc-a-${ts}`;
    const a1 = await ask(u, 'What does the app do?');
    record('A1_identity', okReply(a1) && /biblebuddy|scripture|companion|pray/i.test(a1.reply), a1.route);
    const a2 = await ask(u, 'Tell me more.');
    record('A2_tell_me_more', okReply(a2) && /bible|pray|scripture|situation/i.test(a2.reply), a2.route);
    const a3 = await ask(u, 'Go deeper.');
    record('A3_go_deeper', okReply(a3), a3.route);
  }

  // --- B Multi-part ---
  {
    const r = await ask(`ftc-b-${ts}`, 'How many heavens are there in the Bible and where will we be with Jesus at the second coming?');
    record(
      'B1_heavens_multipart',
      okReply(r) && /heaven/i.test(r.reply) && /(second coming|return|cloud|reign|kingdom|earth|air|meet)/i.test(r.reply),
      r.route,
    );
  }

  // --- C Current message wins ---
  {
    const u = `ftc-c-${ts}`;
    await ask(u, 'What is the Sabbath and how should we keep it?');
    const r = await ask(u, 'When did Jesus rise according to Matthew 28?');
    const sabbathOnly = /sabbath|seventh day/i.test(r.reply) && !/matthew|28|risen|tomb|women/i.test(r.reply);
    record('C1_current_message_wins', okReply(r) && /matthew|28|risen|tomb|women/i.test(r.reply) && !sabbathOnly, r.route);
  }

  // --- D Scripture silence ---
  {
    const r = await ask(`ftc-d-${ts}`, 'Does Matthew 28 say the exact moment Jesus rose from the dead? Yes or no?');
    record(
      'D1_scripture_silence',
      okReply(r) && /\bno\b|does not|doesn't|not explicitly|not say the exact|does not reveal/i.test(r.reply),
      r.route,
    );
  }

  // --- E Prayer ---
  {
    const u = `ftc-e-${ts}`;
    const e1 = await ask(u, 'Can you pray with me?');
    record('E1_prayer', okReply(e1) && /pray|father|lord|amen/i.test(e1.reply), e1.route);
    const e2 = await ask(u, 'I need a better prayer');
    record('E2_better_prayer', okReply(e2) && /pray|father|lord|amen/i.test(e2.reply), e2.route);
  }

  // --- F Correction ---
  {
    const u = `ftc-f-${ts}`;
    await ask(u, 'What does Matthew 28 say about the resurrection?');
    const r = await ask(u, 'That verse does not say the exact time He rose.');
    record(
      'F1_correction_matthew28',
      okReply(r) && /matthew|28|exact|moment|time|does not|doesn't|risen|tomb/i.test(r.reply),
      r.route,
    );
  }

  // --- G Presence ---
  {
    const r = await ask(`ftc-g-${ts}`, "I'm nervous about tomorrow.");
    record('G1_presence', okReply(r) && /nervous|hear|with you|breath|weighing/i.test(r.reply), r.route);
  }

  // --- H Acts 10 / dietary (historical Founder family — previously uncovered) ---
  {
    const u = `ftc-h-${ts}`;
    const h1 = await ask(u, 'Does Acts 10 make pork clean? Yes or no?');
    const deniesClean =
      /\bno\b|does not|doesn't|not make pork|not about food|gentile|people/i.test(h1.reply) &&
      !/\byes\b.*pork.*(clean|ok|allowed)/i.test(h1.reply);
    const openerClean =
      !/Staying with Scripture,\s+with Scripture/i.test(h1.reply) &&
      !/Staying Scripture answers/i.test(h1.reply);
    record(
      'H1_acts10_pork',
      okReply(h1) && deniesClean && openerClean,
      `${h1.route} | ${h1.reply.slice(0, 140)}`,
    );

    const h2 = await ask(u, 'You did not answer my question about pork.');
    const h2Ok =
      okReply(h2) &&
      /\bno\b/i.test(h2.reply) &&
      /acts\s*10/i.test(h2.reply) &&
      /pork|unclean|swine/i.test(h2.reply) &&
      !/ask me the part i missed/i.test(h2.reply) &&
      !/^No\.\s+Staying with Scripture,\s+You are right/i.test(h2.reply);
    record('H2_pork_correction', h2Ok, `${h2.route} | ${h2.reply.slice(0, 160)}`);

    const h3 = await ask(u, 'What about Isaiah 66:17?');
    record(
      'H3_isaiah66',
      okReply(h3) && /isaiah|66|swine|abomination|eat/i.test(h3.reply),
      `${h3.route} | ${h3.reply.slice(0, 140)}`,
    );
  }

  // --- I Decision ownership ---
  {
    const r = await ask(`ftc-i-${ts}`, 'Decision');
    record(
      'I1_decision_bare',
      okReply(r) && /decision|choice|facing|tell me/i.test(r.reply) && !/sabbath|pork|acts 10/i.test(r.reply),
      r.route,
    );
  }

  // --- J Stop release ---
  {
    const u = `ftc-j-${ts}`;
    await ask(u, 'What is the Sabbath?');
    const r = await ask(u, 'Stop.');
    record('J1_stop', okReply(r) && /stop|topic|talk about now/i.test(r.reply), r.route);
  }

  // --- K False appearance claim ---
  {
    const r = await ask(
      `ftc-k-${ts}`,
      'Based on Revelation 1:14-15, does Scripture say Jesus is white with blue eyes and fine straight hair? Yes or no?',
    );
    record(
      'K1_appearance_contradicted',
      okReply(r) && /\bno\b|opposite|does not|wool|flame/i.test(r.reply),
      r.route,
    );
  }

  // --- L Explicit Scripture fidelity ---
  {
    const r = await ask(`ftc-l-${ts}`, 'What does John 3:16 say?');
    record(
      'L1_john316',
      okReply(r) && /john\s*3:16|loved the world|everlasting|eternal life|believ/i.test(r.reply),
      r.route,
    );
  }

  // --- M Rapid topic change ---
  {
    const u = `ftc-m-${ts}`;
    await ask(u, 'Tell me about the Sabbath.');
    const r = await ask(u, 'Now answer only this: Can you pray with me?');
    record(
      'M1_rapid_topic_to_prayer',
      okReply(r) && /pray|father|lord|amen/i.test(r.reply) && !(/sabbath/i.test(r.reply) && !/pray/i.test(r.reply)),
      r.route,
    );
  }

  // --- N "You contradicted yourself" ---
  {
    const u = `ftc-n-${ts}`;
    await ask(u, 'Does Matthew 28 give the exact second Jesus rose?');
    const r = await ask(u, 'You are contradicting yourself.');
    record(
      'N1_contradiction_challenge',
      okReply(r) && !ASK_AGAIN.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- O State of the dead (historical doctrine family) ---
  {
    const r = await ask(`ftc-o-${ts}`, 'What is the state of the dead according to Scripture?');
    record(
      'O1_state_of_the_dead',
      okReply(r) &&
        /dead|death|sleep|grave|resurrection/i.test(r.reply) &&
        /(ecclesiastes|know not|know nothing|psalm 146|asleep|1 thessalonians|john 11)/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- P Sabbath doctrine (not only as stale-state setup) ---
  {
    const r = await ask(`ftc-p-${ts}`, 'What is the Sabbath day according to Scripture?');
    record(
      'P1_sabbath_doctrine',
      okReply(r) && /sabbath|seventh|exodus|genesis/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- Q Original language (Founder Manual Guide) ---
  {
    const r = await ask(`ftc-q-${ts}`, 'What does the Greek word agape mean in John 3:16?');
    record(
      'Q1_greek_agape_john316',
      okReply(r) &&
        /agape|ἀγάπη|love|greek/i.test(r.reply) &&
        !/hebrew word agape/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- R Historical context ---
  {
    const r = await ask(`ftc-r-${ts}`, 'What is the historical context of Daniel 3?');
    record(
      'R1_historical_daniel3',
      okReply(r) && /daniel|babylon|nebuchadnezzar|furnace|shadrach|meshach|abednego/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- S Memory / forget request ---
  {
    const u = `ftc-s-${ts}`;
    await ask(u, 'Please remember that I prefer direct answers.');
    const r = await ask(u, 'Can you forget what I told you?');
    record(
      'S1_memory_forget_request',
      okReply(r) && !ASK_AGAIN.test(r.reply) && /forget|memory|remember|privacy|cannot|don't store|session|clear/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- T Repeated question ---
  {
    const u = `ftc-t-${ts}`;
    await ask(u, 'What does John 3:16 say?');
    const r = await ask(u, 'What does John 3:16 say?');
    record(
      'T1_repeated_question',
      okReply(r) && /john\s*3:16|loved the world|everlasting|eternal life|believ/i.test(r.reply),
      r.route,
    );
  }

  // --- U Long conversation continuity (5 turns) ---
  {
    const u = `ftc-u-${ts}`;
    await ask(u, 'What does the app do?');
    await ask(u, 'Tell me more.');
    await ask(u, 'Can you pray with me?');
    await ask(u, 'What is the Sabbath day according to Scripture?');
    const r = await ask(u, 'Now answer only this: When did Jesus rise according to Matthew 28?');
    const sabbathOnly = /sabbath|seventh day/i.test(r.reply) && !/matthew|28|risen|tomb|women/i.test(r.reply);
    record(
      'U1_long_conversation_current_intent',
      okReply(r) && /matthew|28|risen|tomb|women/i.test(r.reply) && !sabbathOnly,
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- V Scripture silence vs explicit claim categories ---
  {
    const silence = await ask(
      `ftc-v-silence-${ts}`,
      'Does Matthew 28 say the exact clock time Jesus rose? Yes or no?',
    );
    record(
      'V1_claim_scripture_silent',
      okReply(silence) && /\bno\b|does not|doesn't|not say|not explicitly|silence/i.test(silence.reply),
      silence.route,
    );
    const explicit = await ask(`ftc-v-explicit-${ts}`, 'Quote John 3:16.');
    record(
      'V2_claim_explicit_scripture',
      okReply(explicit) && /john\s*3:16|loved the world|believ/i.test(explicit.reply),
      explicit.route,
    );
  }

  // --- W OpenAI healthy-path (no provider fall-through on normal doctrine) ---
  {
    const r = await ask(`ftc-w-${ts}`, 'Does Acts 10 make pork clean? Yes or no?');
    record(
      'W1_no_openai_ask_again_on_doctrine',
      okReply(r) && !ASK_AGAIN.test(r.reply) && !r.fallback,
      `${r.route} | fallback=${r.fallback}`,
    );
  }

  // --- X Hallucination correction / false appearance ---
  {
    const r = await ask(
      `ftc-x-${ts}`,
      "Doesn't the Bible say Jesus had white skin and blue eyes?",
    );
    record(
      'X1_hallucination_correction_appearance',
      okReply(r) && /\bno\b|does not|doesn't|not say|revelation|wool|flame|scripture/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- Y IOG/ICOJ: approved evidence must not replace Scripture authority ---
  {
    const r = await ask(`ftc-y-${ts}`, 'According to Scripture, what is the state of the dead?');
    const inventsOrgAsCanon = /\b(IOG|ICOJ)\b.*\b(says|teaches|proves)\b.*\b(scripture|bible)\b/i.test(r.reply);
    record(
      'Y1_evidence_does_not_replace_scripture',
      okReply(r) &&
        /ecclesiastes|psalm|john 11|thessalonians|dead|sleep|resurrection/i.test(r.reply) &&
        !inventsOrgAsCanon,
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  // --- Z College major silence (Founder Manual Guide — Scripture silent) ---
  {
    const r = await ask(`ftc-z-${ts}`, 'What does the Bible say about which college major I should choose?');
    record(
      'Z1_scripture_silent_college_major',
      okReply(r) &&
        (/(does not|doesn't|not specifically|not explicitly|scripture (is )?silent|no specific verse|no verse names)/i.test(
          r.reply,
        ) ||
          /make sure i answer|bible passage|life situation|clarify/i.test(r.reply)),
      `${r.route} | ${r.reply.slice(0, 140)}`,
    );
  }

  const pass = results.filter((x) => x.pass).length;
  const fail = results.length - pass;
  console.log(`\n${pass}/${results.length} passed, ${fail} failed.`);
  if (fail) {
    console.error(
      'Failures:',
      JSON.stringify(
        results.filter((x) => !x.pass),
        null,
        2,
      ),
    );
    process.exit(1);
  }
  console.log('FOUNDER_TRUTH_CORPUS PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
