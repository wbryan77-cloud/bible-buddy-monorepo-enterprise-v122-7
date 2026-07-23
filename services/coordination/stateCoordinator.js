/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Scalability (objective 1).
 *
 * A tiny shared-cache abstraction: `get(key)` / `set(key, value, ttlMs)` /
 * `invalidate(key)`. Exists to give every in-process, module-level cache in
 * this codebase (the Command Center's 3s summary cache being the first
 * caller — see services/adminCommandCenterAggregator.js) one place to move
 * to when it needs to stop being per-instance.
 *
 * DEFAULT BEHAVIOR (unconditional, zero risk): an in-process Map with TTL,
 * identical semantics to the bespoke cache it replaces. No behavior change
 * for the current single-instance deployment.
 *
 * REDIS-READY, NOT REDIS-VERIFIED: if `REDIS_URL` is set, `getCoordinator()`
 * will attempt to use `ioredis` (already an optionalDependency in
 * package.json — added when this codebase was scaffolded, never previously
 * wired to anything) so a cache entry set on one instance is visible to
 * every other instance. This environment has no reachable Redis instance,
 * so the Redis path is implemented to the same standard as
 * services/persistence/postgresAdapter.js — written carefully, but NOT
 * exercised against a live Redis server. It is not the default; enabling it
 * requires an explicit `REDIS_URL` and should be verified against a real
 * Redis instance (e.g. in staging) before being relied on in production.
 */

const DEFAULT_TTL_MS = 3000;

class InProcessCoordinator {
  constructor() {
    this.kind = 'IN_PROCESS';
    this.store = new Map(); // key -> { value, expiresAt }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  invalidate(key) {
    this.store.delete(key);
  }
}

/**
 * SCAFFOLD — see file header. Same interface as InProcessCoordinator but
 * backed by Redis so multiple instances share one cache. `get`/`set` become
 * async when this adapter is active, which callers already handle (they
 * were written against a Promise-returning coordinator from the start —
 * unlike the FILE/POSTGRES persistence adapters, there is no synchronous
 * legacy caller to reconcile here since this coordinator is new in Phase 2).
 */
class RedisCoordinator {
  constructor() {
    this.kind = 'REDIS';
    this._client = null;
  }

  _getClient() {
    if (this._client) return this._client;
    let Redis;
    try {
      Redis = require('ioredis');
    } catch (e) {
      throw new Error(`REDIS_URL is set but "ioredis" is not installed. Original error: ${e.message}`);
    }
    this._client = new Redis(process.env.REDIS_URL);
    return this._client;
  }

  async get(key) {
    const client = this._getClient();
    const raw = await client.get(key);
    if (raw === null) return undefined;
    try { return JSON.parse(raw); } catch (_) { return undefined; }
  }

  async set(key, value, ttlMs = DEFAULT_TTL_MS) {
    const client = this._getClient();
    await client.set(key, JSON.stringify(value), 'PX', Math.max(1, ttlMs));
    return value;
  }

  async invalidate(key) {
    const client = this._getClient();
    await client.del(key);
  }
}

let activeCoordinator = null;

function getCoordinator() {
  if (activeCoordinator) return activeCoordinator;
  if (process.env.REDIS_URL) {
    try {
      activeCoordinator = new RedisCoordinator();
      console.warn('[stateCoordinator] REDIS_URL is set — using RedisCoordinator. This path has NOT been verified against a live Redis instance in this environment; confirm in staging before relying on it in production.');
      return activeCoordinator;
    } catch (e) {
      console.error('[stateCoordinator] Failed to initialize RedisCoordinator, falling back to in-process:', e.message);
    }
  }
  activeCoordinator = new InProcessCoordinator();
  return activeCoordinator;
}

function resetCoordinatorForTests() {
  activeCoordinator = null;
}

module.exports = { InProcessCoordinator, RedisCoordinator, getCoordinator, resetCoordinatorForTests };
