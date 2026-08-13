/**
 * Support graph candidate queue — admin-review only precept proposals.
 * Never auto-promotes; never alters final answers or approved doctrine.
 */

const fs = require('fs');
const path = require('path');

const QUEUE_PATH = path.join(__dirname, '..', 'data', 'support-graph-candidates.jsonl');
const DECISIONS_PATH = path.join(__dirname, '..', 'data', 'support-graph-candidate-decisions.jsonl');

function ensureQueueDir() {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {object} candidate
 * @returns {object} queued record
 */
function enqueueSupportGraphCandidate(candidate = {}) {
  ensureQueueDir();

  const record = {
    id: candidate.id || `sgc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    topic: candidate.topic || null,
    proposedClaim: String(candidate.proposedClaim || candidate.claim || '').trim(),
    scriptures: candidate.scriptures || [],
    scriptureOrder: candidate.scriptureOrder || candidate.scriptures || [],
    relationshipType: candidate.relationshipType || 'unknown',
    reason: String(candidate.reason || '').trim(),
    confidence: candidate.confidence || 'low',
    source: candidate.source || 'support_relationship_engine',
    reviewRequired: true,
    autoApplied: false,
    status: candidate.status || 'pending_review',
    createdAt: new Date().toISOString(),
    // PHASE_6D — governed IOG/ICOJ candidate metadata (services/iogIcojGovernedIngestion.js).
    // Optional and additive: existing callers that never set these fields
    // are unaffected (all default to null/false below).
    discoverySource: candidate.discoverySource || null,
    sourceDocument: candidate.sourceDocument || null,
    sourceLocation: candidate.sourceLocation || null,
    extractedReference: candidate.extractedReference || null,
    actualKjvText: candidate.actualKjvText || null,
    proposedTopic: candidate.proposedTopic || candidate.topic || null,
    proposedRelationshipType: candidate.proposedRelationshipType || candidate.relationshipType || null,
    supportingReason: candidate.supportingReason || candidate.reason || null,
    duplicateStatus: candidate.duplicateStatus || null,
    scriptureValidation: candidate.scriptureValidation || null,
    rulesDecision: candidate.rulesDecision || null,
    adminReviewRequired: candidate.adminReviewRequired !== undefined ? candidate.adminReviewRequired : true,
    productionStatus: candidate.productionStatus || 'NOT_IN_PRODUCTION',
    // PHASE_6E Part 8 — TAG stage metadata (services/knowledgeTagStage.js).
    // Additive/optional: callers that never set this are unaffected (null).
    tags: candidate.tags || null,
  };

  fs.appendFileSync(QUEUE_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

function readJsonlFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Decisions are appended, never mutated in place (same durability pattern as
 * the candidate queue itself). The latest decision for a candidate id wins
 * when computing effective status.
 */
function readDecisionsById() {
  const decisions = readJsonlFile(DECISIONS_PATH);
  const byId = new Map();
  for (const decision of decisions) {
    if (!decision || !decision.candidateId) continue;
    byId.set(decision.candidateId, decision);
  }
  return byId;
}

// PHASE_6D.4 — extended to the full admin action vocabulary required by the
// Admin Exception Review contract. edit_metadata/reclassify/request_more_evidence
// are additive, non-doctrinal actions (they never themselves promote a
// candidate into production evidence — only `approve` + the rules-engine
// AUTO_APPROVED path can do that).
const ADMIN_ACTIONS = new Set([
  'approve',
  'reject',
  'merge',
  'archive',
  'edit_metadata',
  'reclassify',
  'request_more_evidence',
]);
const ACTION_TO_STATUS = {
  approve: 'approved',
  reject: 'rejected',
  merge: 'merged',
  archive: 'archived',
  edit_metadata: 'pending_review',
  reclassify: 'pending_review',
  request_more_evidence: 'awaiting_more_evidence',
};

/**
 * Record an admin (or rules-engine auto-approve) decision against a pending
 * candidate. Never mutates the original candidate record or any production
 * doctrine/Scripture file — this only appends a decision row that
 * `readSupportGraphCandidates` overlays when reporting effective status.
 */
function recordCandidateDecision({
  candidateId,
  action,
  decidedBy = 'admin',
  note = '',
  ruleEvaluation = null,
  metadataPatch = null,
} = {}) {
  if (!candidateId) throw new Error('recordCandidateDecision requires candidateId');
  if (!ADMIN_ACTIONS.has(action)) {
    throw new Error(`Unknown admin action "${action}". Expected one of: ${[...ADMIN_ACTIONS].join(', ')}`);
  }

  ensureQueueDir();
  const decision = {
    candidateId,
    action,
    status: ACTION_TO_STATUS[action],
    decidedBy,
    note: String(note || '').trim(),
    ruleEvaluation,
    // PHASE_6D.4 — edit_metadata/reclassify actions carry the proposed
    // field changes here rather than mutating the original append-only
    // candidate row, preserving full history of every prior state.
    metadataPatch: metadataPatch || null,
    decidedAt: new Date().toISOString(),
  };
  fs.appendFileSync(DECISIONS_PATH, `${JSON.stringify(decision)}\n`, 'utf8');
  dualWriteSgDecision(decision);
  return decision;
}

function dualWriteSgDecision(decision) {
  setImmediate(() => {
    try {
      const { appendItem, DOC, MAX } = require('./founderExperienceDurableStore');
      appendItem(DOC.supportGraphDecisions, decision, MAX.supportGraphDecisions).catch((err) => {
        console.warn('[supportGraphCandidateQueue] durable decision failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[supportGraphCandidateQueue] durable decision wire failed:', err && err.message ? err.message : err);
    }
  });
}

/**
 * Admin decisions overlay candidate status. After Render redeploy the JSONL
 * is empty and dispositions disappear — hydrate when decisions file is empty.
 */
async function hydrateSupportGraphDecisionsFromDurableIfNeeded() {
  let existing = 0;
  try {
    if (fs.existsSync(DECISIONS_PATH)) {
      existing = fs.readFileSync(DECISIONS_PATH, 'utf8').trim().split('\n').filter(Boolean).length;
    }
  } catch (_) {
    existing = 0;
  }
  if (existing > 0) {
    return { ok: true, hydrated: false, reason: 'jsonl_present', existing };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.supportGraphDecisions);
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
  ensureQueueDir();
  // Latest-by-candidateId wins (same overlay semantics as readDecisionsById)
  const byId = new Map();
  for (const d of items) {
    if (!d || !d.candidateId) continue;
    byId.set(d.candidateId, d);
  }
  const lines = [...byId.values()].map((d) => JSON.stringify(d));
  if (!lines.length) {
    return { ok: true, hydrated: false, reason: 'durable_items_invalid', backend };
  }
  fs.writeFileSync(DECISIONS_PATH, `${lines.join('\n')}\n`, 'utf8');
  return { ok: true, hydrated: true, count: lines.length, backend };
}

function readSupportGraphCandidates({ limit = 100, status = null } = {}) {
  const records = readJsonlFile(QUEUE_PATH);
  const decisionsById = readDecisionsById();

  let enriched = records.map((record) => {
    const decision = decisionsById.get(record.id) || null;
    return {
      ...record,
      status: decision ? decision.status : record.status,
      decision,
    };
  });

  if (status) enriched = enriched.filter((r) => r.status === status);
  return enriched.slice(-limit);
}

/**
 * Propose a candidate when support cannot be verified — research only.
 * Does NOT change doctrine or answers.
 */
function proposeCandidateFromUnverifiedClaim({
  claim = '',
  supportingScriptures = [],
  topic = null,
  reason = '',
  source = 'support_relationship_engine',
} = {}) {
  if (!claim || !supportingScriptures.length) return null;

  return enqueueSupportGraphCandidate({
    topic,
    proposedClaim: claim,
    scriptures: supportingScriptures,
    scriptureOrder: supportingScriptures,
    relationshipType: 'unverified_support',
    reason: reason || 'Claim cites Scripture but no approved support edge exists yet.',
    confidence: 'low',
    source,
  });
}

module.exports = {
  QUEUE_PATH,
  DECISIONS_PATH,
  ADMIN_ACTIONS,
  enqueueSupportGraphCandidate,
  readSupportGraphCandidates,
  proposeCandidateFromUnverifiedClaim,
  recordCandidateDecision,
  hydrateSupportGraphDecisionsFromDurableIfNeeded,
};
