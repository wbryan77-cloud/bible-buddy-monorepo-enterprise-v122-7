const crypto = require('crypto');
const express = require('express');
const { runBuddy } = require('../services/buddyBrain');
const { isCoreRestorationDebugEnabled } = require('../services/coreRestorationDebug');
const { buildLiveRequestTrace, logLiveRequestTrace, logRouteOwnership } = require('../services/liveRequestTrace');
const { logLiveResponseCapture } = require('../services/liveResponseCapture');
const { applyDoctrineErrorFirewall } = require('../services/doctrineErrorFirewall');
const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
const { captureAlphaTurn } = require('../services/alphaConversationCapture');
const { isActiveAlphaTester } = require('../services/alphaTesterManager');
const { recordFounderObservation } = require('../services/runtimeHealthMonitor');

// FOUNDER_ALPHA_RELEASE_GATE Part 4 — request-limits gate. 4000 characters
// comfortably covers any realistic typed chat message (the Scripture
// Alignment paste tool has its own, separate, larger limit for pasted
// lesson text — see services/lessonScriptureAlignmentAnalyzer.js).
const MAX_CHAT_MESSAGE_LENGTH = 4000;

// PHASE_6H Part 7 — Founder Observation Layer. Derives only aggregate,
// non-identifying signals from a single already-computed reply: which
// category of question it was, and whether a witness / original-language /
// historical-context / prayer / continuation path was used. Reuses fields
// that already exist on every reply (answerLineage, runtime,
// primaryWitness) rather than re-parsing or re-classifying anything.
function deriveFounderObservationSignals(reply, payload) {
  const route = payload?.answerLineage?.route || reply?.runtime?.doctrineRoute || '';
  const category = reply?.runtime?.doctrineTopic || route || 'general';
  const replyText = typeof payload?.reply === 'string' ? payload.reply : '';
  const witnessRetrieved = !!(
    payload?.primaryWitness ||
    (Array.isArray(payload?.supportingWitnesses) && payload.supportingWitnesses.length) ||
    (Array.isArray(payload?.scripture) && payload.scripture.length)
  );
  const historicalContextUsed = /Historical context:/i.test(replyText);
  const originalLanguageUsed = /Original language \(|Transliteration:|Word-by-word literal gloss:/i.test(replyText);
  const prayerUsed = /prayer/i.test(route);
  const continuationUsed = !!reply?.runtime?.conversationContinuation;
  return { category, witnessRetrieved, historicalContextUsed, originalLanguageUsed, prayerUsed, continuationUsed };
}

// FOUNDER_ALPHA_OPERATIONAL_INTELLIGENCE Part 2 — one-way hash so the
// runtime-health module can detect "same session, next category" without
// ever holding a reversible userId/sessionId. Not a security boundary
// (this is an analytics key, not a credential) — just non-identifying.
function hashSessionKey(userId, sessionId) {
  if (!userId && !sessionId) return null;
  return crypto.createHash('sha256').update(`${userId || ''}:${sessionId || ''}`).digest('hex').slice(0, 24);
}

function recordFounderObservationSafely(reply, payload, sessionKey) {
  try {
    recordFounderObservation({ ...deriveFounderObservationSignals(reply, payload), sessionKey });
  } catch (e) {
    console.warn('[founderObservation] skipped:', e.message);
  }
}

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

// PHASE_6H Part 4 — Visible answer lineage is an advertised Founder Alpha
// differentiator, but the full internal coreDebug object (25+ engineering
// flags) is only attached when isCoreRestorationDebugEnabled() is true,
// which is FALSE by default in production (NODE_ENV=production, per
// render.yaml) — so Founders running the real deployed app would see none
// of it. This exposes a small, deliberately curated, always-present
// subset (never the full debug object) so the promise holds in production
// too, without leaking internal engineering flags to end users.
function buildAnswerLineage(coreDebug) {
  if (!coreDebug || typeof coreDebug !== 'object') return null;
  return {
    route: coreDebug.routeUsed || null,
    answerOwner: coreDebug.finalAnswerAuthor || null,
    aiAssisted: typeof coreDebug.openaiCalled === 'boolean' ? coreDebug.openaiCalled : null,
    scriptureGrounded: typeof coreDebug.scriptureEvidenceUsed === 'boolean' ? coreDebug.scriptureEvidenceUsed : null,
  };
}

function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || 'I may have lost the thread in this session, but I can continue from the last approved Bible topic if you tell me the topic.'),
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

  // FOUNDER_ALPHA_RELEASE_GATE Part 4 — a chat message has no legitimate
  // reason to be tens of thousands of characters; letting an unbounded
  // string reach the companion pipeline caused multi-second processing and
  // log bloat during release verification. Reject early with a clean 400
  // rather than let it hang the request or the log stream.
  if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
    emitBuddyChatJson(res, {
      requestId,
      userId,
      message: message.slice(0, 200),
      httpStatus: 400,
      body: {
        ok: false,
        error: `Message is too long (${message.length} characters). Please keep messages under ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      },
    });
    return;
  }

  const started = Date.now();
  const guaranteed = await withBuddyChatGuarantee(
    () => runBuddy({ userId, testerId, sessionId, cohort, mode, personaKey, message }),
    { userId, message },
  );
  const reply = guaranteed.reply || {};
  if (reply.runtime?.routeOwnership) {
    logRouteOwnership(reply.runtime.routeOwnership);
  }
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

  let payload = normalizePayload(reply);
  payload = applyDoctrineErrorFirewall(payload, {
    userId,
    topic: reply?.runtime?.doctrineTopic,
    strictDoctrine: !!reply?.runtime?.doctrineTopic || reply?.doctrineFinalAuthority,
  });
  const coreDebugSource = reply.coreDebug || reply.runtime?.coreDebug || null;
  payload.answerLineage = buildAnswerLineage(coreDebugSource);
  if (isCoreRestorationDebugEnabled()) {
    payload.coreDebug = coreDebugSource;
  }
  if (process.env.BUDDY_LIVE_TRACE === '1') {
    payload.liveRequestTrace = reply.liveRequestTrace;
  }
  const latencyMs = Date.now() - started;
  recordFounderObservationSafely(reply, payload, hashSessionKey(userId, sessionId));
  if (isActiveAlphaTester(testerId)) {
    try {
      captureAlphaTurn({
        testerId,
        sessionId,
        message,
        reply: payload,
        latencyMs,
        messageId: requestId,
      });
    } catch (captureErr) {
      console.warn('[alphaCapture] skipped:', captureErr.message);
    }
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
      body: {
        ok: false,
        error: 'Something interrupted this conversation. Please try your question again.',
      },
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

    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      res.status(400).json({
        ok: false,
        error: `Message is too long (${message.length} characters). Please keep messages under ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      });
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
    const guaranteed = await withBuddyChatGuarantee(
      () => runBuddy({ userId, testerId, sessionId, cohort, mode, personaKey, message }),
      { userId, message },
    );
    const raw = guaranteed.reply || {};
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

    let donePayload = applyDoctrineErrorFirewall(
      {
        ...reply,
        orb_state: reply.orb_state || 'speaking',
      },
      {
        userId,
        topic: raw?.runtime?.doctrineTopic,
        strictDoctrine: !!raw?.runtime?.doctrineTopic || raw?.doctrineFinalAuthority,
      },
    );
    const streamCoreDebugSource = raw.coreDebug || raw.runtime?.coreDebug || null;
    donePayload.answerLineage = buildAnswerLineage(streamCoreDebugSource);
    if (isCoreRestorationDebugEnabled()) {
      donePayload.coreDebug = streamCoreDebugSource;
    }
    if (process.env.BUDDY_LIVE_TRACE === '1') {
      donePayload.liveRequestTrace = trace;
    }
    recordFounderObservationSafely(raw, donePayload, hashSessionKey(userId, sessionId));
    send('done', donePayload);
    res.end();
  } catch (e) {
    console.error('Buddy stream error:', e);
    try {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: 'Something interrupted this conversation. Please try again.' })}\n\n`,
      );
      res.end();
    } catch (_) {}
  }
});

module.exports = router;
