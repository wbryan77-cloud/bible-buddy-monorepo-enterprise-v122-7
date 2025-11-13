// server.js — Bible Buddy “maxed-out” backend (CommonJS, Render-ready)

const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

dotenv.config();

// ---- AI helper (must exist in your repo) ----
const { chat } = require('./lib/ai/index.js');

// ---- App & middleware ----
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Wide-open CORS for testers
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

// ---- Constants & directories ----
const APP_VERSION = process.env.APP_VERSION || 'v122.12-max';
const USE_REDIS = String(process.env.QUEUE_MODE || '').toLowerCase() === 'redis';

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ADMIN_DIR = path.join(ROOT_DIR, 'admin');
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- Static serving ----
app.use(express.static(PUBLIC_DIR));

// ---- Landing ----
app.get('/', (_req, res) => {
  res.send(`
    <html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px">
      <h1>📖 Bible Buddy</h1>
      <p>Version: ${APP_VERSION}</p>
      <ul>
        <li><a href="/admin">Admin Dashboard</a></li>
        <li><a href="/chat">Tester Chat (AI coach)</a></li>
      </ul>
    </body></html>
  `);
});

// ---- Admin HTML ----
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

// ---- Health & providers ----
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    version: APP_VERSION,
    time: new Date().toISOString()
  });
});

app.get('/api/providers/status', (_req, res) => {
  res.json({
    email: {
      provider: process.env.EMAIL_PROVIDER || 'resend',
      ready: !!process.env.RESEND_API_KEY
    },
    sms: {
      provider: process.env.SMS_PROVIDER || 'twilio',
      ready: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN)
    },
    queue: {
      mode: USE_REDIS ? 'redis/bullmq' : 'memory'
    }
  });
});

// ---- Simple in-memory queue (for tests) ----
let MEMORY_QUEUE = [];

app.post('/api/queue/test', (req, res) => {
  const job = {
    id: `job_${Date.now()}`,
    createdAt: new Date().toISOString(),
    payload: req.body || {}
  };
  MEMORY_QUEUE.push(job);
  res.json({ ok: true, job });
});

app.get('/api/queue/list', (_req, res) => {
  res.json({ ok: true, jobs: MEMORY_QUEUE });
});

// ---- Self-test (health + providers + queue) ----
const SELFTEST = { summary: 'never run', results: [] };

async function runSelfTest(baseUrl) {
  const results = [];
  const push = (name, ok, detail) => results.push({ name, ok, detail });

  const base =
    baseUrl ||
    process.env.SELF_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  // health
  try {
    const r = await axios.get(`${base}/api/health`, { timeout: 8000 });
    push('health', r.status === 200 && r.data?.ok === true, JSON.stringify(r.data));
  } catch (e) {
    push('health', false, e.message || 'health error');
  }

  // providers
  try {
    const r = await axios.get(`${base}/api/providers/status`, { timeout: 8000 });
    push('providers', r.status === 200, JSON.stringify(r.data));
  } catch (e) {
    push('providers', false, e.message || 'providers error');
  }

  // queue
  try {
    const r1 = await axios.post(
      `${base}/api/queue/test`,
      { hello: 'world' },
      { timeout: 8000 }
    );
    const r2 = await axios.get(`${base}/api/queue/list`, { timeout: 8000 });
    const ok = r1.status === 200 && Array.isArray(r2.data?.jobs);
    push('queue', ok, JSON.stringify(r2.data));
  } catch (e) {
    push('queue', false, e.message || 'queue error');
  }

  SELFTEST.summary = results.every(r => r.ok) ? 'PASS' : 'FAIL';
  SELFTEST.results = results;
  return SELFTEST;
}

app.post('/api/selftest/run', async (req, res) => {
  try {
    const base = req.body?.base;
    const out = await runSelfTest(base);
    res.json({ ok: true, summary: out.summary, results: out.results });
  } catch (e) {
    console.error('selftest error', e);
    res.status(500).json({ ok: false, error: e.message || 'selftest error' });
  }
});

app.get('/api/selftest/status', (_req, res) => {
  res.json(SELFTEST);
});

// ---- Tester Chat HTML ----
app.get('/chat', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'chat.html'));
});

// ---- Bible Buddy AI system prompt ----
const BIBLE_BUDDY_SYSTEM_PROMPT = `
You are "Bible Buddy", an AI devotional coach and test guide for a Christian Bible app.

High-level goals:
- Make testers feel relaxed, encouraged, and clearly guided.
- Help the product owner uncover what works well and what needs improvement.
- Keep everything grounded in Scripture, kindness, and clarity (but do not give medical, legal, or financial advice).

When a new user starts or says hello:
1. Briefly greet them in a warm, human tone.
2. Ask: "What would you like to test today?" and give 3–5 specific options, such as:
   • "Try a short devotional flow"
   • "Test how I remember conversation context"
   • "See how I respond to tricky questions"
   • "Design a test plan for your first users"

Style:
- Warm, calm, and encouraging.
- Use short paragraphs and bullet points.
- Use Scripture gently and appropriately, without overwhelming the user.
`.trim();

// ---- AI memory (in-process) ----
const MEMORY = { sessions: {} };

function getSession(id = 'default') {
  if (!MEMORY.sessions[id]) {
    MEMORY.sessions[id] = [
      { role: 'system', content: BIBLE_BUDDY_SYSTEM_PROMPT }
    ];
  }
  return MEMORY.sessions[id];
}

