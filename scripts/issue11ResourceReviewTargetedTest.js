const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bible-buddy-issue11-'));
  const queueFile = path.join(tmpDir, 'resource-review-queue.jsonl');
  process.env.BIBLE_AUTHORITY_ADMIN_TOKEN = 'issue11-test-token';
  process.env.RESOURCE_REVIEW_QUEUE_PATH = queueFile;

  const router = require('../routes/resourceReview');
  const app = express();
  app.use(express.json());
  app.use('/admin/resources', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/admin/resources`;
  const auth = { Authorization: 'Bearer issue11-test-token', 'Content-Type': 'application/json' };

  try {
    const unauth = await fetch(`${base}/review-plan`);
    assert.strictEqual(unauth.status, 401, 'admin route must fail closed without token');

    const plan = await fetch(`${base}/review-plan`, { headers: { Authorization: auth.Authorization } });
    assert.strictEqual(plan.status, 200, 'review plan should be available to authenticated admin');
    const planBody = await plan.json();
    assert.strictEqual(planBody.review.aiReviewOutputs.approvalRecommendation, 'human_review_required');

    const missing = await fetch(`${base}/submit`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: 'Incomplete resource' }),
    });
    assert.strictEqual(missing.status, 400, 'required metadata must be enforced');

    const submitted = await fetch(`${base}/submit`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        title: 'Issue 11 Targeted Resource',
        author_or_speaker: 'Test Author',
        summary: 'Non-production resource metadata test.',
        language: 'en',
        category: 'testing',
        resource_type: 'pdf_documents',
        source_links: ['https://example.invalid/test-resource'],
      }),
    });
    assert.strictEqual(submitted.status, 201, 'valid metadata should enter review queue');
    const body = await submitted.json();
    assert.strictEqual(body.resource.status, 'pending_human_review');
    assert.strictEqual(body.resource.human_review_required, true);
    assert.strictEqual(body.resource.approved_for_knowledge_ingestion, false);
    assert.deepStrictEqual(body.ingestion, {
      allowed: false,
      reason: 'Human approval required before knowledge ingestion',
    });

    const note = await fetch(`${base}/review-note`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ resource_id: body.resource.id, note: 'Needs source verification.' }),
    });
    assert.strictEqual(note.status, 201, 'human review note should persist');
    const noteBody = await note.json();
    assert.strictEqual(noteBody.review_note.changes_approval_state, false);

    const rows = fs.readFileSync(queueFile, 'utf8').trim().split('\n').map(JSON.parse);
    assert.strictEqual(rows.length, 2, 'submission and note should both be recorded');
    assert.strictEqual(rows[0].approved_for_knowledge_ingestion, false);
    assert.strictEqual(rows[1].changes_approval_state, false);

    console.log(JSON.stringify({
      ok: true,
      targetedTest: 'GOAL-BB-ISSUE11 resource review human gate',
      assertions: 12,
      persistedRows: rows.length,
      finalApprovalState: rows[0].approved_for_knowledge_ingestion,
    }));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
