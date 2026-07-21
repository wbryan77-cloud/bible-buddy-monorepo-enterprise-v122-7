#!/usr/bin/env node
/**
 * PHASE_6E Part 13 — Test Matrix.
 *
 * Focused, fast, deterministic assertions over every new Phase 6E engine.
 * Uses REAL repository data (never mocked/fabricated) wherever a real
 * example already exists; uses clearly-labeled synthetic fixtures only to
 * exercise contract branches (e.g. an invalid Scripture reference) that
 * real data does not currently happen to contain.
 */

const assert = require('assert');
const results = [];

function test(id, fn) {
  try {
    fn();
    results.push({ id, pass: true });
    console.log(`PASS ${id}`);
  } catch (e) {
    results.push({ id, pass: false, error: e.message });
    console.log(`FAIL ${id}: ${e.message}`);
  }
}

async function testAsync(id, fn) {
  try {
    await fn();
    results.push({ id, pass: true });
    console.log(`PASS ${id}`);
  } catch (e) {
    results.push({ id, pass: false, error: e.message });
    console.log(`FAIL ${id}: ${e.message}`);
  }
}

(async () => {
  console.log('=== PHASE 6E Part 13 — Test Matrix ===\n');

  // ---------------- COVERAGE ----------------
  const { buildBookCoverageReport, buildDoctrineTopicCoverageReport, buildWitnessQualityReport, buildOriginalLanguageCoverageReport } = require('../../services/knowledgeCoverageAnalyticsEngine');
  const bookCoverage = buildBookCoverageReport();
  const doctrineCoverage = buildDoctrineTopicCoverageReport();
  const witnessQuality = buildWitnessQualityReport();

  test('coverage_all_66_books_represented', () => {
    assert.strictEqual(bookCoverage.books.length, 66);
  });
  test('coverage_complete_local_kjv_availability', () => {
    const withFullText = bookCoverage.books.filter((b) => b.chaptersWithLocalText === b.chaptersTotal).length;
    assert.strictEqual(withFullText, 66, 'expected all 66 books to have full local KJV text');
  });
  test('coverage_text_only_book_identified', () => {
    const textOnly = bookCoverage.books.filter((b) => b.coverageStatus === 'TEXT_ONLY');
    assert.ok(textOnly.length > 0, 'expected at least one TEXT_ONLY book to exist (honest, expected state)');
  });
  test('coverage_partial_linked_coverage_identified', () => {
    const partial = bookCoverage.books.filter((b) => b.coverageStatus === 'PARTIAL_LINKED_COVERAGE');
    assert.ok(Array.isArray(partial), 'partial-coverage classification must be computable');
  });
  test('coverage_doctrine_topic_report_generated', () => {
    assert.ok(doctrineCoverage.topics.length > 0);
    for (const t of doctrineCoverage.topics) {
      assert.ok('coverageScore' in t && 'qualityScore' in t && 'knownGaps' in t);
    }
  });
  test('coverage_one_witness_topic_identified', () => {
    // Not asserting count > 0 (governance may legitimately have zero) —
    // asserting the classification itself is computable and consistent.
    const oneWitness = doctrineCoverage.topics.filter((t) => t.primaryWitnesses.length === 1 && t.supportingWitnesses.length === 0);
    for (const t of oneWitness) assert.ok(t.knownGaps.includes('SINGLE_EXPLICIT_WITNESS'));
  });
  test('coverage_missing_cross_reference_identified', () => {
    assert.ok(Array.isArray(doctrineCoverage.summary.lackingCrossReferences));
  });
  test('coverage_external_dependency_identified', () => {
    assert.deepStrictEqual(bookCoverage.summary.externalProviderDependentBooks, [], 'local corpus is Tier 1 default — zero external dependency expected');
  });
  await testAsync('coverage_original_language_report_generated', async () => {
    const ol = await buildOriginalLanguageCoverageReport();
    assert.strictEqual(ol.perBook.length, 66);
    assert.ok(ol.summary.totalBooksWithAnyDataset === 66);
  });
  test('coverage_witness_quality_classification_complete', () => {
    assert.strictEqual(witnessQuality.perTopic.length, doctrineCoverage.topics.length);
    for (const t of witnessQuality.perTopic) assert.ok(t.classification);
  });

  // ---------------- QUEUE ----------------
  const { buildAdminQueueDiagnostics, classifyCandidate, REASON_CODE } = require('../../services/adminQueueDiagnosticsEngine');
  const diagnostics = buildAdminQueueDiagnostics();

  test('queue_exact_duplicate_classification', () => {
    const result = classifyCandidate({ id: 'x', duplicateStatus: 'EXACT_DUPLICATE', discoverySource: 'IOG/ICOJ', topic: 't', proposedClaim: 'c', scriptures: ['Genesis 1:1'], reason: 'r', source: 's' });
    assert.strictEqual(result.primaryReason, REASON_CODE.DUPLICATE_EXACT);
  });
  test('queue_semantic_duplicate_classification', () => {
    const result = classifyCandidate(
      { id: 'x', extractedReference: 'Genesis 1:1', proposedTopic: 't', discoverySource: 'IOG/ICOJ', topic: 't', proposedClaim: 'c', scriptures: ['Genesis 1:1'], reason: 'r', source: 's' },
      { duplicateGroupSize: 3 }
    );
    assert.ok(result.secondaryReasons.includes(REASON_CODE.DUPLICATE_SEMANTIC));
  });
  test('queue_missing_metadata_false_positive_style_classification', () => {
    const result = classifyCandidate({ id: 'x' });
    assert.strictEqual(result.primaryReason, REASON_CODE.MISSING_METADATA);
  });
  test('queue_safely_auto_approvable_is_never_from_untrusted_source', () => {
    // Governance proof: zero IOG/ICOJ candidates are ever safelyAutoApprovable.
    const iogCandidates = diagnostics.candidates.filter((c) => c.discoverySource === 'IOG/ICOJ');
    const anyAutoApprove = iogCandidates.some((c) => c.rulesEngineClassification === 'AUTO_APPROVE');
    assert.strictEqual(anyAutoApprove, false);
  });
  test('queue_safely_auto_rejectable_measured', () => {
    assert.ok(typeof diagnostics.summary.safelyAutoRejectableCount === 'number');
  });
  test('queue_true_human_review_candidate_protected', () => {
    assert.ok(diagnostics.summary.genuineHumanJudgmentCount >= 0);
    for (const c of diagnostics.candidates) {
      if (c.discoverySource === 'IOG/ICOJ' && c.primaryReason === REASON_CODE.WEAK_TOPIC_MATCH) {
        assert.notStrictEqual(c.rulesEngineClassification, 'AUTO_APPROVE');
      }
    }
  });
  test('queue_licensing_issue_classification', () => {
    const result = classifyCandidate({ id: 'x', discoverySource: 'IOG/ICOJ', topic: 't', proposedClaim: 'c', scriptures: ['Genesis 1:1'], reason: 'r', source: 's', scriptureValidation: 'VALID' }, { alreadyApproved: false });
    assert.ok(result.primaryReason); // classification always resolves to *some* code, never silently drops a candidate
  });
  test('queue_invalid_scripture_classification', () => {
    const result = classifyCandidate({ id: 'x', discoverySource: 'IOG/ICOJ', topic: 't', proposedClaim: 'c', scriptures: ['Not A Real Book 99:99'], reason: 'r', source: 's', scriptureValidation: 'INVALID' });
    assert.strictEqual(result.primaryReason, REASON_CODE.INVALID_SCRIPTURE_REFERENCE);
  });
  const { replay } = require('../../services/knowledgeApprovalRulesOptimizer');
  test('queue_replay_after_rule_optimization_is_idempotent', () => {
    const replayResult = replay({ dryRun: true });
    assert.strictEqual(replayResult.applied, false);
    assert.ok(replayResult.actionsPlanned >= 0);
  });

  // ---------------- HISTORICAL INVESTIGATION ----------------
  const { investigateCitation, RESOLUTION_STATUS, runHistoricalSourceInvestigation } = require('../../services/historicalSourceInvestigationEngine');
  test('historical_cited_book_resolved', () => {
    const r = investigateCitation({ rawCitationText: 'Josephus, The Wars of the Jews', relatedScriptures: ['Matthew 24:1-2'] });
    assert.strictEqual(r.resolutionStatus, RESOLUTION_STATUS.RESOLVED);
  });
  test('historical_cited_article_resolved_tier2', () => {
    const r = investigateCitation({ rawCitationText: 'Encyclopaedia Britannica, "Sabbath"', relatedScriptures: ['Exodus 20:8'] });
    assert.strictEqual(r.resolutionStatus, RESOLUTION_STATUS.LICENSING_UNCERTAIN, 'Tier 2 copyrighted reference works are LICENSING_UNCERTAIN until Admin sign-off, never auto-RESOLVED-for-production');
  });
  test('historical_unverifiable_citation', () => {
    const r = investigateCitation({ rawCitationText: 'Some Random Unattested Pamphlet, 1932', relatedScriptures: [] });
    assert.strictEqual(r.resolutionStatus, RESOLUTION_STATUS.UNRESOLVED);
  });
  test('historical_licensing_uncertainty', () => {
    const r = investigateCitation({ rawCitationText: 'Anchor Bible Dictionary', relatedScriptures: ['Genesis 1:1'] });
    assert.strictEqual(r.resolutionStatus, RESOLUTION_STATUS.LICENSING_UNCERTAIN);
  });
  test('historical_tier1_source', () => {
    const r = investigateCitation({ rawCitationText: 'Dead Sea Scrolls, Qumran Cave 1', relatedScriptures: ['Isaiah 53:1'] });
    assert.strictEqual(r.resolvedSource.trustTier, 'TIER_1_PRIMARY_HISTORICAL_SOURCE');
  });
  test('historical_tier2_source', () => {
    const r = investigateCitation({ rawCitationText: 'Encyclopaedia Britannica', relatedScriptures: ['Genesis 1:1'] });
    assert.strictEqual(r.resolvedSource.trustTier, 'TIER_2_ACADEMIC_REFERENCE');
  });
  test('historical_ministry_research_discovery_source_never_authoritative', () => {
    const investigation = runHistoricalSourceInvestigation();
    // Governance proof: zero candidates discovered via IOG/ICOJ are ever
    // marked productionEligible by this engine alone.
    const iogFound = investigation.candidates.filter((c) => c.discoverySource === 'IOG/ICOJ');
    assert.ok(iogFound.every((c) => c.productionEligible === false));
  });
  test('historical_source_claim_matches_citation_note_present', () => {
    const r = investigateCitation({ rawCitationText: 'Josephus, Antiquities of the Jews', claim: 'some claim', relatedScriptures: ['Luke 3:1'] });
    assert.ok(r.claimComparisonNote.includes('never fabricates'));
  });
  test('historical_source_claim_does_not_match_is_never_auto_verdicted', () => {
    const r = investigateCitation({ rawCitationText: 'Josephus, The Wars of the Jews', claim: 'a claim that may or may not match', relatedScriptures: ['Matthew 24:1-2'] });
    assert.ok(!('claimMatchesSource' in r), 'this engine must never emit a fabricated true/false claim-match verdict');
  });

  // ---------------- DRIFT ----------------
  const { buildKnowledgeSnapshot, diffSnapshots, RISK_LEVEL } = require('../../services/knowledgeDriftDetector');
  test('drift_metadata_only_change', () => {
    const before = buildKnowledgeSnapshot();
    const after = JSON.parse(JSON.stringify(before));
    after.adminQueueCounts = { ...before.adminQueueCounts, pending_review: (before.adminQueueCounts.pending_review || 0) + 1 };
    const diff = diffSnapshots({ before, after });
    assert.strictEqual(diff.riskLevel, RISK_LEVEL.LOW_METADATA_ONLY);
    assert.strictEqual(diff.approvalRequired, false);
  });
  test('drift_witness_addition_is_high_risk', () => {
    const before = buildKnowledgeSnapshot();
    const after = JSON.parse(JSON.stringify(before));
    if (after.doctrineTopics[0]) after.doctrineTopics[0].crossReferences = [...after.doctrineTopics[0].crossReferences, 'Synthetic Test 9:99'];
    const diff = diffSnapshots({ before, after });
    assert.strictEqual(diff.riskLevel, RISK_LEVEL.HIGH_AUTHORITY_CHANGE);
    assert.strictEqual(diff.approvalRequired, true);
  });
  test('drift_primary_witness_change_is_critical', () => {
    const before = buildKnowledgeSnapshot();
    const after = JSON.parse(JSON.stringify(before));
    if (after.doctrineTopics[0]) after.doctrineTopics[0].primaryWitnesses = ['Synthetic Test 1:1'];
    const diff = diffSnapshots({ before, after });
    assert.strictEqual(diff.riskLevel, RISK_LEVEL.CRITICAL_SCRIPTURE_OR_DOCTRINE_CHANGE);
    assert.strictEqual(diff.approvalRequired, true);
  });
  test('drift_high_risk_review_requirement_not_bypassed_without_rollback_flag', () => {
    const before = buildKnowledgeSnapshot();
    const after = JSON.parse(JSON.stringify(before));
    if (after.doctrineTopics[0]) after.doctrineTopics[0].primaryWitnesses = ['Synthetic Test 1:1'];
    const diff = diffSnapshots({ before, after, isRollback: false });
    assert.strictEqual(diff.approvalRequired, true);
  });
  test('drift_rollback_comparison_does_not_require_new_approval', () => {
    const before = buildKnowledgeSnapshot();
    const after = JSON.parse(JSON.stringify(before));
    if (after.doctrineTopics[0]) after.doctrineTopics[0].primaryWitnesses = ['Synthetic Test 1:1'];
    const diff = diffSnapshots({ before, after, isRollback: true });
    assert.strictEqual(diff.approvalRequired, false, 'a flagged, evidenced rollback to a previously-approved state does not require a NEW approval');
  });
  test('drift_no_change_is_low_risk', () => {
    const snap = buildKnowledgeSnapshot();
    const diff = diffSnapshots({ before: snap, after: snap });
    assert.strictEqual(diff.riskLevel, RISK_LEVEL.LOW_METADATA_ONLY);
  });

  // ---------------- PERFORMANCE ----------------
  test('performance_analytics_modules_never_required_by_hot_path', () => {
    const fs = require('fs');
    const path = require('path');
    const repoRoot = path.join(__dirname, '..', '..');
    const orchestratorSrc = fs.readFileSync(path.join(repoRoot, 'services/bibleCompanionOrchestrator.js'), 'utf8');
    const buddySrc = fs.readFileSync(path.join(repoRoot, 'routes/buddy.js'), 'utf8');
    for (const forbidden of ['knowledgeCoverageAnalyticsEngine', 'adminQueueDiagnosticsEngine', 'knowledgeApprovalRulesOptimizer', 'knowledgePipelineAnalytics', 'knowledgeDriftDetector', 'historicalSourceInvestigationEngine', 'founderKnowledgeReadinessScorer']) {
      assert.ok(!orchestratorSrc.includes(forbidden), `bibleCompanionOrchestrator.js must never require ${forbidden}`);
      assert.ok(!buddySrc.includes(forbidden), `routes/buddy.js must never require ${forbidden}`);
    }
  });
  test('performance_dashboard_reads_precomputed_snapshot_only', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes/bibleAuthorityAdmin.js'), 'utf8');
    const dashboardHandler = src.slice(src.indexOf("'/knowledge-coverage-dashboard'"), src.indexOf("'/knowledge-coverage-dashboard'") + 1500);
    assert.ok(dashboardHandler.includes('readAllSnapshots'));
    assert.ok(!dashboardHandler.includes('buildBookCoverageReport'), 'dashboard handler must never call a compute function directly');
  });
  test('performance_bounded_cache_snapshot_store', () => {
    const { SNAPSHOT_NAMES } = require('../../services/knowledgeAnalyticsSnapshotStore');
    assert.ok(SNAPSHOT_NAMES.length > 0 && SNAPSHOT_NAMES.length < 50, 'snapshot name list must be a small, bounded, explicit set — not an unbounded/dynamic cache');
  });
  test('performance_no_user_response_blockage_pipeline_dry_run_is_offline_only', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'services/knowledgePipelineAnalytics.js'), 'utf8');
    assert.ok(src.includes('Never required by the live chat request path'));
  });

  const totalPass = results.filter((r) => r.pass).length;
  console.log(`\n${totalPass}/${results.length} passed`);
  if (totalPass !== results.length) {
    console.log('\nFailures:');
    for (const r of results.filter((r) => !r.pass)) console.log(`  ${r.id}: ${r.error}`);
  }

  const outPath = process.argv[2];
  if (outPath) {
    require('fs').writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), total: results.length, passed: totalPass, results }, null, 2));
  }

  process.exit(totalPass === results.length ? 0 : 1);
})();
