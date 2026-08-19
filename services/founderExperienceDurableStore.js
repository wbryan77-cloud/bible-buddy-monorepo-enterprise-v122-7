/**
 * BIE v1.1A — Durable projections for Founder Experience Loop records.
 * Uses EXISTING bible_buddy_documents via storageAdapter (no second DB product).
 * File JSON is offline/local fallback only when DATABASE_URL is absent.
 */

const path = require('path');
const { getStorageAdapter, FileStorageAdapter } = require('./persistence/storageAdapter');

const ROOT = path.join(__dirname, '..');
const DOC = {
  experienceEvents: path.join(ROOT, 'data/founder-experience/experience-events.json'),
  learningRecords: path.join(ROOT, 'data/founder-experience/learning-records.json'),
  evaluationResults: path.join(ROOT, 'data/founder-experience/evaluation-results.json'),
  recommendations: path.join(ROOT, 'data/founder-experience/recommendations.json'),
  recommendationTransitions: path.join(ROOT, 'data/founder-experience/recommendation-transitions.json'),
  discoveries: path.join(ROOT, 'data/founder-experience/discoveries.json'),
  relationships: path.join(ROOT, 'data/founder-experience/relationships.json'),
  hypotheses: path.join(ROOT, 'data/founder-experience/hypotheses.json'),
  predictions: path.join(ROOT, 'data/founder-experience/predictions.json'),
  costLedger: path.join(ROOT, 'data/founder-experience/cost-ledger.json'),
  calibration: path.join(ROOT, 'data/founder-experience/evaluator-calibration.json'),
  // Unified Admin audit — same dual-write helper; not a second audit product.
  adminUnifiedAudit: path.join(ROOT, 'data/admin-command-center/unified-audit-durable.json'),
  // Sprint A — non-regenerable user/Admin state (same dual-write/hydrate pattern).
  userAssistanceEscalations: path.join(ROOT, 'data/user-assistance/escalations-durable.json'),
  alphaFeedback: path.join(ROOT, 'data/alpha/alpha-feedback-durable.json'),
  helpCenterArticles: path.join(ROOT, 'data/help-center/articles-durable.json'),
  // Sprint B Class C — Admin/user decisions that existing contracts keep across re-observe
  founderIntelligenceDispositions: path.join(ROOT, 'data/founder-intelligence/dispositions-durable.json'),
  founderIntelligenceDecisions: path.join(ROOT, 'data/founder-intelligence/decisions-durable.json'),
  supportGraphDecisions: path.join(ROOT, 'data/support-graph/decisions-durable.json'),
  alphaTesters: path.join(ROOT, 'data/alpha/alpha-testers-durable.json'),
  // Unused Alpha invite tokens — survive redeploy (hydrate must not wipe).
  alphaInvites: path.join(ROOT, 'data/alpha/alpha-invites-durable.json'),
  // Explicit "Remember that…" pins — redeploy-surviving (same dual-write/hydrate pattern).
  explicitRememberPins: path.join(ROOT, 'data/explicit-remember-pins-durable.json'),
};

const MAX = {
  experienceEvents: 8000,
  learningRecords: 4000,
  evaluationResults: 4000,
  recommendations: 2000,
  recommendationTransitions: 4000,
  discoveries: 2000,
  relationships: 5000,
  hypotheses: 2000,
  predictions: 2000,
  costLedger: 8000,
  calibration: 4000,
  adminUnifiedAudit: 8000,
  userAssistanceEscalations: 4000,
  alphaFeedback: 8000,
  helpCenterArticles: 2000,
  founderIntelligenceDispositions: 4000,
  founderIntelligenceDecisions: 8000,
  supportGraphDecisions: 8000,
  alphaTesters: 2000,
  alphaInvites: 2000,
  explicitRememberPins: 4000,
};

let backendInfo = null;

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
      console.warn('[founderExperienceDurableStore] Postgres unavailable:', e.message);
    }
  }
  return { kind: 'FILE', adapter: new FileStorageAdapter(), durable: false };
}

