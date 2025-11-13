// server.js — Unified, CommonJS-only, Render-ready (Node 22)

// ===== Core =====
const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const axios = require('axios'); // used by Self-Test
dotenv.config();
// ==== Bible Buddy system prompt for tester mode ====
const BIBLE_BUDDY_SYSTEM_PROMPT = `
You are "Bible Buddy", an AI devotional coach and test guide for a Christian Bible app.

High-level goals:
- Make testers feel relaxed, encouraged, and clearly guided.
- Help the product owner uncover what works well and what needs improvement.
- Keep everything grounded in Scripture, kindness, and clarity (but do not give medical, legal, or financial advice).

When a new user starts or says hello:
1. Briefly greet them in a warm, human tone.
2. Ask: "What would you like to test today?" and give 3–5 specific options, such as:
   - "Try a short devotional flow"
   - "Test how I remember conversation context"
   - "Test how I respond to tricky questions"
   - "Design a test plan for your first users"

During the conversation:
- Think like a gentle QA coach and spiritual companion at the same time.
- Ask short follow-up questions to clarify what they want to test.
- Suggest concrete next steps ("We could try X next", "Would you like to see Y?").
- Summarize what you've learned about their needs every few turns.
- If something seems broken or confusing, name it kindly and suggest what the admin could check (for example: "If this keeps failing, you might look at the provider keys in Render → Environment.").

Tone guidelines:
- Encouraging, calm, never pushy.
- Short paragraphs, not walls of text.
- Sprinkle in Scripture references naturally when appropriate, but don't overload.
- Always respect the user's boundaries and emotional state.

Never:
- Claim you are perfect or always right.
- Give professional medical, legal, or financial advice.
- Hard-judge or shame the user. Stay grace-filled and constructive.
`;
// --- AI Coach helpers ---
const COACH_NAME = 'Bible Buddy Coach';

function summarizeProviders(p) {
  // p looks like: { email:{provider, ready}, sms:{provider,ready}, queue:{mode} }
  const parts = [];
  if (p?.email) parts.push(`Email: ${p.email.provider} (${p.email.ready ? 'ready' : 'missing keys'})`);
  if (p?.sms) parts.push(`SMS: ${p.sms.provider} (${p.sms.ready ? 'ready' : 'missing keys'})`);
  if (p?.queue) parts.push(`Queue: ${p.queue.mode}`);
  return parts.join(' • ');
}

async function gatherStatus(base) {
  // Base is like SELF_BASE_URL or http://localhost:PORT
  const out = { ok: true, version: process.env.APP_VERSION || 'v122.x', checks: {} };
  try {
    const h = await axios.get(`${base}/api/health`).then(r => r.data).catch(() => ({ ok:false }));
    out.checks.health = h;
  } catch { out.checks.health = { ok:false }; }

  try {
    const prov = await axios.get(`${base}/api/providers/status`).then(r => r.data).catch(() => null);
    out.checks.providers = prov;
  } catch { out.checks.providers = null; }

  // You can extend here (queue depth endpoint, DB ping, etc.)
  return out;
}

function coachAdvice(status) {
  const adv = [];
  // Health
  if (!status?.checks?.health?.ok) {
    adv.push('Health check is failing. Confirm service is listening on the Render-assigned PORT and that /api/health returns {ok:true}.');
  } else {
    adv.push('Core service is responding ✅');
  }
  // Providers
  const p = status?.checks?.providers;
  if (!p) {
    adv.push('Provider status endpoint not reachable. Ensure `/api/providers/status` route exists.');
  } else {
    if (!p.email?.ready) adv.push('Email provider keys missing. Add RESEND_API_KEY (or switch provider) in Render → Environment.');
    if (!p.sms?.ready) adv.push('SMS provider keys missing. Add TWILIO_SID and TWILIO_TOKEN in Render → Environment.');
    adv.push(`Providers summary: ${summarizeProviders(p)}.`);
  }
  // Queue hint
  adv.push('Queue is running in memory mode by default. Set QUEUE_MODE=redis and REDIS_URL in Render to enable durable jobs (optional).');
  // Admin link
  adv.push('Use Admin → “Run Self-Test” to validate end-to-end. If it fails, click the row to see the error detail.');
  return adv;
}
// ===== Libs =====
const multer = require('multer');
const { parse } = require('csv-parse/sync');

// ===== App =====
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ===== CORS (open for testers) =====
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ===== Version / meta =====
const APP_VERSION = process.env.APP_VERSION || 'v122.10.11 (Unified)';

