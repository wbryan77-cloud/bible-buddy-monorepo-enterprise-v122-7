#!/usr/bin/env node
/**
 * PHASE_6E — Master offline analytics builder.
 *
 * This is the ONLY place any Phase 6E analytics engine is ever invoked from.
 * It is an explicit, manually/Admin/cron-triggered script — never required
 * by services/bibleCompanionOrchestrator.js, routes/buddy.js, or any other
 * file on the live chat request path (see phase6eHotPathLatencyGate.js for
 * the automated proof).
 *
 * Computes every Phase 6E report, writes the batch-required JSON/MD files
 * into the given output directory, and writes machine-readable snapshots
 * into data/analytics-snapshots/ for the read-only Admin dashboard route to
 * serve without ever recomputing anything during a request.
 *
 * Usage: node scripts/alpha/phase6eBuildAnalyticsSnapshot.js <outputDir> [--apply-rules]
 */

const fs = require('fs');
const path = require('path');

const outDir = process.argv[2];
const applyRules = process.argv.includes('--apply-rules');
if (!outDir) {
  console.error('Usage: node phase6eBuildAnalyticsSnapshot.js <outputDir> [--apply-rules]');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const {
  buildBookCoverageReport,
  buildDoctrineTopicCoverageReport,
  buildWitnessQualityReport,
  buildOriginalLanguageCoverageReport,
} = require('../../services/knowledgeCoverageAnalyticsEngine');
const {
  buildHistoricalCoverageReport,
  runHistoricalSourceInvestigation,
} = require('../../services/historicalSourceInvestigationEngine');
const { buildAdminQueueDiagnostics } = require('../../services/adminQueueDiagnosticsEngine');
const { replay: replayRulesOptimizer } = require('../../services/knowledgeApprovalRulesOptimizer');
const { buildKnowledgePipelineAnalytics } = require('../../services/knowledgePipelineAnalytics');
const { buildKnowledgeSnapshot, diffSnapshots } = require('../../services/knowledgeDriftDetector');
const { buildFounderKnowledgeReadinessScore } = require('../../services/founderKnowledgeReadinessScorer');
const { writeSnapshot, SNAPSHOT_DIR } = require('../../services/knowledgeAnalyticsSnapshotStore');

function writeJsonAndMd(baseName, jsonData, mdLines) {
  fs.writeFileSync(path.join(outDir, `${baseName}.json`), JSON.stringify(jsonData, null, 2));
  if (mdLines) fs.writeFileSync(path.join(outDir, mdLines.filename || `${baseName}.md`), mdLines.lines.join('\n') + '\n');
}

(async () => {
  const t0 = Date.now();
  console.log('=== PHASE 6E Analytics Snapshot Build ===');

  // ---- Part 1: Book coverage ----
  const bookCoverage = buildBookCoverageReport();
  writeJsonAndMd('BibleBookCoverage', bookCoverage, {
    lines: [
      '# Bible Book Coverage — Phase 6E Part 1',
      '',
      `Generated: ${bookCoverage.summary.generatedAt}`,
      '',
      '## Honesty Notice',
      '',
      'Full KJV text availability is NOT equated with full knowledge coverage. A book with complete text and zero doctrine-topic witnesses is honestly reported TEXT_ONLY, not "complete".',
      '',
      '## Summary',
      '',
      `- Total books: ${bookCoverage.summary.totalBooks}`,
      `- By status: ${JSON.stringify(bookCoverage.summary.byStatus)}`,
      `- Average coverage score: ${bookCoverage.summary.averageCoverageScore}`,
      `- External-provider-dependent books: ${bookCoverage.summary.externalProviderDependentBooks.length ? bookCoverage.summary.externalProviderDependentBooks.join(', ') : 'none (local corpus is Tier 1 default)'}`,
      '',
      '## Weakest 10 Books',
      '',
      ...bookCoverage.summary.weakestBooks.map((b) => `- ${b.book}: score ${b.coverageScore} (${b.coverageStatus})`),
      '',
      '## Per-Book Detail',
      '',
      '| # | Book | Testament | Chapters | KJV Text | Indexed | Primary | Supporting | XRef | Score | Status |',
      '|---|------|-----------|----------|----------|---------|---------|------------|------|-------|--------|',
      ...bookCoverage.books.map((b) => `| ${b.bookNumber} | ${b.book} | ${b.testament} | ${b.chaptersTotal} | ${b.chaptersWithLocalText}/${b.chaptersTotal} | ${b.indexedPassages} | ${b.primaryWitnessCount} | ${b.supportingWitnessCount} | ${b.crossReferenceCount} | ${b.coverageScore} | ${b.coverageStatus} |`),
    ],
  });
  writeSnapshot('BibleBookCoverage', bookCoverage);
  console.log('Part 1 done:', bookCoverage.summary.byStatus);

  // ---- Part 2: Doctrine/topic coverage ----
  const doctrineCoverage = buildDoctrineTopicCoverageReport();
  writeJsonAndMd('DoctrineTopicCoverage', doctrineCoverage, {
    lines: [
      '# Doctrine / Topic Coverage — Phase 6E Part 2',
      '',
      `Generated: ${doctrineCoverage.summary.generatedAt}`,
      '',
      `- Total topics: ${doctrineCoverage.summary.totalTopics}`,
      `- No primary witness: ${doctrineCoverage.summary.noPrimaryWitness.join(', ') || 'none'}`,
      `- One-witness-only: ${doctrineCoverage.summary.oneWitnessOnly.join(', ') || 'none'}`,
      `- Lacking supporting witnesses: ${doctrineCoverage.summary.lackingSupportingWitnesses.join(', ') || 'none'}`,
      `- Lacking cross-references: ${doctrineCoverage.summary.lackingCrossReferences.join(', ') || 'none'}`,
      `- Lacking OT witnesses: ${doctrineCoverage.summary.lackingOldTestamentWitnesses.join(', ') || 'none'}`,
      `- Lacking NT witnesses: ${doctrineCoverage.summary.lackingNewTestamentWitnesses.join(', ') || 'none'}`,
      `- Lacking original-language support: ${doctrineCoverage.summary.lackingOriginalLanguageSupport.join(', ') || 'none'}`,
      `- Lacking historical support: ${doctrineCoverage.summary.lackingHistoricalSupport.join(', ') || 'none'}`,
      `- Average coverage score: ${doctrineCoverage.summary.averageCoverageScore}`,
      '',
      `> ${doctrineCoverage.summary.originalLanguageCoverageHonestyNote}`,
      '',
      '## Per-Topic Detail',
      '',
      '| Topic | Primary | Supporting | XRef | OT | NT | OL | Hist | Coverage | Quality | Gaps |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
      ...doctrineCoverage.topics.map((t) => `| ${t.topicId} | ${t.primaryWitnesses.length} | ${t.supportingWitnesses.length} | ${t.crossReferences.length} | ${t.oldTestamentWitnesses} | ${t.newTestamentWitnesses} | ${t.originalLanguageCoverage ? 'Y' : 'N'} | ${t.historicalCoverage ? 'Y' : 'N'} | ${t.coverageScore} | ${t.qualityScore} | ${t.knownGaps.join(', ') || 'none'} |`),
    ],
  });
  writeSnapshot('DoctrineTopicCoverage', doctrineCoverage);
  console.log('Part 2 done:', doctrineCoverage.summary.totalTopics, 'topics');

  // ---- Part 3: Witness quality ----
  const witnessQuality = buildWitnessQualityReport();
  writeJsonAndMd('WitnessQualityReport', witnessQuality, {
    lines: [
      '# Witness Quality Report — Phase 6E Part 3',
      '',
      `Generated: ${witnessQuality.summary.generatedAt}`,
      '',
      `- By classification: ${JSON.stringify(witnessQuality.summary.byClassification)}`,
      `- Total findings: ${witnessQuality.summary.totalFindings}`,
      `- Findings by issue: ${JSON.stringify(witnessQuality.summary.findingsByIssue)}`,
      '',
      '## Per-Topic Classification',
      '',
      '| Topic | Primary | Supporting | Exact Dupes | Supporting=Primary | Classification |',
      '|---|---|---|---|---|---|',
      ...witnessQuality.perTopic.map((t) => `| ${t.topicId} | ${t.primaryWitnessCount} | ${t.supportingWitnessCount} | ${t.exactDuplicateCount} | ${t.supportingRepeatsPrimaryCount} | ${t.classification} |`),
    ],
  });
  writeSnapshot('WitnessQualityReport', witnessQuality);
  console.log('Part 3 done:', witnessQuality.summary.byClassification);

  // ---- Part 4: Original-language coverage (async) ----
  const olCoverage = await buildOriginalLanguageCoverageReport();
  writeJsonAndMd('OriginalLanguageCoverage', olCoverage, {
    lines: [
      '# Original-Language Coverage — Phase 6E Part 4',
      '',
      `Generated: ${olCoverage.summary.generatedAt}`,
      '',
      `- Hebrew/Aramaic books mapped: ${olCoverage.summary.hebrewAramaicBooksMapped}`,
      `- Greek books mapped: ${olCoverage.summary.greekBooksMapped}`,
      `- Books with any dataset: ${olCoverage.summary.totalBooksWithAnyDataset}/66`,
      `- Books missing dataset: ${olCoverage.summary.booksMissingDataset.join(', ') || 'none'}`,
      `- Spot-check failures: ${olCoverage.summary.spotCheckFailures.join(', ') || 'none'}`,
      `- Doctrine topics with OL link: ${olCoverage.summary.doctrineTopicsWithOriginalLanguageLink}/${olCoverage.summary.doctrineTopicsTotal}`,
      '',
      `> ${olCoverage.summary.misleadingGlossOrderNote}`,
      '',
      `Dataset provenance: ${olCoverage.summary.datasetVersionConsistency}`,
    ],
  });
  writeSnapshot('OriginalLanguageCoverage', olCoverage);
  console.log('Part 4 done:', olCoverage.summary.totalBooksWithAnyDataset, '/66 books with dataset');

  // ---- Part 5: Historical coverage + source investigation ----
  const historicalCoverage = buildHistoricalCoverageReport();
  fs.writeFileSync(path.join(outDir, 'HistoricalCoverage.json'), JSON.stringify(historicalCoverage, null, 2));
  const sourceInvestigation = runHistoricalSourceInvestigation();
  fs.writeFileSync(path.join(outDir, 'HistoricalSourceInvestigation.json'), JSON.stringify(sourceInvestigation, null, 2));
  fs.writeFileSync(path.join(outDir, 'HistoricalKnowledgeGaps.md'), [
    '# Historical Knowledge Gaps — Phase 6E Part 5',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Coverage',
    '',
    `- Total historical records: ${historicalCoverage.summary.totalRecords}`,
    `- Approved: ${historicalCoverage.summary.approvedCount}`,
    `- Needs Admin review: ${historicalCoverage.summary.needsAdminReviewCount}`,
    `- Distinct topics covered: ${historicalCoverage.summary.distinctTopicsCovered}`,
    `- Distinct passages covered: ${historicalCoverage.summary.distinctPassagesCovered}`,
    `- By trust tier: ${JSON.stringify(historicalCoverage.summary.byTrustTier)}`,
    '',
    '## Source Investigation',
    '',
    `- Candidates investigated: ${sourceInvestigation.summary.totalCandidatesInvestigated}`,
    `- By resolution status: ${JSON.stringify(sourceInvestigation.summary.byResolutionStatus)}`,
    `- ICOJ PDF titles scanned: ${sourceInvestigation.summary.icojPdfTitlesScanned}`,
    `- ICOJ PDF title citations found: ${sourceInvestigation.summary.icojPdfTitleCitationsFound}`,
    `- IOG transcripts excluded (raw/isolated): ${sourceInvestigation.summary.iogTranscriptsExcluded}`,
    '',
    `> ${sourceInvestigation.summary.honestyNote}`,
    '',
    `> ${sourceInvestigation.summary.governanceNote}`,
    '',
    '## Known Gaps',
    '',
    `- Historical layer covers only ${historicalCoverage.summary.distinctTopicsCovered} of ${doctrineCoverage.summary.totalTopics} tracked doctrine topics.`,
    `- ${sourceInvestigation.candidates.filter((c) => c.resolutionStatus === 'UNRESOLVED').length} self-audited historical record(s) reference a source not yet in the curated bibliographic registry (services/historicalSourceInvestigationEngine.js KNOWN_SOURCE_REGISTRY) — flagged honestly, not fabricated.`,
  ].join('\n') + '\n');
  writeSnapshot('HistoricalCoverage', historicalCoverage);
  writeSnapshot('HistoricalSourceInvestigation', sourceInvestigation);
  console.log('Part 5 done:', historicalCoverage.summary.totalRecords, 'historical records,', sourceInvestigation.summary.totalCandidatesInvestigated, 'source candidates');

  // ---- Part 6: Admin queue diagnostics ----
  const adminQueueDiagnostics = buildAdminQueueDiagnostics();
  writeJsonAndMd('AdminQueueDiagnostics', adminQueueDiagnostics, {
    lines: [
      '# Admin Queue Diagnostics — Phase 6E Part 6',
      '',
      `Generated: ${adminQueueDiagnostics.summary.generatedAt}`,
      '',
      `> ${adminQueueDiagnostics.summary.honestyNote}`,
      '',
      `- Total pending: ${adminQueueDiagnostics.summary.totalPending}`,
      `- By primary reason: ${JSON.stringify(adminQueueDiagnostics.summary.byPrimaryReason)}`,
      `- By discovery source: ${JSON.stringify(adminQueueDiagnostics.summary.byDiscoverySource)}`,
      `- By topic: ${JSON.stringify(adminQueueDiagnostics.summary.byTopic)}`,
      `- By rule outcome: ${JSON.stringify(adminQueueDiagnostics.summary.byRuleOutcome)}`,
      `- Duplicate groups remaining: ${adminQueueDiagnostics.summary.duplicateGroupCount} (${adminQueueDiagnostics.summary.duplicateRowCount} rows)`,
      `- Already approved elsewhere: ${adminQueueDiagnostics.summary.alreadyApprovedElsewhereCount}`,
      `- Safely auto-approvable: ${adminQueueDiagnostics.summary.safelyAutoApprovableCount}`,
      `- Safely auto-rejectable: ${adminQueueDiagnostics.summary.safelyAutoRejectableCount}`,
      `- Genuine human-judgment candidates: ${adminQueueDiagnostics.summary.genuineHumanJudgmentCount}`,
      `- False positives: ${adminQueueDiagnostics.summary.falsePositiveCount}`,
      '',
      `> ${adminQueueDiagnostics.summary.governanceNote}`,
      '',
      '## Oldest 10 Pending',
      '',
      ...adminQueueDiagnostics.summary.oldestCandidates.map((c) => `- ${c.id} (${c.topic}) — age ${Math.round(c.ageMs / 60000)}m — ${c.primaryReason}`),
    ],
  });
  writeSnapshot('AdminQueueDiagnostics', adminQueueDiagnostics);
  console.log('Part 6 done:', adminQueueDiagnostics.summary.totalPending, 'pending,', JSON.stringify(adminQueueDiagnostics.summary.byPrimaryReason));

  // ---- Part 7: Rules-engine optimization (dry-run replay report; the
  // real, safe IDENTICAL_RELATIONSHIP_DEDUPE rule was already applied once
  // earlier in this batch — see FinalImplementationReport.md for that
  // before/after evidence. This run reports current standing state and
  // applies any further safe action only if --apply-rules is passed.) ----
  const rulesOptimizerReport = replayRulesOptimizer({ dryRun: !applyRules });
  writeJsonAndMd('RulesOptimizerReport', rulesOptimizerReport, {
    lines: [
      '# Rules-Engine Optimizer Report — Phase 6E Part 7',
      '',
      `Generated: ${rulesOptimizerReport.generatedAt}`,
      `Applied this run: ${rulesOptimizerReport.applied}`,
      '',
      `- Actions planned: ${rulesOptimizerReport.actionsPlanned}`,
      `- By rule: ${JSON.stringify(rulesOptimizerReport.actionsByRule)}`,
      `- Before: ${JSON.stringify(rulesOptimizerReport.before)}`,
      `- After: ${JSON.stringify(rulesOptimizerReport.after)}`,
      `- Manual work reduction: ${JSON.stringify(rulesOptimizerReport.manualWorkReduction)}`,
      `- False-positive risk: ${JSON.stringify(rulesOptimizerReport.falsePositiveRisk)}`,
      `- False-negative risk: ${JSON.stringify(rulesOptimizerReport.falseNegativeRisk)}`,
    ],
  });
  writeSnapshot('RulesOptimizerReport', rulesOptimizerReport);
  console.log('Part 7 done:', rulesOptimizerReport.actionsPlanned, 'further actions available, applied=', rulesOptimizerReport.applied);

  // ---- Part 8: Knowledge-pipeline analytics ----
  const pipelineAnalytics = buildKnowledgePipelineAnalytics();
  writeJsonAndMd('KnowledgePipelineAnalytics', pipelineAnalytics, {
    lines: [
      '# Knowledge Pipeline Analytics — Phase 6E Part 8',
      '',
      `Generated: ${pipelineAnalytics.summary.generatedAt}`,
      '',
      `- Dry-run pipeline pass duration: ${pipelineAnalytics.summary.dryRunPipelinePassDurationMs}ms`,
      `- Total source documents: ${pipelineAnalytics.summary.totalSourceDocuments}`,
      `- Total references processed: ${pipelineAnalytics.summary.totalReferencesProcessed}`,
      `- Final counts: ${JSON.stringify(pipelineAnalytics.summary.finalCounts)}`,
      `- Audit log entries: ${pipelineAnalytics.summary.auditLogEntryCount}`,
      `- Audit action counts: ${JSON.stringify(pipelineAnalytics.summary.auditActionCounts)}`,
      '',
      `> ${pipelineAnalytics.summary.tagStageStatus}`,
      '',
      `> ${pipelineAnalytics.summary.bottleneckNote}`,
      '',
      '## Stage Metrics',
      '',
      '| Stage | Entered | Passed | Rejected | Errored | Queue Depth |',
      '|---|---|---|---|---|---|',
      ...pipelineAnalytics.stages.map((s) => `| ${s.stage} | ${s.itemsEntered} | ${s.itemsPassed} | ${s.itemsRejected} | ${s.itemsErrored || 0} | ${s.queueDepth || 0} |`),
    ],
  });
  writeSnapshot('KnowledgePipelineAnalytics', pipelineAnalytics);
  console.log('Part 8 done.');

  // ---- Part 9: Knowledge drift detection ----
  const priorSnapshotPath = path.join(SNAPSHOT_DIR, 'KnowledgeStateSnapshot.json');
  const afterSnapshot = buildKnowledgeSnapshot();
  let driftReport;
  if (fs.existsSync(priorSnapshotPath)) {
    const before = JSON.parse(fs.readFileSync(priorSnapshotPath, 'utf8')).data;
    driftReport = diffSnapshots({ before, after: afterSnapshot, actorOrRule: 'phase6e_analytics_build' });
  } else {
    driftReport = {
      changeId: 'baseline_no_prior_snapshot',
      timestamp: new Date().toISOString(),
      actorOrRule: 'phase6e_analytics_build',
      affectedTopics: [],
      affectedReferences: [],
      before: null,
      after: { checksum: afterSnapshot.checksum, takenAt: afterSnapshot.takenAt },
      riskLevel: 'LOW_METADATA_ONLY',
      testsRequired: [],
      approvalRequired: false,
      isRollback: false,
      detail: { note: 'No prior snapshot existed — this run establishes the Phase 6E drift-detection baseline. Future runs will diff against data/analytics-snapshots/KnowledgeStateSnapshot.json.' },
    };
  }
  writeSnapshot('KnowledgeStateSnapshot', afterSnapshot);
  writeSnapshot('KnowledgeDriftReport', driftReport);
  writeJsonAndMd('KnowledgeDriftReport', driftReport, {
    lines: [
      '# Knowledge Drift Report — Phase 6E Part 9',
      '',
      `Generated: ${driftReport.timestamp}`,
      '',
      `- Change id: ${driftReport.changeId}`,
      `- Risk level: ${driftReport.riskLevel}`,
      `- Approval required: ${driftReport.approvalRequired}`,
      `- Affected topics: ${driftReport.affectedTopics.join(', ') || 'none'}`,
      `- Affected references: ${driftReport.affectedReferences.length}`,
      `- Before checksum: ${driftReport.before?.checksum || 'n/a (baseline run)'}`,
      `- After checksum: ${driftReport.after.checksum}`,
      '',
      JSON.stringify(driftReport.detail, null, 2),
    ],
  });
  console.log('Part 9 done. Risk level:', driftReport.riskLevel);

  const durationMs = Date.now() - t0;
  console.log(`\n=== Analytics build complete in ${durationMs}ms ===`);

  return {
    bookCoverage, doctrineCoverage, witnessQuality, olCoverage,
    historicalCoverage, sourceInvestigation, adminQueueDiagnostics,
    rulesOptimizerReport, pipelineAnalytics, driftReport, durationMs,
  };
})().then((results) => {
  fs.writeFileSync(path.join(outDir, '_buildResultsIndex.json'), JSON.stringify({ generatedAt: new Date().toISOString(), durationMs: results.durationMs, outDir }, null, 2));
  process.exit(0);
}).catch((e) => {
  console.error('PHASE 6E analytics build FAILED:', e);
  process.exit(1);
});
