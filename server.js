// server.js — Bible Buddy unified, Render-ready, Node 18+

// Serves static files from /public and /admin
// Provides JSON APIs for self-test + providers
// Mounts AI routes for:
//   /api/ai/tester-chat
//   /api/ai/tester-image
//   /admin/api/ai/helper
// Adds Analyze Note API at /api/analyze
// Exposes /api/health for Render health checks

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ===== App metadata =====
const APP_VERSION = 'v122.10.11 (unified + analyze)';

// ===== Basic middleware =====
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Static assets =====
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(__dirname, 'admin');
const DATA_DIR = path.join(__dirname, 'data');

app.use(express.static(PUBLIC_DIR));
app.use('/admin', express.static(ADMIN_DIR));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
app.use('/data', express.static(DATA_DIR));

// ===== Helper functions for self-test / providers =====
function computeProviderStatus() {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasTwilioToken = !!process.env.TWILIO_AUTH_TOKEN;

  const emailStr = hasResend
    ? 'Email: Resend (configured)'
    : 'Email: Resend (missing keys)';

  const smsStr = hasTwilioSid && hasTwilioToken
    ? 'SMS: Twilio (configured)'
    : 'SMS: Twilio (missing keys)';

  return {
    email: emailStr,
    sms: smsStr,
    detail: {
      email: emailStr,
      sms: smsStr,
    },
  };
}

function buildSelfTestPayload() {
  const now = new Date().toISOString();
  const providers = computeProviderStatus();
  const queue = { ok: true, detail: 'count≈1' };

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
app.get('/api/health', (req, res) => {
  const base = buildSelfTestPayload();
  res.json({
    ok: base.health.ok,
    version: APP_VERSION,
    time: base.health.time,
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
  const providers = computeProviderStatus();
  res.json({
    detail: providers.detail,
  });
});

// Optional: API selftest mirror
app.get('/api/selftest', (req, res) => {
  const payload = buildSelfTestPayload();
  res.json(payload);
});

// ===== AI Router (Tester + Admin Helper) =====
try {
  const aiRouter = require('./admin/ai/routes');
  app.use('/api/ai', aiRouter);
  console.log('AI routes loaded!');
} catch (e) {
  console.warn('WARNING: AI routes failed to load:', e.message);
}

// ===== Analyze Note API (Lab) =====
try {
  const analyzeRouter = require('./routes/analyze');
  app.use('/api/analyze', analyzeRouter);
  console.log('Analyze routes loaded!');
} catch (e) {
  console.warn('WARNING: Analyze routes failed to load:', e.message);
}

// ===== Attach Project Brain & Admin Assistant & Buddy & Content Helper =====
try {
  const adminAssistantRouter = require('./routes/adminAssistant');
  app.use('/admin/assistant', adminAssistantRouter);

  const buddyRouter = require('./routes/buddy');
  app.use('/buddy', buddyRouter);

  const contentHelperRouter = require('./routes/contentHelper');
  app.use('/admin/content', express.json(), contentHelperRouter);

  console.log('Project Brain + Admin Assistant + Buddy + Content routes loaded!');
} catch (err) {
  console.warn('WARNING: Brain routes failed:', err.message);
}

// ===== Explicit routes for main pages =====

// Root ➝ main index.html from public
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Admin root ➝ admin dashboard HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

// ------------------------------
// Analyze Note + Suggest Verses
app.post('/api/analyze/note', async (req, res) => {
  try {
    const { note, userId, chosenVerses, tags } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'No note text provided.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Missing OPENAI_API_KEY env var');
      return res.status(500).json({ error: 'AI not configured on server.' });
    }

    // Call OpenAI: gpt-4.1-mini
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are Bible Buddy, a gentle Christian devotional helper. ' +
              'You help pastors and believers outline a short sermon or devotional, ' +
              'and you suggest 3–5 relevant Bible verses (with references). ' +
              'Keep everything rooted in Scripture and orthodox Christian teaching.',
          },
          {
            role: 'user',
            content:
              `Here is a rough sermon note:\n\n` +
              `"""${note}"""\n\n` +
              '1) Give a clear outline for a short sermon or devotional (with headings and bullets).\n' +
              '2) Suggest 3–5 Bible verses with references that fit this theme.\n' +
              '3) End with 1–2 reflection questions and a short closing prayer.'
          }
        ],
        temperature: 0.5,
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error('OpenAI error:', aiRes.status, txt);
      return res.status(500).json({
        error: 'Error from AI service.',
        detail: txt,
      });
    }

    const aiData = await aiRes.json();
    const outline =
      aiData.choices?.[0]?.message?.content?.trim() ||
      'Bible Buddy could not generate an outline. Please try again.';

    return res.json({ reply: outline });
  } catch (err) {
    console.error('Analyze Note error:', err);
    return res.status(500).json({ error: 'Server error analyzing note.' });
  }
});
