/**
 * Postgres JSON-document adapter for bible_buddy_documents.
 *
 * Canonical pg Pool owner for the runtime. Production uses this path when
 * DATABASE_URL is set (via storageAdapter PERSISTENCE=POSTGRES).
 *
 * CRITICAL error-handling contract (node-pg / pg-pool):
 * - Idle clients in the pool: Pool removes them and emits pool 'error'.
 *   We MUST listen via pool.on('error') or Node exits (Render status 1).
 * - Checked-out clients (pool.connect): pg-pool REMOVES the idle listener.
 *   Application MUST listen on the Client until release(), or a background
 *   TCP disconnect ("Connection terminated unexpectedly") becomes
 *   UNCAUGHT_EXCEPTION → process.exit(1). Observed on b43a3f4 @ 19:28 PDT.
 * - pool.query() attaches a one-shot client error listener internally.
 */

const path = require('path');

/** Module-level singleton — one Pool per process, shared by all adapter instances. */
let sharedPool = null;
let poolErrorHandlerAttached = false;

function releaseCommitShort() {
  const c = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '';
  return c ? String(c).slice(0, 7) : null;
}

function logLifecycle(event, extra = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    pid: process.pid,
    releaseCommit: releaseCommitShort(),
    ...extra,
  };
  console.log(JSON.stringify(payload));
}

function attachPoolBackgroundErrorHandler(pool) {
  if (!pool || typeof pool.on !== 'function') return false;
  if (pool.__biblebuddyPgErrorHandlerAttached) return true;
  pool.__biblebuddyPgErrorHandlerAttached = true;
  pool.on('error', (err) => {
    // Idle client disconnected — Pool discards it; process must stay alive.
    logLifecycle('POSTGRES_BACKGROUND_CONNECTION_ERROR', {
      errorName: err && err.name ? err.name : 'Error',
      errorCode: err && err.code ? err.code : null,
      errorMessage: err && err.message ? String(err.message).slice(0, 160) : 'unknown',
      category: 'idle_or_background_client',
    });
  });
  return true;
}

/**
 * Attach a checked-out Client error listener so TCP death cannot become
 * uncaughtException. Returns a disposer that removes the listener.
 * Does not release the client — caller owns release().
 */
function attachCheckedOutClientErrorHandler(client, meta = {}) {
  if (!client || typeof client.on !== 'function') {
    return () => {};
  }
  const onError = (err) => {
    logLifecycle('POSTGRES_CHECKED_OUT_CLIENT_ERROR', {
      errorName: err && err.name ? err.name : 'Error',
      errorCode: err && err.code ? err.code : null,
      errorMessage: err && err.message ? String(err.message).slice(0, 160) : 'unknown',
      category: 'checked_out_client',
      ...meta,
    });
  };
  client.on('error', onError);
  return () => {
    try {
      if (typeof client.removeListener === 'function') {
        client.removeListener('error', onError);
      }
    } catch (_) {
      /* ignore */
    }
  };
}

