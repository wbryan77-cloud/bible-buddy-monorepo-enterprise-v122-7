/**
 * Phase 4C.1 — Evidence source audit, runtime stability audit, doctrine strict logging.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJsonSafe(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

function listEvidenceCards() {
  const dir = path.join(ROOT, 'services/evidenceCards');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.card.js'));
  const cards = [];
  for (const f of files) {
    try {
      const card = require(path.join(dir, f));
      cards.push({
        file: f,
        topic: card.topic,
        cardId: card.cardId,
        primary: card.primaryScriptures || [],
        supporting: card.supportingScriptures || [],
        caution: card.cautionPassages || [],
      });
    } catch {
      cards.push({ file: f, error: 'load_failed' });
    }
  }
  return cards;
}

function grepInFile(relPath, pattern) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return [];
  const text = fs.readFileSync(full, 'utf8');
  const re = new RegExp(pattern, 'gi');
  const hits = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    hits.push(m[0]);
  }
  return hits;
}

function scanRepoPatterns(patterns = []) {
  const results = {};
  const searchRoots = ['services', 'scripts', 'docs/evidence-candidates'];
  for (const pat of patterns) {
    results[pat] = [];
    for (const root of searchRoots) {
      const base = path.join(ROOT, root);
      if (!fs.existsSync(base)) continue;
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== 'node_modules') walk(p);
          else if (entry.isFile() && /\.(js|json|md)$/.test(entry.name)) {
            const rel = path.relative(ROOT, p);
            const hits = grepInFile(rel, pat);
            if (hits.length) results[pat].push({ file: rel, count: hits.length });
          }
        }
      };
      walk(base);
    }
  }
  return results;
}

function runEvidenceSourceAudit() {
  const cards = listEvidenceCards();
  const masterPacks = readJsonSafe('docs/evidence-candidates/master-topic-packs.json');
  const approvalPacks = readJsonSafe('docs/evidence-candidates/topic-approval-packs.json');
  const relationshipGraph = readJsonSafe('docs/evidence-candidates/relationship-graph.json');
  const observedLib = readJsonSafe('docs/evidence-candidates/ObservedRelationshipLibrary.json');
  const traceability = readJsonSafe('docs/evidence-candidates/scripture-traceability-index.json');
  const vineReport = readJsonSafe('docs/evidence-candidates/scripture-vine-growth-report.json');
  const phase4a4 = readJsonSafe('docs/evidence-candidates/Phase4A4GovernanceActivationReport.json');
  const phase4b = readJsonSafe('docs/evidence-candidates/phase4b/phase4b-validation-results.json');

  const strictTopics = [
    'death_state',
    'dietary_law',
    'sabbath',
    'acts_10',
    'kingdom',
    'resurrection',
    'holy_spirit',
    'david',
    'new_jerusalem',
    'heavens',
    'heaven',
  ];

  const deathMappings = [];
  const dietaryMappings = [];
  const luke16Refs = [];

  for (const c of cards) {
    if (c.topic === 'death_state') deathMappings.push(`evidence card ${c.file}`);
    if (c.topic === 'dietary_law') dietaryMappings.push(`evidence card ${c.file}`);
    for (const ref of [...(c.primary || []), ...(c.supporting || []), ...(c.caution || [])]) {
      if (/luke\s*16/i.test(ref)) luke16Refs.push({ source: c.file, ref });
    }
  }

  const retrievalDeath = grepInFile('services/retrievalEvidencePack.js', 'death_state');
  const parablesCatalog = fs.existsSync(path.join(ROOT, 'services/parablesReferenceCatalog.js'));

  let observedAsDoctrineRisk = false;
  if (observedLib && Array.isArray(observedLib.relationships)) {
    observedAsDoctrineRisk = observedLib.relationships.some(
      (r) => r.usedAsDoctrine || r.doctrineAuthority,
    );
  }

  let candidateLeakRisk = false;
  if (relationshipGraph && Array.isArray(relationshipGraph.candidateRelationships)) {
    candidateLeakRisk = relationshipGraph.candidateRelationships.length > 0;
  }

  const lines = [
    '# Phase 4C.1 Evidence Source Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Strict doctrine topics (runtime contract)',
    strictTopics.map((t) => `- ${t}`).join('\n'),
    '',
    '## Evidence card inventory',
    '',
    '| Card | Topic | Primary count | Caution count |',
    '|------|-------|---------------|---------------|',
    ...cards.map(
      (c) =>
        `| ${c.file || c.cardId || '?'} | ${c.topic || '—'} | ${(c.primary || []).length} | ${(c.caution || []).length} |`,
    ),
    '',
    '## death_state mapping',
    `- retrievalEvidencePack TOPIC_TO_CHAIN maps death_state → resurrection chain (${retrievalDeath.length} refs in pack file)`,
    ...deathMappings.map((m) => `- ${m}`),
    '',
    '## dietary_law mapping',
    ...dietaryMappings.map((m) => `- ${m}`),
  ];

  if (masterPacks) lines.push(`- master-topic-packs.json topics: ${Object.keys(masterPacks).length}`);
  if (approvalPacks) lines.push(`- topic-approval-packs.json entries: ${Object.keys(approvalPacks).length}`);

  lines.push('', '## Luke 16 appearances');
  if (luke16Refs.length === 0) {
    lines.push('- Luke 16 not listed in evidence card scripture lists (contract adds caution witnesses for death_state)');
  } else {
    for (const r of luke16Refs) lines.push(`- ${r.source}: ${r.ref}`);
  }

  lines.push('', '## Parables catalog');
  lines.push(parablesCatalog ? '- parablesReferenceCatalog.js present — parables can surface via catalog hints' : '- no parablesReferenceCatalog.js');

  lines.push('', '## Observed / candidate relationship doctrine risk');
  lines.push(`- Observed relationships flagged as doctrine authority in library: ${observedAsDoctrineRisk}`);
  lines.push(`- Candidate relationships present in graph: ${candidateLeakRisk}`);
  lines.push('- Runtime Phase 4C.1 contract blocks observed/candidate relationships as doctrine authority');

  lines.push('', '## Corpus artifacts');
  lines.push(`- scripture-traceability-index: ${traceability ? 'present' : 'missing'}`);
  lines.push(`- scripture-vine-growth-report: ${vineReport ? 'present' : 'missing'}`);
  lines.push(`- Phase4A4GovernanceActivationReport: ${phase4a4 ? 'present' : 'missing'}`);
  lines.push(`- phase4b-validation-results: ${phase4b ? 'present' : 'missing'}`);

  lines.push('', '## Recommended source priority fixes');
  lines.push('1. Keep doctrine authority on approved evidence cards + contract witnesses (implemented in doctrineAuthorityContract.js)');
  lines.push('2. death_state retrieval still aliases resurrection chain — contract overrides with explicit death_state witnesses');
  lines.push('3. Add Luke 16 to deathState.card cautionPassages in a future corpus phase (not 4C.1 — cards frozen)');
  lines.push('4. Ensure discovery reinforcement never promotes candidate edges to doctrine (validator enforces)');
  lines.push('5. Parables catalog should remain navigation-only; strict validator rejects parable-as-primary-proof');

  return lines.join('\n');
}

function runRenderStabilityAudit() {
  const patterns = [
    'core_connection_error',
    'buildConnectionErrorReplyUsed',
    'openai_unavailable',
    'OpenAIAuthError',
    'correctionRepair',
    'fallbackUsed',
    'regenerated',
    'maxAttempts',
    'timeout',
    'AbortController',
    'memoryUsage',
    'heapUsedMB',
    'rssMB',
  ];

  const scan = scanRepoPatterns(patterns);

  const lines = [
    '# Phase 4C.1 Render Runtime Stability Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Pattern scan (services + scripts + docs/evidence-candidates)',
    '',
  ];

  for (const [pat, hits] of Object.entries(scan)) {
    lines.push(`### ${pat}`);
    if (!hits.length) lines.push('- not found');
    else hits.slice(0, 8).forEach((h) => lines.push(`- ${h.file} (${h.count} hits)`));
    if (hits.length > 8) lines.push(`- ... ${hits.length - 8} more files`);
    lines.push('');
  }

  lines.push('## Stability checklist');
  lines.push('1. Correction pressure → guard regen can add OpenAI attempts; Phase 4C.1 adds max one doctrine strict regen');
  lines.push('2. Validator regeneration capped at one per strict doctrine answer (doctrineStrictRegenerated flag)');
  lines.push('3. Failed validation returns safe corpus answer — not repeated connection_error loops');
  lines.push('4. OpenAI timeout added via OPENAI_TIMEOUT_MS in reasonFirstComposer.callOpenAI');
  lines.push('5. Render memory: requestMemoryLogger logs heap/rss; evidence pack size tracked in runtime');
  lines.push('6. buddy route uses try/catch in finalize path; doctrine validation failures are non-fatal');
  lines.push('7. Safe corpus fallback on OpenAI failure when doctrineStrict enabled');
  lines.push('8. logDoctrineStrictFailure writes structured JSONL diagnostics');
  lines.push('9. openaiAttempts cap flag at >2 attempts');
  lines.push('10. Orb state defaults from structured reply; connection_error path sets speaking state');

  return lines.join('\n');
}

function logDoctrineStrictFailure(entry = {}) {
  const logDir = path.join(ROOT, 'data');
  const logFile = path.join(logDir, 'phase4c1-doctrine-strict-events.jsonl');
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      ...entry,
    });
    fs.appendFileSync(logFile, `${line}\n`, 'utf8');
  } catch (e) {
    console.warn('[phase4c1] doctrine strict log failed:', e.message);
  }
}

function writeAuditReports() {
  const evidenceAudit = runEvidenceSourceAudit();
  const stabilityAudit = runRenderStabilityAudit();
  fs.writeFileSync(path.join(ROOT, 'Phase4C1EvidenceSourceAudit.md'), evidenceAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'Phase4C1RenderRuntimeStabilityAudit.md'), stabilityAudit, 'utf8');
  return { evidenceAuditPath: 'Phase4C1EvidenceSourceAudit.md', stabilityAuditPath: 'Phase4C1RenderRuntimeStabilityAudit.md' };
}

module.exports = {
  runEvidenceSourceAudit,
  runRenderStabilityAudit,
  logDoctrineStrictFailure,
  writeAuditReports,
  listEvidenceCards,
};
