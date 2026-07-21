'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCAN_ROOTS = [
  'services',
  'routes',
  'scripts',
];

const IGNORE_PARTS = [
  'node_modules',
  '.git',
  'docs/alpha',
];

const ENTRY_FILES = [
  'routes/buddy.js',
  'services/buddyBrain.js',
  'services/openAiFirstCompanionRuntime.js',
  'services/bibleCompanionOrchestrator.js',
  'services/bibleWideReasoningEngine.js',
  'services/strictDoctrineGate.js',
  'services/liveResponseOwner.js',
  'services/singleCompanionContract.js',
];

const OWNERSHIP_SYMBOLS = [
  'runBuddy',
  'runOpenAiFirstCompanionRuntime',
  'runBibleCompanionOrchestrator',
  'runStrictDoctrineGate',
  'buildBibleWideAnswer',
  'resolveConceptForMessage',
  'buildConnectionErrorReply',
  'finalizeBuddyResponse',
  'finalizeLiveResponse',
  'enforceSingleCompanionContract',
];

const RUNTIME_NAME_RE =
  /(runtime|orchestrator|dispatcher|router|owner|fallback|responder|composer|contract)/i;

const EXPERIMENT_RE =
  /(experiment|shadow|legacy|deprecated|old|backup|prototype|lite|migration)/i;

function normalize(file) {
  return file.split(path.sep).join('/');
}

function shouldIgnore(file) {
  return IGNORE_PARTS.some((part) => normalize(file).includes(part));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const found = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (shouldIgnore(full)) continue;

    if (entry.isDirectory()) {
      found.push(...walk(full));
    } else if (entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name)) {
      found.push(full);
    }
  }

  return found;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function relative(file) {
  return normalize(path.relative(ROOT, file));
}

