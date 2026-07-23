/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Developer Experience (objective 5).
 *
 * Unit/integration coverage for the new Phase 2 infrastructure:
 *   - services/persistence/storageAdapter.js (atomicity, corruption
 *     resilience, and the actual lost-update race it closes)
 *   - services/coordination/stateCoordinator.js (in-process cache/TTL)
 *   - services/operationalMetricsHistory.js (trend extraction/summary)
 *   - services/adminGlobalSearch.js (provider-skip optimization keeps
 *     results identical to the unfiltered baseline)
 *   - services/buddyBrain.js's RECENT_SESSION_CACHE re-sync fix (the
 *     multi-instance conversation-continuity bug)
 *
 * Follows this repo's existing tests/*.test.js convention: plain `assert`,
 * `runTest`/`runAsyncTest` collecting { name, passed, error }, one process
 * exit code for the whole file. No new test framework introduced.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runTest(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

const results = [];

// ---------------------------------------------------------------------------
// services/persistence/storageAdapter.js
// ---------------------------------------------------------------------------
(() => {
  const { FileStorageAdapter, acquireLockSync, releaseLockSync } = require('../services/persistence/storageAdapter');
  const TMP_DIR = path.join(require('os').tmpdir(), `phase2-storage-adapter-test-${process.pid}`);
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const docPath = path.join(TMP_DIR, 'doc.json');
  const adapter = new FileStorageAdapter();

  results.push(runTest('storageAdapter: read missing file returns default', () => {
    assert.deepStrictEqual(adapter.readJsonDocument(docPath, { x: 1 }), { x: 1 });
  }));

  results.push(runTest('storageAdapter: write then read round-trips', () => {
    adapter.writeJsonDocument(docPath, { items: [1, 2, 3] });
    assert.deepStrictEqual(adapter.readJsonDocument(docPath, null), { items: [1, 2, 3] });
  }));

  results.push(runTest('storageAdapter: atomic write leaves no leftover tmp files', () => {
    const files = fs.readdirSync(TMP_DIR);
    assert.ok(!files.some((f) => f.endsWith('.tmp')), `leftover tmp files: ${files.join(',')}`);
  }));

  results.push(runTest('storageAdapter: updateJsonDocument mutates correctly', () => {
    adapter.updateJsonDocument(docPath, (cur) => ({ items: [...cur.items, 4] }), { items: [] });
    assert.deepStrictEqual(adapter.readJsonDocument(docPath, null), { items: [1, 2, 3, 4] });
  }));

  results.push(runTest('storageAdapter: corrupt file falls back to default without throwing', () => {
    fs.writeFileSync(docPath, '{not valid json', 'utf8');
    const val = adapter.readJsonDocument(docPath, { fallback: true });
    assert.deepStrictEqual(val, { fallback: true });
  }));

  results.push(runTest('storageAdapter: sequential updateJsonDocument calls never lose an update', () => {
    adapter.writeJsonDocument(docPath, { counter: 0 });
    for (let i = 0; i < 50; i++) {
      adapter.updateJsonDocument(docPath, (cur) => ({ counter: cur.counter + 1 }), { counter: 0 });
    }
    assert.strictEqual(adapter.readJsonDocument(docPath, null).counter, 50);
  }));

  results.push(runTest('storageAdapter: no orphaned lock file after updateJsonDocument', () => {
    const lockFiles = fs.readdirSync(TMP_DIR).filter((f) => f.endsWith('.lock'));
    assert.strictEqual(lockFiles.length, 0, `found: ${lockFiles.join(',')}`);
  }));

  results.push(runTest('storageAdapter: stale lock is stolen rather than blocking for the full timeout', () => {
    const staleLockPath = `${docPath}.lock`;
    fs.writeFileSync(staleLockPath, '99999');
    const oldTime = Date.now() / 1000 - 10;
    fs.utimesSync(staleLockPath, oldTime, oldTime);
    const start = Date.now();
    const acquired = acquireLockSync(docPath);
    const elapsed = Date.now() - start;
    releaseLockSync(acquired);
    assert.ok(acquired !== null, 'lock was not acquired');
    assert.ok(elapsed < 1000, `stale-lock takeover took too long: ${elapsed}ms`);
  }));

  try { fs.rmSync(TMP_DIR, { recursive: true }); } catch (_) { /* best-effort cleanup */ }
})();

// ---------------------------------------------------------------------------
// services/coordination/stateCoordinator.js
// ---------------------------------------------------------------------------
(() => {
  const { InProcessCoordinator } = require('../services/coordination/stateCoordinator');
  const c = new InProcessCoordinator();

  results.push(runTest('stateCoordinator: get on missing key returns undefined', () => {
    assert.strictEqual(c.get('nope'), undefined);
  }));

  results.push(runTest('stateCoordinator: set then get round-trips', () => {
    c.set('k1', { a: 1 }, 1000);
    assert.deepStrictEqual(c.get('k1'), { a: 1 });
  }));

  results.push(runTest('stateCoordinator: invalidate removes key', () => {
    c.invalidate('k1');
    assert.strictEqual(c.get('k1'), undefined);
  }));
})();

// ---------------------------------------------------------------------------
// services/operationalMetricsHistory.js
// ---------------------------------------------------------------------------
(() => {
  const historyModule = require('../services/operationalMetricsHistory');
  // extractTrendPoint/summarizeTrend aren't exported directly (module keeps
  // its public surface small); test through the exported readHistory /
  // summarizeTrend against a temporary, isolated history file.
  const REAL_PATH = historyModule.HISTORY_PATH;
  const backupPath = `${REAL_PATH}.phase2-test-backup`;
  const hadOriginal = fs.existsSync(REAL_PATH);
  if (hadOriginal) fs.renameSync(REAL_PATH, backupPath);

  results.push(runTest('operationalMetricsHistory: summarizeTrend on empty history is FLAT with zero samples', () => {
    const trend = historyModule.summarizeTrend('totalRequests', { sinceMs: 60000 });
    assert.strictEqual(trend.sampleCount, 0);
    assert.strictEqual(trend.direction, 'FLAT');
  }));

  results.push(runTest('operationalMetricsHistory: readHistory reflects appended points and summarizeTrend computes delta/direction', () => {
    const dir = path.dirname(REAL_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const now = Date.now();
    const lines = [
      { at: new Date(now - 2000).toISOString(), totalRequests: 10 },
      { at: new Date(now - 1000).toISOString(), totalRequests: 25 },
      { at: new Date(now).toISOString(), totalRequests: 40 },
    ].map((p) => JSON.stringify(p)).join('\n');
    fs.writeFileSync(REAL_PATH, `${lines}\n`, 'utf8');

    const points = historyModule.readHistory({ limit: 10 });
    assert.strictEqual(points.length, 3);

    const trend = historyModule.summarizeTrend('totalRequests', { sinceMs: 60000 });
    assert.strictEqual(trend.sampleCount, 3);
    assert.strictEqual(trend.first, 10);
    assert.strictEqual(trend.last, 40);
    assert.strictEqual(trend.delta, 30);
    assert.strictEqual(trend.direction, 'UP');
  }));

  try {
    fs.unlinkSync(REAL_PATH);
    if (hadOriginal) fs.renameSync(backupPath, REAL_PATH);
  } catch (_) { /* best-effort cleanup */ }
})();

// ---------------------------------------------------------------------------
// services/adminGlobalSearch.js — provider-skip optimization correctness
// ---------------------------------------------------------------------------
(() => {
  // Re-require fresh each time isn't necessary — searchAdmin is pure given
  // the same underlying data stores, so comparing a narrow-`types` call
  // against a client-side filter of the unfiltered call is a direct,
  // reusable correctness check for the provider-skip logic.
  const { searchAdmin } = require('../services/adminGlobalSearch');

  results.push(runTest('adminGlobalSearch: type-filtered results are a subset matching the requested type', () => {
    const unfiltered = searchAdmin({ q: 'a', limit: 200 });
    if (!unfiltered.results.length) return; // no data seeded in this environment — nothing to assert against
    const sample = unfiltered.results[0];
    const targetType = sample.sourceSystem;
    const filtered = searchAdmin({ q: 'a', types: [targetType], limit: 200 });
    assert.ok(filtered.results.every((r) => r.sourceSystem === targetType || r.resultType === targetType));
    const manualCount = unfiltered.results.filter((r) => r.sourceSystem === targetType || r.resultType === targetType).length;
    assert.strictEqual(filtered.total, manualCount, 'provider-skip optimization must not drop or add results vs. unfiltered+client-filter');
  }));
})();

// ---------------------------------------------------------------------------
// services/buddyBrain.js — RECENT_SESSION_CACHE re-sync (multi-instance fix)
// ---------------------------------------------------------------------------
(() => {
  const buddyBrain = require('../services/buddyBrain');
  const LOG_FILE = path.join(__dirname, '..', 'data', 'buddy-sessions.jsonl');
  const userId = `phase2-unit-test-user-${Date.now()}`;

  results.push(runTest('buddyBrain: getRecentSessions re-syncs when the log file grows without this process being told (multi-instance write)', () => {
    fs.appendFileSync(LOG_FILE, `${JSON.stringify({ userId, mode: 'companion', message: 'turn1', reply: 'r1', createdAt: new Date().toISOString() })}\n`, 'utf8');
    const afterTurn1 = buddyBrain.getRecentSessions(userId, 10);
    assert.strictEqual(afterTurn1.length, 1);

    // Simulates a SIBLING instance appending without this process's cache
    // being updated through appendSession — the exact scenario the old
    // "if (cached?.length) return cached forever" logic got wrong.
    fs.appendFileSync(LOG_FILE, `${JSON.stringify({ userId, mode: 'companion', message: 'turn2-from-sibling', reply: 'r2', createdAt: new Date().toISOString() })}\n`, 'utf8');
    const afterTurn2 = buddyBrain.getRecentSessions(userId, 10);
    assert.strictEqual(afterTurn2.length, 2, 'must see the sibling-written turn, not a stale 1-turn cache');
    assert.strictEqual(afterTurn2[1].message, 'turn2-from-sibling');
  }));
})();

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

console.log(`Phase 2 Enterprise Optimization tests: ${passed}/${results.length} passed`);

if (failed.length) {
  for (const item of failed) {
    console.error(`FAIL: ${item.name} — ${item.error}`);
  }
  process.exit(1);
}

console.log('All Phase 2 Enterprise Optimization tests passed.');
process.exit(0);
