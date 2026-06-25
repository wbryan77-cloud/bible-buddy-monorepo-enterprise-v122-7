const fs = require('fs');
const cp = require('child_process');

function run(cmd) {
  try {
    cp.execSync(cmd, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.stdout || e.stderr || e.message) };
  }
}

function exists(path) {
  return fs.existsSync(path);
}

const requiredFiles = [
  'docs/BIBLEBUDDY_ENTERPRISE_HANDBOOK.md',
  'services/turnIntentOwner.js',
  'services/companionCore.js',
  'services/architectureDecisionGate.js',
];

const requiredText = [
  'Scripture owns truth',
  'One companion speaks',
  'Historical',
  'Do not add another owner',
  'Line upon line',
  'Precept upon precept',
];

const handbook = exists('docs/BIBLEBUDDY_ENTERPRISE_HANDBOOK.md')
  ? fs.readFileSync('docs/BIBLEBUDDY_ENTERPRISE_HANDBOOK.md', 'utf8')
  : '';

const missingFiles = requiredFiles.filter((f) => !exists(f));
const missingText = requiredText.filter((t) => !handbook.includes(t));

const syntax = run(`find services routes scripts -name "*.js" -not -path "*/node_modules/*" -print0 | xargs -0 -n1 node --check`);

const regressions = [
  ['Architecture Decision Gate', 'node scripts/runArchitectureDecisionGate.js'],
  ['Turn Intent', 'node scripts/runPhase5R1TurnIntentRegression.js'],
  ['Companion Core', 'node scripts/runPhase6CompanionCoreRegression.js'],
  ['Architecture Consolidation', 'node scripts/runPhase6ArchitectureConsolidationRegression.js'],
].map(([name, cmd]) => ({ name, ...run(cmd) }));

const hardFailures = [
  missingFiles.length ? `Missing files: ${missingFiles.join(', ')}` : null,
  missingText.length ? `Missing handbook principles: ${missingText.join(', ')}` : null,
  !syntax.ok ? 'JavaScript syntax gate failed' : null,
  ...regressions.filter((r) => !r.ok).map((r) => `${r.name} failed`),
].filter(Boolean);

console.table([
  { check: 'required_files', passed: missingFiles.length === 0 },
  { check: 'handbook_principles', passed: missingText.length === 0 },
  { check: 'syntax_gate', passed: syntax.ok },
  ...regressions.map((r) => ({ check: r.name, passed: r.ok })),
]);

if (hardFailures.length) {
  console.error('Enterprise Stabilization Gate FAILED:', hardFailures);
  process.exit(1);
}

console.log('Enterprise Stabilization Gate PASS');
