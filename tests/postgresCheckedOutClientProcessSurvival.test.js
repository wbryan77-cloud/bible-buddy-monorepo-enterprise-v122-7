/**
 * Process-survival: checked-out Client error must not kill a live server.
 * Run: node --test tests/postgresCheckedOutClientProcessSurvival.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

const ROOT = path.join(__dirname, '..');

describe('postgres checked-out client process survival', () => {
  it('child harness survives Connection terminated unexpectedly on checked-out client', async () => {
    const port = 34801 + Math.floor(Math.random() * 200);
    const child = spawn(
      process.execPath,
      [
        '-e',
        `
const http = require('http');
const { EventEmitter } = require('events');
const { attachCheckedOutClientErrorHandler, attachPoolBackgroundErrorHandler } =
  require('./services/persistence/postgresAdapter');

process.on('uncaughtException', (err) => {
  console.error(JSON.stringify({ event: 'UNCAUGHT_EXCEPTION', errorMessage: String(err && err.message) }));
  process.exit(1);
});

const pool = new EventEmitter();
attachPoolBackgroundErrorHandler(pool);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === '/inject-checkout-error') {
    const client = new EventEmitter();
    const detach = attachCheckedOutClientErrorHandler(client, { op: 'inject' });
    client.emit('error', new Error('Connection terminated unexpectedly'));
    detach();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, survived: true }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(${port}, () => {
  console.log(JSON.stringify({ event: 'PROCESS_STARTED', port: ${port} }));
});
`,
      ],
      {
        cwd: ROOT,
        env: { ...process.env, BIBLEBUDDY_SILENCE_PG_ADAPTER_NOTICE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const waitReady = async () => {
      for (let i = 0; i < 40; i++) {
        try {
          await new Promise((resolve, reject) => {
            const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 500 }, (res) => {
              res.resume();
              resolve(res.statusCode);
            });
            req.on('error', reject);
          });
          return;
        } catch (_) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      throw new Error('server never became ready');
    };

    try {
      await waitReady();
      const inject = await new Promise((resolve, reject) => {
        const req = http.get(
          { host: '127.0.0.1', port, path: '/inject-checkout-error', timeout: 2000 },
          (res) => {
            let body = '';
            res.on('data', (c) => {
              body += c;
            });
            res.on('end', () => resolve({ status: res.statusCode, body }));
          },
        );
        req.on('error', reject);
      });
      assert.equal(inject.status, 200);
      assert.match(inject.body, /"survived":true/);

      // Health still up — process alive
      const health = await new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) => {
          let body = '';
          res.on('data', (c) => {
            body += c;
          });
          res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
      });
      assert.equal(health.status, 200);
      assert.match(health.body, /"ok":true/);
      assert.ok(!/UNCAUGHT_EXCEPTION/.test(stderr + stdout));
    } finally {
      try {
        child.kill('SIGTERM');
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 100));
    }
  });
});
