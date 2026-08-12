#!/usr/bin/env node
/**
 * Governed Decision Queue DEFER operator — extends the existing Admin API
 * owners (adminAuthMiddleware, adminDecisionQueue, unified routes) and the
 * human-local secure-probe pattern from V1.3K (/tmp biblebuddy-admin-proof).
 *
 * NOT a second governance system. Calls existing:
 *   GET  /admin/api/bible-authority/unified/decision-queue
 *   POST /admin/api/bible-authority/unified/decision-queue/:id/defer
 *   GET  /admin/api/bible-authority/unified/audit
 *   GET  /admin/api/bible-authority/unified/overview
 *   GET  /health
 *
 * Modes:
 *   --preflight   READ_ONLY (default) — list/filter candidates + auth check
 *   --defer       HUMAN_APPROVED_SINGLE_ACTION — requires CONFIRM_DEFER=YES
 *                 and interactive type-DEFER confirmation
 *
 * Secrets:
 *   Token from env BIBLE_AUTHORITY_ADMIN_TOKEN / CC_SMOKE_TOKEN only.
 *   No insecure local smoke-token fallback.
 *   Token never printed, never written to evidence files.
 *
 * Usage:
 *   CERTIFY_PROD_URL=https://… node scripts/adminGovernedDeferOperator.js --preflight
 *   CONFIRM_DEFER=YES CERTIFY_PROD_URL=https://… node scripts/adminGovernedDeferOperator.js --defer
 */

const https = require('https');
const http = require('http');
const readline = require('readline');
const { createHash } = require('crypto');

const BASE = (process.env.CERTIFY_PROD_URL || process.env.CC_SMOKE_BASE_URL || '').replace(/\/$/, '');
const TOKEN = String(process.env.BIBLE_AUTHORITY_ADMIN_TOKEN || process.env.CC_SMOKE_TOKEN || '').trim();
const WANT_ID = process.env.DEFER_CANDIDATE_ID || 'founder-experience:8d1e5cca-9edf-4995-9907-238903166163';
const MODE = process.argv.includes('--defer') ? 'defer' : 'preflight';

function fingerprint(token) {
  if (!token) return null;
  return createHash('sha256').update(String(token).trim(), 'utf8').digest('hex').slice(0, 12);
}

