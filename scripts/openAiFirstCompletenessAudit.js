#!/usr/bin/env node
/**
 * Pre-deploy OpenAI-first runtime completeness audit.
 * Output: docs/regression-trace/openai-first-completeness-audit.json
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const tracked = new Set(
  execSync('git ls-files', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean)
);

const ENTRY_ROOTS = [
  'routes/buddy.js',
  'services/buddyBrain.js',
  'services/openAiFirstCompanionRuntime.js',
  'services/reasonFirstComposer.js',
  'services/doctrineBoundaryValidator.js',
];

const seen = new Set();
const edges = [];
const nodes = new Map();

function resolveModule(fromAbs, req) {
  if (!req.startsWith('.')) return null;
  const base = path.dirname(fromAbs);
  let candidate = path.normalize(path.join(base, req));
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    candidate = path.join(candidate, 'index.js');
  } else if (!candidate.endsWith('.js')) {
    if (fs.existsSync(candidate + '.js')) candidate += '.js';
    else if (fs.existsSync(path.join(candidate, 'index.js'))) candidate = path.join(candidate, 'index.js');
    else candidate += '.js';
  }
  return candidate;
}

function rel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function isRuntimeCritical(fileRel) {
  if (!fileRel.startsWith('services/') && !fileRel.startsWith('routes/')) return false;
  if (fileRel.startsWith('routes/')) return true;
  if (ENTRY_ROOTS.includes(fileRel)) return true;
  // reachable from entry roots via edges
  const targets = new Set(ENTRY_ROOTS);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (targets.has(e.from) && !targets.has(e.to)) {
        targets.add(e.to);
        changed = true;
      }
    }
  }
  return targets.has(fileRel);
}

function walk(fileRel) {
  const abs = path.join(ROOT, fileRel);
  if (seen.has(fileRel)) return;
  seen.add(fileRel);

  const exists = fs.existsSync(abs);
  const gitTracked = tracked.has(fileRel);
  const importedBy = [];

  if (!nodes.has(fileRel)) {
    nodes.set(fileRel, {
      file: fileRel,
      gitTracked,
      existsLocally: exists,
      importedBy: [],
      runtimeCritical: false,
      deployBlocker: false,
      blockerReason: null,
    });
  }

  if (!exists) {
    const n = nodes.get(fileRel);
    n.deployBlocker = isRuntimeCritical(fileRel) || ENTRY_ROOTS.includes(fileRel);
    n.blockerReason = 'missing_on_disk';
    return;
  }

  if ((fileRel.startsWith('services/') || fileRel.startsWith('routes/')) && !gitTracked) {
    const n = nodes.get(fileRel);
    n.deployBlocker = true;
    n.blockerReason = 'untracked';
  }

  const src = fs.readFileSync(abs, 'utf8');
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const req = m[1];
    if (!req.startsWith('.')) continue;
    const targetAbs = resolveModule(abs, req);
    if (!targetAbs) continue;
    const targetRel = rel(targetAbs);
    edges.push({ from: fileRel, to: targetRel, req });
    walk(targetRel);
  }
}

ENTRY_ROOTS.forEach(walk);

// backfill importedBy + runtimeCritical
for (const e of edges) {
  const n = nodes.get(e.to);
  if (n && !n.importedBy.includes(e.from)) n.importedBy.push(e.from);
}

for (const [fileRel, n] of nodes) {
  n.runtimeCritical = isRuntimeCritical(fileRel);
  if (n.runtimeCritical && (!n.existsLocally || !n.gitTracked)) {
    n.deployBlocker = true;
    n.blockerReason = n.blockerReason || (!n.existsLocally ? 'missing_on_disk' : 'untracked');
  }
}

const allNodes = [...nodes.values()].sort((a, b) => a.file.localeCompare(b.file));
const deployBlockers = allNodes.filter((n) => n.deployBlocker);
const untracked = allNodes.filter((n) => n.existsLocally && !n.gitTracked && (n.file.startsWith('services/') || n.file.startsWith('routes/')));
const missing = allNodes.filter((n) => !n.existsLocally);
const trackedNodes = allNodes.filter((n) => n.gitTracked);
const criticalUntracked = allNodes.filter((n) => n.runtimeCritical && n.existsLocally && !n.gitTracked);
const criticalMissing = allNodes.filter((n) => n.runtimeCritical && !n.existsLocally);

const out = {
  ranAt: new Date().toISOString(),
  entryRoots: ENTRY_ROOTS,
  totals: {
    modules: allNodes.length,
    tracked: trackedNodes.length,
    untracked: untracked.length,
    missingOnDisk: missing.length,
    runtimeCritical: allNodes.filter((n) => n.runtimeCritical).length,
    deployBlockers: deployBlockers.length,
  },
  deployBlockers,
  criticalUntracked,
  criticalMissing,
  requiredForRenderParity: criticalUntracked.map((n) => n.file).sort(),
  nodes: allNodes,
  edges,
};

const OUT = path.join(ROOT, 'docs', 'regression-trace', 'openai-first-completeness-audit.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ totals: out.totals, deployBlockers: out.deployBlockers, requiredForRenderParity: out.requiredForRenderParity }, null, 2));
