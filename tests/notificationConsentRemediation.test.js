/**
 * BIE Notification Rev2 — focused consent/privacy acceptance.
 * Synthetic identities only; no provider credentials or live delivery.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TESTERS_PATH = path.join(ROOT, 'data', 'alpha-testers.json');
const PREFS_PATH = path.join(ROOT, 'data', 'alpha-notification-preferences.json');
const HISTORY_PATH = path.join(ROOT, 'data', 'alpha-notification-history.jsonl');

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function restore(file, value) {
  if (value === null) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

describe('Notification Rev2 consent and privacy', () => {
  const prior = {};
  let scheduler;

  before(() => {
    prior.testers = snapshot(TESTERS_PATH);
    prior.prefs = snapshot(PREFS_PATH);
    prior.history = snapshot(HISTORY_PATH);
    prior.resend = process.env.RESEND_API_KEY;
    prior.twilioSid = process.env.TWILIO_ACCOUNT_SID;
    prior.twilioToken = process.env.TWILIO_AUTH_TOKEN;
    prior.twilioFrom = process.env.TWILIO_FROM_NUMBER;
    delete process.env.RESEND_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;

    const testers = [
      { testerId: 'syn-absent', active: true, consentAccepted: true, emailOrPhone: 'absent@example.test' },
      { testerId: 'syn-invalid', active: true, consentAccepted: true, notificationPreference: 'sometimes', emailOrPhone: 'invalid@example.test' },
      { testerId: 'syn-once', active: true, consentAccepted: true, notificationPreference: 'once_daily', emailOrPhone: 'once@example.test' },
      { testerId: 'syn-twice', active: true, consentAccepted: true, notificationPreference: 'twice_daily', emailOrPhone: 'twice@example.test' },
      { testerId: 'syn-off', active: true, consentAccepted: true, notificationPreference: 'off', emailOrPhone: 'off@example.test' },
      { testerId: 'syn-paused', active: true, consentAccepted: true, notificationPreference: 'once_daily', notificationsPaused: true, emailOrPhone: 'paused@example.test' },
      {
        testerId: 'syn-feature-on',
        active: true,
        consentAccepted: true,
        notificationPreference: 'once_daily',
        categoryPreferences: { feature_announcements: true },
        emailOrPhone: 'feature@example.test',
      },
    ];
    fs.mkdirSync(path.dirname(TESTERS_PATH), { recursive: true });
    fs.writeFileSync(TESTERS_PATH, JSON.stringify({ testers, invites: [] }, null, 2));
    fs.writeFileSync(PREFS_PATH, JSON.stringify({ globalPaused: false }, null, 2));
    delete require.cache[require.resolve('../services/alphaTesterManager')];
    delete require.cache[require.resolve('../services/alphaNotificationScheduler')];
    scheduler = require('../services/alphaNotificationScheduler');
  });

  after(() => {
    restore(TESTERS_PATH, prior.testers);
    restore(PREFS_PATH, prior.prefs);
    restore(HISTORY_PATH, prior.history);
    const envPairs = [
      ['RESEND_API_KEY', prior.resend],
      ['TWILIO_ACCOUNT_SID', prior.twilioSid],
      ['TWILIO_AUTH_TOKEN', prior.twilioToken],
      ['TWILIO_FROM_NUMBER', prior.twilioFrom],
    ];
    for (const [key, value] of envPairs) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    delete require.cache[require.resolve('../services/alphaTesterManager')];
    delete require.cache[require.resolve('../services/alphaNotificationScheduler')];
  });

  it('N01/N02 fails closed for absent or invalid cadence', () => {
    const ids = scheduler.buildNotificationQueue({ slot: 'morning' }).map((x) => x.testerId);
    assert.equal(ids.includes('syn-absent'), false);
    assert.equal(ids.includes('syn-invalid'), false);
    const managerSource = fs.readFileSync(path.join(ROOT, 'services', 'alphaTesterManager.js'), 'utf8');
    assert.match(managerSource, /notificationPreference:[\s\S]*?: 'off'/);
  });

  it('N03 honors once-daily and twice-daily cadence without duplicates', () => {
    const morning = scheduler.buildNotificationQueue({ slot: 'morning' }).map((x) => x.testerId);
    const evening = scheduler.buildNotificationQueue({ slot: 'evening' }).map((x) => x.testerId);
    assert.equal(morning.filter((id) => id === 'syn-once').length, 1);
    assert.equal(evening.includes('syn-once'), false);
    assert.equal(morning.filter((id) => id === 'syn-twice').length, 1);
    assert.equal(evening.filter((id) => id === 'syn-twice').length, 1);
  });

  it('N04 suppresses off and paused testers', () => {
    const ids = ['morning', 'afternoon', 'evening']
      .flatMap((slot) => scheduler.buildNotificationQueue({ slot }))
      .map((x) => x.testerId);
    assert.equal(ids.includes('syn-off'), false);
    assert.equal(ids.includes('syn-paused'), false);
  });

  it('N05 requires explicit enablement for user-controlled categories', () => {
    const built = scheduler.buildCategoryNotificationQueue({
      category: scheduler.NOTIFICATION_CATEGORIES.FEATURE_ANNOUNCEMENTS,
    });
    assert.equal(built.ok, true);
    assert.deepEqual(built.queue.map((x) => x.testerId), ['syn-feature-on']);
  });

  it('N06 records queue-only as queued, never delivered', async () => {
    const result = await scheduler.dispatchNotification({
      testerId: 'syn-once',
      channel: 'queue_only',
      body: 'Synthetic queue-only notice.',
    });
    assert.equal(result.sent, false);
    assert.equal(result.queued, true);
    assert.equal(result.provider, 'queue_only');
    assert.match(result.note, /no provider delivery occurred/i);
  });

  it('N07 support replies require a target and stay isolated to it', () => {
    const untargeted = scheduler.buildCategoryNotificationQueue({
      category: scheduler.NOTIFICATION_CATEGORIES.SUPPORT_REPLIES,
    });
    assert.deepEqual(untargeted.queue, []);
    const targeted = scheduler.buildCategoryNotificationQueue({
      category: scheduler.NOTIFICATION_CATEGORIES.SUPPORT_REPLIES,
      onlyTesterId: 'syn-once',
    });
    assert.deepEqual(targeted.queue.map((x) => x.testerId), ['syn-once']);
  });

  it('N08 global pause suppresses nonsecurity but not security', () => {
    fs.writeFileSync(PREFS_PATH, JSON.stringify({ globalPaused: true }, null, 2));
    const feature = scheduler.buildCategoryNotificationQueue({
      category: scheduler.NOTIFICATION_CATEGORIES.FEATURE_ANNOUNCEMENTS,
    });
    const security = scheduler.buildCategoryNotificationQueue({
      category: scheduler.NOTIFICATION_CATEGORIES.SECURITY_ALERTS,
    });
    assert.deepEqual(feature.queue, []);
    assert.ok(security.queue.length > 0);
    assert.ok(security.queue.every((x) => x.testerId.startsWith('syn-')));
  });
});
