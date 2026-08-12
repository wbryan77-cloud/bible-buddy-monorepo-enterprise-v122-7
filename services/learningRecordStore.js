/**
 * BIE v1.1 — Governed learning-record repository.
 * Founder corrections become candidates; never auto-doctrine or auto-deploy.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { appendExperienceEvent } = require('./experienceEventLedger');

// Optional test override — production uses the canonical data/ path.
const DATA_DIR = process.env.BIBLEBUDDY_LEARNING_RECORD_DIR
  ? path.resolve(process.env.BIBLEBUDDY_LEARNING_RECORD_DIR)
  : path.join(__dirname, '..', 'data', 'founder-experience');
const STORE_PATH = path.join(DATA_DIR, 'learning-records.jsonl');
const INDEX_PATH = path.join(DATA_DIR, 'learning-record-index.json');
const SCHEMA_VERSION = 'bie-learning-record-v1';

function jsonlRecordCount() {
  try {
    if (!fs.existsSync(STORE_PATH)) return 0;
    return fs.readFileSync(STORE_PATH, 'utf8').trim().split('\n').filter(Boolean).length;
  } catch (_) {
    return 0;
  }
}

/**
 * Dual-write already projects learning records into founderExperienceDurableStore
 * (Postgres when DATABASE_URL is set). After Render redeploy the JSONL on disk is
 * empty while durable projections may still exist. Hydrate JSONL/index from durable
 * so Decision Queue / Admin listLearningRecords can see FE candidates again.
 *
 * No-op when JSONL already has rows. Never invents records.
 */
async function hydrateLearningRecordsFromDurableIfNeeded() {
  const existing = jsonlRecordCount();
  if (existing > 0) {
    return { ok: true, hydrated: false, reason: 'jsonl_present', existing };
  }

  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.learningRecords);
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
  const index = loadIndex();
  const lines = [];
  for (const item of items) {
    if (!item || !item.learningRecordId) continue;
    const record = {
      schemaVersion: SCHEMA_VERSION,
      learningRecordId: item.learningRecordId,
      familyKey: item.familyKey || behaviorFamilyKey(item),
      behaviorFamily: item.behaviorFamily || 'unclassified',
      failureOrSuccessPattern:
        item.failureOrSuccessPattern || item.failurePattern || item.successPattern || null,
      expectedBehavior: item.expectedBehavior || null,
      candidateRepair: item.candidateRepair || null,
      discoveryId: item.discoveryId || null,
      packageFingerprint: item.packageFingerprint || null,
      adminStatus: item.adminStatus || 'READY_FOR_ADMIN_REVIEW',
      recurrenceCount: item.recurrenceCount || 1,
      createdAt: item.createdAt || item.updatedAt || item.lastTransitionAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.lastTransitionAt || new Date().toISOString(),
      mutationProhibited: true,
      autoPublishProhibited: true,
      autoDoctrineProhibited: true,
      hydratedFromDurable: true,
    };
    lines.push(JSON.stringify(record));
    index[record.familyKey] = {
      learningRecordId: record.learningRecordId,
      recurrenceCount: record.recurrenceCount,
      firstSeenAt: record.createdAt,
      lastSeenAt: record.updatedAt,
      adminStatus: record.adminStatus,
      packageFingerprint: record.packageFingerprint || null,
    };
  }

  if (!lines.length) {
    return { ok: true, hydrated: false, reason: 'durable_items_invalid', backend };
  }

  fs.writeFileSync(STORE_PATH, `${lines.join('\n')}\n`, 'utf8');
  saveIndex(index);
  return { ok: true, hydrated: true, count: lines.length, backend };
}

