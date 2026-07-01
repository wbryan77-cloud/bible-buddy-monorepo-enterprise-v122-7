#!/usr/bin/env node
/**
 * Reproduce exact Companion UI HTTP path locally (no Render).
 * Output: docs/regression-trace/ui-contract-reproduce-logos.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');

const MESSAGE = 'What does Logos mean in John 1:1?';
const BODY = {
  userId: 'demo-user',
  mode: 'COMPANION',
  personaKey: 'ADAPTIVE_COMPANION',
  message: MESSAGE,
};

function simulateIndexHtml(data, httpStatus) {
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  const displayed = payload.reply || "I'm here with you. Tell me a little more.";
  return {
    httpStatus,
    dataOk: data.ok,
    dataReplyType: typeof data.reply,
    dataReplyIsObject: !!(data.reply && typeof data.reply === 'object'),
    payloadReply: payload.reply,
    payloadReplyType: typeof payload.reply,
    payloadReplyLength: payload.reply == null ? null : String(payload.reply).length,
    clientFallbackUsed: !payload.reply,
    displayed,
  };
}

async function main() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/buddy', require('../routes/buddy'));

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/buddy/chat`;

  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(BODY),
  });
  const rawBody = await res.text();
  const latencyMs = Date.now() - started;

  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(rawBody);
  } catch (e) {
    parseError = e.message;
  }

  const indexView = parsed ? simulateIndexHtml(parsed, res.status) : null;

  const out = {
    ranAt: new Date().toISOString(),
    url,
    requestBody: BODY,
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    httpStatus: res.status,
    resOk: res.ok,
    latencyMs,
    rawResponseBody: rawBody,
    rawBodyLength: rawBody.length,
    parseError,
    parsedJson: parsed,
    fields: parsed
      ? {
          ok: parsed.ok,
          error: parsed.error,
          dataReply: parsed.reply,
          dataReplyType: typeof parsed.reply,
          nestedReply: parsed.reply && typeof parsed.reply === 'object' ? parsed.reply.reply : undefined,
          nestedReplyType:
            parsed.reply && typeof parsed.reply === 'object' ? typeof parsed.reply.reply : undefined,
        }
      : null,
    indexHtml: indexView,
  };

  server.close();

  const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'ui-contract-reproduce-logos.json');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
