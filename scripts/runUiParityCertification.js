/**
 * GATE 7 — UI / API / Production parity
 * Compares production /buddy/chat vs /buddy/stream (+ optional UI HTML presence).
 * Semantic equivalence required — not byte-identical language.
 */
const BASE = (process.env.BUDDY_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com').replace(
  /\/$/,
  '',
);

const results = [];
function record(id, pass, detail = '') {
  results.push({ id, pass, detail: String(detail).slice(0, 320) });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + String(detail).slice(0, 180) : ''}`);
}

function extractStructured(json) {
  const structured = json?.reply && typeof json.reply === 'object' ? json.reply : null;
  return {
    reply: String(structured?.reply || json?.reply || ''),
    route: structured?.runtime?.masterRoute || '',
    flags: structured?.admin_flags || [],
    fallback: structured?.runtime?.fallbackErrorCode || null,
    ok: json?.ok !== false,
  };
}

async function chat(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  return { http: res.status, ...extractStructured(json) };
}

async function stream(userId, message) {
  const res = await fetch(`${BASE}/buddy/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const text = await res.text();
  // Parse SSE done event
  let done = null;
  const blocks = text.split('\n\n');
  for (const block of blocks) {
    if (!block.includes('event: done')) continue;
    const dataLine = block.split('\n').find((l) => l.startsWith('data: '));
    if (!dataLine) continue;
    try {
      done = JSON.parse(dataLine.slice(6));
    } catch (_) {
      /* ignore */
    }
  }
  const reply = String(done?.reply || '');
  return {
    http: res.status,
    reply,
    route: done?.runtime?.masterRoute || '',
    flags: done?.admin_flags || [],
    fallback: done?.runtime?.fallbackErrorCode || null,
    ok: res.ok && !!reply,
    rawLen: text.length,
  };
}

function sameFamily(a, b) {
  // Same substantive lane family (not requiring identical masterRoute string)
  const fam = (r) => {
    const x = String(r || '').toLowerCase();
    if (/bible_wide|explicit/.test(x)) return 'scripture';
    if (/doctrine|final_authority|source_grounded|resurrection_timing/.test(x)) return 'doctrine';
    if (/prayer|phase5k/.test(x)) return 'prayer';
    if (/identity|phase5l_app/.test(x)) return 'identity';
    if (/reason_first|openai/.test(x)) return 'openai';
    if (/revision|correction|continuation|conversation_owner/.test(x)) return 'revision';
    if (/clarification/.test(x)) return 'clarify';
    if (/connection_error|fallback/.test(x)) return 'error';
    return x || 'other';
  };
  return fam(a) === fam(b) || (!a && !b);
}

function sharesConclusion(chatReply, streamReply, needles) {
  return needles.every((re) => re.test(chatReply) || re.test(streamReply))
    ? needles.some((re) => re.test(chatReply)) && needles.some((re) => re.test(streamReply))
    : needles.every((re) => re.test(chatReply) && re.test(streamReply));
}

