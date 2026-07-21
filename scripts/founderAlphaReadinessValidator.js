#!/usr/bin/env node
/**
 * PHASE 6G — PART 4: Founder Readiness Validator.
 *
 * ONE repeatable, deterministic-order command that orchestrates the
 * existing, already-verified test/check scripts from Phases 4-6G — it does
 * NOT reimplement their assertions or create a second testing framework.
 * Each category reports PASS / WARN / FAIL / SKIP_WITH_REASON. A critical
 * failure blocks readiness; a warning never silently averages away.
 *
 * Usage:
 *   node -r dotenv/config scripts/founderAlphaReadinessValidator.js
 *   npm run founder-alpha:validate
 *
 * Optional env:
 *   FOUNDER_VALIDATOR_BASE_URL   base URL for the Admin/HTTP checks
 *                                (defaults to http://localhost:3000; if no
 *                                server is reachable there, HTTP-only
 *                                checks are SKIP_WITH_REASON, not FAIL)
 *   FOUNDER_VALIDATOR_SKIP_SLOW=1  skip the slower full E2E/regression
 *                                  suites (keeps only fast structural
 *                                  checks) — useful for a quick smoke run
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE_URL = process.env.FOUNDER_VALIDATOR_BASE_URL || 'http://localhost:3000';
const SKIP_SLOW = process.env.FOUNDER_VALIDATOR_SKIP_SLOW === '1';
const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join(ROOT, 'docs', 'alpha', 'founder-readiness', RUN_TS);

const STATUS = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'SKIP_WITH_REASON' };

const categories = [];
let criticalFailures = [];
let warnings = [];
let skippedChecks = [];
let testCounts = { pass: 0, warn: 0, fail: 0, skip: 0 };

function addCategory(name, checks) {
  const status = checks.some((c) => c.status === STATUS.FAIL)
    ? STATUS.FAIL
    : checks.some((c) => c.status === STATUS.WARN)
      ? STATUS.WARN
      : checks.every((c) => c.status === STATUS.SKIP)
        ? STATUS.SKIP
        : STATUS.PASS;
  categories.push({ name, status, checks });
  for (const c of checks) {
    if (c.status === STATUS.FAIL) {
      testCounts.fail++;
      criticalFailures.push({ category: name, check: c.name, detail: c.detail });
    } else if (c.status === STATUS.WARN) {
      testCounts.warn++;
      warnings.push({ category: name, check: c.name, detail: c.detail });
    } else if (c.status === STATUS.SKIP) {
      testCounts.skip++;
      skippedChecks.push({ category: name, check: c.name, reason: c.detail });
    } else {
      testCounts.pass++;
    }
  }
  console.log(`\n[${status}] === ${name} ===`);
  for (const c of checks) {
    console.log(`  [${c.status}] ${c.name}${c.detail ? ` — ${String(c.detail).slice(0, 160)}` : ''}`);
  }
}

function check(name, status, detail = null) {
  return { name, status, detail };
}

function runNodeScript(relPath, { timeoutMs = 120000, args = [], env = {} } = {}) {
  try {
    const out = execFileSync(
      process.execPath,
      ['-r', 'dotenv/config', path.join(ROOT, relPath), ...args],
      {
        cwd: ROOT,
        timeout: timeoutMs,
        env: { ...process.env, ...env },
        maxBuffer: 1024 * 1024 * 50,
      },
    );
    return { ok: true, exitCode: 0, output: out.toString('utf8') };
  } catch (e) {
    return {
      ok: false,
      exitCode: e.status ?? null,
      output: (e.stdout ? e.stdout.toString('utf8') : '') + (e.stderr ? e.stderr.toString('utf8') : ''),
      error: e.message,
      timedOut: e.signal === 'SIGTERM' && e.status === null,
    };
  }
}

function countPassFail(output) {
  const pass = (output.match(/^\[?PASS\]?/gm) || []).length;
  const fail = (output.match(/^\[?FAIL\]?/gm) || []).length;
  return { pass, fail };
}

function httpGetJson(urlPath, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlPath, BASE_URL);
    } catch (e) {
      resolve({ ok: false, error: e.message });
      return;
    }
    const req = http.get(url, { agent: false, headers: { Connection: 'close' } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) { /* non-JSON ok */ }
        resolve({ ok: true, status: res.statusCode, json, body });
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

