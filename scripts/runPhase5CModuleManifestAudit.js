#!/usr/bin/env node
/**
 * Phase 5C — Audit live-path module manifest: require.resolve + git tracking.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5CModuleManifestAudit.json');

const MODULES = [
  'services/directAnswerFormatter.js',
  'services/bibleConceptConcordance.js',
  'services/bibleWideReasoningEngine.js',
  'services/userCorrectionMemory.js',
  'services/bibleCompanionOrchestrator.js',
  'services/bibleReasoningEngine.js',
  'services/bibleConceptGraph.js',
  'services/reflectionMemoryEngine.js',
  'services/companionStateEngine.js',
  'services/pendingQuestionResolver.js',
  'services/openAiFirstCompanionRuntime.js',
  'services/responseGuarantee.js',
  'services/buddyLivePathVerifier.js',
];

function gitTracked(relPath) {
  try {
    execSync(`git ls-files --error-unmatch "${relPath}"`, { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function gitOnOriginMain(relPath) {
  try {
    execSync(`git cat-file -e origin/main:"${relPath}"`, { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function resolveOk(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return { ok: false, error: 'file_missing_on_disk' };
  try {
    require.resolve(full);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

function tryRequire(relPath) {
  const full = path.join(ROOT, relPath);
  try {
    delete require.cache[require.resolve(full)];
    require(full);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

const results = MODULES.map((rel) => {
  const tracked = gitTracked(rel);
  const onOriginMain = gitOnOriginMain(rel);
  const resolved = resolveOk(rel);
  const loaded = tryRequire(rel);
  const pass = tracked && resolved.ok && loaded.ok;
  return {
    module: rel,
    pass,
    gitTracked: tracked,
    onOriginMain,
    resolveOk: resolved.ok,
    requireOk: loaded.ok,
    resolveError: resolved.error || null,
    requireError: loaded.error || null,
  };
});

const summary = {
  at: new Date().toISOString(),
  localHead: execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(),
  originMain: execSync('git rev-parse --short origin/main', { cwd: ROOT }).toString().trim(),
  total: results.length,
  pass: results.filter((r) => r.pass).length,
  fail: results.filter((r) => !r.pass).length,
  notOnOriginMain: results.filter((r) => !r.onOriginMain).map((r) => r.module),
  results,
};

fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2), 'utf8');

console.log(`Phase 5C module manifest: ${summary.pass}/${summary.total} pass`);
if (summary.notOnOriginMain.length) {
  console.log('NOT on origin/main:', summary.notOnOriginMain.join(', '));
}
for (const r of results.filter((x) => !x.pass)) {
  console.log(`FAIL ${r.module}: tracked=${r.gitTracked} origin=${r.onOriginMain} require=${r.requireError || r.resolveError}`);
}

process.exit(summary.fail > 0 ? 1 : 0);