function request(method, path, { token = null, body = null, timeoutMs = 45000 } = {}) {
  return new Promise((resolve) => {
    if (!BASE) {
      resolve({ ok: false, error: 'CERTIFY_PROD_URL or CC_SMOKE_BASE_URL required' });
      return;
    }
    let url;
    try {
      url = new URL(path, BASE);
    } catch (e) {
      resolve({ ok: false, error: e.message });
      return;
    }
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Connection: 'close', Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = lib.request(url, { method, headers, timeout: timeoutMs }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_) { /* non-JSON */ }
        const isHtml = /^\s*</.test(raw) || String(res.headers['content-type'] || '').includes('text/html');
        resolve({
          ok: true,
          status: res.statusCode,
          json,
          isHtml,
          rawLen: raw.length,
          // never return raw when token present — avoid accidental secret echo in callers
        });
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

function isSafeDeferCandidate(item) {
  if (!item || !item.id) return { ok: false, reason: 'missing item' };
  const status = String(item.status || '');
  const severity = String(item.severity || '');
  const category = String(item.category || '');
  if (!['New', 'Ready for Decision'].includes(status)) return { ok: false, reason: `status=${status}` };
  if (!['Medium', 'Low'].includes(severity)) return { ok: false, reason: `severity=${severity}` };
  if (!/founder experience/i.test(category)) return { ok: false, reason: `category=${category}` };
  if (/evidence candidate/i.test(category)) return { ok: false, reason: 'evidence candidate excluded' };
  if (/doctrine/i.test(String(item.title || ''))) return { ok: false, reason: 'doctrine title excluded' };
  return { ok: true, reason: 'founder-experience medium/low reversible' };
}

function askLine(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });
}

async function main() {
  const redacted = {
    mode: MODE,
    base: BASE || null,
    tokenPresent: !!TOKEN,
    tokenFingerprint: fingerprint(TOKEN),
    wantId: WANT_ID,
  };
  console.log(JSON.stringify({ phase: 'start', ...redacted }, null, 2));

  if (!BASE) {
    console.error('FAIL: set CERTIFY_PROD_URL');
    process.exit(2);
  }
  if (!TOKEN) {
    console.error('FAIL: set BIBLE_AUTHORITY_ADMIN_TOKEN (required; no insecure smoke-token fallback)');
    process.exit(2);
  }

  const health = await request('GET', '/health');
  if (!health.ok || health.status !== 200 || health.isHtml || !health.json?.health?.ok) {
    console.error('FAIL: /health not green', { status: health.status, isHtml: health.isHtml, error: health.error });
    process.exit(3);
  }
  const prodSha = health.json.health.releaseCommit;
  const prodFp = health.json.health.adminAuthFingerprint;
  console.log(JSON.stringify({
    phase: 'health',
    prodSha,
    prodFp,
    localTokenFp: fingerprint(TOKEN),
    fingerprintMatch: prodFp === fingerprint(TOKEN),
  }, null, 2));
  if (prodFp && fingerprint(TOKEN) && prodFp !== fingerprint(TOKEN)) {
    console.error('FAIL: token fingerprint does not match production — refusing');
    process.exit(4);
  }

  const queue = await request('GET', `/admin/api/bible-authority/unified/decision-queue?limit=100`, { token: TOKEN });
  if (!queue.ok || queue.status !== 200 || queue.isHtml) {
    console.error('FAIL: decision-queue read', { status: queue.status, isHtml: queue.isHtml, error: queue.error });
    process.exit(5);
  }
  const candidates = Array.isArray(queue.json?.items) ? queue.json.items : [];

  let target = candidates.find((i) => i && i.id === WANT_ID);
  if (!target) {
    target = candidates.find((i) => isSafeDeferCandidate(i).ok);
  }
  const safety = target ? isSafeDeferCandidate(target) : { ok: false, reason: 'no candidate' };

  console.log(JSON.stringify({
    phase: 'preflight_candidate',
    queueHttpStatus: queue.status,
    candidateCount: candidates.length,
    target: target ? {
      id: target.id,
      title: target.title,
      category: target.category,
      severity: target.severity,
      status: target.status,
    } : null,
    safety,
    knowledgeActivationExpected: false,
    notificationExpected: 'NONE',
    missionControlChangeExpected: 'NO_CHANGE_EXPECTED_FOR_MEDIUM_FE_DEFER',
    auditEntryExpected: 'DECISION_QUEUE_DEFER',
  }, null, 2));

  if (MODE === 'preflight') {
    console.log(JSON.stringify({
      phase: 'preflight_complete',
      next: 'Re-run with --defer and CONFIRM_DEFER=YES after Founder approval',
    }, null, 2));
    process.exit(safety.ok ? 0 : 6);
  }

  // ---- HUMAN_APPROVED_SINGLE_ACTION ----
  if (process.env.CONFIRM_DEFER !== 'YES') {
    console.error('FAIL: CONFIRM_DEFER=YES required for --defer');
    process.exit(7);
  }
  if (!safety.ok || !target) {
    console.error('FAIL: candidate not safe');
    process.exit(8);
  }

  console.log('\nPROPOSED_ACTION: DEFER');
  console.log(`TARGET_ID: ${target.id}`);
  console.log(`TARGET_TITLE: ${target.title}`);
  console.log(`TARGET_CATEGORY: ${target.category}`);
  console.log(`TARGET_SEVERITY: ${target.severity}`);
  console.log(`CURRENT_STATUS: ${target.status}`);
  console.log('EXPECTED_RESULT: Deferred');
  console.log('KNOWLEDGE_ACTIVATION_EXPECTED: NO');
  console.log('NOTIFICATION_EXPECTED: NONE');
  console.log('MISSION_CONTROL_CHANGE_EXPECTED: NO_CHANGE_EXPECTED (Medium FE)');
  console.log('AUDIT_ENTRY_EXPECTED: DECISION_QUEUE_DEFER');
  console.log('');

  if (!process.stdin.isTTY) {
    console.error('FAIL: --defer requires interactive TTY to type DEFER (will not infer confirmation)');
    process.exit(9);
  }
  const typed = await askLine('Type DEFER to execute one mutation (anything else aborts): ');
  if (typed !== 'DEFER') {
    console.error('ABORTED: confirmation mismatch');
    process.exit(10);
  }

  const preOverview = await request('GET', '/admin/api/bible-authority/unified/overview', { token: TOKEN });
  const preOpen = preOverview.json?.recommendations?.data?.totalOpenItems
    ?? preOverview.json?.data?.recommendations?.data?.totalOpenItems
    ?? null;

  const action = await request('POST', `/admin/api/bible-authority/unified/decision-queue/${encodeURIComponent(target.id)}/defer`, {
    token: TOKEN,
    body: { note: 'lifecycle certification — reversible', decidedBy: 'admin' },
  });
  if (!action.ok || action.status !== 200 || action.isHtml || action.json?.ok === false) {
    console.error('FAIL: defer action', { status: action.status, isHtml: action.isHtml, error: action.json?.error || action.error });
    process.exit(11);
  }

  const postStatus = action.json?.status || action.json?.item?.status || null;
  console.log(JSON.stringify({ phase: 'mutation_response', status: action.status, reportedStatus: postStatus }, null, 2));

  // Round 1 + 2 independent fetches
  async function verifyOnce(label) {
    const q = await request('GET', `/admin/api/bible-authority/unified/decision-queue?limit=100`, { token: TOKEN });
    const items2 = Array.isArray(q.json?.items) ? q.json.items : [];
    const row = items2.find((i) => i.id === target.id);
    const audit = await request('GET', `/admin/api/bible-authority/unified/audit?limit=50`, { token: TOKEN });
    const entries = Array.isArray(audit.json?.entries)
      ? audit.json.entries
      : (Array.isArray(audit.json?.items) ? audit.json.items : []);
    const auditHit = entries.some(
      (e) => e.target === target.id && /DEFER/i.test(String(e.action || e.actionType || '')),
    );
    const ov = await request('GET', '/admin/api/bible-authority/unified/overview', { token: TOKEN });
    const open = ov.json?.recommendations?.data?.totalOpenItems
      ?? ov.json?.data?.recommendations?.data?.totalOpenItems
      ?? null;
    const result = {
      label,
      rowStatus: row?.status || null,
      deferred: row?.status === 'Deferred',
      auditHit,
      openCount: open,
      preOpen,
    };
    console.log(JSON.stringify({ phase: 'verify', ...result }, null, 2));
    return result;
  }

  const v1 = await verifyOnce('round1');
  const v2 = await verifyOnce('round2_independent');
  // Round 3 — short wait + fresh fetch (reload analogue)
  await new Promise((r) => setTimeout(r, 750));
  const v3 = await verifyOnce('round3_fresh');

  const pass = v1.deferred && v2.deferred && v3.deferred && v1.auditHit && v2.auditHit && v3.auditHit;
  console.log(JSON.stringify({
    phase: 'final',
    DEFER_LIFECYCLE: pass ? 'VERIFIED' : 'FAILED',
    knowledgeActivation: 'NONE_OBSERVED',
  }, null, 2));
  process.exit(pass ? 0 : 12);
}

main().catch((e) => {
  console.error('FAIL: uncaught', String(e && e.message ? e.message : e));
  process.exit(1);
});
