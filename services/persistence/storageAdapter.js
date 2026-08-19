/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Persistence (objective 2).
 *
 * A thin, dependency-free abstraction over "one JSON document identified by
 * a key" and "read-mutate-write that document safely" — the exact pattern
 * already used, ad hoc, by every store under services/*Store.js and
 * services/*Manager.js (helpCenterContentStore.js, alphaTesterManager.js,
 * doctrineConversationState.js, etc.).
 *
 * WHY THIS EXISTS (read before extending):
 *   The audit performed for this batch found ~20 authoritative JSON-document
 *   stores that all follow: `readFileSync -> JSON.parse -> mutate in memory
 *   -> writeFileSync(wholeDocument)`. Two problems, in increasing order of
 *   severity:
 *     1. A crash or process kill mid-`writeFileSync` can leave a truncated,
 *        corrupt JSON file (no atomicity). This is a real risk TODAY, on a
 *        single instance, and this adapter fixes it unconditionally
 *        (write-to-temp-file + rename, which is atomic on POSIX).
 *     2. Two *different processes* (i.e. two instances of this app) each
 *        doing their own load-mutate-save independently lose whichever
 *        update was written first ("last writer wins", silently). This
 *        cannot happen on a single instance today (Node's synchronous fs
 *        calls block the event loop, so one request's full read-mutate-write
 *        cycle always finishes before the next request's begins) but WILL
 *        happen the moment a second application instance is introduced.
 *        `updateJsonDocument()` closes this with a simple, dependency-free
 *        advisory file lock (exclusive-create + stale-lock takeover).
 *
 * WHAT THIS DOES NOT DO:
 *   It does not move any data anywhere. `FileStorageAdapter` (the only
 *   adapter wired in as the default, everywhere) reads and writes the exact
 *   same `data/*.json` files these stores already use, at the exact same
 *   paths, in the exact same shape. Zero behavior change for any existing
 *   caller. This is deliberate: the safe, verifiable step available without
 *   a live database is making the *current* storage mechanism correct and
 *   swappable — not swapping it for one that cannot be tested here (see
 *   postgresAdapter.js's header for why that adapter is a scaffold, not a
 *   verified migration).
 *
 * MULTI-INSTANCE CAVEAT (important, see docs/alpha/phase1b-enterprise-operations/13-ScalabilityAndPersistenceImplementation.md):
 *   The advisory lock here only coordinates processes that can see the same
 *   lock file on the same filesystem. On most managed hosting (including
 *   Render's standard web service plan), separate instances do NOT share a
 *   local disk — each gets its own, so this lock (and the underlying JSON
 *   file itself) is only a real cross-*request* safety net within a single
 *   instance until storage is actually backed by a shared service (Postgres,
 *   Redis, or a genuinely shared network volume). That dependency is called
 *   out explicitly rather than glossed over.
 */

const fs = require('fs');
const path = require('path');

const LOCK_STALE_MS = Number(process.env.BIBLEBUDDY_LOCK_STALE_MS || 5000);
const LOCK_RETRY_DELAY_MS = 15;
const LOCK_MAX_WAIT_MS = Number(process.env.BIBLEBUDDY_LOCK_MAX_WAIT_MS || 2000);

function lockPathFor(filePath) {
  return `${filePath}.lock`;
}

/** Synchronous, dependency-free advisory lock. Exclusive-create is atomic on
 * POSIX (`wx` flag fails if the file already exists), which is exactly the
 * mutex primitive needed here — no extra package required. */
function acquireLockSync(filePath) {
  const lockPath = lockPathFor(filePath);
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return lockPath;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          // Orphaned lock (holder crashed before releasing) — safe to steal.
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch (_) {
        continue; // lock disappeared between stat and here; retry loop will re-check EEXIST
      }
      if (Date.now() > deadline) {
        console.warn(`[storageAdapter] lock wait exceeded ${LOCK_MAX_WAIT_MS}ms for ${path.basename(filePath)} — proceeding without lock (best-effort, matches pre-Phase-2 behavior).`);
        return null;
      }
      const until = Date.now() + LOCK_RETRY_DELAY_MS;
      while (Date.now() < until) { /* brief synchronous spin-wait; this codebase's other fs calls are sync too */ }
    }
  }
}

