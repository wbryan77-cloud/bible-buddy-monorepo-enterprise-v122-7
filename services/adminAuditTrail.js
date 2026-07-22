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

/**
 * Record one Admin action into the unified audit trail.
 *
 * @param {object} entry
 * @param {string} entry.action - e.g. 'DECISION_QUEUE_APPROVE', 'SEARCH', 'AI_QUERY'
 * @param {string} entry.actionType - REVIEW | APPROVE | REJECT | DEFER | ASSIGN | INVESTIGATE | RESOLVE | NOTE | QUERY | READ
 * @param {string} entry.target - the item/resource id or path acted on
 * @param {string} entry.sourceSystem - which underlying system owns this item
 * @param {string} [entry.result] - outcome description
 * @param {*} [entry.previousState]
 * @param {*} [entry.resultingState]
 * @param {string} [entry.approvalReasonOrNote]
 * @param {string} [entry.actorId] - defaults to 'admin' (single-admin mode today)
 * @param {boolean} [entry.aiRecommendationInvolved]
 * @param {string} [entry.confidenceAtDecision]
 * @param {string} [entry.rollbackReference]
 * @param {string} [entry.category] - for filtering (e.g. 'KNOWLEDGE', 'LESSON_ALIGNMENT', 'SECURITY')
 * @param {string} [entry.severity]
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
};
