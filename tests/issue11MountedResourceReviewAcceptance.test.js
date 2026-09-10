'use strict';

const assert = require('assert');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForHealth(base, child, output) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited before health check (${child.exitCode})\n${output.join('')}`);
    }
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch (_) {
      // Server may still be starting; bounded retry until deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`server did not become healthy within 15s\n${output.join('')}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function run() {
  const port = await reservePort();
  const token = 'issue11-mounted-acceptance-token';
  const base = `http://127.0.0.1:${port}`;
  const output = [];
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      BIBLE_AUTHORITY_ADMIN_TOKEN: token,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));

  try {
    await waitForHealth(base, child, output);

    // Proves the real server.js static Admin surface is reachable.
    const ui = await fetch(`${base}/admin/resources.html`);
    assert.strictEqual(ui.status, 200, 'mounted Admin resource-review UI must be reachable');
    const uiText = await ui.text();
    assert.ok(/resource/i.test(uiText) && /review/i.test(uiText), 'Admin resource-review UI must identify its purpose');

    // Proves the real server.js mount fails closed without Admin authentication.
    const unauth = await fetch(`${base}/admin/resources/review-plan`);
    assert.strictEqual(unauth.status, 401, 'mounted resource-review API must fail closed without Admin auth');

    // Proves authenticated access reaches the actual mounted Issue #11 review service.
    const plan = await fetch(`${base}/admin/resources/review-plan`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(plan.status, 200, 'authenticated Admin must reach mounted review plan');
    const planBody = await plan.json();
    assert.strictEqual(planBody.ok, true);
    assert.strictEqual(
      planBody.review && planBody.review.aiReviewOutputs && planBody.review.aiReviewOutputs.approvalRecommendation,
      'human_review_required',
      'mounted review plan must preserve human final authority',
    );

    // Missing metadata must still fail before any queue/persistence success is reported.
    const missing = await fetch(`${base}/admin/resources/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Incomplete Issue #11 resource' }),
    });
    assert.strictEqual(missing.status, 400, 'mounted submit path must reject incomplete metadata');

    console.log(JSON.stringify({
      ok: true,
      targetedTest: 'GOAL-BB-ISSUE11 mounted resource review acceptance',
      assertions: 7,
      uiStatus: ui.status,
      unauthStatus: unauth.status,
      authenticatedPlanStatus: plan.status,
      missingMetadataStatus: missing.status,
      humanReviewRequired: true,
    }));
  } finally {
    await stopChild(child);
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
