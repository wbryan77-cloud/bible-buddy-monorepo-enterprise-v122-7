/**
 * Phase 5J — Alpha tester onboarding, invites, consent gate.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_PATH = path.join(__dirname, '..', 'data', 'alpha-testers.json');
const MAX_TESTERS = Number(process.env.ALPHA_MAX_TESTERS || 200);

const AGE_RANGES = ['under_18', '18-24', '25-34', '35-44', '45-54', '55+'];
const BIBLE_FAMILIARITY = ['new', 'beginner', 'regular_reader', 'advanced'];
const TEST_FOCUS = [
  'emotional_support',
  'bible_questions',
  'doctrine_questions',
  'prayer',
  'life_advice',
  'all_areas',
];
const NOTIFICATION_PREFS = ['morning', 'afternoon', 'evening', 'once_daily', 'twice_daily', 'off'];

function load() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    }
  } catch {
    /* fresh */
  }
  return { testers: [], invites: [] };
}

function save(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  data.testers = (data.testers || []).slice(-MAX_TESTERS);
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function generateTesterId() {
  return `alpha-${crypto.randomBytes(6).toString('hex')}`;
}

function createInvite({ label = '', createdBy = 'admin' } = {}) {
  const data = load();
  const inviteToken = generateToken();
  const invite = {
    inviteToken,
    label: String(label).slice(0, 80),
    createdBy: String(createdBy).slice(0, 40),
    createdAt: new Date().toISOString(),
    used: false,
    testerId: null,
  };
  data.invites = [...(data.invites || []), invite].slice(-MAX_TESTERS);
  save(data);
  return invite;
}

function getInviteLink(inviteToken, baseUrl = '') {
  const base = baseUrl || process.env.ALPHA_TESTER_BASE_URL || process.env.PUBLIC_APP_URL || '';
  const path = `/alpha?token=${encodeURIComponent(inviteToken)}`;
  return base ? `${base.replace(/\/$/, '')}${path}` : path;
}

function validateInviteToken(token) {
  const data = load();
  const invite = (data.invites || []).find((i) => i.inviteToken === token);
  if (!invite) return { valid: false, error: 'Invalid invite link.' };
  if (invite.used && invite.testerId) {
    const tester = (data.testers || []).find((t) => t.testerId === invite.testerId);
    return { valid: true, used: true, invite, tester };
  }
  return { valid: true, used: false, invite };
}

function sanitizeIntake(body = {}) {
  return {
    name: String(body.name || '').trim().slice(0, 80),
    emailOrPhone: String(body.email || body.phone || body.emailOrPhone || '').trim().slice(0, 120),
    ageRange: AGE_RANGES.includes(body.ageRange) ? body.ageRange : null,
    role: String(body.role || '').trim().slice(0, 80),
    deviceType: String(body.deviceType || '').trim().slice(0, 40),
    timeZone: String(body.timeZone || '').trim().slice(0, 60),
    bibleFamiliarity: BIBLE_FAMILIARITY.includes(body.bibleFamiliarity) ? body.bibleFamiliarity : null,
    testFocus: Array.isArray(body.testFocus)
      ? body.testFocus.filter((f) => TEST_FOCUS.includes(f)).slice(0, 6)
      : TEST_FOCUS.includes(body.testFocus)
        ? [body.testFocus]
        : ['all_areas'],
    notificationPreference: NOTIFICATION_PREFS.includes(body.notificationPreference)
      ? body.notificationPreference
      : 'once_daily',
  };
}

function completeOnboarding({ inviteToken, intake = {}, consentAccepted, ndaAccepted } = {}) {
  if (!consentAccepted || !ndaAccepted) {
    return { ok: false, error: 'Consent and confidentiality agreement are required.' };
  }

  const validation = validateInviteToken(inviteToken);
  if (!validation.valid) return { ok: false, error: validation.error };

  const data = load();
  let testerId = validation.tester?.testerId;

  if (validation.used && testerId) {
    const idx = data.testers.findIndex((t) => t.testerId === testerId);
    if (idx >= 0) {
      data.testers[idx] = {
        ...data.testers[idx],
        ...sanitizeIntake(intake),
        consentAccepted: true,
        ndaAccepted: true,
        consentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      save(data);
      return { ok: true, tester: data.testers[idx], sessionToken: testerId };
    }
  }

  testerId = generateTesterId();
  const sanitized = sanitizeIntake(intake);
  const tester = {
    testerId,
    inviteToken,
    ...sanitized,
    consentAccepted: true,
    ndaAccepted: true,
    consentAt: new Date().toISOString(),
    notificationsPaused: false,
    active: true,
    onboardedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sessionsStarted: 0,
  };

  data.testers.push(tester);
  const inv = (data.invites || []).find((i) => i.inviteToken === inviteToken);
  if (inv) {
    inv.used = true;
    inv.testerId = testerId;
    inv.usedAt = new Date().toISOString();
  }
  save(data);
  return { ok: true, tester, sessionToken: testerId };
}

function getTester(testerId) {
  const data = load();
  return (data.testers || []).find((t) => t.testerId === testerId && t.active !== false) || null;
}

function isActiveAlphaTester(testerId) {
  const t = getTester(testerId);
  return !!(t && t.consentAccepted && t.ndaAccepted);
}

function listTesters({ activeOnly = true } = {}) {
  const data = load();
  let testers = data.testers || [];
  if (activeOnly) testers = testers.filter((t) => t.active !== false && t.consentAccepted);
  return testers;
}

function startTestSession(testerId) {
  const data = load();
  const idx = data.testers.findIndex((t) => t.testerId === testerId);
  if (idx < 0) return null;
  data.testers[idx].sessionsStarted = (data.testers[idx].sessionsStarted || 0) + 1;
  data.testers[idx].lastSessionAt = new Date().toISOString();
  save(data);
  return data.testers[idx];
}

function updateNotificationPreference(testerId, preference, paused = false) {
  const data = load();
  const idx = data.testers.findIndex((t) => t.testerId === testerId);
  if (idx < 0) return null;
  if (NOTIFICATION_PREFS.includes(preference)) {
    data.testers[idx].notificationPreference = preference;
  }
  data.testers[idx].notificationsPaused = !!paused;
  data.testers[idx].updatedAt = new Date().toISOString();
  save(data);
  return data.testers[idx];
}

module.exports = {
  DATA_PATH,
  AGE_RANGES,
  BIBLE_FAMILIARITY,
  TEST_FOCUS,
  NOTIFICATION_PREFS,
  createInvite,
  getInviteLink,
  validateInviteToken,
  completeOnboarding,
  getTester,
  isActiveAlphaTester,
  listTesters,
  startTestSession,
  updateNotificationPreference,
  load,
};