// ---- AI Chat API ----
app.post('/api/ai/chat', async (req, res) => {
  try {
    const sessionId = req.body?.sessionId || 'default';
    const text = String(req.body?.text ?? req.body?.user ?? '').trim();
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
    res.status(500).json({ ok: false, error: e.message || 'AI error' });
  }
});

// ---- Mapping utilities (CSV upload / preview / apply) ----
const upload = multer({ storage: multer.memoryStorage() });
const MAP_PATH = path.join(DATA_DIR, 'verse-mapping.json');

function readMap() {
  try {
    const raw = fs.readFileSync(MAP_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {}; // empty mapping
  }
}

function writeMap(obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MAP_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

// Upload CSV -> preview
app.post('/api/mapping/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'Missing file' });
  }

  try {
    const csvText = req.file.buffer.toString('utf8');
    const rows = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const preview = rows.map(r => ({
      verse: r.verse || r.reference || '',
      theme: r.theme || r.toTheme || ''
    }));

    res.json({ ok: true, count: preview.length, preview });
  } catch (e) {
    console.error('mapping upload error:', e);
    res.status(500).json({ ok: false, error: e.message || 'CSV parse error' });
  }
});

// Preview diff
app.post('/api/mapping/preview-diff', (req, res) => {
  try {
    const before = readMap();
    const incoming = Array.isArray(req.body) ? req.body : [];
    const after = { ...before };

    let added = 0;
    let changed = 0;

    for (const row of incoming) {
      const verse = row.verse || row.reference;
      const theme = row.theme || row.toTheme;
      if (!verse || !theme) continue;

      if (!before[verse]) {
        added++;
      } else if (before[verse] !== theme) {
        changed++;
      }
      after[verse] = theme;
    }

    res.json({
      ok: true,
      beforeCount: Object.keys(before).length,
      afterCount: Object.keys(after).length,
      added,
      changed,
      before,
      after
    });
  } catch (e) {
    console.error('mapping preview-diff error:', e);
    res.status(500).json({ ok: false, error: e.message || 'preview error' });
  }
});

// Apply mapping
app.post('/api/mapping/apply', (req, res) => {
  try {
    const incoming =
      req.body && typeof req.body === 'object' ? req.body : {};
    writeMap(incoming);
    res.json({ ok: true, count: Object.keys(incoming).length });
  } catch (e) {
    console.error('mapping apply error:', e);
    res.status(500).json({ ok: false, error: e.message || 'apply error' });
  }
});

// ---- Testing phases & coach endpoints ----
app.get('/api/testing/phases', (_req, res) => {
  // Static 4-phase config; Admin UI can overlay this.
  res.json({
    ok: true,
    phases: [
      { id: 1, name: 'Phase 1 – Pastors / Brothers', durationDays: 6 },
      { id: 2, name: 'Phase 2 – Extended testers', durationDays: 6 },
      { id: 3, name: 'Phase 3 – Wider user beta', durationDays: 6 },
      { id: 4, name: 'Phase 4 – Pre-launch polish', durationDays: 6 }
    ]
  });
});

// Simple coach summary stub (Admin can show this)
app.get('/api/testing/coach/summary', (_req, res) => {
  res.json({
    ok: true,
    summary:
      'Coach is ready. Use this to guide Phase 1–4 testers with gentle questions and verse suggestions.',
    hints: [
      'Ask testers: “What felt confusing this week?”',
      'Ask: “Did Bible Buddy feel gentle, not pushy?”',
      'Highlight top verses that were most helpful.'
    ]
  });
});

// ---- Reports & exports (stubbed to JSON files) ----
const SCRIPTURE_ALIGN_PATH = path.join(DATA_DIR, 'scripture-alignment-report.json');
const RENEWAL_SUMMARY_PATH = path.join(DATA_DIR, 'renewal-summary.json');
const QNA_LOG_PATH = path.join(DATA_DIR, 'coach-qna.json');
const ACTION_LOG_PATH = path.join(DATA_DIR, 'coach-actions.json');

function safeReadJson(p, fallback) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

app.get('/api/reports/scripture-alignment', (_req, res) => {
  const report = safeReadJson(SCRIPTURE_ALIGN_PATH, { entries: [] });
  res.json({ ok: true, report });
});

app.get('/api/reports/renewal-summary', (_req, res) => {
  const summary = safeReadJson(RENEWAL_SUMMARY_PATH, { weeks: [] });
  res.json({ ok: true, summary });
});

// CSV export helpers
function toCsv(rows, headers) {
  const head = headers.join(',');
  const body = rows
    .map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
    .join('\n');
  return head + '\n' + body;
}

app.get('/api/export/qna', (_req, res) => {
  const qnas = safeReadJson(QNA_LOG_PATH, []);
  const headers = ['timestamp', 'phase', 'question', 'answer'];
  const csv = toCsv(qnas, headers);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="coach-qna.csv"');
  res.send(csv);
});

app.get('/api/export/actions', (_req, res) => {
  const acts = safeReadJson(ACTION_LOG_PATH, []);
  const headers = ['timestamp', 'phase', 'action', 'details'];
  const csv = toCsv(acts, headers);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="coach-actions.csv"');
  res.send(csv);
});

// ---- Boot ----
async function init() {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log('Bible Buddy listening on', port);
  });

  if (String(process.env.AUTO_SELFTEST || '') === '1') {
    const base =
      process.env.SELF_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    try {
      await runSelfTest(base);
      console.log('Self-test finished, summary:', SELFTEST.summary);
    } catch (e) {
      console.error('self-test on boot error:', e.message || e);
    }
  }
}

init().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
