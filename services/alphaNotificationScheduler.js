/**
 * Phase 5J — Gentle alpha notification queue (no spam; optional SMS/email).
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');
const {
  listTesters,
  updateNotificationPreference,
  NOTIFICATION_CATEGORIES,
  getCategoryPreferences,
  setCategoryPreference,
} = require('./alphaTesterManager');
const { sendEmailResend } = require('../lib/providers/email/resend');
const { sendSmsTwilio } = require('../lib/providers/sms/twilio');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PREFS_PATH = path.join(DATA_DIR, 'alpha-notification-preferences.json');
const HISTORY_PATH = path.join(DATA_DIR, 'alpha-notification-history.jsonl');

const PROMPTS = {
  morning: 'Good morning. How are you feeling today? Want to talk, pray, or read a Scripture together?',
  afternoon:
    'Quick check-in: has anything been weighing on you today, or do you have a Bible question on your mind?',
  evening:
    'How was your day? Want to reflect, pray, or ask BibleBuddy about anything before tonight?',
  sabbath:
    'Want to spend a few minutes in Scripture today? Ask Buddy for a verse, prayer, or Bible study topic.',
  once_daily:
    'Good morning. How are you feeling today? Want to talk, pray, or read a Scripture together?',
  twice_daily:
    'Quick check-in: has anything been weighing on you today, or do you have a Bible question on your mind?',
};

function hasEmailProvider() {
  return !!process.env.RESEND_API_KEY;
}

function hasSmsProvider() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

/** Queue builders historically set `emailOrPhone`; dispatch required `email`. */
function resolveEmailAddress(item = {}) {
  if (item.email) return String(item.email).trim();
  const v = String(item.emailOrPhone || '').trim();
  if (v.includes('@')) return v;
  return null;
}

function resolvePhoneNumber(item = {}) {
  if (item.phone) return String(item.phone).trim();
  const v = String(item.emailOrPhone || '').trim();
  if (!v || v.includes('@')) return null;
  return v;
}

function loadPrefs() {
  try {
    if (fs.existsSync(PREFS_PATH)) return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'));
  } catch {
    /* fresh */
  }
  return { globalPaused: false };
}

function savePrefs(prefs) {
  const dir = path.dirname(PREFS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), 'utf8');
}

function slotForPreference(pref) {
  if (pref === 'morning') return 'morning';
  if (pref === 'afternoon') return 'afternoon';
  if (pref === 'evening') return 'evening';
  if (pref === 'twice_daily') return ['morning', 'evening'];
  if (pref === 'once_daily') return 'morning';
  return null;
}

function buildNotificationQueue({ slot = 'morning' } = {}) {
  if (loadPrefs().globalPaused) return [];
  const queue = [];
  const body = PROMPTS[slot] || PROMPTS.morning;
  for (const t of listTesters()) {
    const channels = Array.isArray(t.notificationChannels) ? t.notificationChannels : [];
    if (t.notificationsPaused || t.notificationPreference === 'off' || !t.notificationConsentAt || channels.length === 0) continue;
    const slots = slotForPreference(t.notificationPreference);
    if (!(slots === slot || (Array.isArray(slots) && slots.includes(slot)))) continue;
    const email = resolveEmailAddress({ emailOrPhone: t.emailOrPhone });
    const phone = resolvePhoneNumber({ emailOrPhone: t.emailOrPhone });
    const channel = channels.includes('in_app') ? 'in_app'
      : (channels.includes('email') && email) ? 'email'
      : (channels.includes('sms') && phone) ? 'sms' : null;
    if (!channel) continue;
    queue.push({
      testerId: t.testerId, slot, body, channel,
      emailOrPhone: t.emailOrPhone || null, email, phone,
      scheduledAt: new Date().toISOString(),
    });
  }
  return queue;
}

