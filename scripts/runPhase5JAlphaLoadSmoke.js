#!/usr/bin/env node
/**
 * Phase 5J — Alpha load smoke: simulate concurrent tester sessions.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { createInvite, completeOnboarding } = require('../services/alphaTesterManager');
const { captureAlphaTurn } = require('../services/alphaConversationCapture');
const { recordFeedback } = require('../services/alphaFeedbackCapture');
const { buildNotificationQueue } = require('../services/alphaNotificationScheduler');
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5JAlphaLoadSmokeReport.md');
const ERROR_RE = /core_connection_error|trouble retrieving additional passages/i;

const TURN_SCRIPT = [
  'Can we eat pork?',
  'Why?',
  'How should I explain it?',
  'Can you pray with me?',
  "I'm nervous about talking to them",
  'What verse should I remember?',
  'My feeling overwhelmed',
  'Can you remember that I like direct answers?',
];

async function simulateTester(testerId, sessionId) {
  const errors = [];
  for (const message of TURN_SCRIPT) {
    const started = Date.now();
    try {
      const s = await runBuddy({
        userId: testerId,
        testerId,
        sessionId,
        message,
        mode: 'COMPANION',
      });
      const reply = String(s.reply || '');
      if (ERROR_RE.test(reply)) errors.push(`error:${message.slice(0, 30)}`);
      captureAlphaTurn({
        testerId,
        sessionId,
        message,
        reply: s,
        latencyMs: Date.now() - started,
        messageId: `smoke-${Date.now()}`,
      });
    } catch (e) {
      errors.push(e.message);
    }
  }
  recordFeedback({ testerId, sessionId, messageId: 'smoke', tag: 'helpful' });
  return errors;
}

async function runCohort(count) {
  const errors = [];
  for (let i = 0; i < count; i++) {
    const invite = createInvite({ label: `smoke-${count}-${i}` });
    const onboard = completeOnboarding({
      inviteToken: invite.inviteToken,
      intake: { name: `Smoke ${i}`, testFocus: 'all_areas' },
      consentAccepted: true,
      ndaAccepted: true,
    });
    if (!onboard.ok) {
      errors.push('onboard failed');
      continue;
    }
    const testerId = onboard.tester.testerId;
    const sessionId = `smoke-sess-${count}-${i}`;
    const e = await simulateTester(testerId, sessionId);
    errors.push(...e);
  }
  return errors;
}

async function run() {
  const cohorts = [10, 25, 50];
  const results = [];
  for (const n of cohorts) {
    const before = getRuntimeHealthSnapshot();
    const errors = await runCohort(n);
    const after = getRuntimeHealthSnapshot();
    results.push({
      testers: n,
      errors: errors.length,
      rssBefore: before.rssMB,
      rssAfter: after.rssMB,
      memoryPressure: after.memoryPressureLevel,
      pass: errors.length === 0 && after.memoryPressureLevel !== 'critical',
    });
  }

  const queue = buildNotificationQueue({ slot: 'morning' });
  const health = getRuntimeHealthSnapshot();
  const allPass = results.every((r) => r.pass);

  const md = [
    '# Phase 5J Alpha Load Smoke Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Result:** ${allPass ? 'PASS' : 'FAIL'}`,
    '',
    ...results.map((r) => `- ${r.testers} testers: errors=${r.errors} rss ${r.rssBefore}→${r.rssAfter} mem=${r.memoryPressure}`),
    '',
    `Notification queue (morning): ${queue.length}`,
    `Final RSS: ${health.rssMB} MB, errors: ${health.errors}, alpha captures: ${health.alphaCaptureCount}`,
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Load smoke: ${allPass ? 'PASS' : 'FAIL'}`);
  if (!allPass) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
