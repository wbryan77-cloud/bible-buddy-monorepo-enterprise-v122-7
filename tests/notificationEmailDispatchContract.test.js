/**
 * Sprint B — notification email dispatch contract.
 * Queue builders set emailOrPhone; dispatch must resolve email and attempt Resend
 * when RESEND_API_KEY is present (not silently fall through to queue_only).
 * Run: node --test tests/notificationEmailDispatchContract.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'alpha-notification-history.jsonl');

describe('notification email dispatch contract', () => {
  let prevKey;
  let hadHistory;
  let bakHistory;

  before(() => {
    prevKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 'sprint-b-test-key-not-for-production';
    hadHistory = fs.existsSync(HISTORY);
    bakHistory = hadHistory ? fs.readFileSync(HISTORY) : null;
    delete require.cache[require.resolve('../services/alphaNotificationScheduler')];
    delete require.cache[require.resolve('../lib/providers/email/resend')];
  });

  after(() => {
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (bakHistory != null) fs.writeFileSync(HISTORY, bakHistory);
    else if (!hadHistory && fs.existsSync(HISTORY)) {
      try { fs.unlinkSync(HISTORY); } catch (_) {}
    }
    delete require.cache[require.resolve('../services/alphaNotificationScheduler')];
  });

  it('resolves email from emailOrPhone', () => {
    const { resolveEmailAddress, resolvePhoneNumber } = require('../services/alphaNotificationScheduler');
    assert.equal(resolveEmailAddress({ emailOrPhone: 'user@example.com' }), 'user@example.com');
    assert.equal(resolveEmailAddress({ email: 'a@b.c', emailOrPhone: 'ignored' }), 'a@b.c');
    assert.equal(resolveEmailAddress({ emailOrPhone: '5551234567' }), null);
    assert.equal(resolvePhoneNumber({ emailOrPhone: '5551234567' }), '5551234567');
    assert.equal(resolvePhoneNumber({ emailOrPhone: 'user@example.com' }), null);
  });

  it('dispatch uses emailOrPhone when item.email is absent (does not queue_only)', async () => {
    const { dispatchNotification } = require('../services/alphaNotificationScheduler');
    const result = await dispatchNotification({
      channel: 'email',
      emailOrPhone: 'sprint-b-dispatch-contract@example.com',
      subject: 'Sprint B contract',
      body: 'contract body',
      testerId: 'sprint-b-notif-tester',
      category: 'feature_announcements',
    });
    assert.equal(result.provider, 'resend', `expected resend path, got ${JSON.stringify(result)}`);
    assert.equal(result.to, 'sprint-b-dispatch-contract@example.com');
    assert.notEqual(result.provider, 'queue_only');
    // Fake key → provider reports not-sent; that is fine — path must still be email.
    assert.equal(result.sent, false);
  });
});
