const crypto = require('crypto');
const express = require('express');
const { runBuddy } = require('../services/buddyBrain');
const { isCoreRestorationDebugEnabled } = require('../services/coreRestorationDebug');
const { buildLiveRequestTrace, logLiveRequestTrace } = require('../services/liveRequestTrace');
const { logLiveResponseCapture } = require('../services/liveResponseCapture');

const router = express.Router();

function emitBuddyChatJson(res, { requestId, userId, message, httpStatus, body }) {
  logLiveResponseCapture({
    requestId,
    userId,
    message,
    httpStatus,
    responseBody: body,
  });
  res.status(httpStatus).json(body);
}

function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || "I'm having trouble reaching the AI service right now. Please try again in a moment."),
    scripture: [],
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
  };
}

async function handleBuddyChat({ body, res, requestId }) {
  const testerId = body.testerId || body.userId || 'anonymous';
  const userId = testerId;
  const sessionId = body.sessionId || null;
  const cohort = body.cohort || null;
  const mode = body.mode || 'COMPANION';
  const personaKey = body.personaKey || 'ADAPTIVE_COMPANION';
  const message = body.message || '';

  if (!message) {
    emitBuddyChatJson(res, {
      requestId,
      userId,
      message,
      httpStatus: 400,
      body: { ok: false, error: 'message is required' },
    });
    return;
  }

  const started = Date.now();
  const reply = await runBuddy({ userId, testerId, sessionId, cohort, mode, personaKey, message });
  const trace = buildLiveRequestTrace({
    message,
    reply,
    httpStatus: 200,
    latencyMs: Date.now() - started,
  });
  if (process.env.BUDDY_LIVE_TRACE === '1') {
    logLiveRequestTrace(trace);
    reply.liveRequestTrace = trace;
  }

  const payload = normalizePayload(reply);
  if (isCoreRestorationDebugEnabled()) {
    payload.coreDebug = reply.coreDebug || reply.runtime?.coreDebug || null;
  }
  if (process.env.BUDDY_LIVE_TRACE === '1') {
    payload.liveRequestTrace = reply.liveRequestTrace;
  }
  emitBuddyChatJson(res, {
    requestId,
    userId,
    message,
    httpStatus: 200,
    body: { ok: true, reply: payload },
  });
}

// POST /buddy/chat  -> main Bible Buddy endpoint for the app
router.post('/chat', async (req, res) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const body = req.body || {};
  const userId = body.testerId || body.userId || 'anonymous';
  const message = body.message || '';
  try {
    await handleBuddyChat({ body, res, requestId });
  } catch (e) {
    console.error('Buddy error:', e);
    emitBuddyChatJson(res, {
      requestId,
      userId,
      message,
      httpStatus: 500,
      body: { ok: false, error: e.message },
    });
  }
});

// POST /buddy/stream -> streaming text fallback for realtime-like UI
router.post('/stream', async (req, res) => {
  try {
    const body = req.body || {};
    const testerId = body.testerId || body.userId || 'anonymous';
    const userId = testerId;
    const sessionId = body.sessionId || null;
    const cohort = body.cohort || null;
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

    const started = Date.now();
    const raw = await runBuddy({ userId, testerId, sessionId, cohort, mode, personaKey, message });
    const trace = buildLiveRequestTrace({ message, reply: raw, httpStatus: 200, latencyMs: Date.now() - started });
    if (process.env.BUDDY_LIVE_TRACE === '1') {
      logLiveRequestTrace(trace);
    }

    const reply = normalizePayload(raw);
    const text = reply.reply || '';
    const words = text.split(/(\s+)/).filter(Boolean);

    send('state', { orb_state: 'speaking', mode: reply.mode, safety_level: reply.safety_level });

    for (const word of words) {
      send('delta', { text: word });
      await new Promise((resolve) => setTimeout(resolve, 22));
    }

    const donePayload = {
      ...reply,
      orb_state: reply.orb_state || 'speaking',
    };
    if (isCoreRestorationDebugEnabled()) {
      donePayload.coreDebug = raw.coreDebug || raw.runtime?.coreDebug || null;
    }
    if (process.env.BUDDY_LIVE_TRACE === '1') {
      donePayload.liveRequestTrace = trace;
    }
    send('done', donePayload);
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
