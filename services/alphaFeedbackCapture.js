/**
 * Phase 5J — Alpha feedback capture (in-chat tags).
 *
 * Durability (Sprint A): JSONL on disk is ephemeral on Render. Dual-write
 * projections into founderExperienceDurableStore (Postgres when DATABASE_URL
 * is set) and hydrate JSONL on boot when empty — same pattern as
 * learningRecordStore / adminAuditTrail.
 *
 * Sprint C: companion-chat guests (guest-* ids) may submit helpful /
 * not_helpful tags on a specific messageId. Feedback is evidence only —
 * it does not mutate doctrine, activate knowledge, or approve learning.
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');
const { isActiveAlphaTester } = require('./alphaTesterManager');
const { recordAlphaFeedback } = require('./runtimeHealthMonitor');

const FEEDBACK_PATH = path.join(__dirname, '..', 'data', 'alpha-feedback.jsonl');

const VALID_TAGS = [
  'helpful',
  'not_helpful',
  'wrong_doctrine',
  'didnt_listen',
  'too_robotic',
  'felt_supportive',
  'bug_glitch',
];

/** Public Companion Chat may only use these tags (lightweight UX). */
const COMPANION_PUBLIC_TAGS = ['helpful', 'not_helpful'];

const TAG_ALIASES = {
  '👍': 'helpful',
  '👎': 'not_helpful',
  '⚠️': 'wrong_doctrine',
  '💬': 'didnt_listen',
  '🧊': 'too_robotic',
  '❤️': 'felt_supportive',
  '🐞': 'bug_glitch',
};

function normalizeTag(tag = '') {
  const t = String(tag).trim();
  if (TAG_ALIASES[t]) return TAG_ALIASES[t];
  if (VALID_TAGS.includes(t)) return t;
  const lower = t.toLowerCase().replace(/\s+/g, '_');
  if (VALID_TAGS.includes(lower)) return lower;
  return null;
}

function isCompanionGuestId(id = '') {
  return /^guest-[a-z0-9]+$/i.test(String(id || '').trim());
}

function newFeedbackId() {
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function jsonlFeedbackCount() {
  try {
    if (!fs.existsSync(FEEDBACK_PATH)) return 0;
    return fs.readFileSync(FEEDBACK_PATH, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch (_) {
    return 0;
  }
}

function dualWriteFeedbackDurable(entry) {
  setImmediate(() => {
    try {
      const { appendItem, DOC, MAX } = require('./founderExperienceDurableStore');
      appendItem(DOC.alphaFeedback, entry, MAX.alphaFeedback).catch((err) => {
        console.warn('[alphaFeedbackCapture] durable append failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[alphaFeedbackCapture] durable wire failed:', err && err.message ? err.message : err);
    }
  });
}

/**
 * After Render redeploy, ephemeral JSONL feedback is empty while durable
 * projections may still hold user-submitted tags. Hydrate when empty.
 */
async function hydrateAlphaFeedbackFromDurableIfNeeded() {
  const existing = jsonlFeedbackCount();
  if (existing > 0) {
    return { ok: true, hydrated: false, reason: 'jsonl_present', existing };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.alphaFeedback);
    items = Array.isArray(result.items) ? result.items : [];
    backend = result.backend || 'UNKNOWN';
  } catch (err) {
    return {
      ok: false,
      hydrated: false,
      reason: 'durable_read_failed',
      error: err && err.message ? err.message : String(err),
    };
  }
  if (!items.length) {
    return { ok: true, hydrated: false, reason: 'durable_empty', backend };
  }
  const dir = path.dirname(FEEDBACK_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const lines = items
    .filter((r) => r && typeof r === 'object' && r.tag)
    .map((r) => JSON.stringify(r));
  if (!lines.length) {
    return { ok: true, hydrated: false, reason: 'durable_items_invalid', backend };
  }
  fs.writeFileSync(FEEDBACK_PATH, `${lines.join('\n')}\n`, 'utf8');
  return { ok: true, hydrated: true, count: lines.length, backend };
}

function findFeedbackForMessage(testerId, messageId) {
  if (!testerId || !messageId) return null;
  const rows = readFeedback({ limit: 5000 });
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row && row.testerId === testerId && row.messageId === messageId) return row;
  }
  return null;
}

function recordFeedback({
  testerId = '',
  sessionId = '',
  messageId = '',
  rating = null,
  tag = '',
  optionalComment = '',
  source = '',
} = {}) {
  const tid = String(testerId || '').trim().slice(0, 80);
  if (!tid) return { ok: false, error: 'testerId required' };

  const companionSource = String(source || '').trim() === 'companion_chat';
  const guest = companionSource || isCompanionGuestId(tid);

  if (guest) {
    if (!isCompanionGuestId(tid)) {
      return { ok: false, error: 'Invalid guest identity' };
    }
  } else if (!isActiveAlphaTester(tid)) {
    return { ok: false, error: 'Invalid or non-onboarded tester' };
  }

  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) return { ok: false, error: 'Invalid feedback tag' };
  if (guest && !COMPANION_PUBLIC_TAGS.includes(normalizedTag)) {
    return { ok: false, error: 'Invalid feedback tag' };
  }

  const mid = String(messageId || '').trim().slice(0, 80);
  if (guest && !mid) {
    return { ok: false, error: 'messageId required' };
  }

  if (mid) {
    const existing = findFeedbackForMessage(tid, mid);
    if (existing) {
      return { ok: true, alreadyRecorded: true, entry: existing };
    }
  }

  // Server-authored entry only — never copy client Admin/governance fields.
  const entry = {
    feedbackId: newFeedbackId(),
    testerId: tid,
    sessionId: String(sessionId || '').slice(0, 80),
    messageId: mid,
    rating: rating != null && Number.isFinite(Number(rating)) ? Number(rating) : null,
    tag: normalizedTag,
    optionalComment: String(optionalComment || '').slice(0, 500),
    timestamp: new Date().toISOString(),
    source: guest ? 'companion_chat' : 'alpha',
  };

  appendJsonlSafe(FEEDBACK_PATH, entry);
  dualWriteFeedbackDurable(entry);
  recordAlphaFeedback({ tag: normalizedTag, testerId: tid });
  return { ok: true, entry };
}

function readFeedback({ limit = 500, tag = null } = {}) {
  try {
    if (!fs.existsSync(FEEDBACK_PATH)) return [];
    const lines = fs.readFileSync(FEEDBACK_PATH, 'utf8').trim().split('\n').filter(Boolean);
    let items = lines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (tag) items = items.filter((i) => i.tag === tag);
    return items.slice(-limit);
  } catch {
    return [];
  }
}

module.exports = {
  FEEDBACK_PATH,
  VALID_TAGS,
  COMPANION_PUBLIC_TAGS,
  recordFeedback,
  readFeedback,
  normalizeTag,
  isCompanionGuestId,
  findFeedbackForMessage,
  hydrateAlphaFeedbackFromDurableIfNeeded,
  jsonlFeedbackCount,
};