/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — real dispatch attempt.
 *
 * BUGFIX + ENHANCEMENT: previously this always set sent=false regardless
 * of provider configuration (the two provider files it was documented to
 * call were never actually wired in, and were themselves unloadable ESM
 * syntax in a CommonJS project — see lib/providers/*). Now this actually
 * calls the shared provider functions. In every environment without
 * RESEND_API_KEY / Twilio credentials configured (every environment this
 * batch was built/tested in), the providers themselves return the same
 * safe stub result as before — so default behavior is unchanged, and no
 * notification is ever actually sent until an operator configures real
 * provider credentials.
 */
async function dispatchNotification(item) {
  const result = {
    ...item,
    attempted: true,
    queued: false,
    sent: false,
    delivered: false,
    provider: 'none',
    at: new Date().toISOString(),
  };
  const emailTo = resolveEmailAddress(item);
  const phoneTo = resolvePhoneNumber(item) || item.emailOrPhone || null;
  try {
    if (item.channel === 'in_app') {
      result.provider = 'in_app';
      result.queued = true;
      result.note = 'Queued for in-app display only.';
    } else if (item.channel === 'email') {
      if (!hasEmailProvider() || !emailTo) {
        result.error = 'Email provider or explicit destination unavailable.';
      } else {
        const sent = await sendEmailResend({ to: emailTo, subject: item.subject || 'BibleBuddy', html: item.html, text: item.body });
        result.provider = 'resend';
        result.to = emailTo;
        result.queued = sent.queued === true || sent.sent === true;
        result.sent = sent.sent === true;
        result.delivered = sent.delivered === true;
        result.error = sent.error || null;
      }
    } else if (item.channel === 'sms') {
      if (!hasSmsProvider() || !phoneTo) {
        result.error = 'SMS provider or explicit destination unavailable.';
      } else {
        const sent = await sendSmsTwilio({ to: phoneTo, body: item.body });
        result.provider = 'twilio';
        result.to = phoneTo;
        result.queued = sent.queued === true || sent.sent === true;
        result.sent = sent.sent === true;
        result.delivered = sent.delivered === true;
        result.error = sent.error || null;
      }
    } else {
      result.error = 'Explicit supported notification channel required.';
    }
  } catch (error) {
    result.error = error && error.message ? error.message : 'Notification dispatch failed.';
  }
  appendJsonlSafe(HISTORY_PATH, result);
  return result;
}

// --- Category model (Deliverable 8) -----------------------------------

const CATEGORY_DEFAULT_BODY = {
  [NOTIFICATION_CATEGORIES.FEATURE_ANNOUNCEMENTS]: 'BibleBuddy has a new feature — check the app for details.',
  [NOTIFICATION_CATEGORIES.MAINTENANCE_NOTICES]: 'BibleBuddy will have brief scheduled maintenance soon.',
  [NOTIFICATION_CATEGORIES.SECURITY_ALERTS]: 'Important security notice regarding your BibleBuddy account.',
  [NOTIFICATION_CATEGORIES.SUPPORT_REPLIES]: 'You have a reply to your support question in BibleBuddy.',
  [NOTIFICATION_CATEGORIES.BIBLE_REMINDERS]: PROMPTS.morning,
  [NOTIFICATION_CATEGORIES.PRAYER_REMINDERS]: 'Take a moment to pray — Buddy is here if you would like company.',
  [NOTIFICATION_CATEGORIES.LESSON_REMINDERS]: 'A lesson you started is waiting for you to finish.',
};

const CATEGORY_USER_CONTROLLED = new Set([
  NOTIFICATION_CATEGORIES.FEATURE_ANNOUNCEMENTS,
  NOTIFICATION_CATEGORIES.MAINTENANCE_NOTICES,
  NOTIFICATION_CATEGORIES.BIBLE_REMINDERS,
  NOTIFICATION_CATEGORIES.PRAYER_REMINDERS,
  NOTIFICATION_CATEGORIES.LESSON_REMINDERS,
]);
// Security alerts and support replies are transactional/non-suppressible
// (Deliverable 8 category table) — not in CATEGORY_USER_CONTROLLED.

/**
 * Build a notification queue for one category, honoring each tester's
 * per-category preference (security alerts always included regardless of
 * stored preference; support replies are transactional and targeted to a
 * single testerId via `onlyTesterId`, not broadcast).
 */
function buildCategoryNotificationQueue({
  category,
  body = null,
  onlyTesterId = null,
  supportThreadId = null,
  securityEventId = null,
  purposeCode = null,
} = {}) {
  if (!Object.values(NOTIFICATION_CATEGORIES).includes(category)) {
    return { ok: false, error: `Unknown notification category: ${category}`, queue: [] };
  }
  if (loadPrefs().globalPaused && category !== NOTIFICATION_CATEGORIES.SECURITY_ALERTS) {
    return { ok: true, queue: [], reason: 'Global notifications paused.' };
  }
  const active = listTesters();
  const exactTarget = onlyTesterId ? active.find((t) => t.testerId === onlyTesterId) : null;
  if (category === NOTIFICATION_CATEGORIES.SUPPORT_REPLIES && (!exactTarget || !String(supportThreadId || '').trim())) {
    return { ok: false, error: 'Exact active tester and supportThreadId required.', queue: [] };
  }
  const securityPurposes = new Set(['account_access_security', 'credential_compromise', 'privacy_incident_notice']);
  if (category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS && (
    !exactTarget || !String(securityEventId || '').trim() || !securityPurposes.has(String(purposeCode || '').trim())
  )) {
    return { ok: false, error: 'Exact active tester, securityEventId and purposeCode required.', queue: [] };
  }
  const transactional = category === NOTIFICATION_CATEGORIES.SUPPORT_REPLIES
    || category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS;
  const testers = transactional ? [exactTarget] : active.filter((t) => !onlyTesterId || t.testerId === onlyTesterId);
  const resolvedBody = category === NOTIFICATION_CATEGORIES.SUPPORT_REPLIES
    ? 'You have a reply to your support question in BibleBuddy.'
    : category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS
      ? 'Important security notice regarding your BibleBuddy account.'
      : (body || CATEGORY_DEFAULT_BODY[category] || 'BibleBuddy notification.');
  const queue = [];
  for (const t of testers) {
    if (!t) continue;
    const channels = Array.isArray(t.notificationChannels) ? t.notificationChannels : [];
    const ordinaryConsent = t.notificationPreference !== 'off' && !t.notificationsPaused && !!t.notificationConsentAt && channels.length > 0;
    if (!transactional && !ordinaryConsent) continue;
    if (CATEGORY_USER_CONTROLLED.has(category) && getCategoryPreferences(t.testerId)[category] !== true) continue;
    const email = resolveEmailAddress({ emailOrPhone: t.emailOrPhone });
    const phone = resolvePhoneNumber({ emailOrPhone: t.emailOrPhone });
    const channel = category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS ? 'in_app'
      : channels.includes('in_app') ? 'in_app'
      : (channels.includes('email') && email) ? 'email'
      : (channels.includes('sms') && phone) ? 'sms' : null;
    if (!channel) continue;
    queue.push({
      testerId: t.testerId, category, body: resolvedBody,
      subject: `BibleBuddy — ${category.replace(/_/g, ' ')}`,
      channel, emailOrPhone: t.emailOrPhone || null, email, phone,
      supportThreadId: category === NOTIFICATION_CATEGORIES.SUPPORT_REPLIES ? String(supportThreadId) : null,
      securityEventId: category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS ? String(securityEventId) : null,
      purposeCode: category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS ? String(purposeCode) : null,
      scheduledAt: new Date().toISOString(),
    });
  }
  return { ok: true, queue };
}

async function dispatchCategoryNotification(input = {}) {
  const built = buildCategoryNotificationQueue(input);
  if (!built.ok) return built;
  const results = [];
  for (const item of built.queue) results.push(await dispatchNotification(item));
  return {
    ok: true, category: input.category,
    attempted: results.filter((r) => r.attempted).length,
    queued: results.filter((r) => r.queued).length,
    sent: results.filter((r) => r.sent).length,
    delivered: results.filter((r) => r.delivered).length,
    results,
  };
}

function getCategoryDeliveryReport({ limit = 500 } = {}) {
  const history = readHistory({ limit });
  const byCategory = {};
  for (const rec of history) {
    const cat = rec.category || 'uncategorized_reminder';
    if (!byCategory[cat]) byCategory[cat] = { attempted: 0, queued: 0, sent: 0, delivered: 0 };
    if (rec.attempted) byCategory[cat].attempted += 1;
    if (rec.queued) byCategory[cat].queued += 1;
    if (rec.sent) byCategory[cat].sent += 1;
    if (rec.delivered) byCategory[cat].delivered += 1;
  }
  return {
    categories: Object.values(NOTIFICATION_CATEGORIES),
    userControlledCategories: [...CATEGORY_USER_CONTROLLED],
    byCategory,
    providers: { email: hasEmailProvider(), sms: hasSmsProvider() },
    recentHistorySampleSize: history.length,
  };
}

function subscribe(testerId, preference, channels = []) {
  if (!preference || preference === 'off') return { ok: false, error: 'Explicit non-off cadence required.' };
  return updateNotificationPreference(testerId, preference, false, channels);
}

function unsubscribe(testerId) {
  return updateNotificationPreference(testerId, 'off', true);
}

function getQueueReport() {
  const morning = buildNotificationQueue({ slot: 'morning' });
  const afternoon = buildNotificationQueue({ slot: 'afternoon' });
  const evening = buildNotificationQueue({ slot: 'evening' });
  return {
    providers: { email: hasEmailProvider(), sms: hasSmsProvider() },
    counts: {
      morning: morning.length,
      afternoon: afternoon.length,
      evening: evening.length,
      total: morning.length + afternoon.length + evening.length,
    },
    globalPaused: loadPrefs().globalPaused,
  };
}

function readHistory({ limit = 200 } = {}) {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return [];
    const lines = fs.readFileSync(HISTORY_PATH, 'utf8').trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function exportNotificationHistoryForTester(authenticatedTesterId, targetTesterId) {
  if (!authenticatedTesterId || authenticatedTesterId !== targetTesterId) {
    return { ok: false, error: 'Authenticated tester scope mismatch.' };
  }
  return { ok: true, testerId: targetTesterId, history: readHistory({ limit: 5000 }).filter((row) => row.testerId === targetTesterId) };
}

function deleteNotificationHistoryForTester(authenticatedTesterId, targetTesterId) {
  if (!authenticatedTesterId || authenticatedTesterId !== targetTesterId) {
    return { ok: false, error: 'Authenticated tester scope mismatch.' };
  }
  const all = readHistory({ limit: 5000 });
  const preserved = all.filter((row) => row.testerId !== targetTesterId);
  const tempPath = `${HISTORY_PATH}.notification-delete-${Date.now()}.tmp`;
  try {
    const dir = path.dirname(HISTORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tempPath, preserved.length ? `${preserved.map((row) => JSON.stringify(row)).join('\n')}\n` : '', 'utf8');
    fs.renameSync(tempPath, HISTORY_PATH);
    return { ok: true, testerId: targetTesterId, deleted: all.length - preserved.length };
  } catch (_) {
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
    return { ok: false, error: 'Unable to atomically delete notification history.' };
  }
}

module.exports = {
  PREFS_PATH,
  HISTORY_PATH,
  PROMPTS,
  buildNotificationQueue,
  dispatchNotification,
  resolveEmailAddress,
  resolvePhoneNumber,
  subscribe,
  unsubscribe,
  getQueueReport,
  readHistory,
  hasEmailProvider,
  hasSmsProvider,
  // ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — Notification Framework
  NOTIFICATION_CATEGORIES,
  CATEGORY_USER_CONTROLLED,
  buildCategoryNotificationQueue,
  dispatchCategoryNotification,
  getCategoryDeliveryReport,
  exportNotificationHistoryForTester,
  deleteNotificationHistoryForTester,
  getCategoryPreferences,
  setCategoryPreference,
};