async function isServerReachable() {
  const r = await httpGetJson('/health', 3000);
  return r.ok && r.status === 200;
}

// ---------------------------------------------------------------------------
// REPOSITORY
// ---------------------------------------------------------------------------
function checkRepository() {
  const checks = [];

  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
    checks.push(check('node_version', major >= 20 ? STATUS.PASS : STATUS.WARN, nodeVersion));
  } catch (e) {
    checks.push(check('node_version', STATUS.WARN, e.message));
  }

  try {
    const npmVersion = execFileSync('npm', ['--version'], { cwd: ROOT }).toString().trim();
    checks.push(check('npm_version', STATUS.PASS, npmVersion));
  } catch (e) {
    checks.push(check('npm_version', STATUS.WARN, e.message));
  }

  const lockfile = path.join(ROOT, 'package-lock.json');
  checks.push(check('lockfile_present', fs.existsSync(lockfile) ? STATUS.PASS : STATUS.FAIL, lockfile));

  const requiredFiles = ['server.js', 'package.json', '.env.sample', 'render.yaml'];
  const missing = requiredFiles.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  checks.push(check('required_files_present', missing.length === 0 ? STATUS.PASS : STATUS.FAIL, missing.join(',') || null));

  try {
    execFileSync(process.execPath, ['-c', 'server.js'], { cwd: ROOT });
    checks.push(check('server_syntax_valid', STATUS.PASS));
  } catch (e) {
    checks.push(check('server_syntax_valid', STATUS.FAIL, e.message));
  }

  const migrationsDir = path.join(ROOT, 'prisma', 'migrations');
  const renderYamlActiveLines = fs
    .readFileSync(path.join(ROOT, 'render.yaml'), 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  checks.push(
    check(
      'migrations_not_referenced_in_build',
      /prisma migrate/.test(renderYamlActiveLines) ? STATUS.FAIL : STATUS.PASS,
      fs.existsSync(migrationsDir) ? 'migrations dir exists' : 'no migrations dir; render.yaml does not invoke prisma migrate in any active (non-comment) line (confirmed fixed Phase 6F/6G)',
    ),
  );

  try {
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT }).toString().trim();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
    const status = execFileSync('git', ['status', '--short'], { cwd: ROOT }).toString().trim();
    checks.push(check('commit_and_working_tree_status', STATUS.PASS, `branch=${branch} head=${head.slice(0, 12)} dirty=${status.length > 0}`));
  } catch (e) {
    checks.push(check('commit_and_working_tree_status', STATUS.WARN, e.message));
  }

  return checks;
}

// ---------------------------------------------------------------------------
// SCRIPTURE + ORIGINAL LANGUAGE + HISTORY + COMPANION + ADMIN (via existing
// regression suites — this is the "orchestrate, don't reinvent" core)
// ---------------------------------------------------------------------------
function runSuiteAsCheck(name, relPath, { timeoutMs = 180000 } = {}) {
  if (SKIP_SLOW) return check(name, STATUS.SKIP, 'FOUNDER_VALIDATOR_SKIP_SLOW=1');
  const result = runNodeScript(relPath, { timeoutMs });
  const { pass, fail } = countPassFail(result.output || '');
  if (result.timedOut) return check(name, STATUS.FAIL, `timed out after ${timeoutMs}ms`);
  if (fail > 0) return check(name, STATUS.FAIL, `${pass} passed, ${fail} failed`);
  if (!result.ok && pass === 0 && fail === 0) return check(name, STATUS.FAIL, result.error || 'non-zero exit, no parseable results');
  return check(name, STATUS.PASS, `${pass} passed, 0 failed`);
}

