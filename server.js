// server.js — Unified, CommonJS-only, Render-ready

// Core
const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Libs
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const axios = require('axios'); // for Self-Test

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// ----------------------------------------------------------------------------
// Persistence selector (MEMORY default, POSTGRES via Prisma when enabled)
const { createStore: createMem } = require('./lib/persist/memory.js');
const { createPrisma }           = require('./lib/persist/prisma.js');

const USE_PRISMA =
  (process.env.PERSISTENCE || 'MEMORY').toUpperCase() === 'POSTGRES' &&
  process.env.POSTGRES_PRISMA === 'enabled';

let store;
async function makeStore() {
  store = USE_PRISMA ? await createPrisma() : createMem();
  
}

// ----------------------------------------------------------------------------
const { createQueue }     = require('./lib/queue/queue.js');
const { sendEmailResend } = require('./lib/providers/email/resend.js');
const { sendSmsTwilio }   = require('./lib/providers/sms/twilio.js');

const sendQueue = createQueue(async (job) => {
  const { type, to, subject, html, body } = job || {};
  if (type === 'email') {
    const ok = await sendEmailResend({ to, subject, html });
    await store.logSend({ channel: 'email', to, subject, status: ok ? 'ok' : 'fail', detail: ok ? 'sent' : 'stub' });
  } else if (type === 'sms') {
    const ok = await sendSmsTwilio({ to, body });
    await store.logSend({ channel: 'sms', to, subject: '', status: ok ? 'ok' : 'fail', detail: ok ? 'sent' : 'stub' });
  } else if (type === 'precept') {
    await store.logSend({ channel: 'precept', to: '', subject: '', status: 'ok', detail: JSON.stringify({ ref: job.ref }) });
  }
});

// ----------------------------------------------------------------------------
const {
  nextCoachStep,
  summarizeForAdmin,
  suggestionsFromQA,
} = require('./lib/coach/engine.js');

const { checkPrecept, syncAll: preceptSyncAll } = require('./lib/precept/engine.js');

// ----------------------------------------------------------------------------
// Static (Admin + Public)
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/',      express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
// Health / Status
app.get('/health', (_req, res) => res.json({ ok: true, version: process.env.APP_VERSION || 'v122.10.11' }));
app.get('/status', (_req, res) => {
  res.json({
    phaseAutoStart: (process.env.PHASE_AUTOSTART || 'false') === 'true',
    aiDeploymentAgent: (process.env.AI_DEPLOYMENT_AGENT || 'false') === 'true',
    sabbathQuiet: (process.env.SABBATH_QUIET || 'true') === 'true',
    sundayRenewal: process.env.SUNDAY_RENEWAL || '08:00',
    tz: process.env.TZ || 'UTC',
    ocrEnabled: (process.env.OCR_ENABLED || 'true') === 'true',
    persistence: USE_PRISMA ? 'POSTGRES' : 'MEMORY'
  });
});

// ----------------------------------------------------------------------------
// Coach (per-phase adaptive Q&A)
app.get('/api/coach/next', async (req, res) => {
  const phase   = Number(req.query.phase || 1);
  const metrics = req.query.metrics ? JSON.parse(req.query.metrics) : { engagement: 0.72, scriptureAccuracy: 0.91, feedbackPositivity: 0.86 };
  const out = await nextCoachStep({ phase, metrics, unanswered: 0, lastTopic: null });
  res.json(out);
});

app.post('/api/coach/answer', async (req, res) => {
  const { topic, question, answer } = req.body || {};
  const saved = await store.saveQA({ topic, question, answer });
  res.json({ ok: true, saved });
});

app.get('/api/coach/suggestions', async (_req, res) => {
  const qa = await store.listQA();
  const sug = await suggestionsFromQA(qa);
  res.json(sug);
});

app.get('/api/coach/summary', async (_req, res) => {
  const qa = await store.listQA();
  const acts = await store.listActions();
  const journal = await store.listJournal();
  const sum = await summarizeForAdmin({ qa, actions: acts, journal });
  res.json(sum);
});

