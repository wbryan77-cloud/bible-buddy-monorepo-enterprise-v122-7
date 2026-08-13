/**
 * FOUNDER_ALPHA_OPERATIONAL_INTELLIGENCE Part 6/7 — Admin Approval Workflow
 * + Self-Learning Validation for the Founder Intelligence Layer.
 *
 * This store NEVER applies a recommendation. Recording an "APPROVED"
 * decision here means "an Admin has confirmed this is worth pursuing
 * through the existing knowledge-authoring / IOG-ICOJ / relationship
 * pipelines" — it is a decision record, not a production mutation. No
 * function in this file writes to any Scripture, doctrine, witness, or
 * relationship data file.
 *
 * Persistence is a small, bounded JSON index (recommendations rarely
 * number more than a few hundred at a time) plus two append-only JSONL
 * audit logs, following the same pattern as every other Admin-facing
 * store in this codebase (safeJsonlWriter, supportGraphCandidateQueue).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { appendJsonlSafe } = require('./safeJsonlWriter');

const DATA_DIR = path.join(__dirname, '..', 'data', 'founder-intelligence');
const INDEX_PATH = path.join(DATA_DIR, 'recommendation-index.json');
const DECISIONS_LOG_PATH = path.join(DATA_DIR, 'decisions.jsonl');
const GROWTH_BASELINE_PATH = path.join(DATA_DIR, 'growth-baseline.json');

const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function stableRecommendationId(rec) {
  const key = `${rec.type}|${rec.title}|${rec.reference || ''}|${(rec.topicIds || []).slice().sort().join(',')}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 20);
}

function loadIndex() {
  try {
    if (!fs.existsSync(INDEX_PATH)) return {};
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) || {};
  } catch (e) {
    console.warn('[founderIntelligenceStore] index read failed, starting fresh:', e.message);
    return {};
  }
}

function saveIndex(index) {
  try {
    ensureDataDir();
    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('[founderIntelligenceStore] index write failed:', e.message);
    return false;
  }
}

function dualWriteFiDisposition(entry) {
  if (!entry || !entry.id) return;
  setImmediate(() => {
    try {
      const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');
      upsertById(
        DOC.founderIntelligenceDispositions,
        'id',
        {
          id: entry.id,
          status: entry.status,
          decidedAt: entry.decidedAt || null,
          decidedBy: entry.decidedBy || null,
          note: entry.note || null,
          flaggedFalsePositive: !!entry.flaggedFalsePositive,
          firstSeenAt: entry.firstSeenAt || null,
          lastSeenAt: entry.lastSeenAt || null,
          timesSeen: entry.timesSeen || 1,
          type: entry.latest?.type || entry.type || null,
          title: entry.latest?.title || entry.title || null,
          latest: entry.latest || null,
        },
        MAX.founderIntelligenceDispositions
      ).catch((err) => {
        console.warn('[founderIntelligenceStore] durable disposition failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[founderIntelligenceStore] durable disposition wire failed:', err && err.message ? err.message : err);
    }
  });
}

function dualWriteFiDecisionLog(row) {
  setImmediate(() => {
    try {
      const { appendItem, DOC, MAX } = require('./founderExperienceDurableStore');
      appendItem(DOC.founderIntelligenceDecisions, row, MAX.founderIntelligenceDecisions).catch((err) => {
        console.warn('[founderIntelligenceStore] durable decision log failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[founderIntelligenceStore] durable decision log wire failed:', err && err.message ? err.message : err);
    }
  });
}

/**
 * syncRecommendations keeps status when the index file exists. After Render
 * redeploy the index is gone and REJECTED resurfaces as PENDING — violating
 * that contract. Hydrate dispositions from durable when the index is empty.
 */