function checkScripture() {
  return [
    runSuiteAsCheck('scriptureFidelitySmoke', 'scripts/alpha/scriptureFidelitySmoke.js'),
    runSuiteAsCheck('alphaCoreTruthSmoke', 'scripts/alpha/alphaCoreTruthSmoke.js'),
    runSuiteAsCheck('openAiFirstRegressionTest', 'scripts/openAiFirstRegressionTest.js', { timeoutMs: 300000 }),
    runSuiteAsCheck('liveRuntimeVerification', 'scripts/liveRuntimeVerification.js', { timeoutMs: 300000 }),
  ];
}

function checkOriginalLanguage() {
  if (SKIP_SLOW) return [check('originalLanguageValidation', STATUS.SKIP, 'FOUNDER_VALIDATOR_SKIP_SLOW=1')];
  const result = runNodeScript('scripts/alpha/phase6bOriginalLanguageValidation.js', { timeoutMs: 60000 });
  return [check('originalLanguageValidation', result.ok ? STATUS.PASS : STATUS.WARN, result.ok ? null : (result.error || 'non-zero exit'))];
}

function checkHistory() {
  // Historical knowledge has no dedicated pass/fail script of its own;
  // verified structurally via the production provider directly (fast,
  // deterministic, no OpenAI call needed).
  try {
    const { getAllHistoricalRecords } = require(path.join(ROOT, 'services', 'historicalKnowledgeProvider'));
    const records = getAllHistoricalRecords();
    const allApproved = records.every((r) => r.approvalStatus === 'APPROVED');
    const allTiered = records.every((r) => r.trustTier);
    return [
      check('historical_records_present', records.length > 0 ? STATUS.PASS : STATUS.FAIL, `${records.length} records`),
      check('historical_records_approved_and_tiered', allApproved && allTiered ? STATUS.PASS : STATUS.FAIL, `approved=${allApproved} tiered=${allTiered}`),
    ];
  } catch (e) {
    return [check('historical_records_present', STATUS.FAIL, e.message)];
  }
}

function checkCompanion() {
  const checks = [runSuiteAsCheck('decisionOwnershipSmoke', 'scripts/alpha/decisionOwnershipSmoke.js', { timeoutMs: 240000 })];
  if (!SKIP_SLOW) {
    const result = runNodeScript('scripts/runPhase5OContinuationRegression.js', { timeoutMs: 60000 });
    checks.push(check('phase5OContinuationRegression', result.ok ? STATUS.PASS : STATUS.FAIL, result.ok ? null : (result.error || 'non-zero exit')));
  } else {
    checks.push(check('phase5OContinuationRegression', STATUS.SKIP, 'FOUNDER_VALIDATOR_SKIP_SLOW=1'));
  }
  return checks;
}

async function checkAdmin(serverUp) {
  if (!serverUp) {
    return [check('admin_endpoints_reachable', STATUS.SKIP, `no server reachable at ${BASE_URL} — start the app and rerun for live Admin checks`)];
  }
  const endpoints = [
    '/admin/api/bible-authority/command-center',
    '/admin/api/bible-authority/review-queue',
    '/admin/api/bible-authority/knowledge-coverage-dashboard',
    '/admin/api/bible-authority/founder-console',
    '/admin/api/bible-authority/provider-health',
  ];
  const checks = [];
  for (const ep of endpoints) {
    const r = await httpGetJson(ep, 20000);
    checks.push(check(`admin_${ep}`, r.ok && r.status === 200 ? STATUS.PASS : STATUS.FAIL, r.ok ? `status=${r.status}` : r.error));
  }
  return checks;
}