// ----------------------------------------------------------------------------
// Actions (admin one-click)
app.post('/api/actions/apply', async (req, res) => {
  const act = req.body || {};
  await store.saveAction(act);
  res.json({ ok: true });
});

app.post('/api/actions/advance-phase', async (_req, res) => {
  const current = (await store.getPhase()) || 1;
  const next = Math.min(4, current + 1);
  await store.setPhase(next);
  await store.saveAction({ type: 'advance_phase', to: next, ts: new Date().toISOString() });
  res.json({ ok: true, phase: next });
});

// ----------------------------------------------------------------------------
// CSV helpers + endpoints
function toCSV(rows) {
  if (!rows || !rows.length) return 'no,data';
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const header = keys.join(',');
  const lines = rows.map(r => keys.map(k => {
    const v = r[k] == null ? '' : String(r[k]).replace(/"/g, '""');
    return `"${v}"`;
  }).join(','));
  return [header, ...lines].join('\n');
}

app.get('/api/export/qa.csv', async (_req, res) => {
  const rows = await store.listQA();
  const csv = toCSV(rows);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="coach_qa.csv"');
  res.send(csv);
});

app.get('/api/export/actions.csv', async (_req, res) => {
  const rows = await store.listActions();
  const csv = toCSV(rows);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="coach_actions.csv"');
  res.send(csv);
});

// ----------------------------------------------------------------------------
// Verse mapping (upload / export / preview-diff / apply / write-csv)
const mapPath = path.join(__dirname, 'data', 'verse_mapping.json');
function readMap() {
  try { return JSON.parse(fs.readFileSync(mapPath, 'utf-8')); }
  catch { return { misapplied: {}, themes: {} }; }
}
function writeMap(obj) {
  fs.mkdirSync(path.dirname(mapPath), { recursive: true });
  fs.writeFileSync(mapPath, JSON.stringify(obj, null, 2));
  return obj;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Upload JSON/CSV (CSV expects columns: ref,toTheme)
app.post('/api/mapping/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const name = (req.file.originalname || '').toLowerCase();

  let mapping = readMap();

  if (name.endsWith('.json')) {
    const incoming = JSON.parse(req.file.buffer.toString('utf-8'));
    mapping = incoming;
  } else if (name.endsWith('.csv')) {
    const rows = parse(req.file.buffer.toString('utf-8'), { columns: true, skip_empty_lines: true });
    mapping.misapplied = mapping.misapplied || {};
    mapping.themes     = mapping.themes || {};
    for (const r of rows) {
      const ref = (r.ref || r.Ref || '').trim();
      const toTheme = (r.toTheme || r.theme || '').trim().toLowerCase();
      if (!ref || !toTheme) continue;
      mapping.misapplied[ref] = { toTheme };
      mapping.themes[toTheme] = mapping.themes[toTheme] || [];
    }
  } else {
    return res.status(400).send('Unsupported file type. Use .json or .csv');
  }

  writeMap(mapping);
  res.json({ ok: true, count: Object.keys(mapping.misapplied || {}).length, themes: Object.keys(mapping.themes || {}).length });
});

// Export mapping as CSV
app.get('/api/mapping/export.csv', (_req, res) => {
  const m = readMap();
  const rows = Object.entries(m.misapplied || {}).map(([ref, v]) => ({ ref, toTheme: v.toTheme }));
  const csv = toCSV(rows);
  res.set('Content-Type', 'text/csv');
  res.set('Content-Disposition', 'attachment; filename="verse_mapping.csv"');
  res.send(csv);
});

// Write current mapping to /data/verse_mapping.csv
app.post('/api/mapping/write-csv', (_req, res) => {
  const m = readMap();
  const rows = Object.entries(m.misapplied || {}).map(([ref, v]) => ({ ref, toTheme: v.toTheme }));
  const csv = ['ref,toTheme', ...rows.map(r => `${r.ref},${r.toTheme}`)].join('\n');
  const csvPath = path.join(__dirname, 'data', 'verse_mapping.csv');
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, csv);
  res.json({ ok: true, path: '/data/verse_mapping.csv', count: rows.length });
});

