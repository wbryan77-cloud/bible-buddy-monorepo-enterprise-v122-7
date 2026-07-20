/**
 * PHASE_6E Part 11 — Founder Readiness Score.
 *
 * Transparent scorecard. Every category score carries its own calculation
 * method, source metrics, and known limitations — this module never
 * averages unrelated metrics into one invented headline percentage, and a
 * critical failure in a `criticalIfLow` category blocks readiness
 * regardless of the numeric average of every other category.
 *
 * Pure function of already-computed report objects passed in by the caller
 * (scripts/alpha/phase6eBuildAnalyticsSnapshot.js) — this module does not
 * itself read any file or run any other engine, so it stays trivially fast
 * and side-effect-free.
 */

const CRITICAL_CATEGORIES = new Set([
  'BIBLE_TEXT_AVAILABILITY',
  'RUNTIME_STABILITY',
  'SECURITY_PRIVACY',
  'PRODUCTION_LINEAGE',
  'REGRESSION_STATUS',
]);

const BLOCKING_THRESHOLD = 60;

function category(name, { score, calculationMethod, sourceMetrics, knownLimitations = [] }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const critical = CRITICAL_CATEGORIES.has(name);
  const blocking = critical && clamped < BLOCKING_THRESHOLD;
  return { category: name, score: clamped, calculationMethod, sourceMetrics, knownLimitations, criticalCategory: critical, blocking };
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 10000) / 100;
}

