/**
 * Phase 5J — Bounded alpha conversation capture (preview-only by default).
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');
const { isActiveAlphaTester } = require('./alphaTesterManager');
const { recordAlphaCapture } = require('./runtimeHealthMonitor');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CAPTURE_PATH = path.join(DATA_DIR, 'alpha-conversations.jsonl');

const FULL_TRANSCRIPTS = process.env.ALPHA_CAPTURE_FULL_TRANSCRIPTS === 'true';
const PREVIEW_CHARS = Number(process.env.ALPHA_CAPTURE_MESSAGE_PREVIEW_CHARS || 500);
const RETENTION_DAYS = Number(process.env.ALPHA_CAPTURE_RETENTION_DAYS || 30);
const MAX_CAPTURE_LINES = Number(process.env.ALPHA_CAPTURE_MAX_LINES || 50000);

function preview(text = '', max = PREVIEW_CHARS) {
  const s = String(text || '').trim();
  if (FULL_TRANSCRIPTS) return s.slice(0, max * 4);
  return s.slice(0, max);
}

function trimRetention() {
  try {
    if (!fs.existsSync(CAPTURE_PATH)) return;
    const stat = fs.statSync(CAPTURE_PATH);
    if (stat.size < MAX_CAPTURE_LINES * 300) return;
    const raw = fs.readFileSync(CAPTURE_PATH, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const cutoff = Date.now() - RETENTION_DAYS * 86400000;
    const kept = lines.filter((line) => {
      try {
        const o = JSON.parse(line);
        const ts = new Date(o.timestamp || o.ts || 0).getTime();
        return ts >= cutoff;
      } catch {
        return false;
      }
    });
    const final = kept.length > MAX_CAPTURE_LINES ? kept.slice(-MAX_CAPTURE_LINES) : kept;
    fs.writeFileSync(CAPTURE_PATH, `${final.join('\n')}\n`, 'utf8');
  } catch (e) {
    console.warn('[alphaCapture] retention trim failed:', e.message);
  }
}

function captureAlphaTurn({
  testerId = '',
  sessionId = '',
  message = '',
  reply = {},
  latencyMs = 0,
  messageId = '',
} = {}) {
  if (!testerId || !isActiveAlphaTester(testerId)) return null;

  const runtime = reply.runtime || {};
  const scripture = (reply.scripture || []).map((s) => s.reference || s).filter(Boolean);

  const entry = {
    testerId,
    sessionId: sessionId || 'unknown',
    messageId: messageId || `${Date.now()}`,
    timestamp: new Date().toISOString(),
    userMessagePreview: preview(message),
    buddyReplyPreview: preview(reply.reply || ''),
    intent: runtime.intent || runtime.orchestratorLane || null,
    concept:
      runtime.bibleConcept ||
      runtime.bncConcept ||
      runtime.doctrineTopic ||
      reply.runtime?.relationshipSummary ||
      null,
    scripturesUsed: scripture.slice(0, 5),
    answerLane: runtime.orchestratorLane || runtime.masterRoute || null,
    responseTimeMs: latencyMs,
    openAiCalled: !!runtime.openAiCalled,
    strictDoctrineUsed: !!(
      runtime.doctrineFinalAuthority ||
      runtime.strictDoctrine ||
      /strict|doctrine_final/i.test(String(runtime.masterRoute || ''))
    ),
    memoryUsed: !!reply.memory_used,
    fallbackUsed: /fallback|guarantee|emergency/i.test(String(runtime.masterRoute || '')),
    errorCode: reply.errorCode || runtime.errorCode || null,
    fullTranscript: FULL_TRANSCRIPTS,
  };

  appendJsonlSafe(CAPTURE_PATH, entry);
  trimRetention();
  recordAlphaCapture({ testerId, sessionId, latencyMs, fallback: entry.fallbackUsed, error: entry.errorCode });
  return entry;
}

function readCaptures({ limit = 500, testerId = null } = {}) {
  try {
    if (!fs.existsSync(CAPTURE_PATH)) return [];
    const lines = fs.readFileSync(CAPTURE_PATH, 'utf8').trim().split('\n').filter(Boolean);
    let parsed = lines.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (testerId) parsed = parsed.filter((e) => e.testerId === testerId);
    return parsed.slice(-limit);
  } catch {
    return [];
  }
}

module.exports = {
  CAPTURE_PATH,
  captureAlphaTurn,
  readCaptures,
  preview,
  FULL_TRANSCRIPTS,
  PREVIEW_CHARS,
};
