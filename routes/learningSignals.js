const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const SIGNALS_FILE = path.join(DATA_DIR, 'learning-signals.jsonl');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function sanitizeSignal(body = {}) {
  return {
    createdAt: new Date().toISOString(),
    consent: body.consent === true,
    category: body.category || 'companion_feedback',
    // Store summaries/labels, not raw private conversations by default.
    signal: {
      helpful: body.helpful ?? null,
      mode: body.mode || null,
      safetyLevel: body.safetyLevel || null,
      orbState: body.orbState || null,
      feature: body.feature || null,
      issue: body.issue || null,
      suggestion: body.suggestion || null,
    },
    source: 'bible-buddy-web',
    retention: 'aggregate-review',
    privacy: {
      rawConversationStored: false,
      rawAudioStored: false,
      rawVideoStored: false,
      canDeleteOnUserRequest: true,
      adminReviewRequiredForModelTraining: true,
    },
  };
}

router.post('/signals', (req, res) => {
  try {
    const entry = sanitizeSignal(req.body || {});

    if (!entry.consent) {
      return res.status(400).json({
        ok: false,
        error: 'Learning signals require explicit user consent.',
      });
    }

    fs.appendFileSync(SIGNALS_FILE, JSON.stringify(entry) + '\n');
    res.json({
      ok: true,
      saved: true,
      message: 'Opt-in learning signal recorded for aggregate review.',
      privacy: entry.privacy,
    });
  } catch (error) {
    console.error('Learning signal error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
