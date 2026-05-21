const express = require('express');
const { runBuddy } = require('../services/buddyBrain');

const router = express.Router();

function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || 'I’m here with you. Tell me a little more.'),
    scripture: [],
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
  };
}

// POST /buddy/chat  -> main Bible Buddy endpoint for the app
router.post('/chat', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId || 'anonymous';
    const mode = body.mode || 'COMPANION';
    const personaKey = body.personaKey || 'ADAPTIVE_COMPANION';
    const message = body.message || '';

    if (!message) {
      return res.status(400).json({ ok: false, error: 'message is required' });
    }

    const reply = await runBuddy({ userId, mode, personaKey, message });
    res.json({ ok: true, reply: normalizePayload(reply) });
  } catch (e) {
    console.error('Buddy error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /buddy/stream -> streaming text fallback for realtime-like UI
// Uses Server-Sent Events style chunks so the orb can react while text arrives.
router.post('/stream', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId || 'anonymous';
    const mode = body.mode || 'COMPANION';
    const personaKey = body.personaKey || 'ADAPTIVE_COMPANION';
    const message = body.message || '';

    if (!message) {
      res.status(400).json({ ok: false, error: 'message is required' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send('state', { orb_state: 'thinking', message: 'Buddy is thinking...' });

    const reply = normalizePayload(await runBuddy({ userId, mode, personaKey, message }));
    const text = reply.reply || '';
    const words = text.split(/(\s+)/).filter(Boolean);

    send('state', { orb_state: 'speaking', mode: reply.mode, safety_level: reply.safety_level });

    for (const word of words) {
      send('delta', { text: word });
      await new Promise((resolve) => setTimeout(resolve, 22));
    }

    send('done', {
      ...reply,
      orb_state: reply.orb_state || 'speaking',
    });
    res.end();
  } catch (e) {
    console.error('Buddy stream error:', e);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    } catch (_) {}
  }
});

module.exports = router;
