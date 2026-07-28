/**
 * Phase 7C — Authoritative durable user-memory owner.
 *
 * One owner for retained relational facts. Persistence uses the EXISTING
 * storageAdapter + bible_buddy_documents Postgres path when DATABASE_URL is
 * set. Local JSON is cache / offline fallback only — not cross-instance authority.
 *
 * No new database product. No parallel memory engine.
 */

const path = require('path');
const crypto = require('crypto');
const { getStorageAdapter, FileStorageAdapter } = require('./persistence/storageAdapter');

const DOC_PATH = path.join(__dirname, '..', 'data', 'durable-user-memory.json');

const MEMORY_TYPES = {
  IDENTITY: 'IDENTITY',
  IMPORTANT_PERSON: 'IMPORTANT_PERSON',
  FAMILY_RELATIONSHIP: 'FAMILY_RELATIONSHIP',
  PRAYER_SUBJECT: 'PRAYER_SUBJECT',
  ACTIVE_BURDEN: 'ACTIVE_BURDEN',
  RESOLVED_BURDEN: 'RESOLVED_BURDEN',
  SPIRITUAL_GOAL: 'SPIRITUAL_GOAL',
  ONGOING_STUDY: 'ONGOING_STUDY',
  USER_PREFERENCE: 'USER_PREFERENCE',
  ACCEPTED_CORRECTION: 'ACCEPTED_CORRECTION',
  ONGOING_TOPIC: 'ONGOING_TOPIC',
  TEMPORARY_CONTEXT: 'TEMPORARY_CONTEXT',
  DO_NOT_RETAIN: 'DO_NOT_RETAIN',
};

const CONFIDENCE = {
  CONFIRMED: 'CONFIRMED',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNKNOWN: 'UNKNOWN',
};

const PROVENANCE = {
  CURRENT_TURN: 'CURRENT_TURN',
  CURRENT_CONVERSATION: 'CURRENT_CONVERSATION',
  PRIOR_CONVERSATION: 'PRIOR_CONVERSATION',
  USER_CONFIRMED_MEMORY: 'USER_CONFIRMED_MEMORY',
  SYSTEM_DERIVED_SUMMARY: 'SYSTEM_DERIVED_SUMMARY',
};

/** @type {Map<string, object>} */
const sessionCache = new Map();
/** @type {Map<string, boolean>} */
const dirtyUsers = new Map();

function emptyStore() {
  return { users: {}, meta: { owner: 'durableUserMemory', version: 1 } };
}

function emptyUser() {
  return { records: [], updatedAt: null };
}

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function resolveBackend() {
  const hasDb = !!String(process.env.DATABASE_URL || '').trim();
  if (hasDb) {
    try {
      const storage = require('./persistence/storageAdapter');
      storage.resetStorageAdapterForTests();
      const prev = process.env.PERSISTENCE;
      process.env.PERSISTENCE = 'POSTGRES';
      const adapter = storage.getStorageAdapter();
      if (adapter.kind === 'POSTGRES') {
        return { kind: 'POSTGRES', adapter, durable: true };
      }
      if (prev !== undefined) process.env.PERSISTENCE = prev;
    } catch (e) {
      console.warn('[durableUserMemory] Postgres unavailable, file fallback:', e.message);
    }
  }
  return { kind: 'FILE', adapter: new FileStorageAdapter(), durable: false };
}

let backendInfo = null;
function getBackend() {
  if (!backendInfo) backendInfo = resolveBackend();
  return backendInfo;
}

function resetDurableBackendForTests() {
  backendInfo = null;
  sessionCache.clear();
  dirtyUsers.clear();
  try {
    require('./persistence/storageAdapter').resetStorageAdapterForTests();
  } catch (_) {}
}

async function readStoreAsync() {
  const { adapter, kind } = getBackend();
  if (kind === 'POSTGRES') {
    return adapter.readJsonDocument(DOC_PATH, emptyStore());
  }
  return Promise.resolve(adapter.readJsonDocument(DOC_PATH, emptyStore()));
}

async function writeStoreAsync(store) {
  const { adapter, kind } = getBackend();
  if (kind === 'POSTGRES') {
    return adapter.writeJsonDocument(DOC_PATH, store);
  }
  return Promise.resolve(adapter.writeJsonDocument(DOC_PATH, store));
}

/**
 * Load user records from durable backend into process cache (request start).
 */
async function ensureHydrated(userId) {
  if (!userId) return emptyUser();
  const store = await readStoreAsync();
  const user = store.users?.[userId] || emptyUser();
  sessionCache.set(userId, {
    records: Array.isArray(user.records) ? user.records.map((r) => ({ ...r })) : [],
    updatedAt: user.updatedAt || null,
  });
  dirtyUsers.set(userId, false);
  return sessionCache.get(userId);
}

