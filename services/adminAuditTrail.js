/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 10: Complete Audit History.
 *
 * This is an ADDITIVE, cross-system Admin audit trail. It does not replace
 * or duplicate the two audit logs that already exist:
 *   - services/iogIcojGovernedIngestion.js (appendAuditLog / readKnowledgeAuditLog)
 *     -> ingestion/knowledge-candidate decisions only.
 *   - services/founderIntelligenceRecommendationStore.js (readDecisionsLog)
 *     -> Founder Intelligence recommendation decisions only.
 *
 * Those two logs remain authoritative for their own domains and are still
 * written by their own call sites. This module gives every Admin action —
 * across ALL source systems, including the two above — one consolidated,
 * append-only, filterable trail, using the same safe-append pattern already
 * established by services/safeJsonlWriter.js (bounded line size, bounded
 * file size with rotation, never throws).
 *
 * Hard rules (per batch instructions):
 *   - Never store secret values or the Admin token.
 *   - Never store private Founder content (prayer text, lesson bodies) —
 *     only references/ids/counts.
 *   - Append-only through ordinary application use (no update/delete API).
 *
 * Durability (post-51f0072 follow-on):
 *   JSONL on disk is ephemeral on Render. Dual-write projections into
 *   founderExperienceDurableStore (Postgres when DATABASE_URL is set) and
 *   hydrate JSONL on boot when empty — same pattern as learningRecordStore.
 */

const fs = require('fs');
const path = require('path');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const AUDIT_DIR = path.join(__dirname, '..', 'data', 'admin-command-center');
const AUDIT_LOG_PATH = path.join(AUDIT_DIR, 'unified-audit-trail.jsonl');

const SECRET_KEY_PATTERN = /token|password|secret|api[_-]?key|authorization/i;

function stripSecrets(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = stripSecrets(v);
      }
    }
    return out;
  }
  return value;
}

let sequenceCounter = 0;
function nextCorrelationId() {
  sequenceCounter += 1;
  return `aud_${Date.now().toString(36)}_${sequenceCounter}`;
}

function ensureAuditDir() {
  if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

function jsonlAuditCount() {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return 0;
    return fs.readFileSync(AUDIT_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch (_) {
    return 0;
  }
}

function dualWriteAuditDurable(record) {
  setImmediate(() => {
    try {
      const { appendItem, DOC, MAX } = require('./founderExperienceDurableStore');
      appendItem(DOC.adminUnifiedAudit, record, MAX.adminUnifiedAudit).catch((err) => {
        console.warn('[adminAuditTrail] durable append failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[adminAuditTrail] durable wire failed:', err && err.message ? err.message : err);
    }
  });
}

/**
 * After Render redeploy, ephemeral JSONL audit is empty while durable projections
 * may still hold prior Admin actions. Hydrate JSONL from durable when empty.
 */
async function hydrateAdminAuditFromDurableIfNeeded() {
  const existing = jsonlAuditCount();
  if (existing > 0) {
    return { ok: true, hydrated: false, reason: 'jsonl_present', existing };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.adminUnifiedAudit);
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
  ensureAuditDir();
  const lines = items
    .filter((r) => r && typeof r === 'object')
    .map((r) => JSON.stringify(r));
  if (!lines.length) {
    return { ok: true, hydrated: false, reason: 'durable_items_invalid', backend };
  }
  fs.writeFileSync(AUDIT_LOG_PATH, `${lines.join('\n')}\n`, 'utf8');
  return { ok: true, hydrated: true, count: lines.length, backend };
}

/**
 * Record one Admin action into the unified audit trail.
 */
function recordAdminAuditEvent(entry = {}) {
  const record = {
    correlationId: entry.correlationId || nextCorrelationId(),
    at: new Date().toISOString(),
    action: entry.action || 'UNKNOWN_ACTION',
    actionType: entry.actionType || 'READ',
    target: entry.target || null,
    sourceSystem: entry.sourceSystem || 'unified-admin-command-center',
    category: entry.category || null,
    severity: entry.severity || null,
    status: entry.status || 'COMPLETED',
    result: entry.result || null,
    previousState: stripSecrets(entry.previousState ?? null),
    resultingState: stripSecrets(entry.resultingState ?? null),
    approvalReasonOrNote: entry.approvalReasonOrNote || null,
    actorId: entry.actorId || 'admin',
    aiRecommendationInvolved: !!entry.aiRecommendationInvolved,
    confidenceAtDecision: entry.confidenceAtDecision || null,
    rollbackReference: entry.rollbackReference || null,
  };
  appendJsonlSafe(AUDIT_LOG_PATH, record);
  dualWriteAuditDurable(record);
  return record;
}

function readAllAuditLines({ limit = 5000 } = {}) {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
    const raw = fs.readFileSync(AUDIT_LOG_PATH, 'utf8').trim();
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
    console.warn('[adminAuditTrail] read failed:', e.message);
    return [];
  }
}

/**
 * Filterable read over the unified audit trail. Bounded by `limit` and an
 * internal scan cap (readAllAuditLines) so this never loads an unbounded
 * file into memory as the trail grows (Part 14 scalability requirement).
 */
function readAdminAuditTrail({
  limit = 100,
  offset = 0,
  dateFrom = null,
  dateTo = null,
  action = null,
  category = null,
  status = null,
  sourceSystem = null,
  severity = null,
} = {}) {
  const boundedLimit = Math.min(Number(limit) || 100, 500);
  const all = readAllAuditLines({ limit: 5000 }).reverse(); // most recent first

  const filtered = all.filter((rec) => {
    if (dateFrom && rec.at < dateFrom) return false;
    if (dateTo && rec.at > dateTo) return false;
    if (action && rec.action !== action) return false;
    if (category && rec.category !== category) return false;
    if (status && rec.status !== status) return false;
    if (sourceSystem && rec.sourceSystem !== sourceSystem) return false;
    if (severity && rec.severity !== severity) return false;
    return true;
  });

  return {
    ok: true,
    total: filtered.length,
    offset,
    limit: boundedLimit,
    entries: filtered.slice(offset, offset + boundedLimit),
  };
}

module.exports = {
  AUDIT_LOG_PATH,
  recordAdminAuditEvent,
  readAdminAuditTrail,
  hydrateAdminAuditFromDurableIfNeeded,
  jsonlAuditCount,
};
