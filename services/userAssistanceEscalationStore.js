/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — User Assistance Platform.
 *
 * Escalation log for AI-2 (User Assistance AI, services/userAssistanceAssistant.js)
 * questions it could not answer confidently. Per Deliverable 7 ("What This
 * Platform Deliberately Does NOT Include"): this is explicitly NOT a
 * second ticketing system. It is a small, append-only log that
 * services/adminDecisionQueue.js reads as one more source — the exact
 * same "read/normalize/overlay" pattern already used for the other three
 * sources in that module. An admin resolving an escalation here IS the
 * support workflow; there is no separate ticket object anywhere else.
 *
 * Same file-based, bounded, safe-append pattern as
 * services/supportGraphCandidateQueue.js.
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const QUEUE_PATH = path.join(__dirname, '..', 'data', 'user-assistance-escalations.jsonl');

function ensureDir() {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readAllEscalations({ limit = 2000 } = {}) {
  try {
    ensureDir();
    if (!fs.existsSync(QUEUE_PATH)) return [];
    const raw = fs.readFileSync(QUEUE_PATH, 'utf8').trim();
    if (!raw) return [];
    return raw
      .split('\n')
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    console.warn('[userAssistanceEscalationStore] read failed:', e.message);
    return [];
  }
}

/**
 * An escalation record is append-only; "resolving" it appends a new record
 * with the same id and a newer `at` timestamp (same pattern as this
 * codebase's other JSONL logs — readEscalations always folds to latest-by-id).
 */
function readEscalations({ limit = 500 } = {}) {
  const all = readAllEscalations({ limit: 5000 });
  const byId = new Map();
  for (const rec of all) {
    if (!rec.id) continue;
    byId.set(rec.id, { ...(byId.get(rec.id) || {}), ...rec });
  }
  return [...byId.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, limit);
}

function enqueueEscalation({ question, testerId = null, bestGuessArticleId = null, confidence = 'LOW', reason = '' } = {}) {
  ensureDir();
  const record = {
    id: `ua_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    question: String(question || '').slice(0, 1000),
    testerId: testerId || null,
    bestGuessArticleId,
    confidence,
    reason: String(reason || '').slice(0, 500),
    status: 'pending_review',
    adminReply: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
  };
  appendJsonlSafe(QUEUE_PATH, record);
  return record;
}

function resolveEscalation({ id, reply, resolvedBy = 'admin', action = 'resolve' } = {}) {
  const existing = readEscalations({ limit: 2000 }).find((e) => e.id === id);
  if (!existing) return { ok: false, error: 'Escalation not found.' };
  const status = action === 'dismiss' ? 'dismissed' : 'resolved';
  const record = {
    ...existing,
    status,
    adminReply: reply || existing.adminReply,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  };
  appendJsonlSafe(QUEUE_PATH, record);
  return { ok: true, escalation: record };
}

function listPendingEscalations({ limit = 200 } = {}) {
  return readEscalations({ limit: 2000 }).filter((e) => e.status === 'pending_review').slice(0, limit);
}

function getStats() {
  const all = readEscalations({ limit: 5000 });
  return {
    total: all.length,
    pending: all.filter((e) => e.status === 'pending_review').length,
    resolved: all.filter((e) => e.status === 'resolved').length,
    dismissed: all.filter((e) => e.status === 'dismissed').length,
  };
}

module.exports = {
  QUEUE_PATH,
  enqueueEscalation,
  readEscalations,
  resolveEscalation,
  listPendingEscalations,
  getStats,
};