// ===== Queue (memory default, BullMQ/Redis only when configured) =====
const USE_REDIS = String(process.env.QUEUE_MODE || '').toLowerCase() === 'redis';

function createMemoryQueue() {
  const jobs = [];
  return {
    add: async (name, payload) => {
      const job = { id: Date.now().toString(), name, payload, ts: new Date().toISOString() };
      jobs.push(job);
      return job;
    },
    list: async () => jobs.slice(-100)
  };
}

async function createRedisQueue() {
  let Queue;
  try {
    ({ Queue } = await import('bullmq')); // lazy import; won’t crash if not installed
  } catch (e) {
    console.warn('[queue] BullMQ not available, fallback to memory:', e.message);
    return createMemoryQueue();
  }
  const connection = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING || null;
  if (!connection) {
    console.warn('[queue] No REDIS_URL set, fallback to memory');
    return createMemoryQueue();
  }
  const q = new Queue('jobs', { connection: { url: connection } });
  return {
    add: async (name, payload) => q.add(name, payload),
    list: async () => (await q.getJobs(['waiting','active','delayed','completed','failed'])).slice(-100)
  };
}

let queue;
async function makeQueue() { queue = USE_REDIS ? await createRedisQueue() : createMemoryQueue(); }

// ===== Minimal storage for mapping =====
const dataDir = path.join(__dirname, 'data');
const mapJson = path.join(dataDir, 'verse_mapping.json');

function readMap() {
  try { return JSON.parse(fs.readFileSync(mapJson, 'utf8')); }
  catch { return { themes: {}, misapplied: {} }; }
}
function writeMap(m) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(mapJson, JSON.stringify(m, null, 2));
}

// ===== Home =====
app.get('/', (_req, res) => {
  res.set('X-App-Version', APP_VERSION);
  res.send(`<html><head><title>Bible Buddy</title></head>
  <body style="font-family:Arial">
    <h3>🙌 Bible Buddy — ${APP_VERSION}</h3>
    <p><a href="/admin">Open Admin</a> • <a href="/api/health">Health</a></p>
  </body></html>`);
});

// ===== Admin (tiny UI with Self-Test button) =====
app.get('/admin', (_req, res) => {
  res.send(`<!doctype html><html><head><meta charset="utf-8"/>
  <title>Admin</title>
  <style>
    body{font-family:Arial;padding:24px}
    .btn{padding:8px 12px;border:1px solid #333;border-radius:6px;text-decoration:none;margin-right:8px}
    table{border-collapse:collapse;margin-top:14px}
    td,th{border:1px solid #ddd;padding:6px}
    #status{margin-top:10px}
  </style>
  </head><body>
    <h2>📊 Admin Dashboard</h2>
    <p>Version: ${APP_VERSION}</p>
    <p>
      <a id="run" class="btn" href="#">Run Self-Test</a>
      <a class="btn" href="/api/providers/status" target="_blank">Providers</a>
      <a class="btn" href="/api/health" target="_blank">Health</a>
    </p>
    <div id="status">—</div>
    <table id="results" style="display:none">
      <thead><tr><th>Check</th><th>OK</th><th>Detail</th></tr></thead><tbody></tbody>
    </table>
    <script>
      async function refresh(){
        const r = await fetch('/api/selftest/status'); const j = await r.json();
        document.getElementById('status').textContent = 'Summary: ' + (j.summary || '—');
        const t = document.getElementById('results'); const tb = t.querySelector('tbody');
        tb.innerHTML = '';
        (j.results||[]).forEach(x=>{
          const tr=document.createElement('tr');
          tr.innerHTML = '<td>'+x.name+'</td><td>'+(x.ok?'✅':'❌')+'</td><td><pre style="margin:0;white-space:pre-wrap">'+(x.detail||'')+'</pre></td>';
          tb.appendChild(tr);
        });
        t.style.display = (j.results||[]).length ? 'table' : 'none';
      }
      document.getElementById('run').onclick = async (e)=>{
        e.preventDefault();
        document.getElementById('status').textContent = 'Running...';
        await fetch('/api/selftest/run', {method:'POST',headers:{'Content-Type':'application/json'}});
        await refresh();
      };
      refresh();
    </script>
  </body></html>`);
});

