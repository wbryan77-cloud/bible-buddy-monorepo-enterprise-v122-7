// routes/analyze.js
const express = require('express');
const router = express.Router();

const { analyzeNote } = require('../services/contentInsight');

// POST /api/analyze/note
router.post('/note', async (req, res) => {
  try {
    const { note, text } = req.body || {};
    const input = (note || text || '').trim();

    if (!input) {
      return res.status(400).json({ error: 'Missing note text.' });
    }

    const reply = await analyzeNote(input);
    return res.json({ reply });
  } catch (err) {
    console.error('Analyze error:', err);
    return res.status(500).json({ error: 'Failed to analyze note.' });
  }
});

// Simple GET sanity check
router.get('/', (req, res) => {
  res.json({ ok: false, error: 'POST /api/analyze/note only.' });
});

module.exports = router;