const ADMIN_STATUS = Object.freeze([
  'OBSERVED',
  'CORRELATED',
  'DRAFT_RECOMMENDATION',
  'DUPLICATE_CHECKED',
  'EVIDENCE_CHECKED',
  'READY_FOR_ADMIN_REVIEW',
  'APPROVED',
  'REJECTED',
  'DEFERRED',
  'IMPLEMENTED_IN_SHADOW',
  'VALIDATED_LOCALLY',
  'DEPLOYED',
  'VALIDATED_IN_PRODUCTION',
  'PROMOTED',
  'ROLLED_BACK',
  'SUPERSEDED',
  'RETIRED',
]);

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadIndex() {
  try {
    if (!fs.existsSync(INDEX_PATH)) return {};
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function saveIndex(index) {
  ensureDir();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
}

function behaviorFamilyKey({ behaviorFamily, failurePattern, expectedBehavior } = {}) {
  return crypto
    .createHash('sha256')
    .update(
      [behaviorFamily || '', failurePattern || '', String(expectedBehavior || '').slice(0, 120)]
        .join('|')
        .toLowerCase(),
    )
    .digest('hex')
    .slice(0, 20);
}

function findLearningRecordRaw(learningRecordId) {
  try {
    if (!learningRecordId || !fs.existsSync(STORE_PATH)) return null;
    const lines = fs.readFileSync(STORE_PATH, 'utf8').trim().split('\n').filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const row = JSON.parse(lines[i]);
      if (row.learningRecordId === learningRecordId) return row;
    }
  } catch (_) {}
  return null;
}

function indexEntryByLearningRecordId(learningRecordId) {
  const index = loadIndex();
  for (const key of Object.keys(index)) {
    if (index[key] && index[key].learningRecordId === learningRecordId) {
      return { key, entry: index[key], index };
    }
  }
  return { key: null, entry: null, index };
}

function createLearningRecord(input = {}) {
  ensureDir();
  const familyKey = behaviorFamilyKey(input);
  const index = loadIndex();
  if (index[familyKey] && !input.forceNew) {
    const existingId = index[familyKey].learningRecordId;
    index[familyKey].recurrenceCount = (index[familyKey].recurrenceCount || 1) + 1;
    index[familyKey].lastSeenAt = new Date().toISOString();
    if (input.packageFingerprint) {
      index[familyKey].packageFingerprint = input.packageFingerprint;
    }
    saveIndex(index);
    appendExperienceEvent({
      eventType: 'LEARNING_RECORD_CREATED',
      learningRecordId: existingId,
      recommendationLinkage: existingId,
      founderFeedback: input.founderMark || null,
      governanceStatus: 'CORRELATED',
      currentMessageSummary: input.expectedBehavior || null,
      privacyScope: 'INTERNAL_GOVERNANCE',
      authenticatedActorClass: input.actorClass || 'founder',
    });
    return {
      ok: true,
      duplicate: true,
      learningRecordId: existingId,
      recurrenceCount: index[familyKey].recurrenceCount,
    };
  }

  const record = {
    schemaVersion: SCHEMA_VERSION,
    learningRecordId: input.learningRecordId || crypto.randomUUID(),
    familyKey,
    sourceEventIds: input.sourceEventIds || [],
    behaviorFamily: input.behaviorFamily || 'unclassified',
    failureOrSuccessPattern: input.failurePattern || input.successPattern || null,
    rootCause: input.rootCause || null,
    expectedBehavior: input.expectedBehavior || null,
    affectedOwner: input.affectedOwner || null,
    candidateRepair: input.candidateRepair || null,
    discoveryId: input.discoveryId || null,
    packageFingerprint: input.packageFingerprint || null,
    evidence: input.evidence || [],
    confidence: input.confidence || 'medium',
    counterexamples: input.counterexamples || [],
    generalizationTests: input.generalizationTests || [],
    governanceClassification: input.governanceClassification || 'FOUNDER_EXPERIENCE_CANDIDATE',
    adminStatus: 'READY_FOR_ADMIN_REVIEW',
    implementationStatus: 'none',
    deploymentStatus: 'none',
    measuredOutcome: null,
    rollbackLinkage: null,
    supersededBy: null,
    recurrenceCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    founderMark: input.founderMark || null,
    traceId: input.traceId || null,
    releaseCommit: input.releaseCommit || process.env.RENDER_GIT_COMMIT || null,
    mutationProhibited: true,
    autoPublishProhibited: true,
    autoDoctrineProhibited: true,
  };

  fs.appendFileSync(STORE_PATH, `${JSON.stringify(record)}\n`, 'utf8');
  index[familyKey] = {
    learningRecordId: record.learningRecordId,
    recurrenceCount: 1,
    firstSeenAt: record.createdAt,
    lastSeenAt: record.createdAt,
    adminStatus: record.adminStatus,
    packageFingerprint: record.packageFingerprint,
  };
  saveIndex(index);

  setImmediate(() => {
    try {
      const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');
      upsertById(DOC.learningRecords, 'learningRecordId', record, MAX.learningRecords).catch((err) => {
        console.warn('[learningRecordStore] durable upsert failed:', err.message);
      });
    } catch (err) {
      console.warn('[learningRecordStore] durable wire failed:', err.message);
    }
  });

  appendExperienceEvent({
    eventType: 'LEARNING_RECORD_CREATED',
    learningRecordId: record.learningRecordId,
    recommendationLinkage: record.learningRecordId,
    founderFeedback: input.founderMark || null,
    governanceStatus: 'READY_FOR_ADMIN_REVIEW',
    privacyScope: 'INTERNAL_GOVERNANCE',
    authenticatedActorClass: input.actorClass || 'founder',
    currentMessageSummary: record.expectedBehavior,
  });

  return { ok: true, duplicate: false, record };
}

function listLearningRecords({ limit = 100, status = null } = {}) {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const index = loadIndex();
    const byId = {};
    for (const key of Object.keys(index)) {
      const entry = index[key];
      if (entry && entry.learningRecordId) byId[entry.learningRecordId] = entry;
    }
    // Append-only JSONL holds creation snapshot; index/transitions hold current Admin state.
    let rows = fs
      .readFileSync(STORE_PATH, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        const row = JSON.parse(l);
        const overlay = byId[row.learningRecordId];
        if (!overlay) return row;
        return {
          ...row,
          adminStatus: overlay.adminStatus || row.adminStatus,
          recurrenceCount: overlay.recurrenceCount ?? row.recurrenceCount,
          updatedAt: overlay.lastSeenAt || row.updatedAt,
          packageFingerprint: overlay.packageFingerprint || row.packageFingerprint || null,
          measuredOutcome:
            overlay.measuredOutcome !== undefined ? overlay.measuredOutcome : row.measuredOutcome,
        };
      });
    if (status) rows = rows.filter((r) => r.adminStatus === status);
    return rows.slice(-limit).reverse();
  } catch (_) {
    return [];
  }
}

