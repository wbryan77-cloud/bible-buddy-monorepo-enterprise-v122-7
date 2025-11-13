// server.js – Bible Buddy Unified, Render-ready, Node 22+

// ===== Core =====
const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const axios = require('axios'); // used by Self-Test

dotenv.config();

const APP_VERSION = 'v122.10.11 (Unified)';

// ===== Bible Buddy system prompt for tester mode =====
const BIBLE_BUDDY_SYSTEM_PROMPT = `
You are "Bible Buddy" – an AI devotional coach and test guide for a Christian Bible app.

High-level goals:
- Make testers feel relaxed, encouraged, and clearly guided.
- Help the product owner uncover what works well and what needs improvement.
- Keep everything grounded in Scripture, kindness, and clarity (but do not give medical, legal, or financial advice).

When a new user starts or says hello:
1. Briefly greet them in a warm, human tone.
2. Ask: "What would you most like to test today?" and give 3–5 specific options, such as:
   - "Talking through a verse or topic"
   - "Trying a sample devotional flow"
   - "Seeing how I remember conversation context"
   - "Testing follow-up questions"
   - "Creating a test plan for your first users"

During the conversation:
- Ask gentle clarifying questions if their request is vague.
- Reflect back what you understood before giving a longer answer.
- Occasionally suggest, "Would you like to take a note for the product owner about this?" and summarize in 1–2 bullet points.

Style:
- Warm, calm, and encouraging.
- Short paragraphs, no big walls of text.
- Use Scripture references naturally, without forcing them.
`;

// ===== Admin Coach system prompt =====
const ADMIN_COACH_SYSTEM_PROMPT = `
You are the "Bible Buddy Admin Coach", helping the product owner and admins
understand how testing is going and what to do next.

Your job:
- Read the status JSON and any notes we send you.
- Summarize what’s going well and what needs attention.
- Suggest 2–4 specific next actions for the team (for example:
  "Run more tests on X", "Ask testers about Y", "Improve clarity of Z").
- Keep everything grounded in Scripture, kindness, and clarity.
- Never give medical, legal, or financial advice.

When you answer, always structure your reply like:

1) High-level summary (2–3 sentences)
2) What’s going well (bulleted list)
3) What needs attention (bulleted list)
4) Recommended next 2–4 actions (numbered list)

Tone:
- Encouraging, calm, and practical.
- Speak as a supportive coach and brother/sister in Christ, not as a boss.
`;

// ===== AI helper (single import!) =====
const { chat } = require('./lib/ai/index.js');

// ===== Libs =====
const multer = require('multer');
const { parse } = require('csv-parse/sync');

// ===== App =====
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Static files (for chat.html etc.)
app.use(express.static(path.join(__dirname, 'public')));

// ===== CORS (open for testers) =====
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS'
  );
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ===== Simple root =====
app.get('/', (_req, res) => {
  res.type('text').send(`Bible Buddy – ${APP_VERSION}`);
});

// ===== Health =====
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    version: APP_VERSION,
    time: new Date().toISOString()
  });
});

// ===== Providers status (stubs; check env) =====
const USE_REDIS = (process.env.QUEUE_MODE || '').toLowerCase() === 'redis';

app.get('/api/providers/status', (_req, res) => {
  res.json({
    email: {
      provider: process.env.EMAIL_PROVIDER || 'resend',
      ready: !!process.env.RESEND_API_KEY
    },
    sms: {
      provider: 'twilio',
      ready: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN)
    },
    queue: {
      mode: USE_REDIS ? 'redis' : 'memory'
    }
  });
});

// ===== In-memory "queue" (for tests) =====
const QUEUE = [];

app.post('/api/queue/test', (req, res) => {
  const payload = req.body || {};
  const job = {
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    data: payload
  };
  QUEUE.push(job);
  res.json({ ok: true, job });
});

app.get('/api/queue/list', (_req, res) => {
  res.json({ ok: true, jobs: QUEUE });
});

// ===== Mapping: CSV upload + preview + apply (simplified) =====

const upload = multer({ storage: multer.memoryStorage() });

// where we store mapping JSON
const MAP_PATH = path.join(__dirname, 'data', 'verse-mapping.json');

function readMap() {
  try {
    const txt = fs.readFileSync(MAP_PATH, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return {};
  }
}

function writeMap(obj) {
  const dir = path.dirname(MAP_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MAP_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

// upload CSV
app.post('/api/mapping/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Missing file' });
  }
  try {
    const rows = parse(req.file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true
    });
    res.json({ ok: true, rowsCount: rows.length });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || 'CSV parse error' });
  }
});

