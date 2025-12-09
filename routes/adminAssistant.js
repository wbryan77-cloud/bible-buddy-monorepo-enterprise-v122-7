const express = require('express');
const { getAdminAnswer } = require('../services/adminBrain');
const { getSnapshot } = require('../services/projectBrain');

const router = express.Router();

// POST /admin/assistant  -> ask “what next?”
router.post('/assistant', async (req, res) => {
  try {
    const question = (req.body && req.body.question) || null;
    const answer = await getAdminAnswer(question);
    res.json({ ok: true, answer });
  } catch (e) {
    console.error('Admin assistant error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /admin/project-brain  -> export the brain (for you to paste into ChatGPT)
router.get('/project-brain', (req, res) => {
  res.json(getSnapshot());
});

module.exports = router;
