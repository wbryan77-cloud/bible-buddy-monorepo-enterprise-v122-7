// server.js — Bible Buddy unified, Render-ready, Node 20+

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = 'v122.14.0 (platform unification foundation)';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(__dirname, 'admin');
const DATA_DIR = path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.static(PUBLIC_DIR));
app.use('/admin', express.static(ADMIN_DIR));
// PII lives under data/ (sessions, feedback). Do not expose via public static file serving.

function computeProviderStatus() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasTwilioToken = !!process.env.TWILIO_AUTH_TOKEN;

  return {
    openai: hasOpenAI ? 'OpenAI: configured' : 'OpenAI: missing OPENAI_API_KEY',
    email: hasResend ? 'Email: Resend configured' : 'Email: Resend missing keys',
    sms: hasTwilioSid && hasTwilioToken ? 'SMS: Twilio configured' : 'SMS: Twilio missing keys',
    detail: {
      openai: hasOpenAI ? 'configured' : 'missing',
      email: hasResend ? 'configured' : 'missing',
      sms: hasTwilioSid && hasTwilioToken ? 'configured' : 'missing',
    },
  };
}

function buildSelfTestPayload() {
  return {
    health: {
      ok: true,
      version: APP_VERSION,
      time: new Date().toISOString(),
    },
    providers: computeProviderStatus(),
    queue: { ok: true, detail: 'not configured for production queue yet' },
  };
}

function mountRoute(label, mountPath, requirePath) {
  try {
    const router = require(requirePath);
    app.use(mountPath, router);
    console.log(`${label} loaded at ${mountPath}`);
  } catch (error) {
    console.warn(`WARNING: ${label} failed to load:`, error.message);
  }
}

app.get('/api/health', (req, res) => {
  const base = buildSelfTestPayload();
  res.json({ ok: true, version: base.health.version, time: base.health.time });
});

app.get('/health', (req, res) => {
  res.json(buildSelfTestPayload());
});

app.get('/selftest', (req, res) => {
  res.json(buildSelfTestPayload());
});

app.get('/api/selftest', (req, res) => {
  res.json(buildSelfTestPayload());
});

app.get('/admin/api/selftest', (req, res) => {
  const base = buildSelfTestPayload();
  res.json({ version: APP_VERSION, health: 'ok', queue: base.queue });
});

app.get('/admin/api/providers', (req, res) => {
  res.json({ detail: computeProviderStatus().detail });
});

// Core routes. Optional modules fail soft so one broken feature does not crash Render.
mountRoute('AI tester routes', '/api/ai', './admin/ai/routes');
mountRoute('Analyze routes', '/api/analyze', './routes/analyze');
mountRoute('Admin assistant routes', '/admin/assistant', './routes/adminAssistant');
mountRoute('Buddy routes', '/buddy', './routes/buddy');
mountRoute('Content helper routes', '/admin/content', './routes/contentHelper');
mountRoute('Realtime voice routes', '/api/realtime', './routes/realtime');
mountRoute('Health signal routes', '/api/health/signals', './routes/healthSignals');
mountRoute('Learning signal routes', '/api/learning', './routes/learningSignals');
mountRoute('Beta routes', '/api/beta', './routes/beta');
mountRoute('Platform unification routes', '/api/platform-unification', './routes/platformUnification');

// Simple fallback analyze endpoint if routes/analyze is unavailable.
app.post('/api/analyze/note', async (req, res) => {
  try {
    const note = String(req.body?.note || '').trim();
    if (!note) return res.status(400).json({ error: 'No note text provided.' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'AI not configured on server.' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content:
              'You are Bible Buddy, a gentle Scripture-grounded companion. Distinguish Scripture from explanation and never invent Bible verses.',
          },
          {
            role: 'user',
            content:
              `Note:\n\n${note}\n\nCreate a clear devotional outline, suggest 3-5 Bible references, and end with reflection questions and a short prayer.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI analyze error:', response.status, text);
      return res.status(500).json({ error: 'AI service error.' });
    }

    const data = await response.json();
    res.json({ reply: data?.choices?.[0]?.message?.content || 'No response generated.' });
  } catch (error) {
    console.error('Analyze Note fallback error:', error);
    res.status(500).json({ error: 'Server error analyzing note.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

app.get('/beta', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'beta.html'));
});

app.get('/admin/beta-review', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'beta-review.html'));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found', path: req.path });
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

const { logStartupDiagnostics } = require('./services/buddyRuntimeConfig');

app.listen(PORT, () => {
  console.log(`Bible Buddy ${APP_VERSION} listening on port ${PORT}`);
  logStartupDiagnostics();
});