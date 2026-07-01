#!/usr/bin/env node
/**
 * Walk require() graph from OpenAI-first hot path roots.
 * Reports untracked or missing local modules.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const tracked = new Set(
  execSync('git ls-files', { cwd: ROOT })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
);

const HOT_ROOTS = [
  'routes/buddy.js',
  'services/buddyBrain.js',
  'services/openAiFirstCompanionRuntime.js',
  'services/reasonFirstComposer.js',
  'services/doctrineBoundaryValidator.js',
  'services/answerVerifier.js',
  'services/metaAnswerResponder.js',
];

const seen = new Set();
const edges = [];
const issues = [];

function resolveModule(fromFile, req) {
  if (!req.startsWith('.')) return null;
  const base = path.dirname(fromFile);
  let candidate = path.normalize(path.join(base, req));
  if (!candidate.endsWith('.js')) candidate += '.js';
  return candidate;
}

function gitPath(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function walk(fileRel) {
  const abs = path.join(ROOT, fileRel);
  if (seen.has(fileRel)) return;
  seen.add(fileRel);

  if (!fs.existsSync(abs)) {
    issues.push({ file: fileRel, status: 'missing_on_disk', risk: 'critical' });
    return;
  }

  if ((fileRel.startsWith('services/') || fileRel.startsWith('routes/')) && !tracked.has(fileRel)) {
    issues.push({ file: fileRel, status: 'untracked', risk: fileRel.includes('liveResponseCapture') ? 'low' : 'critical' });
  }

  const src = fs.readFileSync(abs, 'utf8');
  const re = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const req = m[1];
    if (!req.startsWith('.')) continue;
    const targetAbs = resolveModule(abs, req);
    if (!targetAbs) continue;
    const targetRel = gitPath(targetAbs);
    edges.push({ from: fileRel, to: targetRel, req });
    walk(targetRel);
  }
}

// buddyBrain runBuddy only loads openAiFirst — still walk full buddyBrain for require at load
HOT_ROOTS.forEach(walk);

const uniqueIssues = [...new Map(issues.map((i) => [i.file + i.status, i])).values()].sort((a, b) =>
  a.file.localeCompare(b.file)
);

const out = {
  ranAt: new Date().toISOString(),
  hotRoots: HOT_ROOTS,
  modulesVisited: seen.size,
  edgeCount: edges.length,
  issues: uniqueIssues,
  criticalUntracked: uniqueIssues.filter((i) => i.status === 'untracked' && i.risk === 'critical'),
  answerVerifierChain: edges.filter(
    (e) =>
      e.from.includes('answerVerifier') ||
      e.to.includes('answerVerifier') ||
      e.from.includes('doctrineBoundary') ||
      e.to.includes('metaAnswerResponder')
  ),
};

const OUT = path.join(ROOT, 'docs', 'regression-trace', 'openai-first-dependency-audit.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
