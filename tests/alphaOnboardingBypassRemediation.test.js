/**
 * Founder Alpha — onboarding bypass remediation regressions.
 * Run: node --test tests/alphaOnboardingBypassRemediation.test.js
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const ROOT = path.join(__dirname, '..');

describe('alpha onboarding bypass remediation', () => {
  const prevPublic = process.env.PUBLIC_APP_URL;
  const prevAlpha = process.env.ALPHA_TESTER_BASE_URL;
  let tmpDataPath = null;
  let mgr = null;

  beforeEach(() => {
    for (const key of Object.keys(require.cache)) {
      if (/alphaOnboardingGate|alphaTesterManager|alphaTest\.js/.test(key)) {
        delete require.cache[key];
      }
    }
    delete process.env.PUBLIC_APP_URL;
    delete process.env.ALPHA_TESTER_BASE_URL;
  });

  afterEach(() => {
    if (prevPublic === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = prevPublic;
    if (prevAlpha === undefined) delete process.env.ALPHA_TESTER_BASE_URL;
    else process.env.ALPHA_TESTER_BASE_URL = prevAlpha;
  });

  it('CASE A/B: fresh unused invite + clean client requires onboarding and blocks product', () => {
    const { resolveAlphaOnboardingGate, shouldBlockAnonymousChat } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'fresh-token',
      existingTesterId: null,
      invite: { ok: true, used: false, tester: null },
    });
    assert.equal(gate.phase, 'onboard_required');
    assert.equal(gate.showOnboarding, true);
    assert.equal(gate.allowProduct, false);
    assert.equal(shouldBlockAnonymousChat(gate), true);
  });

  it('CASE D: stale localStorage + NEW unused invite still requires onboarding and clears stale', () => {
    const { resolveAlphaOnboardingGate } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'new-invite-token',
      existingTesterId: 'alpha-stale-other-user',
      invite: { ok: true, used: false, tester: null },
    });
    assert.equal(gate.phase, 'onboard_required');
    assert.equal(gate.showOnboarding, true);
    assert.equal(gate.allowProduct, false);
    assert.equal(gate.clearStaleTesterId, true);
  });

  it('CASE C: consumed invite + matching local tester skips onboarding (returning)', () => {
    const { resolveAlphaOnboardingGate } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'used-token',
      existingTesterId: 'alpha-abc',
      invite: { ok: true, used: true, tester: { testerId: 'alpha-abc', name: 'Sam' } },
    });
    assert.equal(gate.phase, 'returning_bound');
    assert.equal(gate.showOnboarding, false);
    assert.equal(gate.allowProduct, true);
    assert.equal(gate.bindTesterId, 'alpha-abc');
  });

  it('CASE C clean device: consumed invite binds tester — never anonymous guest', () => {
    const { resolveAlphaOnboardingGate } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'used-token',
      existingTesterId: null,
      invite: { ok: true, used: true, tester: { testerId: 'alpha-abc', name: 'Sam' } },
    });
    assert.equal(gate.phase, 'returning_invite');
    assert.equal(gate.allowProduct, true);
    assert.equal(gate.bindTesterId, 'alpha-abc');
    assert.notEqual(gate.bindTesterId, null);
  });

  it('CASE E: invalid token fails closed — no product, no bind', () => {
    const { resolveAlphaOnboardingGate } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'bad',
      existingTesterId: null,
      invite: { ok: false, error: 'Invalid invite link.' },
    });
    assert.equal(gate.phase, 'invalid_invite');
    assert.equal(gate.showOnboarding, true);
    assert.equal(gate.allowProduct, false);
    assert.equal(gate.bindTesterId, null);
  });

  it('validating phase blocks anonymous chat before fetch returns', () => {
    const { resolveAlphaOnboardingGate, shouldBlockAnonymousChat } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'tok',
      existingTesterId: null,
      invite: 'pending',
    });
    assert.equal(gate.phase, 'validating');
    assert.equal(shouldBlockAnonymousChat(gate), true);
  });

  it('invite links are absolute when base is provided; Admin must not rely on bare relative links alone', () => {
    const { getInviteLink } = require('../services/alphaTesterManager');
    const abs = getInviteLink('tok123', 'https://bible-buddy.example');
    assert.equal(abs, 'https://bible-buddy.example/alpha?token=tok123');
    // Without base, helper may still return path — public UI/server must supply host.
    const rel = getInviteLink('tok123');
    assert.match(rel, /\/alpha\?token=tok123/);
  });

  it('preferred name required on completeOnboarding', () => {
    const { createInvite, completeOnboarding } = require('../services/alphaTesterManager');
    const inv = createInvite({ label: 'name-required' });
    const fail = completeOnboarding({
      inviteToken: inv.inviteToken,
      intake: { name: '   ' },
      consentAccepted: true,
      ndaAccepted: true,
    });
    assert.equal(fail.ok, false);
    assert.match(String(fail.error), /name/i);
    const ok = completeOnboarding({
      inviteToken: inv.inviteToken,
      intake: { name: 'Jordan' },
      consentAccepted: true,
      ndaAccepted: true,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.tester.name, 'Jordan');
    assert.ok(ok.tester.testerId);
    const { validateInviteToken } = require('../services/alphaTesterManager');
    const v = validateInviteToken(inv.inviteToken);
    assert.equal(v.used, true);
    assert.equal(v.tester.testerId, ok.tester.testerId);
  });

  it('public HTML gates product during Alpha invite and clears stale identity', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.match(html, /alpha-gate-open/);
    assert.match(html, /alphaOnboardingGate/);
    assert.match(html, /bb_alpha_tester_id/);
    assert.match(html, /removeItem\(['"]bb_alpha_tester_id['"]\)/);
    assert.match(html, /What should Buddy call you/);
    assert.match(html, /alpha-gate-open/);
    assert.match(html, /if \(document\.body\.classList\.contains\('alpha-gate-open'\)\) return;/);
    assert.doesNotMatch(html, /id="adminConsoleLink"/);
    const gateJs = fs.readFileSync(path.join(ROOT, 'public', 'js', 'alphaOnboardingGate.js'), 'utf8');
    assert.match(gateJs, /resolveAlphaOnboardingGate/);
    assert.match(gateJs, /onboard_required/);
  });

  it('server.js /alpha without token fails closed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    assert.match(src, /Alpha invite required/);
    assert.doesNotMatch(
      src,
      /app\.get\(\['\/alpha'[\s\S]*?res\.redirect\(302, '\/'\);/,
    );
  });

  it('Admin invite creation prefers absolute host base', () => {
    const src = fs.readFileSync(path.join(ROOT, 'routes', 'alphaAdmin.js'), 'utf8');
    assert.match(src, /RENDER_EXTERNAL_URL|req\.get\('host'\)/);
  });
  it('/alpha?token= redirects with alphaToken; /alpha without token is 400', async () => {
    const app = express();
    app.get(['/alpha', '/alpha/'], (req, res) => {
      const token = req.query && req.query.token != null ? String(req.query.token).trim() : '';
      if (token) return res.redirect(302, `/?alphaToken=${encodeURIComponent(token)}`);
      res.status(400).type('html').send('<h1>Alpha invite required</h1>');
    });
    const server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address();
    try {
      const missing = await fetch(`http://127.0.0.1:${port}/alpha`);
      assert.equal(missing.status, 400);
      assert.match(await missing.text(), /invite required/i);

      const ok = await fetch(`http://127.0.0.1:${port}/alpha?token=freshTok`, { redirect: 'manual' });
      assert.equal(ok.status, 302);
      assert.equal(ok.headers.get('location'), '/?alphaToken=freshTok');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('cross-user: new unused invite does not inherit other tester id', () => {
    const { resolveAlphaOnboardingGate } = require('../services/alphaOnboardingGate');
    const gate = resolveAlphaOnboardingGate({
      alphaToken: 'invite-b',
      existingTesterId: 'alpha-tester-a',
      invite: { ok: true, used: false, tester: null },
    });
    assert.equal(gate.clearStaleTesterId, true);
    assert.equal(gate.bindTesterId, null);
    assert.equal(gate.allowProduct, false);
  });
});