async function hydrateFounderIntelligenceFromDurableIfNeeded() {
  const existing = loadIndex();
  if (Object.keys(existing).length > 0) {
    return { ok: true, hydrated: false, reason: 'index_present', existing: Object.keys(existing).length };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.founderIntelligenceDispositions);
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
  const index = {};
  for (const item of items) {
    if (!item || !item.id) continue;
    index[item.id] = {
      id: item.id,
      status: item.status || STATUS.PENDING,
      decidedAt: item.decidedAt || null,
      decidedBy: item.decidedBy || null,
      note: item.note || null,
      flaggedFalsePositive: !!item.flaggedFalsePositive,
      firstSeenAt: item.firstSeenAt || item.decidedAt || new Date().toISOString(),
      lastSeenAt: item.lastSeenAt || item.decidedAt || new Date().toISOString(),
      timesSeen: item.timesSeen || 1,
      latest: item.latest || { type: item.type || null, title: item.title || null },
      hydratedFromDurable: true,
    };
  }
  if (!Object.keys(index).length) {
    return { ok: true, hydrated: false, reason: 'durable_items_invalid', backend };
  }
  saveIndex(index);

  // Restore decisions JSONL when empty
  try {
    const emptyLog = !fs.existsSync(DECISIONS_LOG_PATH) || !fs.readFileSync(DECISIONS_LOG_PATH, 'utf8').trim();
    if (emptyLog) {
      const { readItems, DOC } = require('./founderExperienceDurableStore');
      const log = await readItems(DOC.founderIntelligenceDecisions);
      const lines = (log.items || []).filter((r) => r && r.recommendationId).map((r) => JSON.stringify(r));
      if (lines.length) {
        ensureDataDir();
        fs.writeFileSync(DECISIONS_LOG_PATH, `${lines.join('\n')}\n`, 'utf8');
      }
    }
  } catch (_) {
    /* best-effort audit restore */
  }

  return { ok: true, hydrated: true, count: Object.keys(index).length, backend };
}

/**
 * Merge freshly generated recommendations into the persisted index.
 * Returns the full merged list (each entry annotated with id/status/
 * firstSeenAt/lastSeenAt/timesSeen) — this is how "duplicate
 * recommendations" get collapsed rather than spamming the Admin queue
 * with the same finding every time the report runs.
 */
function syncRecommendations(freshRecommendations = []) {
  const index = loadIndex();
  const now = new Date().toISOString();
  let newCount = 0;
  let reseen = 0;

  for (const rec of freshRecommendations) {
    const id = stableRecommendationId(rec);
    if (index[id]) {
      index[id].lastSeenAt = now;
      index[id].timesSeen = (index[id].timesSeen || 1) + 1;
      // Keep the decision status, but refresh the evidence/confidence with
      // the latest computed values so an Admin reviewing an older pending
      // recommendation sees current numbers.
      index[id].latest = rec;
      reseen += 1;
    } else {
      index[id] = {
        id,
        status: STATUS.PENDING,
        firstSeenAt: now,
        lastSeenAt: now,
        timesSeen: 1,
        latest: rec,
      };
      newCount += 1;
    }
  }

  saveIndex(index);
  return {
    ok: true,
    newRecommendations: newCount,
    reobservedRecommendations: reseen,
    totalIndexed: Object.keys(index).length,
  };
}

function listRecommendations({ status = null, limit = 500 } = {}) {
  const index = loadIndex();
  let entries = Object.values(index);
  if (status) entries = entries.filter((e) => e.status === status);
  entries.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
  return entries.slice(0, limit);
}

function getRecommendation(id) {
  const index = loadIndex();
  return index[id] || null;
}

/**
 * PART 6 — Admin Approval Workflow. The system already performed the
 * research (founderOperationalIntelligenceEngine); the Admin makes the
 * decision here. This function only ever records that decision — it never
 * calls any knowledge-publishing function.
 */
function recordAdminDecision({ id, decision, decidedBy = 'admin', note = '', flaggedFalsePositive = false } = {}) {
  if (!id) return { ok: false, error: 'id is required' };
  if (!Object.values(STATUS).includes(decision)) {
    return { ok: false, error: `decision must be one of ${Object.values(STATUS).join(', ')}` };
  }
  const index = loadIndex();
  if (!index[id]) return { ok: false, error: 'Unknown recommendation id' };

  index[id].status = decision;
  index[id].decidedAt = new Date().toISOString();
  index[id].decidedBy = decidedBy;
  index[id].note = note;
  index[id].flaggedFalsePositive = !!flaggedFalsePositive;
  saveIndex(index);

  const decisionRow = {
    recommendationId: id,
    type: index[id].latest?.type,
    title: index[id].latest?.title,
    decision,
    decidedBy,
    note: String(note || '').slice(0, 400),
    flaggedFalsePositive: !!flaggedFalsePositive,
  };
  appendJsonlSafe(DECISIONS_LOG_PATH, decisionRow);
  dualWriteFiDisposition(index[id]);
  dualWriteFiDecisionLog(decisionRow);

  return { ok: true, recommendation: index[id] };
}

// ---------------------------------------------------------------------------
// PART 7 — Self-Learning Validation.
// ---------------------------------------------------------------------------