// preview diff between current mapping and new suggestions
app.post('/api/mapping/preview-diff', (req, res) => {
  const sugg = Array.isArray(req.body) ? req.body : [];
  const before = readMap();
  const after = JSON.parse(JSON.stringify(before));
  let added = 0;

  for (const s of sugg) {
    if (!s || !s.ref) continue;
    if (!after[s.ref]) {
      after[s.ref] = s;
      added++;
    }
  }

  res.json({
    ok: true,
    added,
    beforeCount: Object.keys(before || {}).length,
    afterCount: Object.keys(after || {}).length,
    before,
    after
  });
});

// apply mapping JSON
app.post('/api/mapping/apply', (req, res) => {
  const sugg = Array.isArray(req.body) ? req.body : [];
  const before = readMap();
  const after = JSON.parse(JSON.stringify(before));
  let applied = 0;

  for (const s of sugg) {
    if (!s || !s.ref) continue;
    after[s.ref] = s;
    applied++;
  }

  writeMap(after);
  res.json({
    ok: true,
    applied,
    beforeCount: Object.keys(before || {}).length,
    afterCount: Object.keys(after || {}).length
  });
});

// ===== Self-Test (health + providers + queue) =====
const SELFTEST = {
  summary: 'never run',
  results: []
};

function summarizeProviders(p) {
  const emailStatus = p.email.ready ? 'ready' : 'missing keys';
  const smsStatus = p.sms.ready ? 'ready' : 'missing keys';
  const queueStatus = p.queue.mode === 'redis' ? 'redis' : 'memory';
  return `Email: ${p.email.provider} (${emailStatus}) • SMS: ${p.sms.provider} (${smsStatus}) • Queue: ${queueStatus}`;
}

async function runSelfTest(base) {
  const out = [];
  function push(name, ok, detail) {
    out.push({ name, ok, detail });
  }

  // base like https://your-app.onrender.com
  const t = { timeout: 8000 };

  try {
    const r = await axios.get(`${base}/api/health`, t);
    push('health', r.status === 200 && r.data && r.data.ok === true, JSON.stringify(r.data));
  } catch (e) {
    push('health', false, e.message);
  }

  try {
    const r = await axios.get(`${base}/api/providers/status`, t);
    push('providers', r.status === 200, summarizeProviders(r.data || {}));
  } catch (e) {
    push('providers', false, e.message);
  }

  try {
    const r1 = await axios.post(
      `${base}/api/queue/test`,
      { hello: 'world' },
      t
    );
    const r2 = await axios.get(`${base}/api/queue/list`, t);
    const ok =
      r1.status === 200 &&
      r2.status === 200 &&
      Array.isArray(r2.data.jobs) &&
      r2.data.jobs.length > 0;
    push('queue', ok, `count=${(r2.data.jobs || []).length}`);
  } catch (e) {
    push('queue', false, e.message);
  }

  const pass = out.every((x) => x.ok);
  SELFTEST.summary = pass ? 'PASS' : 'FAIL';
  SELFTEST.results = out;
  return { pass, out };
}

