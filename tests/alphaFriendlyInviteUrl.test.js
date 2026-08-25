/**
 * Friendly Alpha invite URL regressions.
 * Run: node --test tests/alphaFriendlyInviteUrl.test.js
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const ROOT = path.join(__dirname, '..');

describe('alpha friendly invite URL', () => {
  const prev = {
    PUBLIC_ALPHA_ORIGIN: process.env.PUBLIC_ALPHA_ORIGIN,
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
    ALPHA_TESTER_BASE_URL: process.env.ALPHA_TESTER_BASE_URL,
    RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  };

  beforeEach(() => {
    for (const key of Object.keys(require.cache)) {
      if (/alphaTesterManager|publicAlphaOrigin|alphaOnboardingGate|alphaAdmin|alphaTest\.js/.test(key)) {
        delete require.cache[key];
      }
    }
    delete process.env.PUBLIC_ALPHA_ORIGIN;
    delete process.env.PUBLIC_APP_URL;
    delete process.env.ALPHA_TESTER_BASE_URL;
    delete process.env.RENDER_EXTERNAL_URL;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('creates invite with non-sequential publicInviteCode (BB-XXXXX)', () => {
    const {
      createInvite,
      isPublicInviteCodeFormat,
    } = require('../services/alphaTesterManager');
    const a = createInvite({ label: 'friendly-a' });
    const b = createInvite({ label: 'friendly-b' });
    assert.ok(isPublicInviteCodeFormat(a.publicInviteCode));
    assert.ok(isPublicInviteCodeFormat(b.publicInviteCode));
    assert.notEqual(a.publicInviteCode, b.publicInviteCode);
    assert.notEqual(a.inviteToken, b.inviteToken);
    assert.notEqual(a.publicInviteCode, a.inviteToken);
    // Not monotonic numeric IDs
    assert.doesNotMatch(a.publicInviteCode, /^BB-\d+$/);
    assert.match(a.publicInviteCode, /^BB-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}$/);
  });

  it('friendly URL contains no raw token and no PII', () => {
    const { createInvite, getFriendlyInviteLink } = require('../services/alphaTesterManager');
    const inv = createInvite({ label: 'Jordan Tester' });
    process.env.PUBLIC_ALPHA_ORIGIN = 'https://example.test';
    const link = getFriendlyInviteLink(inv.publicInviteCode);
    assert.equal(link, `https://example.test/alpha/${inv.publicInviteCode}`);
    assert.doesNotMatch(link, new RegExp(inv.inviteToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(link, /alphaToken=/i);
    assert.doesNotMatch(link, /Jordan|email|phone|gender|sex/i);
  });

  it('public origin validation rejects unsafe / malformed production origins', () => {
    const { resolvePublicAlphaOrigin } = require('../services/publicAlphaOrigin');
    assert.equal(resolvePublicAlphaOrigin('').ok, false);
    assert.equal(resolvePublicAlphaOrigin('not a url').ok, false);
    assert.equal(resolvePublicAlphaOrigin('http://example.com').ok, false);
    assert.equal(resolvePublicAlphaOrigin('http://example.com').reason, 'https_required');
    assert.equal(resolvePublicAlphaOrigin('https://example.com/').ok, true);
    assert.equal(resolvePublicAlphaOrigin('https://example.com/').origin, 'https://example.com');
    assert.equal(resolvePublicAlphaOrigin('http://localhost:3000').ok, true);
  });

  it('valid unused friendly code maps to onboarding-required gate (no anonymous)', () => {
    const { createInvite, validateInviteByPublicCode } = require('../services/alphaTesterManager');
    const { resolveAlphaOnboardingGate, shouldBlockAnonymousChat } = require('../services/alphaOnboardingGate');
    const inv = createInvite({ label: 'gate' });
    const v = validateInviteByPublicCode(inv.publicInviteCode);
    assert.equal(v.valid, true);
    assert.equal(v.used, false);
    const gate = resolveAlphaOnboardingGate({
      alphaInviteCode: inv.publicInviteCode,
      existingTesterId: null,
      invite: { ok: true, used: false, tester: null },
    });
    assert.equal(gate.phase, 'onboard_required');
    assert.equal(gate.allowProduct, false);
    assert.equal(shouldBlockAnonymousChat(gate), true);
  });

  it('onboarding by inviteCode binds tester without client needing raw token', () => {
    const { createInvite, completeOnboarding, validateInviteByPublicCode } = require('../services/alphaTesterManager');
    const inv = createInvite({ label: 'bind-by-code' });
    const ok = completeOnboarding({
      inviteCode: inv.publicInviteCode,
      intake: { name: 'Alex' },
      consentAccepted: true,
      ndaAccepted: true,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.tester.name, 'Alex');
    const v = validateInviteByPublicCode(inv.publicInviteCode);
    assert.equal(v.used, true);
    assert.equal(v.tester.testerId, ok.tester.testerId);
  });

  it('invalid / revoked / expired friendly codes fail closed', () => {
    const {
      createInvite,
      validateInviteByPublicCode,
      load,
    } = require('../services/alphaTesterManager');
    assert.equal(validateInviteByPublicCode('BB-ZZZZZ').valid, false);
    assert.equal(validateInviteByPublicCode('70831').valid, false);
    assert.equal(validateInviteByPublicCode('not-a-code').valid, false);

    const revoked = createInvite({ label: 'revoked' });
    const data = load();
    const row = data.invites.find((i) => i.inviteToken === revoked.inviteToken);
    row.revokedAt = new Date().toISOString();
    fs.writeFileSync(require('../services/alphaTesterManager').DATA_PATH, JSON.stringify(data, null, 2));
    assert.equal(validateInviteByPublicCode(revoked.publicInviteCode).valid, false);
    assert.match(validateInviteByPublicCode(revoked.publicInviteCode).error, /revoked/i);

    const expired = createInvite({ label: 'expired' });
    const data2 = load();
    const row2 = data2.invites.find((i) => i.inviteToken === expired.inviteToken);
    row2.expiresAt = new Date(Date.now() - 60_000).toISOString();
    fs.writeFileSync(require('../services/alphaTesterManager').DATA_PATH, JSON.stringify(data2, null, 2));
    assert.equal(validateInviteByPublicCode(expired.publicInviteCode).valid, false);
    assert.match(validateInviteByPublicCode(expired.publicInviteCode).error, /expired/i);
  });

  it('stale localStorage cannot bypass new unused friendly invite', () => {
    const { resolveAlphaOnboardingGate } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaInviteCode: 'BB-7K4M2',
      existingTesterId: 'alpha-stale-other',
      invite: { ok: true, used: false, tester: null },
    });
    assert.equal(gate.showOnboarding, true);
    assert.equal(gate.allowProduct, false);
    assert.equal(gate.clearStaleTesterId, true);
  });

  it('legacy token URL validation remains compatible', () => {
    const { createInvite, validateInviteToken } = require('../services/alphaTesterManager');
    const inv = createInvite({ label: 'legacy' });
    const v = validateInviteToken(inv.inviteToken);
    assert.equal(v.valid, true);
    assert.equal(v.used, false);
  });

  it('GET /alpha/:code redirects to ?alphaInvite= without raw token', async () => {
    const { createInvite } = require('../services/alphaTesterManager');
    const inv = createInvite({ label: 'route' });
    const app = express();
    // Mirror server friendly route contract
    app.get('/alpha/:publicInviteCode', (req, res) => {
      const {
        isPublicInviteCodeFormat,
        normalizePublicInviteCode,
        validateInviteByPublicCode,
      } = require('../services/alphaTesterManager');
      const code = normalizePublicInviteCode(req.params.publicInviteCode);
      if (!isPublicInviteCodeFormat(code)) return res.status(400).send('bad');
      const result = validateInviteByPublicCode(code);
      if (!result.valid) return res.status(404).send(result.error);
      return res.redirect(302, `/?alphaInvite=${encodeURIComponent(code)}`);
    });
    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/alpha/${inv.publicInviteCode}`, {
        redirect: 'manual',
      });
      assert.equal(res.status, 302);
      const loc = res.headers.get('location');
      assert.equal(loc, `/?alphaInvite=${inv.publicInviteCode}`);
      assert.doesNotMatch(loc, new RegExp(inv.inviteToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

      const bad = await fetch(`http://127.0.0.1:${port}/alpha/BB-ZZZZZ`, { redirect: 'manual' });
      assert.equal(bad.status, 404);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('invite-code API never returns inviteToken', async () => {
    const { createInvite } = require('../services/alphaTesterManager');
    const inv = createInvite({ label: 'api-shape' });
    const alphaTest = require('../routes/alphaTest');
    const app = express();
    app.use(express.json());
    app.use('/api/alpha', alphaTest);
    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/alpha/invite-code/${inv.publicInviteCode}`);
      const j = await res.json();
      assert.equal(j.ok, true);
      assert.equal(j.publicInviteCode, inv.publicInviteCode);
      assert.equal(j.inviteToken, undefined);
      assert.ok(!JSON.stringify(j).includes(inv.inviteToken));
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('Admin invite output prefers friendly link; public product has no Admin chrome', () => {
    const adminSrc = fs.readFileSync(path.join(ROOT, 'routes', 'alphaAdmin.js'), 'utf8');
    assert.match(adminSrc, /getFriendlyInviteLink/);
    assert.match(adminSrc, /PUBLIC_ALPHA_ORIGIN/);
    const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.doesNotMatch(html, /id="adminConsoleLink"/);
    assert.match(html, /alphaInvite/);
    assert.match(html, /invite-code/);
    const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(serverSrc, /\/alpha\/:publicInviteCode/);
    assert.match(serverSrc, /alphaInvite=/);
  });
});