function readDecisionsLog({ limit = 5000 } = {}) {
  try {
    if (!fs.existsSync(DECISIONS_LOG_PATH)) return [];
    const lines = fs.readFileSync(DECISIONS_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (e) {
    console.warn('[founderIntelligenceStore] decisions log read failed:', e.message);
    return [];
  }
}

function loadGrowthBaseline() {
  try {
    if (!fs.existsSync(GROWTH_BASELINE_PATH)) return null;
    return JSON.parse(fs.readFileSync(GROWTH_BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveGrowthBaseline(snapshot) {
  try {
    ensureDataDir();
    fs.writeFileSync(GROWTH_BASELINE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('[founderIntelligenceStore] growth baseline write failed:', e.message);
    return false;
  }
}

/**
 * Records/compares a coverage snapshot (caller supplies the real, already-
 * computed numbers — this module never recomputes coverage itself, only
 * tracks it over time). On first call, establishes the baseline honestly
 * rather than fabricating a "growth" number with nothing to compare against.
 */
function trackKnowledgeGrowth(currentCoverageSnapshot) {
  const baseline = loadGrowthBaseline();
  if (!baseline) {
    saveGrowthBaseline({ recordedAt: new Date().toISOString(), snapshot: currentCoverageSnapshot });
    return {
      status: 'BASELINE_ESTABLISHED',
      message: 'No prior knowledge-coverage baseline existed. Recorded the current snapshot as the baseline; growth will be measurable on the next comparison.',
      baselineRecordedAt: new Date().toISOString(),
      current: currentCoverageSnapshot,
    };
  }
  const growth = {};
  for (const key of Object.keys(currentCoverageSnapshot)) {
    const before = baseline.snapshot[key];
    const after = currentCoverageSnapshot[key];
    if (typeof before === 'number' && typeof after === 'number') {
      growth[key] = { before, after, delta: after - before };
    }
  }
  return {
    status: 'COMPUTED',
    baselineRecordedAt: baseline.recordedAt,
    growth,
    current: currentCoverageSnapshot,
  };
}

function computeEffectivenessMetrics(currentCoverageSnapshot = null) {
  const index = loadIndex();
  const entries = Object.values(index);
  const decisions = readDecisionsLog();

  const byStatus = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, { PENDING: 0, APPROVED: 0, REJECTED: 0 });

  const falsePositives = decisions.filter((d) => d.flaggedFalsePositive).length;
  // Real (not estimated) count of recommendation occurrences that were
  // collapsed into an existing index entry rather than re-queued —
  // this IS the duplicate-recommendation-suppression metric.
  const duplicatesCollapsed = entries.reduce((acc, e) => acc + Math.max(0, (e.timesSeen || 1) - 1), 0);

  const byType = entries.reduce((acc, e) => {
    const t = e.latest?.type || 'UNKNOWN';
    if (!acc[t]) acc[t] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    acc[t].total += 1;
    if (e.status === STATUS.APPROVED) acc[t].approved += 1;
    else if (e.status === STATUS.REJECTED) acc[t].rejected += 1;
    else acc[t].pending += 1;
    return acc;
  }, {});

  const decidedCount = byStatus.APPROVED + byStatus.REJECTED;
  const approvalRate = decidedCount > 0 ? Math.round((byStatus.APPROVED / decidedCount) * 10000) / 100 : null;

  const result = {
    generatedAt: new Date().toISOString(),
    totalRecommendationsTracked: entries.length,
    byStatus,
    byType,
    approvalRate,
    approvalRateNote: approvalRate === null ? 'No decisions recorded yet — cannot compute an approval rate without fabricating one.' : null,
    falsePositivesFlagged: falsePositives,
    duplicatesCollapsed,
    ruleEffectiveness: {
      note: 'Rule effectiveness (services/knowledgeApprovalRulesOptimizer.js) is tracked separately via its own replay() report (falsePositiveRisk/falseNegativeRisk fields, both documented as zero/near-zero by design) — see potentialRuleImprovements in the intelligence report.',
    },
    governanceEffectiveness: {
      recommendationsRequiringApproval: entries.length,
      recommendationsAutoApplied: 0,
      note: 'Every recommendation ever generated by this layer has requiredApproval:true and zero were auto-applied — governance was not bypassed for any of the tracked recommendations.',
    },
  };

  if (currentCoverageSnapshot) {
    result.knowledgeGrowth = trackKnowledgeGrowth(currentCoverageSnapshot);
  }

  return result;
}

module.exports = {
  STATUS,
  INDEX_PATH,
  DECISIONS_LOG_PATH,
  stableRecommendationId,
  syncRecommendations,
  listRecommendations,
  getRecommendation,
  recordAdminDecision,
  readDecisionsLog,
  trackKnowledgeGrowth,
  computeEffectivenessMetrics,
  hydrateFounderIntelligenceFromDurableIfNeeded,
};
