/**
 * Temporary emergency capture — logs every /buddy/chat JSON response before send.
 * Output: data/live-response-capture.jsonl
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CAPTURE_PATH = path.join(__dirname, '..', 'data', 'live-response-capture.jsonl');

function ensureDataDir() {
  fs.mkdirSync(path.dirname(CAPTURE_PATH), { recursive: true });
}

function buildShapeValidation(responseBody = {}) {
  const reply = responseBody.reply;
  const nested = reply && typeof reply === 'object' && !Array.isArray(reply) ? reply : null;
  const dbg = nested?.coreDebug || nested?.runtime?.coreDebug || {};
  const rt = nested?.runtime || {};

  return {
    ok: responseBody.ok,
    reply,
    replyType: reply === null ? 'null' : Array.isArray(reply) ? 'array' : typeof reply,
    replyReply: nested ? nested.reply : undefined,
    replyReplyType:
      nested && nested.reply === null
        ? 'null'
        : nested
          ? typeof nested.reply
          : 'missing_object',
    replyReplyMissing: nested ? nested.reply === undefined : true,
    replyReplyEmptyString: nested ? nested.reply === '' : false,
    replyUndefined: reply === undefined,
    replyNull: reply === null,
    runtimeUsed: dbg.runtimeUsed || rt.buddyRuntime || null,
    finalAnswerAuthor: dbg.finalAnswerAuthor || null,
    openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
    openaiResponseReceived: dbg.openaiResponseReceived ?? null,
  };
}

function isLiveResponseCaptureEnabled() {
  return String(process.env.BUDDY_CAPTURE || '').toLowerCase() === '1';
}

function logLiveResponseCapture({
  timestamp = new Date().toISOString(),
  requestId,
  userId,
  message,
  httpStatus,
  responseBody,
} = {}) {
  if (!isLiveResponseCaptureEnabled()) return null;
  ensureDataDir();
  const { appendJsonlSafe } = require('./safeJsonlWriter');
  const record = {
    timestamp,
    requestId: requestId || crypto.randomUUID(),
    userId: userId || null,
    message: String(message || '').slice(0, 200),
    httpStatus,
    shape: buildShapeValidation(responseBody),
    replyPreview: String(
      responseBody?.reply?.reply || responseBody?.reply || '',
    ).slice(0, 200),
  };
  appendJsonlSafe(CAPTURE_PATH, record);
  return record;
}

module.exports = {
  CAPTURE_PATH,
  buildShapeValidation,
  isLiveResponseCaptureEnabled,
  logLiveResponseCapture,
};
