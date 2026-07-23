#!/usr/bin/env node
/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Automation (objective 6).
 *
 * A repeatable post-deploy verification script — the same checks that were
 * previously run by hand against production after each release in this
 * engagement (health, release commit, auth boundaries, public endpoint
 * reachability, core Buddy Chat functionality), now a single command any
 * operator (or a future CI/CD "deploy" step) can run against any target:
 *
 *   POST_DEPLOY_VERIFY_URL=https://your-app.onrender.com npm run postdeploy:verify
 *
 * Read-only and least-privilege by design: never sends an admin token
 * unless POST_DEPLOY_VERIFY_ADMIN_TOKEN is explicitly provided, and the one
 * optional live-chat check only runs if POST_DEPLOY_VERIFY_LIVE_CHAT=1 is
 * set (it costs a real OpenAI call, so it must be opted into, not
 * automatic). Writes a timestamped JSON report under
 * docs/alpha/deployment-verification/, matching every other verification
 * artifact already tracked in this repo, and exits non-zero if any
 * REQUIRED check fails (so this is safe to wire into a CI/CD pipeline as a
 * blocking gate later, without requiring anything more than an app URL).
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.POST_DEPLOY_VERIFY_URL || process.argv[2] || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.POST_DEPLOY_VERIFY_ADMIN_TOKEN || null;
const RUN_LIVE_CHAT_CHECK = process.env.POST_DEPLOY_VERIFY_LIVE_CHAT === '1';
const TIMEOUT_MS = Number(process.env.POST_DEPLOY_VERIFY_TIMEOUT_MS || 10000);

function request({ method = 'GET', urlPath, body = null, headers = {} }) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlPath, TARGET_URL);
    } catch (e) {
      resolve({ ok: false, error: `bad URL: ${e.message}` });
      return;
    }
    const client = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const req = client.request(
      url,
      {
        method,
        headers: {
          Connection: 'close',
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(responseBody); } catch (_) { /* non-JSON is fine for some checks */ }
          resolve({ ok: true, status: res.statusCode, json, body: responseBody });
        });
      }
    );
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

const results = [];
function record(name, required, passed, detail) {
  results.push({ name, required, passed, detail });
}

async function main() {
  console.log(`Post-deploy verification against: ${TARGET_URL}\n`);

  const health = await request({ urlPath: '/health' });
  record('health_reachable', true, health.ok && health.status === 200, health.ok ? `status=${health.status}` : health.error);

  if (health.ok && health.json) {
    // Actual shape (server.js /health): { health: { ok, version, releaseCommit, ... }, providers: {...} }
    const h = health.json.health || health.json;
    record('health_reports_ok_status', true, h.ok === true || h.status === 'ok', JSON.stringify(health.json).slice(0, 200));
    if (h.releaseCommit || h.version) {
      record('health_reports_release_identifier', false, true, `releaseCommit/version=${h.releaseCommit || h.version}`);
    }
  }

  const home = await request({ urlPath: '/' });
  record('public_home_reachable', true, home.ok && home.status === 200, home.ok ? `status=${home.status}` : home.error);

  const anonAdmin = await request({ urlPath: '/admin/api/bible-authority/unified/overview' });
  record('admin_rejects_anonymous', true, anonAdmin.ok && anonAdmin.status === 401, anonAdmin.ok ? `status=${anonAdmin.status}` : anonAdmin.error);

  if (ADMIN_TOKEN) {
    const authAdmin = await request({ urlPath: '/admin/api/bible-authority/unified/overview', headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
    record('admin_accepts_valid_token', false, authAdmin.ok && authAdmin.status === 200, authAdmin.ok ? `status=${authAdmin.status}` : authAdmin.error);
  } else {
    record('admin_accepts_valid_token', false, true, 'skipped — no POST_DEPLOY_VERIFY_ADMIN_TOKEN provided (least-privilege default)');
  }

  if (RUN_LIVE_CHAT_CHECK) {
    const chat = await request({
      method: 'POST',
      urlPath: '/buddy/chat',
      body: { message: 'What does John 3:16 say?', userId: `postdeploy-verify-${Date.now()}` },
    });
    record('buddy_chat_responds', true, chat.ok && chat.status === 200 && chat.json && chat.json.ok === true, chat.ok ? `status=${chat.status}` : chat.error);
  } else {
    record('buddy_chat_responds', false, true, 'skipped — set POST_DEPLOY_VERIFY_LIVE_CHAT=1 to exercise (uses a real OpenAI call)');
  }

  const requiredFailed = results.filter((r) => r.required && !r.passed);
  const optionalFailed = results.filter((r) => !r.required && !r.passed);

  console.log('--- Results ---');
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}]${r.required ? '' : ' (optional)'} ${r.name} — ${r.detail}`);
  }

  const summary = {
    at: new Date().toISOString(),
    targetUrl: TARGET_URL,
    results,
    requiredFailedCount: requiredFailed.length,
    optionalFailedCount: optionalFailed.length,
    verdict: requiredFailed.length === 0 ? 'VERIFIED' : 'FAILED',
  };

  const outDir = path.join(__dirname, '..', 'docs', 'alpha', 'deployment-verification');
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\nReport written to ${outPath}`);
  } catch (e) {
    console.warn(`Could not write report file: ${e.message}`);
  }

  console.log(`\n=== POST-DEPLOY VERIFICATION: ${summary.verdict} ===`);
  process.exit(requiredFailed.length === 0 ? 0 : 1);
}

main();