function getBackend() {
  if (!backendInfo) backendInfo = resolveBackend();
  return backendInfo;
}

function resetFounderExperienceDurableForTests() {
  backendInfo = null;
  try {
    require('./persistence/storageAdapter').resetStorageAdapterForTests();
  } catch (_) {}
}

function emptyDoc() {
  return { schemaVersion: 'bie-fel-durable-v1', items: [], updatedAt: null };
}

function trimItems(items, max) {
  if (items.length <= max) return items;
  return items.slice(items.length - max);
}

async function appendItem(docPath, item, maxItems) {
  const { adapter, kind, durable } = getBackend();
  const mutator = (cur) => {
    const base = cur && typeof cur === 'object' ? cur : emptyDoc();
    const items = Array.isArray(base.items) ? base.items.slice() : [];
    items.push(item);
    return {
      schemaVersion: 'bie-fel-durable-v1',
      items: trimItems(items, maxItems),
      updatedAt: new Date().toISOString(),
      backend: kind,
      durable,
    };
  };
  if (kind === 'POSTGRES' && typeof adapter.updateJsonDocument === 'function') {
    return adapter.updateJsonDocument(docPath, mutator, emptyDoc());
  }
  // File adapter: sync updateJsonDocument
  return Promise.resolve(adapter.updateJsonDocument(docPath, mutator, emptyDoc()));
}

async function readItems(docPath) {
  const { adapter, kind } = getBackend();
  const doc = await Promise.resolve(adapter.readJsonDocument(docPath, emptyDoc()));
  return {
    backend: kind,
    durable: getBackend().durable,
    items: Array.isArray(doc?.items) ? doc.items : [],
    updatedAt: doc?.updatedAt || null,
  };
}

async function upsertById(docPath, idField, record, maxItems) {
  const { adapter, kind, durable } = getBackend();
  const mutator = (cur) => {
    const base = cur && typeof cur === 'object' ? cur : emptyDoc();
    const items = Array.isArray(base.items) ? base.items.slice() : [];
    const id = record[idField];
    const idx = items.findIndex((x) => x && x[idField] === id);
    if (idx >= 0) items[idx] = { ...items[idx], ...record, updatedAt: new Date().toISOString() };
    else items.push({ ...record, updatedAt: new Date().toISOString() });
    return {
      schemaVersion: 'bie-fel-durable-v1',
      items: trimItems(items, maxItems),
      updatedAt: new Date().toISOString(),
      backend: kind,
      durable,
    };
  };
  if (kind === 'POSTGRES' && typeof adapter.updateJsonDocument === 'function') {
    return adapter.updateJsonDocument(docPath, mutator, emptyDoc());
  }
  return Promise.resolve(adapter.updateJsonDocument(docPath, mutator, emptyDoc()));
}

/** Replace the full items array (Help Center article set, etc.). */
async function replaceAllItems(docPath, items, maxItems) {
  const { adapter, kind, durable } = getBackend();
  const next = {
    schemaVersion: 'bie-fel-durable-v1',
    items: trimItems(Array.isArray(items) ? items.slice() : [], maxItems),
    updatedAt: new Date().toISOString(),
    backend: kind,
    durable,
  };
  if (kind === 'POSTGRES' && typeof adapter.writeJsonDocument === 'function') {
    return adapter.writeJsonDocument(docPath, next);
  }
  return Promise.resolve(adapter.writeJsonDocument(docPath, next));
}

function getStatus() {
  const b = getBackend();
  return {
    owner: 'founderExperienceDurableStore',
    backend: b.kind,
    durable: b.durable,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    documents: Object.keys(DOC),
  };
}

module.exports = {
  DOC,
  MAX,
  getBackend,
  getStatus,
  resetFounderExperienceDurableForTests,
  appendItem,
  readItems,
  upsertById,
  replaceAllItems,
  emptyDoc,
};
