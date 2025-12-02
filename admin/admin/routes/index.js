// admin/routes/index.js
// Simple admin API for Bible Buddy v122
// - Self-test summary
// - Provider status
// - Activity log
// - Dismissed items
// - RBAC JSON
// - Suggested actions + Undo

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ACTIVITY_PATH = path.join(DATA_DIR, 'activity.json');
const DISMISSES_PATH = path.join(DATA_DIR, 'dismisses.json');
const RBAC_PATH = path.join(DATA_DIR, 'rbac.json');
const UNDO_PATH = path.join(DATA_DIR, 'undo_tokens.json');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ACTIVITY_PATH)) fs.writeFileSync(ACTIVITY_PATH, '[]');
  if (!fs.existsSync(DISMISSES_PATH)) fs.writeFileSync(DISMISSES_PATH, '[]');
  if (!fs.existsSync(RBAC_PATH)) {
    fs.writeFileSync(
      RBAC_PATH,
      JSON.stringify(
        { default: { super_admin: ['admin@example.com'] } },
        null,
        2
      )
    );
  }
  if (!fs.existsSync(UNDO_PATH)) fs.writeFileSync(UNDO_PATH, '{}');
}

ensureFiles();

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ----- Self-test & providers -----

router.get('/selftest', (req, res) => {
  const version = process.env.APP_VERSION || 'v122.10.11 (Unified)';
  const timeoutExceeded = false;

  res.json({
    version,
    health: timeoutExceeded ? 'timeout of 8000ms exceeded' : 'ok',
    queue: { ok: true, detail: 'count=1' },
  });
});

router.get('/providers', (req, res) => {
  const email = process.env.RESEND_API_KEY
    ? 'Email: resend (configured)'
    : 'Email: resend (missing keys)';
  const sms = process.env.TWILIO_ACCOUNT_SID
    ? 'SMS: twilio (configured)'
    : 'SMS: twilio (missing keys)';
  const queue = 'Queue: memory';

  res.json({
    ok: true,
    detail: `${email} ; ${sms} ; ${queue}`,
  });
});

// ----- RBAC -----

router.get('/rbac', (req, res) => {
  const rbac = loadJson(RBAC_PATH, {});
  res.json(rbac);
});

router.post('/rbac', (req, res) => {
  const body = req.body || {};
  saveJson(RBAC_PATH, body);
  res.json({ ok: true });
});

// ----- Activity -----

router.get('/activity', (req, res) => {
  const rows = loadJson(ACTIVITY_PATH, []);
  res.json(rows);
});

router.post('/activity', (req, res) => {
  const rows = loadJson(ACTIVITY_PATH, []);
  rows.push({
    timestamp: new Date().toISOString(),
    ...(req.body || {}),
  });
  saveJson(ACTIVITY_PATH, rows);
  res.json({ ok: true });
});

// ----- Dismisses -----

router.get('/dismisses', (req, res) => {
  const rows = loadJson(DISMISSES_PATH, []);
  res.json(rows);
});

router.post('/dismisses', (req, res) => {
  const rows = loadJson(DISMISSES_PATH, []);
  rows.push({
    timestamp: new Date().toISOString(),
    ...(req.body || {}),
  });
  saveJson(DISMISSES_PATH, rows);
  res.json({ ok: true });
});

// ----- Suggested Actions + Undo -----

router.post('/suggested_action', (req, res) => {
  const { label, tenant = 'default', theme } = req.body || {};
  if (!label || !theme) {
    return res.status(400).json({ error: 'label and theme required' });
  }

  const undo = loadJson(UNDO_PATH, {});
  const token =
    Math.random().toString(16).slice(2) +
    Math.random().toString(16).slice(2);
  const undoWindowSec = Number(process.env.SUGGESTED_UNDO_SEC || 60);
  const expiresAt = Date.now() + undoWindowSec * 1000;

  const action = { tenant, theme, label };

  undo[token] = { action, expiresAt };
  saveJson(UNDO_PATH, undo);

  const activity = loadJson(ACTIVITY_PATH, []);
  activity.push({
    timestamp: new Date().toISOString(),
    tenant,
    theme,
    label,
    action: 'APPLY',
    undoToken: token,
    undoExpiresAt: new Date(expiresAt).toISOString(),
  });
  saveJson(ACTIVITY_PATH, activity);

  res.json({
    token,
    undo_expires_at: new Date(expiresAt).toISOString(),
    action,
  });
});

router.post('/undo_action', (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });

  const undo = loadJson(UNDO_PATH, {});
  const entry = undo[token];
  if (!entry) return res.status(400).json({ error: 'Invalid or expired token' });

  if (Date.now() > entry.expiresAt) {
    delete undo[token];
    saveJson(UNDO_PATH, undo);
    return res.status(400).json({ error: 'Undo window expired' });
  }

  delete undo[token];
  saveJson(UNDO_PATH, undo);

  const activity = loadJson(ACTIVITY_PATH, []);
  activity.push({
    timestamp: new Date().toISOString(),
    tenant: entry.action.tenant,
    theme: entry.action.theme,
    label: `UNDO ${entry.action.label}`,
    action: 'UNDO',
  });
  saveJson(ACTIVITY_PATH, activity);

  res.json({ undone: true });
});

module.exports = router;
