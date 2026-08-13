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
  const global = loadPrefs();
  if (global.globalPaused) return [];

  const testers = listTesters();
  const queue = [];
  const body = PROMPTS[slot] || PROMPTS.morning;

  for (const t of testers) {
    if (t.notificationsPaused || t.notificationPreference === 'off') continue;
    const slots = slotForPreference(t.notificationPreference);
    const match =
      slots === slot ||
      (Array.isArray(slots) && slots.includes(slot)) ||
      (t.notificationPreference === 'once_daily' && slot === 'morning');
    if (!match) continue;
    queue.push({
      testerId: t.testerId,
      slot,
      body,
      channel: hasSmsProvider() && t.emailOrPhone?.match(/\d{10}/) ? 'sms' : hasEmailProvider() ? 'email' : 'queue_only',
      emailOrPhone: t.emailOrPhone || null,
      email: resolveEmailAddress({ emailOrPhone: t.emailOrPhone }),
      phone: resolvePhoneNumber({ emailOrPhone: t.emailOrPhone }),
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
  const result = { ...item, sent: false, provider: 'none', at: new Date().toISOString() };
  const emailTo = resolveEmailAddress(item);
  const phoneTo = resolvePhoneNumber(item) || item.emailOrPhone || null;

  if (item.channel === 'email' && hasEmailProvider() && emailTo) {
    const sendResult = await sendEmailResend({ to: emailTo, subject: item.subject || 'BibleBuddy', html: item.html, text: item.body });
    result.provider = 'resend';
    result.to = emailTo;
    result.sent = !!sendResult.sent;
    result.note = sendResult.sent ? 'Delivered via Resend.' : (sendResult.error || 'Email dispatch attempted — provider reported not-sent.');
  } else if (item.channel === 'sms' && hasSmsProvider() && phoneTo) {
    const sendResult = await sendSmsTwilio({ to: phoneTo, body: item.body });
    result.provider = 'twilio';
    result.to = phoneTo;
    result.sent = !!sendResult.sent;
    result.note = sendResult.sent ? 'Delivered via Twilio.' : (sendResult.error || 'SMS dispatch attempted — provider reported not-sent.');
  } else {
    result.provider = 'queue_only';
    result.sent = true;
    result.note = 'Queued for in-app display only';
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
function buildCategoryNotificationQueue({ category, body = null, onlyTesterId = null } = {}) {
  if (!Object.values(NOTIFICATION_CATEGORIES).includes(category)) {
    return { ok: false, error: `Unknown notification category: ${category}`, queue: [] };
  }
  const global = loadPrefs();
  if (global.globalPaused && category !== NOTIFICATION_CATEGORIES.SECURITY_ALERTS) {
    return { ok: true, queue: [], reason: 'Global notifications paused.' };
  }

  const testers = listTesters().filter((t) => !onlyTesterId || t.testerId === onlyTesterId);
  const resolvedBody = body || CATEGORY_DEFAULT_BODY[category] || 'BibleBuddy notification.';
  const queue = [];

  for (const t of testers) {
    if (t.notificationsPaused && category !== NOTIFICATION_CATEGORIES.SECURITY_ALERTS) continue;
    const prefs = getCategoryPreferences(t.testerId);
    const userControlled = CATEGORY_USER_CONTROLLED.has(category);
    const enabled = category === NOTIFICATION_CATEGORIES.SECURITY_ALERTS
      || !userControlled // transactional categories (support replies) are always deliverable once triggered
      || prefs[category] === true;
    if (!enabled) continue;
    queue.push({
      testerId: t.testerId,
      category,
      body: resolvedBody,
      subject: `BibleBuddy — ${category.replace(/_/g, ' ')}`,
      channel: hasSmsProvider() && t.emailOrPhone?.match(/\d{10}/) ? 'sms' : hasEmailProvider() ? 'email' : 'queue_only',
      emailOrPhone: t.emailOrPhone,
      email: resolveEmailAddress({ emailOrPhone: t.emailOrPhone }),
      phone: resolvePhoneNumber({ emailOrPhone: t.emailOrPhone }),
      scheduledAt: new Date().toISOString(),
    });
  }
  return { ok: true, queue };
}

async function dispatchCategoryNotification({ category, body = null, onlyTesterId = null } = {}) {
  const built = buildCategoryNotificationQueue({ category, body, onlyTesterId });
  if (!built.ok) return built;
  const results = [];
  for (const item of built.queue) {
    results.push(await dispatchNotification(item));
  }
  return { ok: true, category, attempted: results.length, delivered: results.filter((r) => r.sent).length, results };
}

function getCategoryDeliveryReport({ limit = 500 } = {}) {
  const history = readHistory({ limit });
  const byCategory = {};
  for (const rec of history) {
    const cat = rec.category || 'uncategorized_reminder';
    if (!byCategory[cat]) byCategory[cat] = { attempted: 0, delivered: 0, queuedOnly: 0 };
    byCategory[cat].attempted += 1;
    if (rec.sent && rec.provider !== 'queue_only') byCategory[cat].delivered += 1;
    if (rec.provider === 'queue_only') byCategory[cat].queuedOnly += 1;
  }
  return {
    categories: Object.keys(NOTIFICATION_CATEGORIES).map((k) => NOTIFICATION_CATEGORIES[k]),
    userControlledCategories: [...CATEGORY_USER_CONTROLLED],
    byCategory,
    providers: { email: hasEmailProvider(), sms: hasSmsProvider() },
    recentHistorySampleSize: history.length,
  };
}

function subscribe(testerId, preference = 'once_daily') {
  return updateNotificationPreference(testerId, preference, false);
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
  getCategoryPreferences,
  setCategoryPreference,
};
