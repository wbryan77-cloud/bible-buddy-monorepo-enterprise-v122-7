#!/usr/bin/env node
/**
 * Full Product + Admin Certification Gate
 *
 * Reuses existing Node test files / service checks. No new framework.
 *
 * Usage:
 *   npm run certify:product
 *   node scripts/runFullProductCertificationGate.js
 *
 * Optional production read-only checks (no Admin token / no mutations):
 *   CERTIFY_PROD_URL=https://… node scripts/runFullProductCertificationGate.js
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(id, passed, detail = '') {
  results.push({ id, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}${detail ? ` — ${detail}` : ''}`);
}

function runNode(relPath, args = []) {
  const full = path.join(ROOT, relPath);
  const r = spawnSync(process.execPath, [full, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    timeout: 180000,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  return { code: r.status == null ? 1 : r.status, out };
}

function fetchJson(url, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: String(res.headers['content-type'] || ''),
          body: raw,
          isHtml: /^\s*</.test(raw) || String(res.headers['content-type'] || '').includes('text/html'),
        });
      });
    });
    req.on('error', (e) => resolve({ status: 0, contentType: '', body: '', isHtml: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, contentType: '', body: '', isHtml: false, error: 'timeout' }); });
  });
}

async function main() {
  console.log('BibleBuddy Full Product Certification Gate\n');

  // A. Admin UI / queue / auth contract (local)
  const admin = runNode('tests/humanNeedGriefFriend.test.js');
  record('humanNeed_grief_friend', admin.code === 0, admin.code === 0 ? '' : admin.out.slice(-400));

  // Inline Admin RC static contract
  const js = fs.readFileSync(path.join(ROOT, 'admin/js/bible-authority.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'admin/bible-authority.html'), 'utf8');
  record('admin_parseAdminJson', js.includes('parseAdminJson'));
  record('admin_ccResolveScrollTarget', js.includes('ccResolveScrollTarget'));
  record('admin_queue_anchor', html.includes('id="cc-decision-queue"'));
  record('admin_cachebust', html.includes('rc-admin-20260807'));

  const { listDecisionQueue } = require(path.join(ROOT, 'services/adminDecisionQueue'));
  const { buildAdminCommandCenterSummary, invalidateAdminCommandCenterCache } = require(path.join(ROOT, 'services/adminCommandCenterAggregator'));
  const { checkAdminAuth } = require(path.join(ROOT, 'services/adminAuthMiddleware'));
  invalidateAdminCommandCenterCache();
  const summary = buildAdminCommandCenterSummary();
  const queue = listDecisionQueue({ limit: 25 });
  const OPEN = new Set(['New', 'Investigating', 'Ready for Decision', 'Deferred']);
  const open = Object.entries(queue.counts.byStatus || {}).reduce((n, [s, c]) => (OPEN.has(s) ? n + c : n), 0);
  record(
    'queue_open_total_semantics',
    summary.recommendations?.data?.totalQueueItems === queue.total
      && summary.recommendations?.data?.totalOpenItems === open
      && open <= queue.total,
    `open=${open} total=${queue.total}`,
  );
  const authRes = { statusCode: null, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; } };
  record('admin_auth_fail_closed_json', checkAdminAuth({ headers: {} }, authRes) === false && authRes.statusCode === 401 && authRes.body?.ok === false);

  // B. Doctrine / Sabbath / resurrection / satan / memory families
  const suites = [
    ['sprint2_repair_route', 'tests/sprint2RepairRoute.test.js'],
    ['phase2_enterprise_opt', 'tests/phase2EnterpriseOptimization.test.js'],
    ['phase3_autonomous', 'tests/phase3AutonomousOperations.test.js'],
    ['bie_resurrection', 'tests/bieV13aResurrectionChronology.test.js'],
    ['bie_satan', 'tests/bieV13cSatanReleaseExplicitness.test.js'],
    ['bie_memory_forget', 'tests/bieV13dMemoryForgetAck.test.js'],
    ['bie_admin_auth_norm', 'tests/bieV13fAdminAuthNormalization.test.js'],
    ['gate4_resurrection', 'tests/gate4ResurrectionTopicOwnership.test.js'],
  ];
  for (const [id, rel] of suites) {
    const r = runNode(rel);
    // node --test style exits 0 on pass; some scripts print PASS without strict exit
    const passed = r.code === 0;
    record(id, passed, passed ? '' : r.out.slice(-500));
  }

  // C. Optional production read-only
  const prodUrl = (process.env.CERTIFY_PROD_URL || '').replace(/\/$/, '');
  if (prodUrl) {
    const health = await fetchJson(`${prodUrl}/health`);
    let healthOk = false;
    let sha = null;
    try {
      const parsed = JSON.parse(health.body);
      sha = parsed?.health?.releaseCommit || null;
      healthOk = health.status === 200 && !health.isHtml && parsed?.health?.ok === true;
    } catch (_) {
      healthOk = false;
    }
    record('prod_health_json', healthOk, `sha=${sha}`);

    const overview = await fetchJson(`${prodUrl}/admin/api/bible-authority/unified/overview`);
    record(
      'prod_unified_overview_json_not_html',
      overview.status === 401 && !overview.isHtml && overview.contentType.includes('json'),
      `status=${overview.status}`,
    );

    const page = await fetchJson(`${prodUrl}/admin/bible-authority`);
    record(
      'prod_admin_page_assets',
      page.status === 200 && page.body.includes('cc-decision-queue') && page.body.includes('rc-admin-20260807'),
    );
  } else {
    record('prod_checks', true, 'SKIPPED (set CERTIFY_PROD_URL to enable)');
  }

  const pass = results.filter((r) => r.passed).length;
  const fail = results.filter((r) => !r.passed).length;
  const skip = results.filter((r) => /SKIPPED/.test(r.detail || '')).length;
  console.log(`\nREGRESSION_SUITE_COMMAND=npm run certify:product`);
  console.log(`TEST_COUNT=${results.length}`);
  console.log(`PASS_COUNT=${pass}`);
  console.log(`FAIL_COUNT=${fail}`);
  console.log(`SKIP_COUNT=${skip}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