app.post('/api/selftest/run', async (req, res) => {
  const base =
    (req.body && req.body.base) ||
    process.env.SELF_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  try {
    await runSelfTest(base);
    res.json({ ok: true, summary: SELFTEST.summary, results: SELFTEST.results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.get('/api/selftest/status', (_req, res) => {
  res.json(SELFTEST);
});

// ===== Tester Chat UI (/chat) =====
// serves public/chat.html (file must exist)
app.get('/chat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// ===== AI Chat API for testers =====
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
    const sessionId = 'default';
    const user = req.body || {};
    const text = String(user.text || '').trim();
    if (!text) {
      return res.status(400).json({ ok: false, error: 'Empty message' });
    }

    const messages = getSession(sessionId);
    messages.push({ role: 'user', content: text });

    const out = await chat(messages);

    messages.push({ role: 'assistant', content: out.text });

    res.json({ ok: true, reply: out.text });
  } catch (e) {
    console.error('AI chat error:', e);
    res.status(500).json({ ok: false, error: e.message || 'Server error' });
  }
});

// ===== Admin Coach API =====
app.post('/api/ai/coach', async (req, res) => {
  try {
    const { statusJson, notes } = req.body || {};
    const statusText =
      typeof statusJson === 'string'
        ? statusJson
        : JSON.stringify(statusJson || {}, null, 2);

    const extraNotes = String(notes || '').trim();

    const messages = [
      { role: 'system', content: ADMIN_COACH_SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          'Here is the latest status JSON from Bible Buddy:\n\n' +
          statusText +
          (extraNotes
            ? '\n\nAdditional notes from admin:\n' + extraNotes
            : '')
      }
    ];

    const out = await chat(messages);

    res.json({ ok: true, reply: out.text });
  } catch (e) {
    console.error('Admin coach error:', e);
    res.status(500).json({
      ok: false,
      error: e.message || 'Admin coach server error'
    });
  }
});

// ===== Admin Dashboard (/admin) =====
app.get('/admin', (_req, res) => {
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Bible Buddy Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 16px; background: #f7f7fb; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .sub { color: #555; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; max-width: 800px; background: #fff; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 0.9rem; }
    th { background: #f0f0f5; text-align: left; }
    .ok { color: #2e7d32; }
    .fail { color: #c62828; }
    button { padding: 6px 12px; border-radius: 999px; border: none; background: #467bff; color: #fff; cursor: pointer; font-size: 0.9rem; }
    button:disabled { opacity: 0.6; cursor: default; }
    .top-buttons { margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
    a.btn-link { text-decoration: none; }
  </style>
</head>
<body>
  <h1>📊 Admin Dashboard</h1>
  <div class="sub">
    Version: ${APP_VERSION}. Use this screen to run self-tests and see provider status.
  </div>

  <div class="top-buttons">
    <button id="run">Run Self-Test</button>
    <a class="btn-link" href="/coach"><button type="button">AI Deployment Coach</button></a>
    <a class="btn-link" href="/admin/coach"><button type="button">Admin Coach</button></a>
    <a class="btn-link" href="/chat"><button type="button">Tester Chat</button></a>
  </div>

  <table>
    <thead>
      <tr><th>Check</th><th>OK</th><th>Detail</th></tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="3">No self-test run yet.</td></tr>
    </tbody>
  </table>

  <script>
    async function loadStatus() {
      const tb = document.getElementById('rows');
      tb.innerHTML = '<tr><td colspan="3">Loading…</td></tr>';
      try {
        const r = await fetch('/api/selftest/status');
        const data = await r.json();
        if (!data || !Array.isArray(data.results) || data.results.length === 0) {
          tb.innerHTML = '<tr><td colspan="3">No results yet. Run Self-Test.</td></tr>';
          return;
        }
        tb.innerHTML = '';
        data.results.forEach(function(x){
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + x.name + '</td>' +
            '<td class="' + (x.ok ? 'ok' : 'fail') + '">' + (x.ok ? '✔' : '✖') + '</td>' +
            '<td><code>' + String(x.detail || '') + '</code></td>';
          tb.appendChild(tr);
        });
      } catch (e) {
        tb.innerHTML = '<tr><td colspan="3">Error loading status: ' + (e.message || 'unknown') + '</td></tr>';
      }
    }

    document.getElementById('run').onclick = async function(e) {
      e.preventDefault();
      this.disabled = true;
      this.textContent = 'Running…';
      try {
        const base = window.location.origin;
        await fetch('/api/selftest/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base: base })
        });
        await loadStatus();
      } catch (e) {
        alert('Error running self-test: ' + (e.message || 'unknown'));
      } finally {
        this.disabled = false;
        this.textContent = 'Run Self-Test';
      }
    };

    loadStatus();
  </script>
</body>
</html>`);
});

// ===== AI Deployment Coach Page (/coach) =====
app.get('/coach', (_req, res) => {
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Bible Buddy – AI Deployment Coach</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 16px; background: #f7f7fb; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .card { background: #fff; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    pre { white-space: pre-wrap; font-size: 0.85rem; }
    button { padding: 6px 12px; border-radius: 999px; border: none; background: #467bff; color: #fff; cursor: pointer; font-size: 0.9rem; }
    .status { font-size: 0.8rem; color: #777; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>📘 Bible Buddy – AI Deployment Coach</h1>
  <div class="card">
    <strong>Status</strong>
    <pre id="statusBox">Loading…</pre>
    <div class="status" id="statusMeta"></div>
    <button id="refreshBtn">Refresh Status</button>
  </div>
  <div class="card">
    <strong>Coach Advice</strong>
    <pre id="adviceBox">Waiting for status…</pre>
  </div>

  <script>
    async function loadStatus() {
      const sBox = document.getElementById('statusBox');
      const meta = document.getElementById('statusMeta');
      const advice = document.getElementById('adviceBox');
      meta.textContent = 'Loading…';
      try {
        const r = await fetch('/api/selftest/status');
        const data = await r.json();
        sBox.textContent = JSON.stringify(data, null, 2);
        meta.textContent = 'Summary: ' + (data.summary || 'unknown');
        // Simple inline advice, without extra AI call:
        const providersRow = (data.results || []).find(r => r.name === 'providers') || {};
        const queueRow = (data.results || []).find(r => r.name === 'queue') || {};
        let lines = [];
        lines.push('Core service is responding ' + (data.summary === 'PASS' ? '✅' : '⚠️'));
        if (providersRow && !providersRow.ok) {
          lines.push('Email/SMS provider keys missing. Add RESEND_API_KEY and/or TWILIO keys in Render → Environment.');
        } else {
          lines.push('Providers look configured. Good!');
        }
        if (queueRow && !queueRow.ok) {
          lines.push('Queue is still in memory mode by default. Set QUEUE_MODE=redis and REDIS_URL in Render to enable durable jobs (optional).');
        } else {
          lines.push('Queue check passed.');
        }
        lines.push('Use Admin → "Run Self-Test" to validate end-to-end. If it fails, click the row to see the error detail (in future UI).');
        advice.textContent = lines.join('\\n');
      } catch (e) {
        sBox.textContent = 'Error loading status.';
        meta.textContent = 'Failed to load.';
        advice.textContent = 'Fix status endpoint before relying on Deployment Coach.';
      }
    }
    document.getElementById('refreshBtn').onclick = function(){ loadStatus(); };
    loadStatus();
  </script>
</body>
</html>`);
});

// ===== Admin Coach page (/admin/coach) =====
app.get('/admin/coach', (_req, res) => {
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Bible Buddy – Admin Coach</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 16px; background: #f7f7fb; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .sub { color: #555; margin-bottom: 16px; }
    .card { background: #fff; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    textarea { width: 100%; min-height: 60px; padding: 8px; border-radius: 6px; border: 1px solid #ccc; resize: vertical; font-family: inherit; font-size: 0.9rem; }
    button { margin-top: 8px; padding: 6px 14px; border-radius: 999px; border: none; background: #467bff; color: #fff; font-size: 0.9rem; cursor: pointer; }
    button:disabled { opacity: 0.6; cursor: default; }
    pre { white-space: pre-wrap; font-size: 0.85rem; }
    .status { font-size: 0.8rem; color: #777; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>📊 Bible Buddy – Admin Coach</h1>
  <div class="sub">
    AI helper for you and your team. It looks at the latest self-test status
    and gives you a simple coaching summary with next steps.
  </div>

  <div class="card">
    <strong>Status JSON (from /api/selftest/status)</strong>
    <pre id="statusJson">Loading…</pre>
    <div class="status" id="statusState"></div>
  </div>

  <div class="card">
    <strong>Optional notes to Coach</strong>
    <textarea id="notes" placeholder="Anything you want the coach to know about current testing?"></textarea>
    <button id="askBtn">Ask Coach</button>
    <div class="status" id="coachState"></div>
  </div>

  <div class="card">
    <strong>Coach Reply</strong>
    <pre id="coachReply">No reply yet.</pre>
  </div>

  <script>
    async function loadStatus() {
      const statusEl = document.getElementById('statusJson');
      const statusState = document.getElementById('statusState');
      statusState.textContent = 'Loading latest self-test status…';

      try {
        const res = await fetch('/api/selftest/status');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        statusEl.textContent = JSON.stringify(data, null, 2);
        statusState.textContent = 'Loaded.';
        return data;
      } catch (e) {
        console.error(e);
        statusEl.textContent = 'Error loading status.';
        statusState.textContent = 'Failed to load self-test status.';
        return null;
      }
    }

    async function askCoach() {
      const btn = document.getElementById('askBtn');
      const notesEl = document.getElementById('notes');
      const coachState = document.getElementById('coachState');
      const replyEl = document.getElementById('coachReply');

      btn.disabled = true;
      coachState.textContent = 'Asking Coach…';

      try {
        const statusText = document.getElementById('statusJson').textContent;
        const body = {
          statusJson: statusText,
          notes: notesEl.value || ''
        };

        const res = await fetch('/api/ai/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Unknown error');

        replyEl.textContent = data.reply || '(no reply)';
        coachState.textContent = 'Coach reply received.';
      } catch (e) {
        console.error(e);
        coachState.textContent = 'Error: ' + (e.message || 'Unknown problem talking to Coach.');
      } finally {
        btn.disabled = false;
      }
    }

    document.getElementById('askBtn').addEventListener('click', askCoach);
    loadStatus();
  </script>
</body>
</html>`);
});

// ===== Boot =====
async function init() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log('Bible Buddy listening on', port);
  });

  // auto self-test on boot if desired
  if (String(process.env.AUTO_SELFTEST || '') === '1') {
    const base = process.env.SELF_BASE_URL || `http://localhost:${port}`;
    try {
      await runSelfTest(base);
      console.log('self-test finished:', SELFTEST.summary);
    } catch (e) {
      console.error('self-test error:', e.message || e);
    }
  }
}

init().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