function releaseLockSync(lockPath) {
  if (!lockPath) return;
  try { fs.unlinkSync(lockPath); } catch (_) { /* already gone — fine */ }
}

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Atomic write: write to a sibling temp file, then rename over the target.
 * `rename()` is atomic on the same filesystem on POSIX — readers never see
 * a partially-written file, unlike a direct `writeFileSync` to the target.
 */
function writeAtomicSync(filePath, contents) {
  ensureDirFor(filePath);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, contents, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

class FileStorageAdapter {
  constructor() {
    this.kind = 'FILE';
  }

  /** Read a JSON document; returns `defaultValue` (not thrown) if missing/corrupt. */
  readJsonDocument(filePath, defaultValue) {
    try {
      if (!fs.existsSync(filePath)) return defaultValue;
      const raw = fs.readFileSync(filePath, 'utf8');
      if (!raw.trim()) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`[storageAdapter] read failed for ${path.basename(filePath)}, using default:`, e.message);
      return defaultValue;
    }
  }

  /** Unconditional overwrite, atomic. Prefer `updateJsonDocument` for read-then-write callers. */
  writeJsonDocument(filePath, value) {
    writeAtomicSync(filePath, JSON.stringify(value, null, 2));
    return value;
  }

  /**
   * The safe replacement for the "load(); mutate; save();" pattern.
   * `mutatorFn(current)` receives the current document (or defaultValue if
   * absent) and must return the new document to persist.
   */
  updateJsonDocument(filePath, mutatorFn, defaultValue) {
    ensureDirFor(filePath);
    const lockPath = acquireLockSync(filePath);
    try {
      const current = this.readJsonDocument(filePath, defaultValue);
      const next = mutatorFn(current);
      writeAtomicSync(filePath, JSON.stringify(next, null, 2));
      return next;
    } finally {
      releaseLockSync(lockPath);
    }
  }
}

let activeAdapter = null;

/**
 * Selection is env-gated and defaults to FILE unconditionally — Postgres is
 * never activated unless an operator explicitly opts in AND has actually
 * provisioned a database, per postgresAdapter.js's own guard.
 */
function getStorageAdapter() {
  if (activeAdapter) return activeAdapter;
  const mode = String(process.env.PERSISTENCE || 'FILE').toUpperCase();
  if (mode === 'POSTGRES') {
    try {
      // Lazy required: keeps `pg` an optionalDependency with zero cost/risk
      // to the (default) FILE path if it is never installed.
      const { PostgresStorageAdapter } = require('./postgresAdapter');
      activeAdapter = new PostgresStorageAdapter();
      // Production uses this path whenever DATABASE_URL drives PERSISTENCE=POSTGRES
      // (durableUserMemory / founderExperienceDurableStore). Warning is informational
      // once only — adapter is the live durable owner, not an unused scaffold.
      if (!process.env.BIBLEBUDDY_SILENCE_PG_ADAPTER_NOTICE) {
        console.log(
          '[storageAdapter] PERSISTENCE=POSTGRES active — using shared pg Pool (bible_buddy_documents). Background pool errors are handled so idle disconnects do not exit the process.',
        );
      }
      return activeAdapter;
    } catch (e) {
      console.error('[storageAdapter] PERSISTENCE=POSTGRES requested but the adapter could not be loaded, falling back to FILE:', e.message);
    }
  }
  activeAdapter = new FileStorageAdapter();
  return activeAdapter;
}

/** Test-only: force a fresh adapter selection (env may have changed). */
function resetStorageAdapterForTests() {
  activeAdapter = null;
}

module.exports = {
  FileStorageAdapter,
  getStorageAdapter,
  resetStorageAdapterForTests,
  acquireLockSync,
  releaseLockSync,
  writeAtomicSync,
};
