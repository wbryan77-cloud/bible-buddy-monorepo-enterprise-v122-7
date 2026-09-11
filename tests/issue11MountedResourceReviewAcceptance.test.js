'use strict';

const assert = require('assert');
const fs = require('fs');
const net = require('net');
const os = require('os');
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
  const root = path.join(__dirname, '..');
  const port = await reservePort();
  const token = 'issue11-mounted-acceptance-token';
  const base = `http://127.0.0.1:${port}`;
  const output = [];
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bible-buddy-issue11-mounted-'));
  const localQueuePath = path.join(tmpDir, 'resource-review-queue.jsonl');
  const durablePath = path.join(root, 'data', 'resource-review', 'queue-durable.json');
  const durableExisted = fs.existsSync(durablePath);
  const durableBackup = durableExisted ? fs.readFileSync(durablePath, 'utf8') : null;

  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      BIBLE_AUTHORITY_ADMIN_TOKEN: token,
      RESOURCE_REVIEW_QUEUE_PATH: localQueuePath,
      PERSISTENCE: 'FILE',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => output.push(chunk.toString()));
  child.stderr.on('data', (chunk) => output.push(chunk.toString()));

  try {
    await waitForHealth(base, child, output);

    const ui = await fetch(`${base}/admin/resources.html`);
    assert.strictEqual(ui.status, 200, 'mounted Admin resource-review UI must be reachable');
    const uiText = await ui.text();
    assert.ok(/resource/i.test(uiText) && /review/i.test(uiText), 'Admin resource-review UI must identify its purpose');

    const unauth = await fetch(`${base}/admin/resources/review-plan`);
    assert.strictEqual(unauth.status, 401, 'mounted resource-review API must fail closed without Admin auth');

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

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const missing = await fetch(`${base}/admin/resources/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Incomplete Issue #11 resource' }),
    });
    assert.strictEqual(missing.status, 400, 'mounted submit path must reject incomplete metadata');

    // Real server submission: valid metadata may be recorded, but it must remain
    // pending human review and must never become knowledge-ingestion approved here.
    const submitted = await fetch(`${base}/admin/resources/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Issue #11 mounted acceptance resource',
        author_or_speaker: 'Acceptance Test',
        summary: 'Non-production metadata proving the mounted review path.',
        language: 'en',
        category: 'testing',
        resource_type: 'pdf_documents',
        source_links: ['https://example.invalid/issue11-mounted-acceptance'],
      }),
    });
    assert.strictEqual(submitted.status, 201, 'valid metadata must enter the mounted review queue');
    const submittedBody = await submitted.json();
    assert.strictEqual(submittedBody.ok, true);
    assert.strictEqual(submittedBody.resource.status, 'pending_human_review');
    assert.strictEqual(submittedBody.resource.human_review_required, true);
    assert.strictEqual(submittedBody.resource.approved_for_knowledge_ingestion, false);
    assert.deepStrictEqual(submittedBody.ingestion, {
      allowed: false,
      reason: 'Human approval required before knowledge ingestion',
    });

    assert.ok(fs.existsSync(localQueuePath), 'mounted submission must create the configured local audit queue');
    const localRows = fs.readFileSync(localQueuePath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    assert.strictEqual(localRows.length, 1, 'exactly one valid submission must be written to the local audit queue');
    assert.strictEqual(localRows[0].id, submittedBody.resource.id);
    assert.strictEqual(localRows[0].approved_for_knowledge_ingestion, false);

    assert.ok(fs.existsSync(durablePath), 'mounted submission must create/update the durable review projection');
    const durableDoc = JSON.parse(fs.readFileSync(durablePath, 'utf8'));
    const durableEvent = durableDoc.items.find((item) => item && item.id === submittedBody.resource.id);
    assert.ok(durableEvent, 'submitted resource must be present in durable review projection');
    assert.strictEqual(durableEvent.status, 'pending_human_review');
    assert.strictEqual(durableEvent.human_review_required, true);
    assert.strictEqual(durableEvent.approved_for_knowledge_ingestion, false);

    console.log(JSON.stringify({
      ok: true,
      targetedTest: 'GOAL-BB-ISSUE11 mounted resource review end-to-end acceptance',
      assertions: 20,
      uiStatus: ui.status,
      unauthStatus: unauth.status,
      authenticatedPlanStatus: plan.status,
      missingMetadataStatus: missing.status,
      validSubmissionStatus: submitted.status,
      finalReviewStatus: submittedBody.resource.status,
      durableProjectionVerified: true,
      knowledgeIngestionAllowed: submittedBody.ingestion.allowed,
    }));
  } finally {
    await stopChild(child);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (durableExisted) {
      fs.mkdirSync(path.dirname(durablePath), { recursive: true });
      fs.writeFileSync(durablePath, durableBackup, 'utf8');
    } else {
      try { fs.unlinkSync(durablePath); } catch (_) {}
      try { fs.rmdirSync(path.dirname(durablePath)); } catch (_) {}
    }
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
