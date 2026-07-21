#!/usr/bin/env node
/**
 * Simulate index.html lines 495-498 against response shapes.
 * Output: docs/regression-trace/frontend-execution-simulate.json
 */
const fs = require('fs');
const path = require('path');

const MASK = "I'm here with you. Tell me a little more.";

function indexHtmlRender(data, httpStatus = 200) {
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  const rendered = payload.reply || MASK;
  return {
    httpStatus,
    dataOk: data.ok,
    dataReply: data.reply,
    dataReplyType: typeof data.reply,
    payloadReply: payload.reply,
    payloadReplyType: typeof payload.reply,
    clientFallbackUsed: !payload.reply,
    rendered,
  };
}

const scenarios = {
  openAiSuccess: indexHtmlRender({
    ok: true,
    reply: {
      reply:
        'In John 1:1, Logos (Greek: λόγος) means the divine Word or self-expression of God—the one through whom all things were made.',
      scripture: [],
      mode: 'companion',
    },
  }),
  uiContractLocal200: indexHtmlRender({
    ok: true,
    reply: {
      reply:
        "I'm having trouble reaching the AI service right now. Please try again in a moment.",
      mode: 'companion',
    },
  }),
  emptyNestedReply: indexHtmlRender({ ok: true, reply: { reply: '', mode: 'companion' } }),
  nullNestedReply: indexHtmlRender({ ok: true, reply: { reply: null, mode: 'companion' } }),
  missingNestedReply: indexHtmlRender({ ok: true, reply: { mode: 'companion' } }),
  nullDataReply: indexHtmlRender({ ok: true, reply: null }),
  http500: indexHtmlRender({ ok: false, error: 'Cannot set properties of null' }, 500),
  http400: indexHtmlRender({ ok: false, error: 'message is required' }, 400),
  http404: indexHtmlRender({ ok: false, error: 'Not found', path: '/buddy/chat' }, 404),
  replyAsString: indexHtmlRender({ ok: true, reply: 'Answer at wrong nesting level' }),
  replyAsArray: indexHtmlRender({ ok: true, reply: [] }),
  emptyObjectReply: indexHtmlRender({ ok: true, reply: {} }),
};

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'frontend-execution-simulate.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), scenarios }, null, 2));
console.log(JSON.stringify(scenarios, null, 2));
