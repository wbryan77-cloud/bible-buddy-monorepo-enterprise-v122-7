/**
 * Phase 5J — Alpha feedback capture (in-chat tags).
 */

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

function recordFeedback({
  testerId = '',
  sessionId = '',
  messageId = '',
  rating = null,
  tag = '',
  optionalComment = '',
} = {}) {
  if (!testerId) return { ok: false, error: 'testerId required' };
  if (!isActiveAlphaTester(testerId)) return { ok: false, error: 'Invalid or non-onboarded tester' };

  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) return { ok: false, error: 'Invalid feedback tag' };

  const entry = {
    testerId,
    sessionId: String(sessionId || '').slice(0, 80),
    messageId: String(messageId || '').slice(0, 80),
    rating: rating != null ? Number(rating) : null,
    tag: normalizedTag,
    optionalComment: String(optionalComment || '').slice(0, 500),
    timestamp: new Date().toISOString(),
  };

  appendJsonlSafe(FEEDBACK_PATH, entry);
  recordAlphaFeedback({ tag: normalizedTag, testerId });
  return { ok: true, entry };
}

function readFeedback({ limit = 500, tag = null } = {}) {
  const fs = require('fs');
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
  recordFeedback,
  readFeedback,
  normalizeTag,
};
