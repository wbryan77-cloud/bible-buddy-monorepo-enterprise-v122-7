const fs = require('fs');
const cp = require('child_process');

const target = process.argv[2];
const name = process.argv[3] || 'legacy_block';

if (!target || !fs.existsSync(target)) {
  console.error('Usage: node scripts/safeRetireLegacyBlock.js <target-file> <name>');
  process.exit(1);
}

const original = fs.readFileSync(target, 'utf8');
const backup = `/tmp/biblebuddy-runtime-backups/${target.replace(/[\/]/g, '_')}.${Date.now()}.bak`;
fs.writeFileSync(backup, original);

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = null;
  let escape = false;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function run(cmd) {
  cp.execSync(cmd, { stdio: 'inherit' });
}

const requiredNeedles = [
  'buildRouteOwnershipTrace(',
  'logRouteOwnership(routeOwnership)',
  "console.warn('liveResponseOwner finalize skipped:'",
];

let candidate = null;
let searchFrom = 0;

while (true) {
  const tryIndex = original.indexOf('try', searchFrom);
  if (tryIndex === -1) break;

  const openTry = original.indexOf('{', tryIndex);
  if (openTry === -1) break;

  const closeTry = findMatchingBrace(original, openTry);
  if (closeTry === -1) break;

  const catchIndex = original.indexOf('catch', closeTry);
  if (catchIndex === -1) {
    searchFrom = closeTry + 1;
    continue;
  }

  const openCatch = original.indexOf('{', catchIndex);
  if (openCatch === -1) break;

  const closeCatch = findMatchingBrace(original, openCatch);
  if (closeCatch === -1) break;

  const block = original.slice(tryIndex, closeCatch + 1);

  const hasAll = requiredNeedles.every((needle) => block.includes(needle));
  const appearsLoggingOnly =
    block.includes('const routeOwnership = buildRouteOwnershipTrace({') &&
    block.includes('logRouteOwnership(routeOwnership);') &&
    block.includes("console.warn('liveResponseOwner finalize skipped:', liveOwnerErr.message);") &&
    !/\breturn\b/.test(block) &&
    !/\bthrow\b/.test(block) &&
    !/\breply\s*=/.test(block) &&
    !/\bselectedReturn\s*=/.test(block) &&
    !/\bruntimeResponse\s*=/.test(block);

  if (hasAll && appearsLoggingOnly) {
    if (candidate) {
      console.error('More than one matching legacy block found. Refusing to modify.');
      process.exit(1);
    }
    candidate = { start: tryIndex, end: closeCatch + 1, block };
  }

  searchFrom = closeCatch + 1;
}

if (!candidate) {
  console.error('No safe logging-only legacy block found. No changes made.');
  process.exit(1);
}

console.log(`Found safe legacy block for retirement: ${name}`);
console.log('--- BLOCK PREVIEW START ---');
console.log(candidate.block.slice(0, 1200));
console.log('--- BLOCK PREVIEW END ---');

let updated = original.slice(0, candidate.start) + '\n' + original.slice(candidate.end);

updated = updated.replace(
  "const { buildRouteOwnershipTrace, logRouteOwnership } = require('./liveRequestTrace');\n",
  ''
);
updated = updated.replace(
  "const { logRouteOwnership } = require('./liveRequestTrace');\n",
  ''
);

fs.writeFileSync(target, updated);

try {
  run(`node --check ${target}`);
  run('node scripts/runEnterpriseStabilizationGate.js');
  run('node scripts/runPhase5OContinuationRegression.js');
  run('node scripts/runPhase5QRevisionRegression.js');
} catch (err) {
  console.error('Validation failed. Restoring backup.');
  fs.writeFileSync(target, original);
  process.exit(1);
}

const finalText = fs.readFileSync(target, 'utf8');
if (
  finalText.includes('liveResponseOwner finalize skipped') ||
  finalText.includes('buildRouteOwnershipTrace(') ||
  finalText.includes('logRouteOwnership(routeOwnership)')
) {
  console.error('Legacy ownership trace references still present. Restoring backup.');
  fs.writeFileSync(target, original);
  process.exit(1);
}

console.log('Safe retirement PASS.');
console.log(`Backup saved at: ${backup}`);
