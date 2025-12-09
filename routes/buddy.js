const express = require('express');
const { runBuddy } = require('../services/buddyBrain');

const router = express.Router();

// POST /buddy/chat  -> main Bible Buddy endpoint for the app
router.post('/chat', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId || 'anonymous';
    const mode = body.mode || 'BIBLE';
    const personaKey = body.personaKey || 'GENTLE_COACH';
    const message = body.message || '';

    if (!message) {
      return res.status(400).json({ ok: false, error: 'message is required' });
    }

    const reply = await runBuddy({ userId, mode, personaKey, message });
    res.json({ ok: true, reply });
  } catch (e) {
    console.error('Buddy error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