// ===== Health =====
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: APP_VERSION, time: new Date().toISOString() });
});
// ===== AI Coach API =====
app.get('/api/coach/status', async (req, res) => {
  try {
    const base = process.env.SELF_BASE_URL || `https://` + req.headers.host;
    const s = await gatherStatus(base);
    const adviceList = coachAdvice(s);
    res.json({
      ok: true,
      coach: COACH_NAME,
      status: s,
      advice: adviceList,
      time: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'Unknown error',
      coach: COACH_NAME
    });
  }
});
// ===== Admin Coach UI =====
app.get('/admin/coach', (req, res) => {
  const pass = req.query.pass;
  if (!pass || pass !== process.env.ADMIN_PASSCODE)
    return res.status(403).send('Forbidden: Invalid admin passcode');

  res.send(`
    <html>
      <head>
        <title>AI Coach – Bible Buddy</title>
        <style>
          body { font-family: sans-serif; max-width: 900px; margin: 40px auto; }
          .card { padding: 20px; border: 1px solid #ccc; margin-bottom: 20px; }
          h2 { margin-top: 0; }
          pre { background:#f0f0f0; padding:10px; white-space:pre-wrap; }
          button { padding:10px 16px; cursor:pointer; }
        </style>
      </head>
      <body>
        <h1>📘 Bible Buddy – AI Deployment Coach</h1>
        <button onclick="load()">Refresh Status</button>
        <div id="out" class="card">Loading…</div>
        <script>
          async function load() {
            const r = await fetch('/api/coach/status');
            const j = await r.json();
            document.getElementById('out').innerHTML =
              '<h2>Status</h2><pre>' + JSON.stringify(j.status, null, 2) +
              '</pre><h2>Coach Advice</h2><pre>' +
              j.advice.join('\\n') + '</pre>';
          }
          load();
        </script>
      </body>
    </html>
  `);
});
// Pretty route for /chat → serves public/chat.html
// ===== Tester Chat UI + AI Chat API =====

// Make sure /public is served (safe to call even if defined earlier)
app.use(express.static(path.join(__dirname, 'public')));

// Simple tester chat page – uses public/chat.html
app.get('/chat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// AI chat helper (OpenAI wrapper lives here)
const { chat } = require('./lib/ai/index.js');

// In-memory conversation store (per process)
const MEMORY = { sessions: {} };

function getSession(id = 'default') {
  if (!MEMORY.sessions[id]) {
    // Start each new session with our system prompt
    MEMORY.sessions[id] = [
      { role: 'system', content: BIBLE_BUDDY_SYSTEM_PROMPT },
    ];
  }
  return MEMORY.sessions[id];
}

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { sessionId = 'default', user } = req.body || {};
    const text = String(user || '').trim();

    if (!text) {
      return res.status(400).json({ ok: false, error: 'Empty message' });
    }

    const messages = getSession(sessionId);

    // user message
    messages.push({ role: 'user', content: text });

    // call OpenAI (via ./lib/ai/index.js)
    const out = await chat(messages);

    // remember assistant reply for context
    messages.push({ role: 'assistant', content: out.text });

    // send reply back to the browser
    res.json({ ok: true, reply: out.text });
  } catch (e) {
    console.error('AI chat error:', e);
    res.status(500).json({ ok: false, error: e.message || 'Server error' });
  }
});
// ===== Providers status (stubs; we show “ready” when keys exist) =====
app.get('/api/providers/status', (_req, res) => {
  res.json({
    email: { provider: process.env.EMAIL_PROVIDER || 'resend', ready: !!process.env.RESEND_API_KEY },
    sms:   { provider: 'twilio', ready: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN) },
    queue: { mode: USE_REDIS ? 'redis/bullmq' : 'memory' }
  });
});

// ===== Mapping: CSV upload =====
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/mapping/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'Missing file' });
  fs.mkdirSync(dataDir, { recursive: true });
  const csvPath = path.join(dataDir, 'verse_mapping.csv');
  fs.writeFileSync(csvPath, req.file.buffer);
  const rows = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true });
  res.json({ ok: true, saved: '/data/verse_mapping.csv', rows: rows.length });
});

// ===== Mapping: preview-diff =====
app.post('/api/mapping/preview-diff', (req, res) => {
  const sugg = Array.isArray(req.body) ? req.body : [];
  const before = readMap();
  const after  = JSON.parse(JSON.stringify(before));
  let add = 0;

  for (const s of sugg) {
    if (s.type === 'move_verse' && s.ref && s.toTheme) {
      if (!after.themes[s.toTheme]) after.themes[s.toTheme] = [];
      for (const t of Object.keys(after.themes)) {
        after.themes[t] = after.themes[t].filter(r => r !== s.ref);
      }
      after.themes[s.toTheme].push(s.ref);
      if (after.misapplied && after.misapplied[s.ref]) delete after.misapplied[s.ref];
      add++;
    }
  }

  res.json({
    ok: true,
    add,
    beforeCount: Object.keys(before.misapplied || {}).length,
    afterCount:  Object.keys(after.misapplied  || {}).length,
    before, after
  });
});

