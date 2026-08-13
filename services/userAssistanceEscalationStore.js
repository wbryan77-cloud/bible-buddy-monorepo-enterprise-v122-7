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
 *
 * Durability (Sprint A): JSONL on disk is ephemeral on Render. Dual-write
 * projections into founderExperienceDurableStore (Postgres when DATABASE_URL
 * is set) and hydrate JSONL on boot when empty — same pattern as
 * learningRecordStore / adminAuditTrail.
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const QUEUE_PATH = path.join(__dirname, '..', 'data', 'user-assistance-escalations.jsonl');

function ensureDir() {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function jsonlEscalationCount() {
  try {
    if (!fs.existsSync(QUEUE_PATH)) return 0;
    return fs.readFileSync(QUEUE_PATH, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch (_) {
    return 0;
  }
}

function dualWriteEscalationDurable(record) {
  setImmediate(() => {
    try {
      const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');
      upsertById(DOC.userAssistanceEscalations, 'id', record, MAX.userAssistanceEscalations).catch((err) => {
        console.warn('[userAssistanceEscalationStore] durable upsert failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[userAssistanceEscalationStore] durable wire failed:', err && err.message ? err.message : err);
    }
  });
}

/**
 * After Render redeploy, ephemeral JSONL is empty while durable projections
 * may still hold pending/resolved escalations. Hydrate when empty.
 */
async function hydrateEscalationsFromDurableIfNeeded() {
  const existing = jsonlEscalationCount();
  if (existing > 0) {
    return { ok: true, hydrated: false, reason: 'jsonl_present', existing };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.userAssistanceEscalations);
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
  ensureDir();
  const lines = items
    .filter((r) => r && typeof r === 'object' && r.id)
    .map((r) => JSON.stringify(r));
  if (!lines.length) {
    return { ok: true, hydrated: false, reason: 'durable_items_invalid', backend };
  }
  fs.writeFileSync(QUEUE_PATH, `${lines.join('\n')}\n`, 'utf8');
  return { ok: true, hydrated: true, count: lines.length, backend };
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
  dualWriteEscalationDurable(record);
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
  dualWriteEscalationDurable(record);
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
  hydrateEscalationsFromDurableIfNeeded,
  jsonlEscalationCount,
};
