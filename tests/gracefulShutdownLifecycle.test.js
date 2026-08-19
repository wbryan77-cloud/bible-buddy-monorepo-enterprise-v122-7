/**
 * P0 — graceful SIGTERM exits 0 with lifecycle logs.
 * Run: node --test tests/gracefulShutdownLifecycle.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function waitHealth(port, ms = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve(true);
        if (Date.now() - start > ms) return resolve(false);
        setTimeout(tick, 200);
      });
      req.on('error', () => {
        if (Date.now() - start > ms) return resolve(false);
        setTimeout(tick, 200);
      });
    };
    tick();
  });
}

describe('graceful shutdown lifecycle', () => {
  it('SIGTERM logs drain and exits 0', async () => {
    const port = 34601 + Math.floor(Math.random() * 200);
    const child = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        OPENAI_API_KEY: '',
        DATABASE_URL: '',
        PERSISTENCE: 'MEMORY',
        APP_SHUTDOWN_TIMEOUT_MS: '8000',
        BIBLEBUDDY_SILENCE_PG_ADAPTER_NOTICE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
    });
    child.stderr.on('data', (d) => {
      out += d.toString();
    });

    const up = await waitHealth(port);
    assert.equal(up, true, 'server should become healthy');
    assert.match(out, /PROCESS_STARTED/);

    const exit = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch (_) {}
        resolve({ code: 'TIMEOUT', signal: null });
      }, 10000);
      child.on('exit', (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal });
      });
      child.kill('SIGTERM');
    });

    assert.equal(exit.code, 0, `expected exit 0, got ${JSON.stringify(exit)} out=${out.slice(-500)}`);
    assert.match(out, /SHUTDOWN_SIGNAL_RECEIVED/);
    assert.match(out, /HTTP_DRAIN_STARTED/);
    assert.match(out, /SHUTDOWN_COMPLETE/);
  });
});
