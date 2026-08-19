/**
 * Alpha invite public path + durable unused invites across wipe/hydrate.
 * Run: node --test tests/alphaInviteRouteAndDurability.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ALPHA_PATH = path.join(ROOT, 'data', 'alpha-testers.json');
const DURABLE_TESTERS = path.join(ROOT, 'data', 'alpha', 'alpha-testers-durable.json');
const DURABLE_INVITES = path.join(ROOT, 'data', 'alpha', 'alpha-invites-durable.json');

function wipe(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {}
}

function resetModules() {
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes('alphaTesterManager') ||
      key.includes('founderExperienceDurableStore') ||
      key.includes('storageAdapter')
    ) {
      delete require.cache[key];
    }
  }
}

describe('alpha invite route + durability', () => {
  let snapA;
  let snapT;
  let snapI;

  before(() => {
    snapA = fs.existsSync(ALPHA_PATH) ? fs.readFileSync(ALPHA_PATH) : null;
    snapT = fs.existsSync(DURABLE_TESTERS) ? fs.readFileSync(DURABLE_TESTERS) : null;
    snapI = fs.existsSync(DURABLE_INVITES) ? fs.readFileSync(DURABLE_INVITES) : null;
  });

  after(() => {
    if (snapA != null) fs.writeFileSync(ALPHA_PATH, snapA);
    else wipe(ALPHA_PATH);
    if (snapT != null) fs.writeFileSync(DURABLE_TESTERS, snapT);
    else wipe(DURABLE_TESTERS);
    if (snapI != null) fs.writeFileSync(DURABLE_INVITES, snapI);
    else wipe(DURABLE_INVITES);
  });

  it('unused invites survive wipe + hydrate; A/B isolation', async () => {
    wipe(ALPHA_PATH);
    wipe(DURABLE_TESTERS);
    wipe(DURABLE_INVITES);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();

    const mgr = require('../services/alphaTesterManager');
    const invA = mgr.createInvite({ label: 'Tester A private', createdBy: 'test' });
    const invB = mgr.createInvite({ label: 'Tester B private', createdBy: 'test' });
    assert.ok(invA.inviteToken);
    assert.ok(invB.inviteToken);
    assert.notEqual(invA.inviteToken, invB.inviteToken);

    const { replaceAllItems, DOC, MAX, readItems } = require('../services/founderExperienceDurableStore');
    const data = JSON.parse(fs.readFileSync(ALPHA_PATH, 'utf8'));
    await replaceAllItems(DOC.alphaTesters, data.testers || [], MAX.alphaTesters);
    await replaceAllItems(DOC.alphaInvites, data.invites || [], MAX.alphaInvites);

    const durableInv = await readItems(DOC.alphaInvites);
    assert.ok(durableInv.items.some((i) => i.inviteToken === invA.inviteToken));
    assert.ok(durableInv.items.some((i) => i.inviteToken === invB.inviteToken));

    wipe(ALPHA_PATH);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const mgr2 = require('../services/alphaTesterManager');
    const hyd = await mgr2.hydrateAlphaTestersFromDurableIfNeeded();
    assert.equal(hyd.ok, true);
    assert.equal(hyd.hydrated, true);
    assert.ok(hyd.inviteCount >= 2);

    const vA = mgr2.validateInviteToken(invA.inviteToken);
    const vB = mgr2.validateInviteToken(invB.inviteToken);
    assert.equal(vA.valid, true);
    assert.equal(vB.valid, true);
    assert.equal(vA.used, false);
    assert.equal(vB.used, false);
  });

  it('/alpha?token= redirects to alpha-test preserving token', async () => {
    const port = 34701 + Math.floor(Math.random() * 200);
    const child = spawn(process.execPath, ['server.js'], {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        OPENAI_API_KEY: '',
        DATABASE_URL: '',
        PERSISTENCE: 'MEMORY',
        BIBLEBUDDY_SILENCE_PG_ADAPTER_NOTICE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const token = 'invite-token-smoke-xyz';
    await new Promise((r) => setTimeout(r, 1200));
    const loc = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: `/alpha?token=${encodeURIComponent(token)}`,
          method: 'GET',
          headers: { Accept: 'text/html' },
        },
        (res) => {
          resolve({ status: res.statusCode, location: res.headers.location || '' });
          res.resume();
        },
      );
      req.on('error', reject);
      req.end();
    });
    try {
      child.kill('SIGTERM');
    } catch (_) {}
    assert.equal(loc.status, 302);
    assert.ok(
      loc.location.includes('/admin/alpha-test') && loc.location.includes(encodeURIComponent(token)),
      loc.location,
    );
  });
});
