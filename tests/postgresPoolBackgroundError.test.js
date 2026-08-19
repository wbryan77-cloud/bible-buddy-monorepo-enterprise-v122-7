/**
 * P0 — pg Pool background error must not exit the Node process.
 * Run: node --test tests/postgresPoolBackgroundError.test.js
 *
 * Uses EventEmitter pool stand-in so the test does not require optional `pg`
 * to be installed locally; production attaches the same handler to real Pool.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

describe('postgres pool background error handling', () => {
  it('idle Connection terminated unexpectedly does not process.exit', async () => {
    const { attachPoolBackgroundErrorHandler } = require('../services/persistence/postgresAdapter');

    const pool = new EventEmitter();
    // Mimic pg Pool surface used by diagnostics.
    pool.totalCount = 0;
    pool.idleCount = 0;
    pool.waitingCount = 0;

    attachPoolBackgroundErrorHandler(pool);
    attachPoolBackgroundErrorHandler(pool); // idempotent

    let exitCalled = false;
    let exitCode = null;
    const realExit = process.exit;
    process.exit = (code) => {
      exitCalled = true;
      exitCode = code;
      throw new Error(`process.exit(${code}) invoked`);
    };

    let uncaught = null;
    const onUncaught = (err) => {
      uncaught = err;
    };
    process.on('uncaughtException', onUncaught);

    try {
      const err = new Error('Connection terminated unexpectedly');
      err.code = 'ECONNRESET';
      pool.emit('error', err);

      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setTimeout(r, 30));

      assert.equal(exitCalled, false, `process.exit should not run (code=${exitCode})`);
      assert.equal(uncaught, null, 'error must not become uncaughtException');

      // Subsequent emit still handled (process stays alive).
      pool.emit('error', new Error('Connection terminated unexpectedly'));
      await new Promise((r) => setImmediate(r));
      assert.equal(exitCalled, false);
    } finally {
      process.exit = realExit;
      process.removeListener('uncaughtException', onUncaught);
    }
  });

  it('unhandled pool error without handler would be fatal class', () => {
    // Document the defect class: EventEmitter throws on unhandled 'error'.
    const bare = new EventEmitter();
    let threw = false;
    try {
      bare.emit('error', new Error('Connection terminated unexpectedly'));
    } catch (e) {
      threw = /Unhandled.*error|Connection terminated/i.test(String(e && e.message)) || true;
    }
    assert.equal(threw, true);
  });
});
