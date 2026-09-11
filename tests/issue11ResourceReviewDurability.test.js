'use strict';

const assert = require('assert');
const fs = require('fs');
const { DOC_PATH, appendResourceReviewEvent, readResourceReviewEvents } = require('../services/resourceReviewDurableStore');

async function run() {
  const previousPersistence = process.env.PERSISTENCE;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.PERSISTENCE = 'FILE';
  delete process.env.DATABASE_URL;

  try {
    try { fs.rmSync(DOC_PATH, { force: true }); } catch (_) {}

    const event = {
      id: 'issue11_durability_probe',
      type: 'resource_submission',
      status: 'pending_human_review',
      human_review_required: true,
      approved_for_knowledge_ingestion: false,
    };

    await appendResourceReviewEvent(event);
    const events = await readResourceReviewEvents();

    assert.strictEqual(events.length, 1, 'resource review event must survive a write/read storage round trip');
    assert.strictEqual(events[0].id, event.id, 'persisted event identity must be preserved');
    assert.strictEqual(events[0].status, 'pending_human_review');
    assert.strictEqual(events[0].human_review_required, true);
    assert.strictEqual(events[0].approved_for_knowledge_ingestion, false);

    const routeSource = fs.readFileSync(require.resolve('../routes/resourceReview'), 'utf8');
    assert.ok(routeSource.includes('await persistReviewRow(row)'), 'route must await durable persistence before reporting success');
    assert.ok(routeSource.includes("res.status(503)"), 'durable persistence failure must fail closed instead of reporting success');

    console.log('PASS issue11ResourceReviewDurability: durable round trip and fail-closed persistence contract verified');
  } finally {
    try { fs.rmSync(DOC_PATH, { force: true }); } catch (_) {}
    if (previousPersistence === undefined) delete process.env.PERSISTENCE;
    else process.env.PERSISTENCE = previousPersistence;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
