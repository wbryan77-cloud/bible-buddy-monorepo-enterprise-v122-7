/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Persistence (objective 2).
 *
 * ============================================================================
 * STATUS: SCAFFOLD / EXPERIMENTAL. NOT VERIFIED AGAINST A LIVE DATABASE.
 * ============================================================================
 * This environment has no `DATABASE_URL` credential and no reachable
 * Postgres instance (render.yaml declares it as `sync: false` — set only in
 * the Render dashboard, never available to this process). Every line below
 * is standard, defensible `pg` usage, but it has not been exercised against
 * a real database, migration, or connection pool in this engagement, and it
 * must not be treated as "tested" or "production ready" on that basis
 * alone. Do not enable `PERSISTENCE=POSTGRES` in production until it has
 * been run against a real staging database with the schema below applied
 * and at least the same regression suite this repo already has passing
 * against it.
 *
 * WHY IT EXISTS ANYWAY: `services/persistence/storageAdapter.js` defines the
 * interface (`readJsonDocument` / `writeJsonDocument` / `updateJsonDocument`)
 * every store in this codebase can be migrated to call instead of touching
 * `fs` directly. Writing the second implementation of that interface now —
 * even unverified — is what makes the interface itself trustworthy: if it
 * can only ever have one implementation, it isn't really an abstraction.
 * `getStorageAdapter()` in storageAdapter.js only activates this class if an
 * operator explicitly sets `PERSISTENCE=POSTGRES`; the default everywhere
 * remains the fully-verified `FileStorageAdapter`.
 *
 * SUGGESTED SCHEMA (one generic table, mirroring every existing store's
 * "one JSON document per key" shape — deliberately not a bespoke table per
 * store, so migrating a new store never requires a schema change):
 *
 *   CREATE TABLE IF NOT EXISTS bible_buddy_documents (
 *     doc_key     TEXT PRIMARY KEY,
 *     doc_value   JSONB NOT NULL,
 *     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *
 * `doc_key` should be the same relative path each store already uses today
 * (e.g. "data/help-center-articles.json") so the migration script can be a
 * literal `INSERT ... SELECT` from the existing file contents, and so the
 * FILE and POSTGRES adapters stay drop-in-compatible with each other.
 *
 * KNOWN GAP, DISCLOSED RATHER THAN HIDDEN: every method here is `async`
 * (real DB drivers require it) while `FileStorageAdapter`'s methods and
 * every existing store's public functions (`listArticles`, `createArticle`,
 * etc.) are synchronous. Swapping this adapter in is therefore NOT a
 * zero-further-change drop-in today — the calling store (and, one layer up,
 * its route handler) must also be made `async`/`await`-based first. That is
 * a mechanical, low-risk change per store (Express already supports async
 * handlers) but it is a second, explicit step in the migration runbook
 * (docs/alpha/phase1b-enterprise-operations/13-ScalabilityAndPersistenceImplementation.md),
 * not something this scaffold silently papers over.
 */

const path = require('path');

class PostgresStorageAdapter {
  constructor() {
    this.kind = 'POSTGRES';
    // Intentionally lazy/deferred: never `require('pg')` or open a
    // connection at module-load time. This constructor only runs when an
    // operator has explicitly opted in via PERSISTENCE=POSTGRES.
    this._pool = null;
  }

  _getPool() {
    if (this._pool) return this._pool;
    let PgPool;
    try {
      // `pg` is an optionalDependency (see package.json) — never required by
      // the default FILE path, so its absence never breaks a normal install.
      ({ Pool: PgPool } = require('pg'));
    } catch (e) {
      throw new Error(
        `PERSISTENCE=POSTGRES is set but the "pg" package is not installed. Run "npm install pg" (already declared as an optionalDependency) before using this adapter. Original error: ${e.message}`
      );
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('PERSISTENCE=POSTGRES is set but DATABASE_URL is not configured.');
    }
    this._pool = new PgPool({ connectionString: process.env.DATABASE_URL, max: 5 });
    return this._pool;
  }

  _keyFor(filePath) {
    // Normalize to the same relative key regardless of which machine's
    // absolute path produced it, so FILE -> POSTGRES migration is a literal
    // copy of each store's existing path.
    return path.relative(path.join(__dirname, '..', '..'), filePath).split(path.sep).join('/');
  }

  async readJsonDocument(filePath, defaultValue) {
    const pool = this._getPool();
    const key = this._keyFor(filePath);
    const { rows } = await pool.query('SELECT doc_value FROM bible_buddy_documents WHERE doc_key = $1', [key]);
    return rows.length ? rows[0].doc_value : defaultValue;
  }

  async writeJsonDocument(filePath, value) {
    const pool = this._getPool();
    const key = this._keyFor(filePath);
    await pool.query(
      `INSERT INTO bible_buddy_documents (doc_key, doc_value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (doc_key) DO UPDATE SET doc_value = $2, updated_at = now()`,
      [key, value]
    );
    return value;
  }

  /**
   * Uses a real transaction + row lock (`FOR UPDATE`) instead of the
   * FileStorageAdapter's advisory file lock — this is the actual advantage
   * a real database gives over files: correct, atomic, cross-instance
   * read-mutate-write with no stale-lock heuristics needed.
   */
  async updateJsonDocument(filePath, mutatorFn, defaultValue) {
    const pool = this._getPool();
    const key = this._keyFor(filePath);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT doc_value FROM bible_buddy_documents WHERE doc_key = $1 FOR UPDATE', [key]);
      const current = rows.length ? rows[0].doc_value : defaultValue;
      const next = await mutatorFn(current);
      await client.query(
        `INSERT INTO bible_buddy_documents (doc_key, doc_value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (doc_key) DO UPDATE SET doc_value = $2, updated_at = now()`,
        [key, next]
      );
      await client.query('COMMIT');
      return next;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = { PostgresStorageAdapter };