async function main() {
  console.log(`Gate 7 UI/API/Production Parity against ${BASE}\n`);
  const ts = Date.now();

  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json();
  const releaseCommit = health?.health?.releaseCommit || '';
  record('H_health_ok', health?.health?.ok === true && !!releaseCommit, JSON.stringify(health.health).slice(0, 160));

  // App identity
  {
    const u = `g7-id-${ts}`;
    const c = await chat(u, 'What does this app do?');
    const s = await stream(`${u}-s`, 'What does this app do?');
    record(
      'S_app_identity_chat_stream',
      c.ok &&
        s.ok &&
        /bible|companion|scripture|study|prayer/i.test(c.reply) &&
        /bible|companion|scripture|study|prayer/i.test(s.reply) &&
        !/core_connection_error/i.test(c.route + s.route),
      `chat=${c.route} stream=${s.route}`,
    );
  }

  // Explicit Scripture
  {
    const u = `g7-john-${ts}`;
    const c = await chat(u, 'What does John 3:16 say?');
    const s = await stream(`${u}-s`, 'What does John 3:16 say?');
    record(
      'S_john316_chat_stream',
      c.ok &&
        s.ok &&
        /john\s*3:16|loved the world|everlasting|eternal/i.test(c.reply) &&
        /john\s*3:16|loved the world|everlasting|eternal/i.test(s.reply) &&
        sameFamily(c.route, s.route),
      `chat=${c.route} stream=${s.route}`,
    );
  }

  // Doctrine
  {
    const u = `g7-sab-${ts}`;
    const c = await chat(u, 'What day is the biblical Sabbath?');
    const s = await stream(`${u}-s`, 'What day is the biblical Sabbath?');
    record(
      'S_sabbath_chat_stream',
      c.ok &&
        s.ok &&
        /seventh|sabbath|exodus|genesis/i.test(c.reply) &&
        /seventh|sabbath|exodus|genesis/i.test(s.reply),
      `chat=${c.route} stream=${s.route}`,
    );
  }

  // Go deeper continuity (chat session)
  {
    const u = `g7-deep-${ts}`;
    await chat(u, 'What does John 3:16 say?');
    const g = await chat(u, 'Go deeper.');
    record(
      'S_go_deeper_same_session',
      g.ok && /john|world|believe|son|love/i.test(g.reply) && !/acts 10:14 shows peter still refused unclean food/i.test(g.reply),
      `${g.route} | ${g.reply.slice(0, 100)}`,
    );
  }

  // Correction
  {
    const u = `g7-corr-${ts}`;
    await chat(u, 'What does Isaiah 66:17 say?');
    const c = await chat(u, 'No, I meant Acts 10, not Isaiah 66.');
    record(
      'S_correction',
      c.ok && /acts\s*10/i.test(c.reply),
      `${c.route} | ${c.reply.slice(0, 100)}`,
    );
  }

  // Explicit memory short
  {
    const u = `g7-mem-${ts}`;
    await chat(u, 'Remember this: my favorite verse is Psalm 23:1.');
    const r = await chat(u, 'What is my favorite verse?');
    record(
      'S_memory_short',
      r.ok && /psalm\s*23/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 100)}`,
    );
  }

  // Multi-part
  {
    const r = await chat(`g7-mp-${ts}`, 'Two questions: What does Genesis 1:1 say, and what does John 3:16 say?');
    record(
      'S_multipart',
      r.ok && /genesis|beginning|created/i.test(r.reply) && /john|loved|world|believe/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 120)}`,
    );
  }

  // Prayer / emotional
  {
    const r = await chat(`g7-pray-${ts}`, 'I feel anxious — can you pray with me for peace?');
    record(
      'S_prayer',
      r.ok && /pray|father|peace|amen|lord/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 100)}`,
    );
  }

  // Malformed / empty-ish
  {
    const r = await chat(`g7-mal-${ts}`, '???');
    record(
      'S_malformed_no_crash',
      r.ok && r.reply.length > 0 && !/traceback|TypeError/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 80)}`,
    );
  }

  // Session isolation
  {
    const a = `g7-iso-a-${ts}`;
    const b = `g7-iso-b-${ts}`;
    await chat(a, 'Remember this: my favorite verse is Psalm 119:105.');
    const rb = await chat(b, 'What is my favorite verse?');
    record(
      'S_session_isolation',
      rb.ok && !/psalm\s*119:105/i.test(rb.reply),
      `${rb.route} | ${rb.reply.slice(0, 100)}`,
    );
  }

  // Same-session return
  {
    const u = `g7-ret-${ts}`;
    await chat(u, 'Remember this: my marker is GATE7_RETURN.');
    const r = await chat(u, 'What marker did I ask you to remember?');
    record(
      'S_same_session_return',
      r.ok && /GATE7_RETURN/i.test(r.reply),
      `${r.route} | ${r.reply.slice(0, 100)}`,
    );
  }

  // Chat vs stream substantive parity on Acts 10 trap
  {
    const u = `g7-acts-${ts}`;
    const c = await chat(u, 'Does Acts 10 make pork clean? Answer directly.');
    const s = await stream(`${u}-s`, 'Does Acts 10 make pork clean? Answer directly.');
    const chatOk =
      !/\byes\b.{0,40}(pork|all foods?).{0,20}clean/i.test(c.reply) &&
      (/\bno\b|does not|doesn't|not make|vision|gentile/i.test(c.reply) ||
        /scripture does not state that directly/i.test(c.reply));
    const streamOk =
      !/\byes\b.{0,40}(pork|all foods?).{0,20}clean/i.test(s.reply) &&
      (/\bno\b|does not|doesn't|not make|vision|gentile/i.test(s.reply) ||
        /scripture does not state that directly/i.test(s.reply));
    record(
      'S_acts10_chat_stream_parity',
      c.ok && s.ok && chatOk && streamOk,
      `chat=${c.route} stream=${s.route}`,
    );
  }

  // Companion UI surface exists (static)
  {
    const candidates = ['/', '/companion', '/buddy', '/index.html', '/app'];
    let found = null;
    for (const p of candidates) {
      try {
        const res = await fetch(`${BASE}${p}`, { method: 'GET', redirect: 'follow' });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && /text\/html/i.test(ct)) {
          const html = await res.text();
          if (/buddy|companion|bible/i.test(html)) {
            found = { path: p, status: res.status, len: html.length };
            break;
          }
        }
      } catch (_) {
        /* continue */
      }
    }
    record(
      'S_ui_html_surface',
      !!found,
      found ? JSON.stringify(found) : 'no HTML companion surface found on common paths',
    );
  }

  // No chat-only vs stream-only fallback divergence on John 3:16 family
  {
    const u = `g7-parity-${ts}`;
    const c = await chat(u, 'What does Genesis 1:1 say?');
    const s = await stream(`${u}-s`, 'What does Genesis 1:1 say?');
    record(
      'S_genesis_chat_stream_family',
      c.ok &&
        s.ok &&
        /genesis|beginning|created/i.test(c.reply) &&
        /genesis|beginning|created/i.test(s.reply) &&
        sameFamily(c.route, s.route),
      `chat=${c.route} stream=${s.route}`,
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed, ${failed.length} failed.`);
  console.log(`releaseCommit=${releaseCommit}`);
  if (failed.length) {
    console.log('UI_PARITY_CERTIFICATION FAIL');
    process.exit(1);
  }
  console.log('UI_PARITY_CERTIFICATION PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
