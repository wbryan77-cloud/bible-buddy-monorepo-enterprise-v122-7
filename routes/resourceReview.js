const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildResourceIngestionReview } = require('../services/resourceIngestionReview');
const { checkAdminAuth } = require('../services/adminAuthMiddleware');

const router = express.Router();

function queuePath() {
  return process.env.RESOURCE_REVIEW_QUEUE_PATH || path.join(__dirname, '..', 'data', 'resource-review-queue.jsonl');
}

function appendQueueRow(row) {
  const file = queuePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`, 'utf8');
}

function clean(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

router.get('/review-plan', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    res.json({ ok: true, review: buildResourceIngestionReview() });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Unable to load resource review plan' });
  }
});

router.post('/submit', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const plan = buildResourceIngestionReview();
    const body = req.body || {};
    const metadata = {
      title: clean(body.title, 500),
      author_or_speaker: clean(body.author_or_speaker, 500),
      summary: clean(body.summary),
      language: clean(body.language, 80),
      category: clean(body.category, 160),
      resource_type: clean(body.resource_type, 160),
      scripture_references: Array.isArray(body.scripture_references) ? body.scripture_references.map((v) => clean(v, 120)).filter(Boolean).slice(0, 100) : [],
      historical_period: clean(body.historical_period, 300),
      topic_tags: Array.isArray(body.topic_tags) ? body.topic_tags.map((v) => clean(v, 120)).filter(Boolean).slice(0, 100) : [],
      source_links: Array.isArray(body.source_links) ? body.source_links.map((v) => clean(v, 1000)).filter(Boolean).slice(0, 25) : [],
      usage_notes: clean(body.usage_notes),
    };

    const missing = plan.requiredMetadata.filter((key) => !metadata[key]);
    if (missing.length) {
      return res.status(400).json({ ok: false, error: 'Required resource metadata missing', missing });
    }
    if (!plan.acceptedResourceTypes.includes(metadata.resource_type)) {
      return res.status(400).json({ ok: false, error: 'Unsupported resource_type' });
    }

    const row = {
      id: `resource_${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending_human_review',
      human_review_required: true,
      approved_for_knowledge_ingestion: false,
      metadata,
      review_notes: [],
    };
    appendQueueRow(row);

    return res.status(201).json({
      ok: true,
      resource: row,
      ingestion: { allowed: false, reason: 'Human approval required before knowledge ingestion' },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Unable to record resource metadata' });
  }
});

router.post('/review-note', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const resourceId = clean(req.body && req.body.resource_id, 200);
    const note = clean(req.body && req.body.note, 4000);
    if (!resourceId || !note) {
      return res.status(400).json({ ok: false, error: 'resource_id and note required' });
    }
    const row = {
      type: 'human_review_note',
      resource_id: resourceId,
      note,
      created_at: new Date().toISOString(),
      changes_approval_state: false,
    };
    appendQueueRow(row);
    return res.status(201).json({ ok: true, review_note: row });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Unable to record review note' });
  }
});

module.exports = router;
