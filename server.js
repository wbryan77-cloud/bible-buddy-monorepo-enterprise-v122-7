// server.js – Bible Buddy Unified, Render-ready, Node 18+
//
// - Serves static files from /public and /admin
// - Provides JSON APIs for self-test + providers
// - Mounts AI routes for:
//      * /api/ai/tester-chat
//      * /api/ai/tester-image
//      * /admin/api/ai/helper
// - Exposes /api/health for Render health checks

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ===== App metadata =====
const APP_VERSION = 'v122.10.11 (Unified)';

// ===== Basic middleware =====
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Static assets =====
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

const ADMIN_DIR = path.join(__dirname, 'admin');
app.use('/admin', express.static(ADMIN_DIR));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
app.use('/data', express.static(DATA_DIR));

// ===== Helper functions for self-test / providers =====

function computeProvidersStatus() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasTwilioToken = !!process.env.TWILIO_AUTH_TOKEN;

  const emailStr = hasResend ? 'Email: resend (configured)' : 'Email: resend (missing keys)';
  const smsStr =
    hasTwilioSid && hasTwilioToken
      ? 'SMS: twilio (configured)'
      : 'SMS: twilio (missing keys)';
  const queueStr = 'Queue: memory';

  return {
    ok: hasResend && hasTwilioSid && hasTwilioToken,
    detail: `${emailStr} · ${smsStr} · ${queueStr}`,
  };
}

function buildSelfTestPayload() {
  const now = new Date().toISOString();
  const providers = computeProvidersStatus();
  const queue = { ok: true, detail: 'count=1' };

  return {
    health: {
      ok: true,
      version: APP_VERSION,
      time: now,
    },
    providers,
    queue,
  };
}

// ===== Health check for Render =====
//
// Render is calling /api/health (per your screenshot).
// We return 200 OK with a simple JSON payload.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    version: APP_VERSION,
    time: new Date().toISOString(),
  });
});

// ===== JSON APIs for health & providers (for the dashboard) =====

// Legacy selftest endpoint
app.get('/selftest', (req, res) => {
  const payload = buildSelfTestPayload();
  res.json(payload);
});

// Admin dashboard selftest
app.get('/admin/api/selftest', (req, res) => {
  const base = buildSelfTestPayload();
  res.json({
    version: APP_VERSION,
    health: base.health.ok ? 'ok' : 'fail',
    queue: base.queue,
  });
});

// Admin dashboard providers
app.get('/admin/api/providers', (req, res) => {
  const providers = computeProvidersStatus();
  res.json({
    detail: providers.detail,
  });
});

// ===== AI Router (Tester + Admin Helper) =====

try {
  const aiRouter = require('./admin/ai/routes');
  app.use('/api/ai', aiRouter);
  app.use('/admin/api/ai', aiRouter);
  console.log('AI routes loaded');
} catch (e) {
  console.warn('WARNING: AI routes failed to load:', e.message);
}

app.use('/api/analyze', require('./routes/analyze'));

// ===== Project Brain & Admin Assistant & Buddy & Content Helper =====
try {
  const adminAssistantRouter = require('./routes/adminAssistant');
  app.use('/admin', adminAssistantRouter);

  const buddyRouter = require('./routes/buddy');
  app.use('/buddy', buddyRouter);

  app.use('/admin/content', express.json(), contentHelperRouter);

  console.log('Project Brain + Admin Assistant + Buddy + Content routes loaded!');
} catch (err) {
  console.warn('WARNING: Brain routes failed:', err.message);
}

// ===== Explicit routes for main pages =====

// Root → main index.html from public
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Admin root → admin dashboard HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

// Tester Lab
app.get(['/lab', '/lab.html'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'lab.html'));
});

// Fallback 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

// ===== Boot =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Bible Buddy listening on port', PORT, 'version', APP_VERSION);
});
