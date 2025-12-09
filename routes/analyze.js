const express = require('express');
const router = express.Router();
const { analyzeNote } = require('../services/contentInsight');

router.post('/note', async (req, res) => {
  try {
    const { note } = req.body;
    const reply = await analyzeNote(note);
    res.json({ reply });
  } catch (err) {
    console.error("Analyze error:", err);
    res.status(500).json({ error: 'Failed to analyze note' });
  }
});

module.exports = router;
