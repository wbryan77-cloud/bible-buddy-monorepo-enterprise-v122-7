/**
 * P0 — checked-out pg Client "Connection terminated unexpectedly" must not
 * become UNCAUGHT_EXCEPTION / process.exit(1).
 *
 * Reproduces the b43a3f4 @ 19:28 PDT failure class:
 *   pool.connect() removes idle error listener
 *   → TCP death emits Client 'error'
 *   → no app listener
 *   → uncaughtException
 *
 * Run: node --test tests/postgresCheckedOutClientError.test.js
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

describe('postgres checked-out client error handling', () => {
  let realExit;
  let exitCalled;
  let exitCode;
  let uncaught;

  beforeEach(() => {
    exitCalled = false;
    exitCode = null;
    uncaught = null;
    realExit = process.exit;
    process.exit = (code) => {
      exitCalled = true;
      exitCode = code;
      throw new Error(`process.exit(${code}) invoked`);
    };
  });

  afterEach(() => {
    process.exit = realExit;
  });

  it('BEFORE_FIX class: checked-out Client error without listener is fatal', async () => {
    // Document the production defect: emit on bare Client (no listeners).
    const client = new EventEmitter();
    let threw = false;
    try {
      client.emit('error', new Error('Connection terminated unexpectedly'));
    } catch (e) {
      threw = true;
      assert.match(String(e && e.message), /Connection terminated unexpectedly|Unhandled.*error/i);
    }
    assert.equal(threw, true, 'unhandled Client error must throw (Node EventEmitter contract)');
  });

  it('attachCheckedOutClientErrorHandler prevents uncaughtException', async () => {
    const {
      attachCheckedOutClientErrorHandler,
    } = require('../services/persistence/postgresAdapter');

    const client = new EventEmitter();
    const detach = attachCheckedOutClientErrorHandler(client, { op: 'test' });

    const onUncaught = (err) => {
      uncaught = err;
    };
    process.on('uncaughtException', onUncaught);

    try {
      client.emit('error', new Error('Connection terminated unexpectedly'));
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setTimeout(r, 20));

      assert.equal(exitCalled, false, `process.exit should not run (code=${exitCode})`);
      assert.equal(uncaught, null, 'must not become uncaughtException');
    } finally {
      detach();
      process.removeListener('uncaughtException', onUncaught);
    }
  });

  it('updateJsonDocument attaches client error handler during checkout', async () => {
    const adapterMod = require('../services/persistence/postgresAdapter');
    adapterMod.resetSharedPoolForTests();

    const client = new EventEmitter();
    let releasedWith = undefined;
    client.query = async () => ({ rows: [] });
    client.release = (err) => {
      releasedWith = err;
    };

    const fakePool = {
      query: async () => ({ rows: [] }),
      connect: async () => client,
    };

    // Inject fake pool via createSharedPool singleton bypass:
    // replace _getPool on a fresh adapter instance.
    const { PostgresStorageAdapter } = adapterMod;
    const adapter = new PostgresStorageAdapter();
    adapter._schemaReady = Promise.resolve(true);
    adapter._getPool = () => fakePool;

    const onUncaught = (err) => {
      uncaught = err;
    };
    process.on('uncaughtException', onUncaught);

    try {
      const pending = adapter.updateJsonDocument(
        '/tmp/bb-test-doc.json',
        async (cur) => {
          // Simulate TCP death mid-transaction (checked-out, no idle listener).
          const err = new Error('Connection terminated unexpectedly');
          client.emit('error', err);
          await new Promise((r) => setImmediate(r));
          return { ...(cur || {}), items: [{ id: 1 }] };
        },
        { items: [] },
      );

      // Mutator continues; subsequent query may still "succeed" on fake client.
      // The critical contract: process does not die.
      await pending.catch(() => {});

      await new Promise((r) => setImmediate(r));
      assert.equal(exitCalled, false, `process.exit must not run (code=${exitCode})`);
      assert.equal(uncaught, null, 'checked-out terminate must not be uncaughtException');
      assert.ok(
        releasedWith && /Connection terminated unexpectedly/i.test(String(releasedWith.message)),
        'dead client must be released with error so pool purges it',
      );
      assert.equal(client.listenerCount('error'), 0, 'error listeners detached after release');
    } finally {
      process.removeListener('uncaughtException', onUncaught);
      adapterMod.resetSharedPoolForTests();
    }
  });
});
