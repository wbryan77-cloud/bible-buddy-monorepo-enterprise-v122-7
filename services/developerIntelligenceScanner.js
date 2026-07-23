/**
 * PHASE_3_AUTONOMOUS_OPERATIONS — Developer Intelligence (objective 7).
 *
 * Three read-only, evidence-based scans — no prior service in this
 * codebase does any of these (confirmed during exploration: the closest
 * things are static, one-time audit documents written by hand in earlier
 * sessions, e.g. docs/alpha/consolidation/DuplicateLogicInventory.txt).
 * This module makes "check for drift" a repeatable, on-demand capability
 * instead of a one-off manual audit, and explicitly cites those prior
 * audits rather than re-deriving their conclusions from scratch.
 *
 * 1. Outdated dependencies — via a real `npm outdated --json` call (not a
 *    guess), gracefully degrading to "unavailable" if npm/network access
 *    is not permitted in a given environment.
 * 2. Possibly-unused services — a heuristic: for each services/*.js file,
 *    count how many OTHER tracked files `require(...)` it (by relative
 *    path substring). Zero references does NOT mean "safe to delete" —
 *    it means "verify before removing" (dynamic requires, route mounting
 *    strings, and test-only usage can all evade a static grep). Framed
 *    as a lead for a human to check, not a verdict.
 * 3. Known architectural drift / duplicate-logic findings — cites the
 *    prior manual audits by path rather than re-scanning (they already
 *    did deeper, human-reviewed analysis of this exact question) so this
 *    module doesn't produce a second, possibly-conflicting answer.
 *
 * Read-only. Never modifies a dependency, deletes a file, or refactors
 * anything — every finding is a recommendation for a human to evaluate.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

function scanOutdatedDependencies() {
  try {
    const raw = execFileSync('npm', ['outdated', '--json'], { cwd: REPO_ROOT, timeout: 20000, encoding: 'utf8' });
    return { ok: true, packages: JSON.parse(raw || '{}') };
  } catch (e) {
    // `npm outdated` exits 1 when it finds outdated packages — this is
    // normal, expected output, not a failure; stdout still has the JSON.
    if (e.stdout) {
      try {
        return { ok: true, packages: JSON.parse(e.stdout) };
      } catch (_) { /* fall through to unavailable */ }
    }
    return { ok: false, error: e.message, note: 'npm outdated could not be run in this environment (no network access or npm unavailable) — this finding is unavailable, not "no outdated packages."' };
  }
}

function classifyDependencyRisk(pkg) {
  const [currentMajor] = String(pkg.current || pkg.wanted || '0').split('.');
  const [latestMajor] = String(pkg.latest || '0').split('.');
  if (!pkg.current) return 'NOT_INSTALLED';
  if (Number(latestMajor) > Number(currentMajor)) return 'MAJOR_BEHIND';
  if (pkg.current !== pkg.wanted) return 'MINOR_BEHIND';
  return 'PATCH_BEHIND';
}

function listServiceFiles() {
  const dir = path.join(REPO_ROOT, 'services');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(dir, f));
}

function countReferences(baseName, allFiles, selfPath) {
  let count = 0;
  for (const filePath of allFiles) {
    if (filePath === selfPath) continue;
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch (_) { continue; }
    // Matches require('./foo'), require('../services/foo'), require("services/foo"), etc.
    const pattern = new RegExp(`require\\(['"][^'"]*${baseName}['"]\\)`);
    if (pattern.test(content)) count += 1;
  }
  return count;
}

function scanUnusedServices({ maxFilesToScan = 2000 } = {}) {
  const serviceFiles = listServiceFiles();
  const allJsFiles = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js') && allJsFiles.length < maxFilesToScan) allJsFiles.push(full);
    }
  };
  walk(REPO_ROOT);

  const findings = [];
  for (const filePath of serviceFiles) {
    const baseName = path.basename(filePath, '.js');
    const refCount = countReferences(baseName, allJsFiles, filePath);
    if (refCount === 0) {
      findings.push({
        file: path.relative(REPO_ROOT, filePath),
        referenceCount: 0,
        note: 'No static require() reference found anywhere else in the tracked .js tree. May still be used via a dynamic path, a route-mounting string, or a test — verify manually before removing.',
      });
    }
  }
  return { ok: true, scannedServiceFiles: serviceFiles.length, scannedTotalFiles: allJsFiles.length, findings };
}

/**
 * Cites, rather than re-derives, the prior human-reviewed audits. If those
 * files are missing (e.g. cleaned up later), this degrades to "unavailable"
 * rather than fabricating a fresh conclusion.
 */
function citeKnownArchitecturalDrift() {
  const candidates = [
    { path: 'docs/alpha/consolidation/batch-2b/DuplicateLogicConsolidation.md', summary: 'Identifies canonical owners for companion-routing logic (humanNeedDetector, companionDoctrineRouter, bibleReasoningEngine) and flags several reason-first runtime variants as fallback-only duplicates.' },
    { path: 'docs/alpha/enterprise-architecture-review-20260722-141700/01-EnterpriseArchitectureReviewReport.md', summary: 'Flags V1/V2 near-duplicate services, five reason-first runtime variants, overlapping reasoning engines, unused Prisma/Redis scaffolding, and docs sprawl as the primary technical debt.' },
    { path: 'docs/alpha/phase1b-enterprise-operations/13-ScalabilityAndPersistenceImplementation.md', summary: '(This engagement, Phase 2) ~20 authoritative file-based conversation-memory stores share the same unprotected read-mutate-write pattern — a live architectural-drift finding with a migration runbook, not yet fully executed.' },
  ];
  return candidates
    .map((c) => ({ ...c, exists: fs.existsSync(path.join(REPO_ROOT, c.path)) }))
    .filter((c) => c.exists);
}

function buildDeveloperIntelligenceReport() {
  const deps = scanOutdatedDependencies();
  const depFindings = deps.ok
    ? Object.entries(deps.packages).map(([name, info]) => ({ name, ...info, risk: classifyDependencyRisk(info) }))
    : [];
  const unused = scanUnusedServices();
  const drift = citeKnownArchitecturalDrift();

  return {
    generatedAt: new Date().toISOString(),
    outdatedDependencies: {
      available: deps.ok,
      error: deps.ok ? null : deps.error,
      note: deps.ok ? null : deps.note,
      count: depFindings.length,
      majorBehindCount: depFindings.filter((d) => d.risk === 'MAJOR_BEHIND').length,
      findings: depFindings,
    },
    possiblyUnusedServices: unused,
    architecturalDrift: {
      knownFindings: drift,
      note: 'These cite prior human-reviewed audits rather than re-deriving conclusions — see each path for full detail.',
    },
    requiredApproval: true,
    note: 'Every finding above is a recommendation for a human engineer to evaluate. Nothing here modifies a dependency, deletes a file, or changes any code.',
  };
}

module.exports = {
  scanOutdatedDependencies,
  scanUnusedServices,
  citeKnownArchitecturalDrift,
  buildDeveloperIntelligenceReport,
};
