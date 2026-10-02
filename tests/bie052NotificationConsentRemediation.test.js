#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  sanitizeIntake,
  NOTIFICATION_CATEGORIES,
} = require('../services/alphaTesterManager');
const {
  buildCategoryNotificationQueue,
  isNotificationPaused,
  validateSupportReplyScope,
  validateDispatchBoundary,
  queueOnlyDeliveryResult,
  dispatchNotification,
} = require('../services/alphaNotificationScheduler');

async function main() {
  assert.strictEqual(
    sanitizeIntake({}).notificationPreference,
    'off',
    'missing notification choice must fail closed to off',
  );
  assert.strictEqual(
    sanitizeIntake({ notificationPreference: 'not-a-choice' }).notificationPreference,
    'off',
    'invalid notification choice must fail closed to off',
  );
  assert.strictEqual(
    sanitizeIntake({ notificationPreference: 'once_daily' }).notificationPreference,
    'once_daily',
    'explicit valid opt-in must be preserved',
  );
  assert.strictEqual(
    sanitizeIntake({ notificationPreference: 'off' }).notificationPreference,
    'off',
    'explicit off must be preserved',
  );

  const support = NOTIFICATION_CATEGORIES.SUPPORT_REPLIES;
  assert.strictEqual(validateSupportReplyScope({ category: NOTIFICATION_CATEGORIES.BIBLE_REMINDERS }).ok, true);
  assert.strictEqual(validateSupportReplyScope({ category: support }).ok, false, 'support may not broadcast');
  assert.strictEqual(
    validateSupportReplyScope({ category: support, onlyTesterId: 'alpha-a' }).ok,
    false,
    'support requires a verified case binding',
  );
  assert.strictEqual(
    validateSupportReplyScope({
      category: support,
      onlyTesterId: 'alpha-a',
      supportCaseBinding: { verified: true, testerId: 'alpha-b' },
    }).ok,
    false,
    'cross-user support binding must be rejected',
  );
  assert.strictEqual(
    validateSupportReplyScope({
      category: support,
      onlyTesterId: 'alpha-a',
      supportCaseBinding: { verified: false, testerId: 'alpha-a' },
    }).ok,
    false,
    'unverified case binding must be rejected',
  );
  assert.strictEqual(
    validateSupportReplyScope({
      category: support,
      onlyTesterId: 'alpha-a',
      supportCaseBinding: { verified: true, testerId: 'alpha-a' },
    }).ok,
    false,
    'caller-supplied verified flags must not authorize support delivery',
  );

  const unbound = buildCategoryNotificationQueue({ category: support, onlyTesterId: 'alpha-a' });
  assert.strictEqual(unbound.ok, false, 'queue builder must enforce support binding');
  assert.deepStrictEqual(unbound.queue, [], 'unbound support queue must be empty');

  const trustedFlagStillBlocked = buildCategoryNotificationQueue({
    category: support,
    onlyTesterId: 'alpha-a',
    supportCaseBinding: { verified: true, testerId: 'alpha-a' },
  });
  assert.strictEqual(
    trustedFlagStillBlocked.ok,
    false,
    'support queue must reject caller-supplied binding until server-side resolution exists',
  );
  assert.strictEqual(
    validateDispatchBoundary({ category: support, testerId: 'alpha-a', channel: 'email' }).ok,
    false,
    'dispatch boundary must reject direct support items',
  );
  const directSupport = await dispatchNotification({
    category: support,
    testerId: 'alpha-a',
    channel: 'email',
    email: 'alpha-a@example.test',
    body: 'private support reply',
  });
  assert.strictEqual(directSupport.sent, false, 'direct support dispatch must not send');
  assert.strictEqual(directSupport.delivered, false, 'direct support dispatch must not deliver');
  assert.strictEqual(directSupport.deliveryState, 'REJECTED', 'direct support dispatch must be rejected');
  assert.strictEqual(directSupport.provider, 'none', 'direct support dispatch must not invoke a provider');

  assert.strictEqual(
    isNotificationPaused({ globalPaused: true, category: support }),
    true,
    'global pause must suppress support replies',
  );
  assert.strictEqual(
    isNotificationPaused({ testerPaused: true, category: support }),
    true,
    'tester pause must suppress support replies',
  );
  assert.strictEqual(
    isNotificationPaused({
      globalPaused: true,
      testerPaused: true,
      category: NOTIFICATION_CATEGORIES.SECURITY_ALERTS,
    }),
    false,
    'security alerts remain the sole pause exception',
  );

  const queued = queueOnlyDeliveryResult({ testerId: 'alpha-a', channel: 'queue_only' }, '2026-10-02T11:15:10.000Z');
  assert.strictEqual(queued.sent, false, 'queue-only is not sent');
  assert.strictEqual(queued.delivered, false, 'queue-only is not delivered');
  assert.strictEqual(queued.queued, true, 'queue-only retains queued state');
  assert.strictEqual(queued.deliveryState, 'NOT_DELIVERED', 'queue-only delivery state must be explicit');
  assert.strictEqual(queued.provider, 'queue_only');

  console.log('PASS bie052NotificationConsentRemediation: 26 consent, scope, sink, pause, isolation, and delivery assertions');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