function transitionLearningRecord(
  learningRecordId,
  nextStatus,
  { actor = 'admin', note = null, packageFingerprint = null, measuredOutcome = null } = {},
) {
  if (!ADMIN_STATUS.includes(nextStatus)) {
    return { ok: false, reason: 'invalid_status' };
  }
  // Learning records are append-only; transitions recorded as overlay events.
  const eventType =
    nextStatus === 'APPROVED'
      ? 'ADMIN_RECOMMENDATION_APPROVED'
      : nextStatus === 'REJECTED'
        ? 'ADMIN_RECOMMENDATION_REJECTED'
        : nextStatus === 'DEFERRED'
          ? 'ADMIN_RECOMMENDATION_DEFERRED'
          : 'ADMIN_RECOMMENDATION_CREATED';
  const raw = findLearningRecordRaw(learningRecordId);
  const { key, entry, index } = indexEntryByLearningRecordId(learningRecordId);
  const resolvedFingerprint =
    packageFingerprint || entry?.packageFingerprint || raw?.packageFingerprint || null;

  appendExperienceEvent({
    eventType,
    learningRecordId,
    recommendationLinkage: learningRecordId,
    adminOutcome: {
      status: nextStatus,
      actor,
      note,
      packageFingerprint: resolvedFingerprint,
    },
    governanceStatus: nextStatus,
    privacyScope: 'INTERNAL_GOVERNANCE',
    authenticatedActorClass: 'admin',
    mutationFlags: {
      doctrineChanged: false,
      scriptureChanged: false,
      evidenceActivated: false,
      productionBehaviorChanged: false,
    },
  });
  if (key && index[key]) {
    index[key].adminStatus = nextStatus;
    index[key].lastSeenAt = new Date().toISOString();
    if (resolvedFingerprint) index[key].packageFingerprint = resolvedFingerprint;
    if (measuredOutcome !== null) index[key].measuredOutcome = measuredOutcome;
    saveIndex(index);
  } else {
    // Transition for a record not yet indexed — keep status recoverable via synthetic key.
    const syntheticKey = `id:${learningRecordId}`;
    index[syntheticKey] = {
      learningRecordId,
      adminStatus: nextStatus,
      lastSeenAt: new Date().toISOString(),
      packageFingerprint: resolvedFingerprint,
      measuredOutcome,
      recurrenceCount: raw?.recurrenceCount || 1,
    };
    saveIndex(index);
  }

  const transition = {
    transitionId: crypto.randomUUID(),
    learningRecordId,
    toStatus: nextStatus,
    actor,
    note,
    packageFingerprint: resolvedFingerprint,
    at: new Date().toISOString(),
    productionMutation: false,
    evidenceActivated: false,
  };
  setImmediate(() => {
    try {
      const { appendItem, upsertById, DOC, MAX } = require('./founderExperienceDurableStore');
      appendItem(DOC.recommendationTransitions, transition, MAX.recommendationTransitions).catch(() => {});
      upsertById(
        DOC.recommendations,
        'learningRecordId',
        {
          learningRecordId,
          adminStatus: nextStatus,
          packageFingerprint: resolvedFingerprint,
          lastTransitionAt: transition.at,
          lastActor: actor,
        },
        MAX.recommendations,
      ).catch(() => {});
      upsertById(
        DOC.learningRecords,
        'learningRecordId',
        {
          learningRecordId,
          adminStatus: nextStatus,
          packageFingerprint: resolvedFingerprint,
          measuredOutcome,
          behaviorFamily: raw?.behaviorFamily || null,
          expectedBehavior: raw?.expectedBehavior || null,
          candidateRepair: raw?.candidateRepair || null,
          discoveryId: raw?.discoveryId || null,
          lastTransitionAt: transition.at,
        },
        MAX.learningRecords,
      ).catch(() => {});
    } catch (_) {}
  });

  return {
    ok: true,
    learningRecordId,
    adminStatus: nextStatus,
    packageFingerprint: resolvedFingerprint,
    productionMutation: false,
  };
}

module.exports = {
  SCHEMA_VERSION,
  ADMIN_STATUS,
  STORE_PATH,
  INDEX_PATH,
  DATA_DIR,
  createLearningRecord,
  listLearningRecords,
  transitionLearningRecord,
  behaviorFamilyKey,
  findLearningRecordRaw,
  hydrateLearningRecordsFromDurableIfNeeded,
  jsonlRecordCount,
};
