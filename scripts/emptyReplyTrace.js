#!/usr/bin/env node
/**
 * Local trace for empty-reply investigation — mirrors handleBuddyChat + index.html parsing.
 * No HTTP. Output: docs/regression-trace/empty-reply-trace-logos.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

function pickReplyFields(obj, label) {
  if (!obj || typeof obj !== 'object') {
    return { stage: label, type: typeof obj, value: obj };
  }
  return {
    stage: label,
    type: typeof obj,
    keys: Object.keys(obj).slice(0, 40),
    reply: obj.reply,
    replyType: typeof obj.reply,
    replyLength: obj.reply == null ? null : String(obj.reply).length,
    answer: obj.answer,
    message: obj.message,
    text: obj.text,
    content: obj.content,
    openAiCalled: obj.runtime?.openAiCalled ?? obj.coreDebug?.openaiCalled ?? null,
    finalAnswerAuthor: obj.coreDebug?.finalAnswerAuthor ?? null,
    buildConnectionErrorReplyUsed: obj.coreDebug?.buildConnectionErrorReplyUsed ?? null,
  };
}

let composeCapture = null;
const reasonFirstComposer = require('../services/reasonFirstComposer');
const originalCompose = reasonFirstComposer.composeReasonFirstReply;
reasonFirstComposer.composeReasonFirstReply = async function hookedCompose(...args) {
  const out = await originalCompose.apply(this, args);
  composeCapture = {
    beforeReturn: pickReplyFields(out.structured, 'composeReasonFirstReply.structured'),
    openaiCalled: out.openaiCalled,
    apiError: out.apiError || null,
    validationPassed: out.validation?.passed ?? null,
  };
  return out;
};
// Re-bind runtimes that destructured compose at first load
delete require.cache[require.resolve('../services/openAiFirstCompanionRuntime')];
delete require.cache[require.resolve('../services/buddyBrain')];
const { runBuddy } = require('../services/buddyBrain');

const MESSAGE = 'What does Logos mean in John 1:1?';
const BODY = {
  userId: 'demo-user',
  mode: 'COMPANION',
  personaKey: 'ADAPTIVE_COMPANION',
  message: MESSAGE,
};

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

function simulateIndexHtml(data) {
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  const displayed =
    payload.reply || "I'm here with you. Tell me a little more.";
  const clientFallbackUsed = !payload.reply;
  return { payload, displayed, clientFallbackUsed, resOkAssumed: true };
}

function simulateIndexHtmlOnError(data, httpStatus) {
  const payload = data.reply && typeof data.reply === 'object' ? data.reply : data;
  const displayed =
    payload.reply || "I'm here with you. Tell me a little more.";
  return {
    httpStatus,
    dataOk: data.ok,
    payload,
    displayed,
    clientFallbackUsed: !payload.reply,
    note: 'index.html does NOT check res.ok or data.ok',
  };
}

async function main() {
  process.env.BUDDY_TEMPLATE_PROSE = '0';
  process.env.BUDDY_DISABLE_STUDY_FALLBACK = '1';

  const trace = {
    ranAt: new Date().toISOString(),
    message: MESSAGE,
    body: BODY,
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    stages: {},
  };

  const runBuddyOut = await runBuddy({
    userId: BODY.userId,
    testerId: BODY.userId,
    mode: BODY.mode,
    personaKey: BODY.personaKey,
    message: BODY.message,
  });

  trace.stages.afterRunBuddy = pickReplyFields(runBuddyOut, 'runBuddy return');
  trace.stages.composeReasonFirstReply = composeCapture;

  const beforeNormalize = { ...runBuddyOut };
  delete beforeNormalize.liveRequestTrace;
  trace.stages.beforeNormalizePayload = pickReplyFields(beforeNormalize, 'before normalizePayload');

  const payload = normalizePayload(runBuddyOut);
  trace.stages.afterNormalizePayload = pickReplyFields(payload, 'after normalizePayload');

  const httpJson = { ok: true, reply: payload };
  trace.stages.httpJson200 = {
    ok: httpJson.ok,
    replyShape: pickReplyFields(httpJson.reply, 'httpJson.reply'),
    serializedLength: JSON.stringify(httpJson).length,
  };

  trace.stages.indexHtmlParse = simulateIndexHtml(httpJson);

  trace.stages.indexHtmlOn400 = simulateIndexHtmlOnError(
    { ok: false, error: 'message is required' },
    400
  );
  trace.stages.indexHtmlOn500 = simulateIndexHtmlOnError(
    { ok: false, error: 'Simulated server error' },
    500
  );

  trace.stages.runBuddyIsNull = runBuddyOut == null;
  trace.stages.replyTruthyChain = {
    runBuddy_reply: !!runBuddyOut?.reply,
    runBuddy_reply_length: String(runBuddyOut?.reply || '').length,
    payload_reply: !!payload.reply,
    payload_reply_length: String(payload.reply || '').length,
    index_would_fallback: !payload.reply,
  };

  const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'empty-reply-trace-logos.json');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(trace, null, 2));
  console.log(JSON.stringify(trace, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