function getCachedUser(userId) {
  if (!userId) return emptyUser();
  if (!sessionCache.has(userId)) {
    // Sync cold path for FILE / tests — hydrate from file adapter without await
    const { adapter, kind } = getBackend();
    if (kind === 'FILE') {
      const store = adapter.readJsonDocument(DOC_PATH, emptyStore());
      const user = store.users?.[userId] || emptyUser();
      sessionCache.set(userId, {
        records: Array.isArray(user.records) ? user.records.map((r) => ({ ...r })) : [],
        updatedAt: user.updatedAt || null,
      });
    } else {
      sessionCache.set(userId, emptyUser());
    }
  }
  return sessionCache.get(userId);
}

async function flushUser(userId) {
  if (!userId || !dirtyUsers.get(userId)) return false;
  const cached = sessionCache.get(userId) || emptyUser();
  const store = await readStoreAsync();
  if (!store.users) store.users = {};
  store.users[userId] = {
    records: cached.records || [],
    updatedAt: new Date().toISOString(),
  };
  store.meta = { ...(store.meta || {}), owner: 'durableUserMemory', version: 1, updatedAt: new Date().toISOString() };
  await writeStoreAsync(store);
  dirtyUsers.set(userId, false);
  return true;
}

function listActive(userId, { types = null, includeDeleted = false } = {}) {
  const user = getCachedUser(userId);
  return (user.records || []).filter((r) => {
    if (!includeDeleted && (r.deletedAt || r.isActive === false)) return false;
    if (types && types.length && !types.includes(r.memoryType)) return false;
    return true;
  });
}

function upsertMemory({
  userId,
  memoryType,
  subject = null,
  relationship = null,
  content = '',
  normalizedValue = null,
  status = 'active',
  confidence = CONFIDENCE.HIGH,
  provenance = PROVENANCE.CURRENT_CONVERSATION,
  retentionScope = 'long_term',
  consentStatus = 'implied_conversation',
  sensitivityLevel = 'standard',
  supersedesMemoryId = null,
  sourceConversationId = null,
} = {}) {
  if (!userId || !memoryType || memoryType === MEMORY_TYPES.DO_NOT_RETAIN) return null;
  if (!String(content || '').trim() && !subject) return null;

  const user = getCachedUser(userId);
  const now = new Date().toISOString();

  // Soft-supersede matching active records of same type+subject
  const subjectKey = String(subject || normalizedValue || '').toLowerCase();
  for (const rec of user.records) {
    if (rec.deletedAt || rec.isActive === false) continue;
    const sameType = rec.memoryType === memoryType;
    const sameSubject =
      !subjectKey ||
      String(rec.subject || rec.normalizedValue || '').toLowerCase() === subjectKey ||
      (memoryType === MEMORY_TYPES.ACTIVE_BURDEN && rec.memoryType === MEMORY_TYPES.ACTIVE_BURDEN);
    if (sameType && sameSubject) {
      rec.isActive = false;
      rec.status = 'superseded';
      rec.updatedAt = now;
      if (memoryType === MEMORY_TYPES.ACTIVE_BURDEN && status === 'resolved') {
        rec.memoryType = MEMORY_TYPES.RESOLVED_BURDEN;
        rec.status = 'resolved';
      }
    }
  }

  if (supersedesMemoryId) {
    const prior = user.records.find((r) => r.memoryId === supersedesMemoryId);
    if (prior) {
      prior.isActive = false;
      prior.status = 'superseded';
      prior.updatedAt = now;
    }
  }

  const record = {
    memoryId: newId(),
    userId,
    memoryType: status === 'resolved' && memoryType === MEMORY_TYPES.ACTIVE_BURDEN
      ? MEMORY_TYPES.RESOLVED_BURDEN
      : memoryType,
    subject: subject || null,
    relationship: relationship || null,
    content: String(content || '').slice(0, 240),
    normalizedValue: normalizedValue || subject || null,
    status: status === 'resolved' ? 'resolved' : status || 'active',
    confidence,
    provenance,
    sourceConversationId: sourceConversationId || null,
    sourceMessageId: null,
    createdAt: now,
    updatedAt: now,
    lastConfirmedAt: now,
    expiresAt: null,
    retentionScope,
    consentStatus,
    sensitivityLevel,
    isActive: status !== 'resolved' && status !== 'deleted',
    supersedesMemoryId: supersedesMemoryId || null,
    deletedAt: null,
  };

  user.records.push(record);
  // Cap per user
  if (user.records.length > 200) {
    user.records = user.records.slice(-200);
  }
  user.updatedAt = now;
  sessionCache.set(userId, user);
  dirtyUsers.set(userId, true);
  return record;
}