// Preview mapping diff
app.post('/api/mapping/preview-diff', (req, res) => {
  const sugg = Array.isArray(req.body) ? req.body : [];
  const before = readMap();
  const after = JSON.parse(JSON.stringify(before));
  let add = 0;

  for (const s of sugg) {
    if (s.type === 'move_verse' && s.ref && s.toTheme) {
      after.themes[s.toTheme] = after.themes[s.toTheme] || [];
      for (const t of Object.keys(after.themes)) {
        after.themes[t] = (after.themes[t] || []).filter(r => r !== s.ref);
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
    afterCount: Object.keys(after.misapplied || {}).length,
    before,
    after
  });
});

// Apply accepted suggestions
app.post('/api/mapping/apply', (req, res) => {
  const sugg = Array.isArray(req.body) ? req.body : [];
  const before = readMap();
  const after = JSON.parse(JSON.stringify(before));
  let applied = 0;

  for (const s of sugg) {
    if (s.type === 'move_verse' && s.ref && s.toTheme) {
      after.themes[s.toTheme] = after.themes[s.toTheme] || [];
      for (const t of Object.keys(after.themes)) {
        after.themes[t] = (after.themes[t] || []).filter(r => r !== s.ref);
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
    afterCount: Object.keys(after.misapplied || {}).length
  });
});

// ----------------------------------------------------------------------------
// Providers status & tests
app.get('/api/providers/status', async (_req, res) => {
  const st = {
    email:  { provider: (process.env.EMAIL_PROVIDER || 'resend'), ready: !!process.env.RESEND_API_KEY },
    sms:    { provider: (process.env.SMS_PROVIDER   || 'twilio'), ready: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM) },
  };
  const recentSends = await store.recentSends();
  res.json({ st, recentSends });
});

app.post('/api/providers/test-email', async (_req, res) => {
  const ok = await sendEmailResend({ to: process.env.TEST_EMAIL || 'you@example.com', subject: 'Bible Buddy Test', html: '<h3>It works</h3>' });
  res.json({ ok });
});

app.post('/api/providers/test-sms', async (_req, res) => {
  const ok = await sendSmsTwilio({ to: process.env.TEST_SMS || '+15555555555', body: 'Bible Buddy test SMS' });
  res.json({ ok });
});

// ----------------------------------------------------------------------------
// Precept / Scripture utilities
app.get('/api/precept/check', async (req, res) => {
  const ref = (req.query.ref || 'John 3:16');
  const out = await checkPrecept(ref);
  res.json({ ref, suggestions: out });
});

app.post('/api/precept/sync-all', async (_req, res) => {
  const mapping = readMap();
  const result = await preceptSyncAll(mapping);
  for (const r of result || []) {
    await sendQueue.add({ type: 'precept', ref: r.ref });
  }
  res.json({ ok: true, queued: (result || []).length });
});

// ----------------------------------------------------------------------------
// Insights & Persistence info
app.get('/api/insights', async (_req, res) => {
  const qa = await store.listQA();
  const actions = await store.listActions();
  const byTopic = {};
  for (const q of qa) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
  const actionTypes = {};
  for (const a of actions) actionTypes[a.type] = (actionTypes[a.type] || 0) + 1;
  res.json({ byTopic, actionTypes });
});

app.get('/api/persistence', (_req, res) => {
  res.json({ mode: USE_PRISMA ? 'POSTGRES' : 'MEMORY', connected: !!USE_PRISMA });
});

app.get('/api/admin/export-snapshot', async (_req, res) => {
  const payload = {
    at: new Date().toISOString(),
    qa: await store.listQA(),
    actions: await store.listActions(),
    sends: await store.recentSends()
  };
  res.set('Content-Type', 'application/json');
  res.set('Content-Disposition', 'attachment; filename="snapshot.json"');
  res.send(JSON.stringify(payload, null, 2));
});

// -------------------------- SELF-TEST RUNNER ------------------------------
let SELFTEST = {
  lastRunAt: null,
  results: [],
  summary: { passed: 0, failed: 0 },
};

async function probe(name, fn) {
  const started = Date.now();
  try {
    const out = await fn();
    SELFTEST.results.push({ name, ok: true, ms: Date.now() - started, detail: out });
    SELFTEST.summary.passed++;
  } catch (e) {
    SELFTEST.results.push({
      name,
      ok: false,
      ms: Date.now() - started,
      error: (e && e.response && e.response.data) ? e.response.data : (e && e.message) || String(e)
    });
    SELFTEST.summary.failed++;
  }
}

async function runSelfTest(base) {
  SELFTEST = { lastRunAt: new Date().toISOString(), results: [], summary: { passed: 0, failed: 0 } };

  await probe('health', async () => {
    const r = await axios.get(`${base}/health`);
    if (!r.data || !r.data.ok) throw new Error('health not ok');
    return r.data;
  });

  await probe('status', async () => (await axios.get(`${base}/status`)).data);

  await probe('coach/next', async () => {
    const r = await axios.get(`${base}/api/coach/next?phase=1`);
    if (!r.data || !r.data.prompt) throw new Error('no coach prompt');
    return { topic: r.data.topic };
  });

  await probe('coach/answer', async () => {
    const r = await axios.post(`${base}/api/coach/answer`, {
      topic: 'peace',
      question: 'What spoke to you this week?',
      answer: 'John 14:27 encouraged me.'
    });
    if (!r.data || !r.data.ok) throw new Error('answer not saved');
    return r.data;
  });

  await probe('coach/suggestions', async () => ({ count: (await axios.get(`${base}/api/coach/suggestions`)).data?.length || 0 }));
  await probe('coach/summary',     async () => ({ keys: Object.keys((await axios.get(`${base}/api/coach/summary`)).data || {}) }));

  const demoSugg = [
    { type: 'move_verse', ref: 'John 3:16', toTheme: 'hope' },
    { type: 'move_verse', ref: 'Philippians 4:6', toTheme: 'peace' }
  ];
  await probe('mapping/preview-diff', async () => {
    const r = await axios.post(`${base}/api/mapping/preview-diff`, demoSugg);
    if (!r.data || !r.data.ok) throw new Error('preview diff failed');
    return { add: r.data.add };
  });

  await probe('mapping/apply', async () => {
    const r = await axios.post(`${base}/api/mapping/apply`, demoSugg);
    if (!r.data || !r.data.ok) throw new Error('apply failed');
    return { applied: r.data.applied };
  });

  await probe('export/qa.csv',      async () => ({ ok: !!(await axios.get(`${base}/api/export/qa.csv`)).data }));
  await probe('export/actions.csv', async () => ({ ok: !!(await axios.get(`${base}/api/export/actions.csv`)).data }));
  await probe('providers/status',   async () => (await axios.get(`${base}/api/providers/status`)).data);
  await probe('precept/check',      async () => ({ suggestions: (await axios.get(`${base}/api/precept/check?ref=John%203:16`)).data?.suggestions?.length || 0 }));
  await probe('insights',           async () => (await axios.get(`${base}/api/insights`)).data);

  if (SELFTEST.summary.failed === 0 && (process.env.AUTO_ADVANCE_ON_PASS || '0') === '1') {
    await probe('actions/advance-phase', async () => (await axios.post(`${base}/api/actions/advance-phase`)).data);
  }

  return SELFTEST;
}

app.post('/api/selftest/run', async (req, res) => {
  const base = (req.body && req.body.base) ? req.body.base : (process.env.SELF_BASE_URL || `http://localhost:${process.env.PORT || 3000}`);
  try {
    const out = await runSelfTest(base);
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: (e && e.message) || String(e), results: SELFTEST.results });
  }
});

app.get('/api/selftest/status', (_req, res) => res.json(SELFTEST));

// ----------------------------------------------------------------------------
// Boot
async function init() {
  await makeStore();
  const port = process.env.PORT || 3000;
  app.listen(port, async () => {
    console.log('Bible Buddy listening on :' + port);
    if ((process.env.AUTO_SELFTEST || '0') === '1') {
      const base = process.env.SELF_BASE_URL || `http://localhost:${port}`;
      try {
        await runSelfTest(base);
        console.log('Self-test finished:', SELFTEST.summary);
      } catch (e) {
        console.error('Self-test error:', e && e.message ? e.message : e);
      }
    }
  });
}

init().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
