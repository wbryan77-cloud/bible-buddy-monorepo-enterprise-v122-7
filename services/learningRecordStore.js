/**
 * BIE v1.1 — Governed learning-record repository.
 * Founder corrections become candidates; never auto-doctrine or auto-deploy.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { appendExperienceEvent } = require('./experienceEventLedger');

const DATA_DIR = path.join(__dirname, '..', 'data', 'founder-experience');
const STORE_PATH = path.join(DATA_DIR, 'learning-records.jsonl');
const INDEX_PATH = path.join(DATA_DIR, 'learning-record-index.json');
const SCHEMA_VERSION = 'bie-learning-record-v1';

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

function createLearningRecord(input = {}) {
  ensureDir();
  const familyKey = behaviorFamilyKey(input);
  const index = loadIndex();
  if (index[familyKey] && !input.forceNew) {
    const existingId = index[familyKey].learningRecordId;
    index[familyKey].recurrenceCount = (index[familyKey].recurrenceCount || 1) + 1;
    index[familyKey].lastSeenAt = new Date().toISOString();
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
  };
  saveIndex(index);

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
    let rows = fs
      .readFileSync(STORE_PATH, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    if (status) rows = rows.filter((r) => r.adminStatus === status);
    return rows.slice(-limit).reverse();
  } catch (_) {
    return [];
  }
}

function transitionLearningRecord(learningRecordId, nextStatus, { actor = 'admin', note = null } = {}) {
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
  appendExperienceEvent({
    eventType,
    learningRecordId,
    recommendationLinkage: learningRecordId,
    adminOutcome: { status: nextStatus, actor, note },
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
  const index = loadIndex();
  for (const key of Object.keys(index)) {
    if (index[key].learningRecordId === learningRecordId) {
      index[key].adminStatus = nextStatus;
      index[key].lastSeenAt = new Date().toISOString();
    }
  }
  saveIndex(index);
  return { ok: true, learningRecordId, adminStatus: nextStatus };
}

module.exports = {
  SCHEMA_VERSION,
  ADMIN_STATUS,
  STORE_PATH,
  createLearningRecord,
  listLearningRecords,
  transitionLearningRecord,
  behaviorFamilyKey,
};