function resolveLocalImport(fromFile, request) {
  if (!request.startsWith('.')) return null;

  const base = path.resolve(path.dirname(fromFile), request);

  const candidates = [
    base,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.mjs`,
    path.join(base, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return relative(candidate);
    }
  }

  return null;
}

function importsFor(file, source) {
  const requests = [];

  const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  const importRe =
    /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g;

  for (const regex of [requireRe, importRe]) {
    let match;

    while ((match = regex.exec(source)) !== null) {
      requests.push(match[1]);
    }
  }

  return [...new Set(requests)]
    .map((request) => ({
      request,
      resolved: resolveLocalImport(file, request),
    }));
}

function exportedSymbols(source) {
  const symbols = new Set();

  const directExports =
    /(?:module\.exports\.(\w+)|exports\.(\w+))\s*=/g;

  let match;

  while ((match = directExports.exec(source)) !== null) {
    symbols.add(match[1] || match[2]);
  }

  const objectExport =
    /module\.exports\s*=\s*\{([\s\S]*?)\}\s*;/g;

  while ((match = objectExport.exec(source)) !== null) {
    const body = match[1];

    for (const token of body.split(',')) {
      const name = token
        .trim()
        .split(':')[0]
        .trim();

      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
        symbols.add(name);
      }
    }
  }

  return [...symbols].sort();
}

function symbolOccurrences(source, symbol) {
  const regex = new RegExp(`\\b${symbol}\\b`, 'g');
  return [...source.matchAll(regex)].length;
}

const files = SCAN_ROOTS
  .flatMap((root) => walk(path.join(ROOT, root)))
  .sort();

const records = [];

for (const file of files) {
  const source = read(file);

  records.push({
    file: relative(file),
    imports: importsFor(file, source),
    exports: exportedSymbols(source),
    lines: source.split('\n').length,
    runtimeLike: RUNTIME_NAME_RE.test(path.basename(file)),
    experimentLike: EXPERIMENT_RE.test(path.basename(file)),
    symbols: Object.fromEntries(
      OWNERSHIP_SYMBOLS.map((symbol) => [
        symbol,
        symbolOccurrences(source, symbol),
      ])
    ),
  });
}

const reverseImports = {};

for (const record of records) {
  for (const item of record.imports) {
    if (!item.resolved) continue;

    reverseImports[item.resolved] ||= [];
    reverseImports[item.resolved].push(record.file);
  }
}

for (const key of Object.keys(reverseImports)) {
  reverseImports[key] = [...new Set(reverseImports[key])].sort();
}

const entryReachable = new Set();
const queue = ENTRY_FILES.filter((file) =>
  records.some((record) => record.file === file)
);

while (queue.length) {
  const current = queue.shift();

  if (entryReachable.has(current)) continue;

  entryReachable.add(current);

  const record = records.find((item) => item.file === current);
  if (!record) continue;

  for (const item of record.imports) {
    if (
      item.resolved &&
      !entryReachable.has(item.resolved)
    ) {
      queue.push(item.resolved);
    }
  }
}

const runtimeCandidates = records
  .filter((record) => record.runtimeLike)
  .map((record) => ({
    file: record.file,
    callers: reverseImports[record.file] || [],
    reachableFromCertifiedEntries:
      entryReachable.has(record.file),
    experimentLike: record.experimentLike,
  }));

const dormantCandidates = runtimeCandidates
  .filter(
    (item) =>
      !item.reachableFromCertifiedEntries &&
      item.callers.length === 0
  )
  .map((item) => item.file);

const disconnectedCandidates = runtimeCandidates
  .filter(
    (item) =>
      !item.reachableFromCertifiedEntries &&
      item.callers.length > 0
  )
  .map((item) => ({
    file: item.file,
    callers: item.callers,
  }));

const symbolOwners = {};

for (const symbol of OWNERSHIP_SYMBOLS) {
  symbolOwners[symbol] = records
    .filter((record) => record.symbols[symbol] > 0)
    .map((record) => ({
      file: record.file,
      occurrences: record.symbols[symbol],
      exported: record.exports.includes(symbol),
    }));
}

const expectedChain = [
  'routes/buddy.js',
  'services/buddyBrain.js',
  'services/openAiFirstCompanionRuntime.js',
  'services/bibleCompanionOrchestrator.js',
  'services/bibleWideReasoningEngine.js',
  'services/liveResponseOwner.js',
  'services/singleCompanionContract.js',
];

const expectedChainStatus = expectedChain.map((file) => ({
  file,
  exists: records.some((record) => record.file === file),
  callers: reverseImports[file] || [],
  reachableFromCertifiedEntries: entryReachable.has(file),
}));

const output = {
  generatedAt: new Date().toISOString(),
  repositoryRoot: ROOT,
  scannedFileCount: records.length,
  architecture: {
    permanentBoundaries: [
      'conversation_ownership',
      'authority_domain_ownership',
      'specialist_execution_ownership',
      'optional_composition_ownership',
      'final_response_ownership',
    ],
    authorityDomains: [
      'SAFETY',
      'SCRIPTURE',
      'COMPANION',
    ],
    constitutionalRules: [
      'one_turn_one_owner',
      'scripture_owns_scripture_questions',
      'openai_assists_composition_only',
      'one_final_response_owner',
      'no_new_owner_to_fix_owner_conflict',
    ],
  },
  expectedChainStatus,
  symbolOwners,
  runtimeCandidates,
  dormantCandidates,
  disconnectedCandidates,
  reverseImports,
  files: records,
};

const outArg =
  process.argv[2] ||
  path.join(
    ROOT,
    'docs/architecture/live-ownership-audit.json'
  );

fs.mkdirSync(path.dirname(outArg), { recursive: true });
fs.writeFileSync(
  outArg,
  JSON.stringify(output, null, 2) + '\n'
);

const markdownPath = outArg.replace(/\.json$/i, '.md');

const md = [];

md.push('# BibleBuddy Live Ownership Audit');
md.push('');
md.push(`Generated: ${output.generatedAt}`);
md.push('');
md.push(`Scanned JavaScript files: ${records.length}`);
md.push('');
md.push('## Expected live ownership chain');
md.push('');
md.push('| File | Exists | Reachable | Direct callers |');
md.push('|---|---:|---:|---|');

for (const item of expectedChainStatus) {
  md.push(
    `| ${item.file} | ${item.exists ? 'yes' : 'no'} | ` +
      `${item.reachableFromCertifiedEntries ? 'yes' : 'no'} | ` +
      `${item.callers.join(', ') || 'none'} |`
  );
}

md.push('');
md.push('## Ownership symbols');
md.push('');

for (const [symbol, owners] of Object.entries(symbolOwners)) {
  md.push(`### ${symbol}`);
  md.push('');

  if (!owners.length) {
    md.push('- Not found');
  } else {
    for (const owner of owners) {
      md.push(
        `- ${owner.file} — occurrences=${owner.occurrences}, ` +
          `exported=${owner.exported}`
      );
    }
  }

  md.push('');
}

md.push('## Dormant runtime candidates');
md.push('');

if (!dormantCandidates.length) {
  md.push('- None identified by static import analysis.');
} else {
  for (const file of dormantCandidates) {
    md.push(`- ${file}`);
  }
}

md.push('');
md.push('## Disconnected runtime candidates');
md.push('');

if (!disconnectedCandidates.length) {
  md.push('- None identified by static import analysis.');
} else {
  for (const item of disconnectedCandidates) {
    md.push(
      `- ${item.file} — callers: ${item.callers.join(', ')}`
    );
  }
}

md.push('');
md.push('## Important limitation');
md.push('');
md.push(
  'This is a static CommonJS/ES-module ownership map. Dynamic imports, ' +
    'runtime string-based loading, environment-gated paths, and reflection ' +
    'must be verified through execution traces before deletion.'
);

fs.writeFileSync(markdownPath, md.join('\n') + '\n');

console.log(JSON.stringify({
  json: outArg,
  markdown: markdownPath,
  scannedFiles: records.length,
  runtimeCandidates: runtimeCandidates.length,
  dormantCandidates: dormantCandidates.length,
  disconnectedCandidates: disconnectedCandidates.length,
}, null, 2));