function createSharedPool() {
  if (sharedPool) return sharedPool;
  let PgPool;
  try {
    ({ Pool: PgPool } = require('pg'));
  } catch (e) {
    throw new Error(
      `PERSISTENCE=POSTGRES is set but the "pg" package is not installed. Run "npm install pg" (already declared as an optionalDependency) before using this adapter. Original error: ${e.message}`,
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('PERSISTENCE=POSTGRES is set but DATABASE_URL is not configured.');
  }
  // Keep max conservative for Render single-instance + managed Postgres.
  // Do not tune without measured concurrency evidence.
  sharedPool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  if (!poolErrorHandlerAttached) {
    poolErrorHandlerAttached = true;
    attachPoolBackgroundErrorHandler(sharedPool);
  }

  return sharedPool;
}

/**
 * Drain and close the shared pool (graceful shutdown).
 * Safe to call when pool was never created.
 */
async function endSharedPool() {
  if (!sharedPool) {
    return { ended: false, reason: 'no_pool' };
  }
  const pool = sharedPool;
  sharedPool = null;
  poolErrorHandlerAttached = false;
  try {
    await pool.end();
    return { ended: true };
  } catch (err) {
    return {
      ended: false,
      reason: 'end_failed',
      error: err && err.message ? err.message : String(err),
    };
  }
}

/** Test helper: drop singleton without ending (or after end). */
function resetSharedPoolForTests() {
  sharedPool = null;
  poolErrorHandlerAttached = false;
}

/** Expose pool for tests / diagnostics (not for query bypass). */
function getSharedPoolForTests() {
  return sharedPool;
}

class PostgresStorageAdapter {
  constructor() {
    this.kind = 'POSTGRES';
    this._schemaReady = null;
  }

  _getPool() {
    return createSharedPool();
  }

  _keyFor(filePath) {
    return path.relative(path.join(__dirname, '..', '..'), filePath).split(path.sep).join('/');
  }

  async ensureSchema() {
    if (this._schemaReady) return this._schemaReady;
    const pool = this._getPool();
    this._schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS bible_buddy_documents (
        doc_key     TEXT PRIMARY KEY,
        doc_value   JSONB NOT NULL,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this._schemaReady;
    return true;
  }

  async readJsonDocument(filePath, defaultValue) {
    await this.ensureSchema();
    const pool = this._getPool();
    const key = this._keyFor(filePath);
    const { rows } = await pool.query('SELECT doc_value FROM bible_buddy_documents WHERE doc_key = $1', [key]);
    return rows.length ? rows[0].doc_value : defaultValue;
  }

  async writeJsonDocument(filePath, value) {
    await this.ensureSchema();
    const pool = this._getPool();
    const key = this._keyFor(filePath);
    await pool.query(
      `INSERT INTO bible_buddy_documents (doc_key, doc_value, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (doc_key) DO UPDATE SET doc_value = $2, updated_at = now()`,
      [key, value],
    );
    return value;
  }

  async updateJsonDocument(filePath, mutatorFn, defaultValue) {
    await this.ensureSchema();
    const pool = this._getPool();
    const key = this._keyFor(filePath);
    const client = await pool.connect();
    // pg-pool removes idle 'error' listener on checkout — attach ours until release.
    let clientFatal = null;
    const onClientError = (err) => {
      clientFatal = err || clientFatal;
      logLifecycle('POSTGRES_CHECKED_OUT_CLIENT_ERROR', {
        errorName: err && err.name ? err.name : 'Error',
        errorCode: err && err.code ? err.code : null,
        errorMessage: err && err.message ? String(err.message).slice(0, 160) : 'unknown',
        category: 'checked_out_client',
        op: 'updateJsonDocument',
        docKey: String(key).slice(0, 80),
      });
    };
    client.on('error', onClientError);
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT doc_value FROM bible_buddy_documents WHERE doc_key = $1 FOR UPDATE',
        [key],
      );
      const current = rows.length ? rows[0].doc_value : defaultValue;
      const next = await mutatorFn(current);
      await client.query(
        `INSERT INTO bible_buddy_documents (doc_key, doc_value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (doc_key) DO UPDATE SET doc_value = $2, updated_at = now()`,
        [key, next],
      );
      await client.query('COMMIT');
      return next;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore rollback failure */
      }
      throw e;
    } finally {
      try {
        client.removeListener('error', onClientError);
      } catch (_) {
        /* ignore */
      }
      try {
        // Pass error into release so pg-pool purges the dead client.
        client.release(clientFatal || undefined);
      } catch (_) {
        /* ignore double-release / already-ended */
      }
    }
  }
}

module.exports = {
  PostgresStorageAdapter,
  createSharedPool,
  endSharedPool,
  resetSharedPoolForTests,
  getSharedPoolForTests,
  attachPoolBackgroundErrorHandler,
  attachCheckedOutClientErrorHandler,
  logLifecycle,
};