function resolveBurden(userIdOrOpts, maybeOpts = {}) {
  const opts =
    userIdOrOpts && typeof userIdOrOpts === 'object'
      ? userIdOrOpts
      : { userId: userIdOrOpts, ...maybeOpts };
  const { userId, subject = null, content = '' } = opts;
  // Mark prior active burdens inactive first
  const user = getCachedUser(userId);
  const now = new Date().toISOString();
  const subjectKey = String(subject || '').toLowerCase();
  for (const rec of user.records || []) {
    if (rec.deletedAt || rec.isActive === false) continue;
    if (rec.memoryType !== MEMORY_TYPES.ACTIVE_BURDEN) continue;
    if (subjectKey && String(rec.subject || '').toLowerCase() !== subjectKey) continue;
    rec.isActive = false;
    rec.status = 'resolved';
    rec.memoryType = MEMORY_TYPES.RESOLVED_BURDEN;
    rec.updatedAt = now;
    if (content) rec.content = String(content).slice(0, 240);
  }
  sessionCache.set(userId, user);
  dirtyUsers.set(userId, true);
  return upsertMemory({
    userId,
    memoryType: MEMORY_TYPES.RESOLVED_BURDEN,
    subject,
    content: content || `resolved: ${subject || 'burden'}`,
    status: 'resolved',
    confidence: CONFIDENCE.CONFIRMED,
    provenance: PROVENANCE.USER_CONFIRMED_MEMORY,
    consentStatus: 'user_stated',
  });
}

function softDeleteMatching(userId, { about = '', types = null } = {}) {
  const user = getCachedUser(userId);
  const needle = String(about || '').toLowerCase();
  const now = new Date().toISOString();
  let n = 0;
  for (const rec of user.records) {
    if (rec.deletedAt) continue;
    if (types && types.length && !types.includes(rec.memoryType)) continue;
    const hay = `${rec.subject || ''} ${rec.content || ''} ${rec.relationship || ''}`.toLowerCase();
    if (!needle || hay.includes(needle)) {
      rec.deletedAt = now;
      rec.isActive = false;
      rec.status = 'deleted';
      rec.updatedAt = now;
      n += 1;
    }
  }
  if (n) {
    sessionCache.set(userId, user);
    dirtyUsers.set(userId, true);
  }
  return n;
}

function clearAllForUser(userId) {
  if (!userId) return false;
  sessionCache.set(userId, emptyUser());
  dirtyUsers.set(userId, true);
  return true;
}

/**
 * Companion-facing snapshot used by relationshipMemoryEngine / selector.
 */
function buildCompanionFields(userId) {
  const user = getCachedUser(userId);
  const all = user.records || [];
  const active = all.filter((r) => !r.deletedAt && r.isActive !== false && r.status !== 'deleted');
  const prayer = [...active].reverse().find((r) => r.memoryType === MEMORY_TYPES.PRAYER_SUBJECT);
  const burden = [...active].reverse().find((r) => r.memoryType === MEMORY_TYPES.ACTIVE_BURDEN && r.status === 'active');
  const resolved = [...all]
    .reverse()
    .find((r) => r.memoryType === MEMORY_TYPES.RESOLVED_BURDEN || r.status === 'resolved');
  const person = [...active].reverse().find(
    (r) => r.memoryType === MEMORY_TYPES.IMPORTANT_PERSON || r.memoryType === MEMORY_TYPES.FAMILY_RELATIONSHIP,
  );

  const isResolved = !!resolved && !burden;
  return {
    currentStruggle: burden?.content || (isResolved ? resolved?.content : null),
    recentConcern: burden ? 'family_burden' : isResolved ? 'resolved' : null,
    lastPrayerRequest: prayer?.content || null,
    importantPerson: person?.subject || person?.normalizedValue || null,
    resolvedBurden: resolved?.content || null,
    durableBackend: getBackend().kind,
    durable: getBackend().durable,
  };
}

function getStatus() {
  const b = getBackend();
  return {
    owner: 'durableUserMemory',
    backend: b.kind,
    durable: b.durable,
    docKey: 'data/durable-user-memory.json',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  };
}

module.exports = {
  MEMORY_TYPES,
  CONFIDENCE,
  PROVENANCE,
  DOC_PATH,
  ensureHydrated,
  flushUser,
  getCachedUser,
  listActive,
  upsertMemory,
  resolveBurden,
  softDeleteMatching,
  clearAllForUser,
  buildCompanionFields,
  getStatus,
  resetDurableBackendForTests,
  getBackend,
};
