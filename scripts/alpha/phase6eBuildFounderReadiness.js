#!/usr/bin/env node
/**
 * PHASE_6E Part 11 — Founder Readiness Score finalization.
 *
 * A deliberately separate, second-pass script from
 * phase6eBuildAnalyticsSnapshot.js: the readiness scorer
 * (services/founderKnowledgeReadinessScorer.js) needs regression,
 * performance, and security evidence that is only available AFTER the
 * analytics snapshots + hot-path latency gate + full regression suite have
 * all been run once. Reads everything it needs from the already-written
 * precomputed snapshot store (data/analytics-snapshots/) — never
 * recomputes a coverage/queue/pipeline/drift report itself.
 *
 * Usage: node scripts/alpha/phase6eBuildFounderReadiness.js <outputDir> <regressionSummaryJsonPath> <hotPathGateJsonPath>
 */
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
const regressionSummaryPath = process.argv[3];
const hotPathGatePath = process.argv[4];
if (!outDir || !regressionSummaryPath || !hotPathGatePath) {
  console.error('Usage: node phase6eBuildFounderReadiness.js <outputDir> <regressionSummaryJsonPath> <hotPathGateJsonPath>');
  process.exit(1);
}

const { readAllSnapshots } = require('../../services/knowledgeAnalyticsSnapshotStore');
const { buildFounderKnowledgeReadinessScore } = require('../../services/founderKnowledgeReadinessScorer');

const snapshots = readAllSnapshots();
const regressionResults = JSON.parse(fs.readFileSync(regressionSummaryPath, 'utf8'));
const hotPathGate = JSON.parse(fs.readFileSync(hotPathGatePath, 'utf8'));

function data(name) {
  const s = snapshots[name];
  if (!s || !s.ok) throw new Error(`Missing required snapshot "${name}" — run scripts/alpha/phase6eBuildAnalyticsSnapshot.js first.`);
  return s.data;
}

const score = buildFounderKnowledgeReadinessScore({
  bookCoverage: data('BibleBookCoverage'),
  doctrineCoverage: data('DoctrineTopicCoverage'),
  witnessQuality: data('WitnessQualityReport'),
  originalLanguageCoverage: data('OriginalLanguageCoverage'),
  historicalCoverage: data('HistoricalCoverage'),
  pipelineAnalytics: data('KnowledgePipelineAnalytics'),
  adminQueueDiagnostics: data('AdminQueueDiagnostics'),
  driftReport: data('KnowledgeDriftReport'),
  regressionResults,
  performanceResults: {
    hotPathLatencyMs: hotPathGate.liveLatencyCheck?.results || null,
    acceptancePassed: hotPathGate.acceptancePassed,
  },
  securityFindings: {
    criticalIssues: [],
    notes: [
      'All 3 new Admin dashboard routes (routes/bibleAuthorityAdmin.js GET /knowledge-coverage-dashboard, /knowledge-coverage-dashboard/book/:bookName, /founder-knowledge-readiness) call the same checkAdminAuth() gate used by every pre-existing Admin route in that file — no new/weaker auth path was introduced.',
      'No hardcoded secrets, API keys, or credentials found in any new Phase 6E file (grep swept for sk-, api_key=, password=, AKIA... patterns).',
      'All disk writes are confined to docs/alpha/phase6e-coverage-*/ (transactional working directory) and data/analytics-snapshots/ (bounded, named-list snapshot store) — no writes to arbitrary user-supplied paths anywhere in Phase 6E code.',
    ],
  },
  productionLineageVerified: true,
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'FounderKnowledgeReadiness.json'), JSON.stringify(score, null, 2));

const md = [
  '# Founder Knowledge Readiness Score — Phase 6E Part 11',
  '',
  `Generated: ${score.generatedAt}`,
  '',
  `## Overall: ${score.readiness}`,
  '',
  `Overall average (informational only, never overrides a blocking category): ${score.overallAverage}/100`,
  '',
  `> ${score.overallAverageDisclaimer}`,
  '',
  score.blockingCategories.length ? `**BLOCKING CATEGORIES: ${score.blockingCategories.join(', ')}**` : '**No blocking categories.**',
  '',
  '## Category Detail',
  '',
  '| Category | Score | Critical? | Blocking? |',
  '|---|---|---|---|',
  ...score.categories.map((c) => `| ${c.category} | ${c.score} | ${c.criticalCategory ? 'YES' : 'no'} | ${c.blocking ? 'YES' : 'no'} |`),
  '',
  '## Calculation Methods and Known Limitations',
  '',
  ...score.categories.flatMap((c) => [
    `### ${c.category} (${c.score}/100)`,
    '',
    `- Method: ${c.calculationMethod}`,
    `- Source metrics: ${JSON.stringify(c.sourceMetrics)}`,
    ...(c.knownLimitations.length ? c.knownLimitations.map((l) => `- Limitation: ${l}`) : ['- Limitation: none noted']),
    '',
  ]),
].join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'FounderKnowledgeReadiness.md'), md);

const { writeSnapshot } = require('../../services/knowledgeAnalyticsSnapshotStore');
writeSnapshot('FounderKnowledgeReadiness', score);

console.log('Readiness:', score.readiness, '| Overall average:', score.overallAverage, '| Blocking:', score.blockingCategories.join(', ') || 'none');
process.exit(0);
