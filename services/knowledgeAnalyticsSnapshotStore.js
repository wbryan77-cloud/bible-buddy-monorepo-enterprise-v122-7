/**
 * PHASE_6E Part 10 — precomputed analytics snapshot store.
 *
 * The ONLY thing the live Admin dashboard route (routes/bibleAuthorityAdmin.js
 * GET /knowledge-coverage-dashboard) is allowed to do is READ a file this
 * module already wrote. It must NEVER trigger a recomputation of coverage,
 * queue diagnostics, drift, or pipeline analytics during an Admin HTTP
 * request — see scripts/alpha/phase6eBuildAnalyticsSnapshot.js, the only
 * writer, which is an explicit offline/Admin-triggered job.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = path.join(__dirname, '..', 'data', 'analytics-snapshots');

function ensureDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

function snapshotPath(name) {
  return path.join(SNAPSHOT_DIR, `${name}.json`);
}

function writeSnapshot(name, data) {
  ensureDir();
  const payload = { name, generatedAt: new Date().toISOString(), data };
  fs.writeFileSync(snapshotPath(name), JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

/**
 * Read one named snapshot. Returns { ok: false, stale: true, reason } when
 * missing — the dashboard must degrade honestly (Part 12 requirement:
 * "If background work is unavailable, degrade analytics visibility honestly
 * without degrading chat") rather than compute anything on the fly.
 */
function readSnapshot(name, { maxAgeMs = null } = {}) {
  const p = snapshotPath(name);
  if (!fs.existsSync(p)) {
    return { ok: false, stale: true, reason: `No snapshot named "${name}" has been generated yet. Run scripts/alpha/phase6eBuildAnalyticsSnapshot.js.`, name, data: null, generatedAt: null };
  }
  try {
    const payload = JSON.parse(fs.readFileSync(p, 'utf8'));
    const ageMs = Date.now() - new Date(payload.generatedAt).getTime();
    const isStale = maxAgeMs != null && ageMs > maxAgeMs;
    return { ok: true, stale: isStale, staleWarning: isStale ? `Snapshot is ${Math.round(ageMs / 60000)} minutes old (max ${Math.round(maxAgeMs / 60000)}m).` : null, name: payload.name, generatedAt: payload.generatedAt, ageMs, data: payload.data };
  } catch (e) {
    return { ok: false, stale: true, reason: `Failed to parse snapshot "${name}": ${e.message}`, name, data: null, generatedAt: null };
  }
}

const SNAPSHOT_NAMES = [
  'BibleBookCoverage',
  'DoctrineTopicCoverage',
  'WitnessQualityReport',
  'OriginalLanguageCoverage',
  'HistoricalCoverage',
  'HistoricalSourceInvestigation',
  'AdminQueueDiagnostics',
  'RulesOptimizerReport',
  'KnowledgePipelineAnalytics',
  'KnowledgeDriftReport',
  'FounderKnowledgeReadiness',
];

function readAllSnapshots({ maxAgeMs = null } = {}) {
  const out = {};
  for (const name of SNAPSHOT_NAMES) out[name] = readSnapshot(name, { maxAgeMs });
  return out;
}

module.exports = {
  SNAPSHOT_DIR,
  SNAPSHOT_NAMES,
  writeSnapshot,
  readSnapshot,
  readAllSnapshots,
};
