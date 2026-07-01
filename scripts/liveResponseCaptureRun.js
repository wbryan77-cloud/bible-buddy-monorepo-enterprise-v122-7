#!/usr/bin/env node
/**
 * Companion UI reproduction + server capture correlation.
 * Output: docs/regression-trace/live-response-capture-run.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { CAPTURE_PATH } = require('../services/liveResponseCapture');

const MESSAGE = 'What does Logos mean in John 1:1?';
const REQUEST_ID = crypto.randomUUID();
const BROWSER_REQUEST = {
  userId: 'demo-user',
  mode: 'COMPANION',
  personaKey: 'ADAPTIVE_COMPANION',
  message: MESSAGE,
};

const MASK = "I'm here with you. Tell me a little more.";

function simulateIndexHtml(data, httpStatus) {
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  const payloadReply = payload.reply;
  const clientFallbackUsed = !payloadReply;
  const displayed = payloadReply || MASK;
  return {
    httpStatus,
    dataOk: data.ok,
    payloadReply,
    payloadReplyType: payloadReply === null ? 'null' : typeof payloadReply,
    payloadReplyIsFalsy: !payloadReply,
    clientFallbackUsed,
    displayed,
    firstFalsyLocation:
      clientFallbackUsed
        ? !data.reply || typeof data.reply !== 'object'
          ? 'index.html:496 — data.reply not object; payload = whole data; payload.reply undefined'
          : payloadReply === '' || payloadReply === null || payloadReply === undefined
            ? 'index.html:498 — payload.reply falsy after unwrap'
            : 'index.html:498 — payload.reply falsy (other)'
        : null,
  };
}

function readCaptureByRequestId(requestId) {
  if (!fs.existsSync(CAPTURE_PATH)) return null;
  const lines = fs.readFileSync(CAPTURE_PATH, 'utf8').trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const row = JSON.parse(lines[i]);
      if (row.requestId === requestId) return row;
    } catch (_) {}
  }
  return null;
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
  const startedAt = new Date().toISOString();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': REQUEST_ID,
    },
    body: JSON.stringify(BROWSER_REQUEST),
  });

  const rawBody = await res.text();
  const parsed = JSON.parse(rawBody);
  const ui = simulateIndexHtml(parsed, res.status);
  const serverLog = readCaptureByRequestId(REQUEST_ID);

  server.close();

  const out = {
    ranAt: new Date().toISOString(),
    startedAt,
    requestId: REQUEST_ID,
    url,
    browserRequest: BROWSER_REQUEST,
    browserResponse: {
      httpStatus: res.status,
      resOk: res.ok,
      rawBody,
      parsed,
    },
    uiEvaluation: ui,
    serverCapture: serverLog,
    capturePath: CAPTURE_PATH,
  };

  const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'live-response-capture-run.json');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