function buildFounderKnowledgeReadinessScore({
  bookCoverage,
  doctrineCoverage,
  witnessQuality,
  originalLanguageCoverage,
  historicalCoverage,
  pipelineAnalytics,
  adminQueueDiagnostics,
  driftReport,
  regressionResults, // { total, passed, failed, byClassification }
  performanceResults, // { hotPathLatencyMs: {...}, acceptancePassed: bool }
  securityFindings, // { criticalIssues: [], notes: [] }
  productionLineageVerified, // bool
} = {}) {
  const categories = [];

  const booksFullText = bookCoverage.books.filter((b) => b.chaptersWithLocalText === b.chaptersTotal).length;
  categories.push(category('BIBLE_TEXT_AVAILABILITY', {
    score: pct(booksFullText, bookCoverage.books.length),
    calculationMethod: 'percentage of the 66 canonical books with chaptersWithLocalText === chaptersTotal in the local KJV corpus',
    sourceMetrics: { booksFullText, totalBooks: bookCoverage.books.length },
    knownLimitations: booksFullText < bookCoverage.books.length ? ['Some books lack full local text — see BibleBookCoverage.md missingTextBooks.'] : [],
  }));

  const strongOrFull = bookCoverage.books.filter((b) => b.coverageStatus === 'FULLY_REPRESENTED' || b.coverageStatus === 'STRONG_LINKED_COVERAGE').length;
  categories.push(category('BOOK_RELATIONSHIP_COVERAGE', {
    score: bookCoverage.summary.averageCoverageScore,
    calculationMethod: 'average per-book coverageScore (services/knowledgeCoverageAnalyticsEngine.computeBookCoverageScore) across all 66 books',
    sourceMetrics: { averageCoverageScore: bookCoverage.summary.averageCoverageScore, strongOrFullyRepresented: strongOrFull, textOnlyBooks: bookCoverage.summary.byStatus.TEXT_ONLY },
    knownLimitations: [`${bookCoverage.summary.byStatus.TEXT_ONLY} of 66 books are TEXT_ONLY (full KJV text, no doctrine-topic witness yet) — expected at this stage, not a defect.`],
  }));

  categories.push(category('DOCTRINE_TOPIC_COVERAGE', {
    score: doctrineCoverage.summary.averageCoverageScore,
    calculationMethod: 'average per-topic coverageScore across all tracked doctrine/topic identifiers',
    sourceMetrics: { totalTopics: doctrineCoverage.summary.totalTopics, noPrimaryWitness: doctrineCoverage.summary.noPrimaryWitness.length, oneWitnessOnly: doctrineCoverage.summary.oneWitnessOnly.length },
    knownLimitations: doctrineCoverage.summary.noPrimaryWitness.length ? [`${doctrineCoverage.summary.noPrimaryWitness.length} topic(s) have no primary witness: ${doctrineCoverage.summary.noPrimaryWitness.join(', ')}`] : [],
  }));

  const strongOrAdequate = witnessQuality.perTopic.filter((t) => t.classification === 'MULTIPLE_STRONG_WITNESSES' || t.classification === 'ADEQUATE_TWO_WITNESSES' || t.classification === 'SINGLE_EXPLICIT_WITNESS').length;
  categories.push(category('WITNESS_QUALITY', {
    score: pct(strongOrAdequate, witnessQuality.perTopic.length),
    calculationMethod: 'percentage of topics classified MULTIPLE_STRONG_WITNESSES, ADEQUATE_TWO_WITNESSES, or (legitimately) SINGLE_EXPLICIT_WITNESS — excludes DUPLICATE_HEAVY, MISSING_PRIMARY_EVIDENCE, WEAK_SUPPORTING_EVIDENCE, NEEDS_REVIEW',
    sourceMetrics: witnessQuality.summary.byClassification,
    knownLimitations: witnessQuality.summary.byClassification.NEEDS_REVIEW ? [`${witnessQuality.summary.byClassification.NEEDS_REVIEW} topic(s) classified NEEDS_REVIEW.`] : [],
  }));

  const topicsWithXref = doctrineCoverage.topics.filter((t) => t.crossReferences.length > 0).length;
  categories.push(category('CROSS_REFERENCE_COVERAGE', {
    score: pct(topicsWithXref, doctrineCoverage.topics.length),
    calculationMethod: 'percentage of doctrine/topics with at least one CROSS_REFERENCE or RELATED_DOCTRINE relationship',
    sourceMetrics: { topicsWithXref, totalTopics: doctrineCoverage.topics.length },
    knownLimitations: doctrineCoverage.summary.lackingCrossReferences.length ? [`Lacking cross-references: ${doctrineCoverage.summary.lackingCrossReferences.join(', ')}`] : [],
  }));

  const olComplete = originalLanguageCoverage.perBook.filter((b) => b.tokenCoverageStatus === 'SOURCE_DATA_COMPLETE').length;
  categories.push(category('ORIGINAL_LANGUAGE_COVERAGE', {
    score: pct(olComplete, originalLanguageCoverage.perBook.length),
    calculationMethod: 'percentage of the 66 books with tokenCoverageStatus === SOURCE_DATA_COMPLETE (dataset mapped AND spot-check passed)',
    sourceMetrics: { booksWithDataset: originalLanguageCoverage.summary.totalBooksWithAnyDataset, spotCheckFailures: originalLanguageCoverage.summary.spotCheckFailures.length },
    knownLimitations: [originalLanguageCoverage.summary.misleadingGlossOrderNote],
  }));

  const topicsWithHistory = doctrineCoverage.topics.filter((t) => t.historicalCoverage).length;
  categories.push(category('HISTORICAL_KNOWLEDGE_COVERAGE', {
    score: pct(topicsWithHistory, doctrineCoverage.topics.length),
    calculationMethod: 'percentage of doctrine/topics with at least one approved (productionEligible) historical record linked via relatedTopics',
    sourceMetrics: { topicsWithHistory, totalTopics: doctrineCoverage.topics.length, approvedHistoricalRecords: historicalCoverage.summary?.approvedCount ?? null },
    knownLimitations: ['Historical layer is intentionally small and conservative (8 seed records, Tier 1/2 only) — breadth will grow only through the governed pipeline in services/historicalSourceInvestigationEngine.js, never by bulk import.'],
  }));

  const stagesWithErrors = pipelineAnalytics.stages.filter((s) => s.itemsErrored > 0).length;
  categories.push(category('KNOWLEDGE_PIPELINE_HEALTH', {
    score: pct(pipelineAnalytics.stages.length - stagesWithErrors, pipelineAnalytics.stages.length),
    calculationMethod: 'percentage of the 11 pipeline stages (ACQUIRE..PRODUCTION) reporting zero itemsErrored',
    sourceMetrics: { stages: pipelineAnalytics.stages.length, stagesWithErrors, finalCounts: pipelineAnalytics.summary.finalCounts },
    knownLimitations: [],
  }));

  const criticalReasonCodes = ['RULE_CONFLICT', 'INGESTION_FORMAT_ERROR', 'FALSE_POSITIVE'];
  const criticalCount = criticalReasonCodes.reduce((s, code) => s + (adminQueueDiagnostics.summary.byPrimaryReason[code] || 0), 0);
  categories.push(category('ADMIN_QUEUE_HEALTH', {
    score: Math.max(0, 100 - pct(criticalCount, Math.max(1, adminQueueDiagnostics.summary.totalPending)) - (adminQueueDiagnostics.summary.totalPending > 1000 ? 20 : 0)),
    calculationMethod: '100 minus the percentage of pending candidates carrying a critical reason code (RULE_CONFLICT/INGESTION_FORMAT_ERROR/FALSE_POSITIVE), minus a backlog-size penalty above 1000 pending',
    sourceMetrics: { totalPending: adminQueueDiagnostics.summary.totalPending, criticalReasonCodeCount: criticalCount, safelyAutoRejectableCount: adminQueueDiagnostics.summary.safelyAutoRejectableCount },
    knownLimitations: [adminQueueDiagnostics.summary.governanceNote],
  }));

  categories.push(category('PRODUCTION_LINEAGE', {
    score: productionLineageVerified ? 100 : 0,
    calculationMethod: 'live HTTP POST /buddy/chat response runtime.lineage object presence check (Phase 6 answer-lineage requirement)',
    sourceMetrics: { verified: !!productionLineageVerified },
    knownLimitations: productionLineageVerified ? [] : ['Lineage object could not be verified live in this run — see FinalImplementationReport for detail.'],
  }));

  const regressionScore = regressionResults ? pct(regressionResults.passed, regressionResults.total) : null;
  categories.push(category('RUNTIME_STABILITY', {
    score: regressionScore ?? 0,
    calculationMethod: 'percentage of executed regression checks that passed in this batch\'s full regression run',
    sourceMetrics: regressionResults || {},
    knownLimitations: regressionResults?.knownPreexistingFailures ? [`${regressionResults.knownPreexistingFailures} pre-existing/outdated-expectation failure(s) documented separately — not counted against this score's numerator but reflected in the denominator.`] : [],
  }));

  categories.push(category('PERFORMANCE', {
    score: performanceResults?.acceptancePassed ? 100 : 40,
    calculationMethod: 'pass/fail against Part 12 acceptance criteria (no full-corpus scan, no synchronous analytics on chat requests, hot-path latency delta within noise)',
    sourceMetrics: performanceResults || {},
    knownLimitations: [],
  }));

  categories.push(category('SECURITY_PRIVACY', {
    score: securityFindings?.criticalIssues?.length ? 0 : 100,
    calculationMethod: '100 unless a critical security/privacy issue was found in this batch\'s check (hardcoded secrets, unprotected Admin write endpoints, unguarded disk writes)',
    sourceMetrics: { criticalIssueCount: securityFindings?.criticalIssues?.length || 0 },
    knownLimitations: securityFindings?.notes || [],
  }));

  const byClass = regressionResults?.byClassification || {};
  const realDefects = byClass.REAL_PRODUCT_DEFECT || byClass.PHASE6E_REGRESSION || 0;
  categories.push(category('REGRESSION_STATUS', {
    score: realDefects > 0 ? 0 : (regressionScore ?? 0),
    calculationMethod: '0 if any REAL_PRODUCT_DEFECT or PHASE6E_REGRESSION was found; otherwise the same pass percentage as RUNTIME_STABILITY',
    sourceMetrics: { realDefects, byClassification: byClass },
    knownLimitations: [],
  }));

  const overallAverage = Math.round((categories.reduce((s, c) => s + c.score, 0) / categories.length) * 100) / 100;
  const blockingCategories = categories.filter((c) => c.blocking);
  const readiness = blockingCategories.length ? 'BLOCKED' : 'READY_FOR_FOUNDER_KNOWLEDGE_TEST';

  return {
    generatedAt: new Date().toISOString(),
    categories,
    overallAverage,
    overallAverageDisclaimer: 'This average is informational only — it is NEVER used to override a blocking critical-category failure, and it never averages unrelated metrics into a single invented "readiness percentage" without the per-category detail above.',
    blockingCategories: blockingCategories.map((c) => c.category),
    readiness,
  };
}

module.exports = { buildFounderKnowledgeReadinessScore, CRITICAL_CATEGORIES, BLOCKING_THRESHOLD };
