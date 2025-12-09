const express = require('express');
const { analyzeNote, analyzeImage } = require('../services/contentInsight');

const router = express.Router();

// POST /admin/content/analyze-note
// body: { userId?, note, chosenVerses?, tags? }
// example tags: ["tester","pastor","sermon","phase1"]
router.post('/analyze-note', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId || 'admin';
    const note = body.note || '';
    const chosenVerses = body.chosenVerses || [];
    const tags = body.tags || [];

    if (!note) {
      return res.status(400).json({ ok: false, error: 'note is required' });
    }

    const result = await analyzeNote({ userId, note, chosenVerses, tags });
    res.json({ ok: true, result });
  } catch (e) {
    console.error('analyze-note error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /admin/content/analyze-image
// body: { userId?, imageUrl, note?, tags? }
router.post('/analyze-image', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId || 'admin';
    const imageUrl = body.imageUrl;
    const note = body.note || '';
    const tags = body.tags || [];

    if (!imageUrl) {
      return res.status(400).json({ ok: false, error: 'imageUrl is required' });
    }

    const result = await analyzeImage({ userId, imageUrl, note, tags });
    res.json({ ok: true, result });
  } catch (e) {
    console.error('analyze-image error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
