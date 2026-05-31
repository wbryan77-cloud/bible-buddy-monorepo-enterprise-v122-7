#!/usr/bin/env node
/**
 * Sprint 2.DEPLOYMENT — POST /buddy/chat validation against deployed URL.
 * Usage: DEPLOY_URL=https://your-app.onrender.com node scripts/sprint2DeployValidation.js
 */

const DEPLOY_URL = (process.env.DEPLOY_URL || process.env.RENDER_URL || '').replace(/\/$/, '');

const TESTS = [
  { name: 'Sabbath history', message: 'Who changed the Sabbath and why?', checks: [/historical/i, /Scripture|Genesis|Exodus/i, /not the same as a biblical command|does not show God changing/i] },
  { name: 'Prayer', message: 'Please pray for me.', checks: [/pray|Lord|Father|amen/i] },
  { name: 'Memory recall', message: 'What were we talking about recently?', checks: [/remember|talked|recent|carrying|studying/i] },
  { name: 'Continue study', message: 'Continue.', checks: [/continue|study|Scripture|pick up|where we left/i], setup: [{ message: 'What is the Sabbath?' }] },
  { name: 'Kingdom study', message: 'What is the Kingdom of God?', checks: [/Kingdom|Isaiah|Daniel|Revelation|Scripture/i] },
  { name: 'Grief support', message: 'I lost a friend Wednesday.', checks: [/sorry|loss|grief|comfort|here with you/i] },
  { name: 'Knee pain support', message: 'My knees hurt.', checks: [/knee|pain|health|gentle|Scripture/i] },
  { name: 'Follow-up understanding', message: 'That was not my question. Who changed it historically?', checks: [/right|historical|Sunday|Scripture/i], setup: [{ message: 'What is the Sabbath?' }, { message: 'Who changed the Sabbath and why?' }] },
];

async function postChat(userId, message) {
  const res = await fetch(`${DEPLOY_URL}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message }),
  });
  const data = await res.json();
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  return {
    status: res.status,
    ok: data.ok,
    reply: payload.reply || '',
    runtime: payload.runtime || {},
  };
}

async function run() {
  if (!DEPLOY_URL) {
    console.error('Set DEPLOY_URL or RENDER_URL to the deployed base URL.');
    process.exit(2);
  }

  const userId = `deploy-val-${Date.now()}`;
  const results = [];

  console.log(`Validating ${DEPLOY_URL}/buddy/chat\n`);

  for (const test of TESTS) {
    const uid = `${userId}-${test.name.replace(/\s+/g, '-').toLowerCase()}`;
    try {
      for (const step of test.setup || []) {
        await postChat(uid, step.message);
      }
      const result = await postChat(uid, test.message);
      const failures = [];
      if (result.status !== 200) failures.push(`HTTP ${result.status}`);
      if (!result.ok) failures.push('ok:false');
      if (/Source-grounded answer:|The app should not|slow this down together/i.test(result.reply)) {
        failures.push('legacy/stale response markers');
      }
      for (const pattern of test.checks) {
        if (!pattern.test(result.reply)) failures.push(`missing ${pattern}`);
      }
      results.push({
        name: test.name,
        passed: failures.length === 0,
        failures,
        preview: result.reply.slice(0, 180),
        runtimeIntent: result.runtime?.intent || result.runtime?.intercept || null,
      });
    } catch (error) {
      results.push({ name: test.name, passed: false, failures: [error.message], preview: '' });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(JSON.stringify({ deployUrl: DEPLOY_URL, passed, total: results.length, results }, null, 2));
  process.exit(passed === results.length ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