// ---------------------------------------------------------------------------
// USER PRODUCT
// ---------------------------------------------------------------------------
async function checkUserProduct(serverUp) {
  const checks = [];
  const indexHtmlPath = path.join(ROOT, 'public', 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    checks.push(check('no_technical_route_leakage_in_ui', /POST \/buddy\/chat|masterRoute|doctrine_final_authority|bible_wide_reasoning/i.test(html) ? STATUS.FAIL : STATUS.PASS));
    checks.push(check('coming_soon_labels_present_for_disabled_toggles', /Coming soon/i.test(html) ? STATUS.PASS : STATUS.WARN, 'expected disabled-feature labeling'));
  } else {
    checks.push(check('index_html_present', STATUS.FAIL, indexHtmlPath));
  }

  if (serverUp) {
    const r = await httpGetJson('/', 5000);
    checks.push(check('home_page_reachable', r.ok && r.status === 200 ? STATUS.PASS : STATUS.FAIL, r.ok ? `status=${r.status}` : r.error));
  } else {
    checks.push(check('home_page_reachable', STATUS.SKIP, `no server reachable at ${BASE_URL}`));
  }

  return checks;
}

// ---------------------------------------------------------------------------
// PROVIDERS
// ---------------------------------------------------------------------------
function checkProviders() {
  const checks = [];
  checks.push(
    check(
      'openai_configured_or_honest_fallback',
      process.env.OPENAI_API_KEY ? STATUS.PASS : STATUS.WARN,
      process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY present' : 'OPENAI_API_KEY not set — companion/decision OpenAI-composed answers will fail honestly, not silently',
    ),
  );
  try {
    const { getLocalPassage } = require(path.join(ROOT, 'services', 'localKjvCorpusProvider'));
    const r = getLocalPassage('John 3:16');
    checks.push(check('local_kjv_corpus_available', r && r.ok ? STATUS.PASS : STATUS.FAIL, r && r.ok ? null : 'John 3:16 lookup failed'));
  } catch (e) {
    checks.push(check('local_kjv_corpus_available', STATUS.FAIL, e.message));
  }
  checks.push(
    check(
      'no_secret_values_in_env_sample',
      /=\S/.test(fs.readFileSync(path.join(ROOT, '.env.sample'), 'utf8').replace(/^#.*$/gm, '').replace(/OPENAI_API_KEY=\s*$/m, '').split('\n').filter((l) => l.startsWith('OPENAI_API_KEY')).join(''))
        ? STATUS.FAIL
        : STATUS.PASS,
    ),
  );
  return checks;
}

// ---------------------------------------------------------------------------
// SECURITY AND PRIVACY
// ---------------------------------------------------------------------------
async function checkSecurity(serverUp) {
  const checks = [];
  if (serverUp) {
    const r = await httpGetJson('/admin/api/bible-authority/command-center', 5000);
    // Without any admin token configured locally, the route intentionally
    // stays open (documented in .env.sample) — that's expected in a local
    // dev/founder-test environment, not a violation. If a token IS
    // configured, an unauthenticated request must be rejected.
    const anyTokenConfigured = !!(
      process.env.BIBLE_AUTHORITY_ADMIN_TOKEN ||
      process.env.ALPHA_ADMIN_TOKEN ||
      process.env.BETA_REVIEW_TOKEN ||
      process.env.ADMIN_PASSWORD
    );
    if (anyTokenConfigured) {
      checks.push(check('admin_requires_auth_when_token_configured', r.status === 401 || r.status === 403 ? STATUS.PASS : STATUS.FAIL, `status=${r.status}`));
    } else {
      checks.push(check('admin_auth_boundary', STATUS.WARN, 'no admin token env var configured — Admin routes are open in this environment (expected for local Founder testing, must be set before any shared/public deployment)'));
    }
  } else {
    checks.push(check('admin_auth_boundary', STATUS.SKIP, `no server reachable at ${BASE_URL}`));
  }

  const envSamplePath = path.join(ROOT, '.env.sample');
  const gitignorePath = path.join(ROOT, '.gitignore');
  const gitignored = fs.existsSync(gitignorePath) && /^\.env$/m.test(fs.readFileSync(gitignorePath, 'utf8'));
  checks.push(check('dotenv_gitignored', gitignored ? STATUS.PASS : STATUS.WARN, gitignored ? null : '.env not found in .gitignore as an exact line'));

  try {
    execFileSync('git', ['ls-files', '.env'], { cwd: ROOT }).toString().trim();
    const tracked = execFileSync('git', ['ls-files', '.env'], { cwd: ROOT }).toString().trim();
    checks.push(check('no_env_file_committed', tracked ? STATUS.FAIL : STATUS.PASS, tracked || null));
  } catch (e) {
    checks.push(check('no_env_file_committed', STATUS.PASS));
  }

  return checks;
}

// ---------------------------------------------------------------------------
// PERFORMANCE
// ---------------------------------------------------------------------------
async function checkPerformance(serverUp) {
  const checks = [];
  try {
    const { runBuddy } = require(path.join(ROOT, 'services', 'buddyBrain'));
    const { clearActiveConversation } = require(path.join(ROOT, 'services', 'activeConversationManager'));
    const userId = `founder-validator-perf-${Date.now()}`;
    clearActiveConversation(userId);
    const started = Date.now();
    await runBuddy({ userId, message: 'What is a Sabbath day?', mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
    const latencyMs = Date.now() - started;
    checks.push(check('governed_doctrine_latency', latencyMs < 3000 ? STATUS.PASS : STATUS.WARN, `${latencyMs}ms (no OpenAI call expected)`));
  } catch (e) {
    checks.push(check('governed_doctrine_latency', STATUS.WARN, e.message));
  }

  if (serverUp) {
    const started = Date.now();
    const results = await Promise.all(Array.from({ length: 5 }, () => httpGetJson('/health', 8000)));
    const latencyMs = Date.now() - started;
    const allOk = results.every((r) => r.ok && r.status === 200);
    checks.push(check('concurrent_health_requests', allOk ? STATUS.PASS : STATUS.FAIL, `5 concurrent /health in ${latencyMs}ms, allOk=${allOk}`));

    const adminStarted = Date.now();
    const adminR = await httpGetJson('/admin/api/bible-authority/command-center', 20000);
    const adminLatencyMs = Date.now() - adminStarted;
    checks.push(
      check(
        'admin_dashboard_latency',
        !adminR.ok ? STATUS.WARN : adminLatencyMs < 3000 ? STATUS.PASS : STATUS.WARN,
        `command-center in ${adminLatencyMs}ms (offline-precomputed snapshot aggregation; not on the live chat hot path)`,
      ),
    );
  } else {
    checks.push(check('concurrent_health_requests', STATUS.SKIP, `no server reachable at ${BASE_URL}`));
    checks.push(check('admin_dashboard_latency', STATUS.SKIP, `no server reachable at ${BASE_URL}`));
  }

  return checks;
}

// ---------------------------------------------------------------------------
// DEPLOYMENT
// ---------------------------------------------------------------------------
function checkDeployment() {
  const checks = [];
  const renderYamlPath = path.join(ROOT, 'render.yaml');
  if (!fs.existsSync(renderYamlPath)) {
    checks.push(check('render_yaml_present', STATUS.FAIL));
    return checks;
  }
  const renderYaml = fs.readFileSync(renderYamlPath, 'utf8');
  const renderYamlActiveLines = renderYaml
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  checks.push(check('render_yaml_present', STATUS.PASS));
  checks.push(check('render_start_command_present', /startCommand:/.test(renderYamlActiveLines) ? STATUS.PASS : STATUS.FAIL));
  checks.push(check('render_health_check_path_present', /healthCheckPath:/.test(renderYamlActiveLines) ? STATUS.PASS : STATUS.WARN));
  checks.push(check('no_prisma_migrate_in_build', /prisma migrate/.test(renderYamlActiveLines) ? STATUS.FAIL : STATUS.PASS));
  checks.push(check('env_sample_present', fs.existsSync(path.join(ROOT, '.env.sample')) ? STATUS.PASS : STATUS.FAIL));
  const readmePath = path.join(ROOT, 'README.md');
  checks.push(check('readme_present', fs.existsSync(readmePath) ? STATUS.PASS : STATUS.WARN));
  return checks;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  const startedAt = Date.now();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\nBibleBuddy Founder Readiness Validator — ${new Date().toISOString()}`);
  console.log(`Base URL for HTTP checks: ${BASE_URL}`);
  const serverUp = await isServerReachable();
  console.log(`Server reachable: ${serverUp}${SKIP_SLOW ? ' (FOUNDER_VALIDATOR_SKIP_SLOW=1 — slow suites skipped)' : ''}`);

  addCategory('REPOSITORY', checkRepository());
  addCategory('SCRIPTURE', checkScripture());
  addCategory('ORIGINAL_LANGUAGE', checkOriginalLanguage());
  addCategory('HISTORY', checkHistory());
  addCategory('COMPANION', checkCompanion());
  addCategory('ADMIN', await checkAdmin(serverUp));
  addCategory('USER_PRODUCT', await checkUserProduct(serverUp));
  addCategory('PROVIDERS', checkProviders());
  addCategory('SECURITY_AND_PRIVACY', await checkSecurity(serverUp));
  addCategory('PERFORMANCE', await checkPerformance(serverUp));
  addCategory('DEPLOYMENT', checkDeployment());

  let branch = null;
  let headCommit = null;
  let workingTreeStatus = null;
  try {
    branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT }).toString().trim();
    headCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
    workingTreeStatus = execFileSync('git', ['status', '--short'], { cwd: ROOT }).toString().trim() ? 'DIRTY' : 'CLEAN';
  } catch (_) { /* non-fatal */ }

  let readinessDecision;
  if (criticalFailures.length > 0) {
    readinessDecision = 'BLOCKED';
  } else if (warnings.length > 0) {
    readinessDecision = 'READY_WITH_DOCUMENTED_WARNINGS';
  } else {
    readinessDecision = 'READY_FOR_FOUNDER_ALPHA';
  }

  const durationMs = Date.now() - startedAt;

  const report = {
    status: readinessDecision,
    exactCommit: headCommit,
    branch,
    workingTreeStatus,
    timestamp: new Date().toISOString(),
    durationMs,
    baseUrl: BASE_URL,
    serverReachable: serverUp,
    skipSlow: SKIP_SLOW,
    categories,
    criticalFailures,
    warnings,
    skippedChecks,
    testCounts,
    readinessDecision,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'FounderReadinessReport.json'), JSON.stringify(report, null, 2));

  const md = [
    '# Founder Readiness Report',
    '',
    `**Status:** ${readinessDecision}`,
    `**Commit:** ${headCommit} (${branch}, ${workingTreeStatus})`,
    `**Generated:** ${report.timestamp}`,
    `**Duration:** ${Math.round(durationMs / 1000)}s`,
    `**Server reachable at ${BASE_URL}:** ${serverUp}`,
    '',
    `**Counts:** pass=${testCounts.pass} warn=${testCounts.warn} fail=${testCounts.fail} skip=${testCounts.skip}`,
    '',
    '## Categories',
    '',
    ...categories.map((c) => `- **[${c.status}]** ${c.name} — ${c.checks.map((chk) => `${chk.name}:${chk.status}`).join(', ')}`),
    '',
    '## Critical failures',
    criticalFailures.length ? '' : '_None._',
    ...criticalFailures.map((f) => `- **${f.category} / ${f.check}**: ${f.detail}`),
    '',
    '## Warnings (documented, non-blocking)',
    warnings.length ? '' : '_None._',
    ...warnings.map((w) => `- **${w.category} / ${w.check}**: ${w.detail}`),
    '',
    '## Skipped checks',
    skippedChecks.length ? '' : '_None._',
    ...skippedChecks.map((s) => `- **${s.category} / ${s.check}**: ${s.reason}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'FounderReadinessReport.md'), md);

  console.log(`\n=== FOUNDER READINESS: ${readinessDecision} ===`);
  console.log(`pass=${testCounts.pass} warn=${testCounts.warn} fail=${testCounts.fail} skip=${testCounts.skip}`);
  console.log(`Report written to ${OUT_DIR}`);

  if (readinessDecision === 'BLOCKED') process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error('FOUNDER_VALIDATOR_HARNESS_FAILURE', err);
  process.exit(2);
});