// ===== Mapping: apply (persist JSON) =====
app.post('/api/mapping/apply', (req, res) => {
  const sugg = Array.isArray(req.body) ? req.body : [];
  const before = readMap();
  const after  = JSON.parse(JSON.stringify(before));
  let applied = 0;

  for (const s of sugg) {
    if (s.type === 'move_verse' && s.ref && s.toTheme) {
      if (!after.themes[s.toTheme]) after.themes[s.toTheme] = [];
      for (const t of Object.keys(after.themes)) {
        after.themes[t] = after.themes[t].filter(r => r !== s.ref);
      }
      after.themes[s.toTheme].push(s.ref);
      if (after.misapplied && after.misapplied[s.ref]) delete after.misapplied[s.ref];
      applied++;
    }
  }

  writeMap(after);
  res.json({
    ok: true,
    applied,
    beforeCount: Object.keys(before.misapplied || {}).length,
    afterCount:  Object.keys(after.misapplied  || {}).length
  });
});

// ===== Queue routes =====
app.post('/api/queue/test', async (req, res) => {
  const job = await queue.add('test', { at: new Date().toISOString(), data: req.body || {} });
  res.json({ ok: true, job });
});
app.get('/api/queue/list', async (_req, res) => {
  res.json({ ok: true, jobs: await queue.list() });
});

// ===== Self-Test (health, providers, queue) =====
const SELFTEST = { summary: 'never run', results: [] };

async function runSelfTest(base) {
  const out = [];
  const push = (name, ok, detail='') => out.push({ name, ok, detail });

  try {
    const r = await axios.get(`${base}/api/health`, { timeout: 8000 });
    push('health', r.status === 200 && r.data?.ok === true, JSON.stringify(r.data));
  } catch (e) { push('health', false, e.message); }

  try {
    const r = await axios.get(`${base}/api/providers/status`, { timeout: 8000 });
    push('providers', r.status === 200, JSON.stringify(r.data));
  } catch (e) { push('providers', false, e.message); }

  try {
    await axios.post(`${base}/api/queue/test`, { hello: 'world' }, { timeout: 8000 });
    const r2 = await axios.get(`${base}/api/queue/list`, { timeout: 8000 });
    push('queue', r2.status === 200 && Array.isArray(r2.data?.jobs), `count=${(r2.data?.jobs||[]).length}`);
  } catch (e) { push('queue', false, e.message); }

  const pass = out.every(x => x.ok);
  SELFTEST.results = out;
  SELFTEST.summary = pass ? 'PASS' : 'FAIL';
  return { pass, out };
}

app.post('/api/selftest/run', async (req, res) => {
  const base = req.body?.base || process.env.SELF_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  try {
    await runSelfTest(base);
    res.json({ ok: true, summary: SELFTEST.summary, results: SELFTEST.results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.get('/api/selftest/status', (_req, res) => res.json(SELFTEST));

// ===== Boot =====
async function init() {
  await makeQueue();
  const port = process.env.PORT || 3000;
  app.listen(port, async () => {
    console.log('Bible Buddy listening on :', port);

    // Auto self-test on boot (we fixed placement: AFTER app.listen)
    if (String(process.env.AUTO_SELFTEST || '1') === '1') {
      const base = process.env.SELF_BASE_URL || `http://localhost:${port}`;
      try {
        await runSelfTest(base);
        console.log('self-test finished:', SELFTEST.summary);
      } catch (e) {
        console.error('self-test error:', e?.message || e);
      }
    }
  });
}
// ===== AI Chat API =====
const { chat } = require('./lib/ai/index.js');

// in-memory conversation store (per process)
const MEMORY = { sessions: {} };
function getSession(id = 'default') {
  if (!MEMORY.sessions[id]) {
    MEMORY.sessions[id] = [
      { role: 'system', content: BIBLE_BUDDY_SYSTEM_PROMPT }
    ];
  }
  return MEMORY.sessions[id];
}
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { sessionId = 'default', user } = req.body || {};
    const text = String(user || '').trim();
    if (!text) return res.json({ ok: false, error: 'Empty message' });

    const messages = getSession(sessionId);
    messages.push({ role: 'user', content: text });

    const out = await chat(messages);
    messages.push({ role: 'assistant', content: out.text });

    res.json({ ok: true, reply: out.text });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
init().catch(err => { console.error('Startup error:', err); process.exit(1); });

module.exports = app;
