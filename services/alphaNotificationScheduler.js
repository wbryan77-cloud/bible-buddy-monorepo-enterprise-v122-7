/**
 * Phase 5J — Gentle alpha notification queue (no spam; optional SMS/email).
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');
const { listTesters, updateNotificationPreference } = require('./alphaTesterManager');

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
      scheduledAt: new Date().toISOString(),
    });
  }
  return queue;
}

async function dispatchNotification(item) {
  const result = { ...item, sent: false, provider: 'none', at: new Date().toISOString() };

  if (item.channel === 'email' && hasEmailProvider() && item.email) {
    result.provider = 'resend';
    result.sent = false;
    result.note = 'Email dispatch stub — configure Resend template for production';
  } else if (item.channel === 'sms' && hasSmsProvider()) {
    result.provider = 'twilio';
    result.sent = false;
    result.note = 'SMS dispatch stub — configure Twilio for production';
  } else {
    result.provider = 'queue_only';
    result.sent = true;
    result.note = 'Queued for in-app display only';
  }

  appendJsonlSafe(HISTORY_PATH, result);
  return result;
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
  subscribe,
  unsubscribe,
  getQueueReport,
  readHistory,
  hasEmailProvider,
  hasSmsProvider,
};
