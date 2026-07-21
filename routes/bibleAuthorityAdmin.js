/**
 * Phase 2K — Bible Authority Admin API routes.
 *
 * Architecture Verification & Knowledge Completion (Part 7/8) — added a
 * read/decide surface over the existing Support Graph Candidate Queue
 * (`services/supportGraphCandidateQueue.js`), scored by the new rule-based
 * approval engine (`services/knowledgeApprovalRulesEngine.js`). This reuses
 * the existing pending-queue storage and existing admin surface; it does not
 * create a second queue and does not touch the live Scripture-answer path.
 */
const express = require('express');
const { getAdminCommandCenter } = require('../services/bibleAuthorityAdminCenter');
const {
  readSupportGraphCandidates,
  recordCandidateDecision,
  ADMIN_ACTIONS,
} = require('../services/supportGraphCandidateQueue');
const { evaluateCandidates, evaluateCandidate } = require('../services/knowledgeApprovalRulesEngine');
const { appendAuditLog, readKnowledgeAuditLog } = require('../services/iogIcojGovernedIngestion');
const { readSnapshot, readAllSnapshots, SNAPSHOT_NAMES } = require('../services/knowledgeAnalyticsSnapshotStore');
const { analyzeLessonText, recordLessonAlignmentSubmission, readLessonAlignmentSubmissions } = require('../services/lessonScriptureAlignmentAnalyzer');
const { recordFounderObservation } = require('../services/runtimeHealthMonitor');
const {
  getFounderConsoleStatus,
  getProviderHealthSummary,
} = require('../services/founderAdminConsoleStatus');

const router = express.Router();

// PHASE_6E Part 10 — how old a snapshot can be before the dashboard flags it
// stale. This is a READ-ONLY threshold for an honest UI warning — it never
// triggers a recomputation from the request handler.
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// PHASE_6D.4 — role protection on Admin endpoints (same env-token pattern
// already used by routes/alphaAdmin.js). No-op (open) only when no token is
// configured, matching existing behavior elsewhere in the repo; set
// BIBLE_AUTHORITY_ADMIN_TOKEN (or the shared ALPHA_ADMIN_TOKEN) in
// production to require it.
function checkAdminAuth(req, res) {
  const token =
    process.env.BIBLE_AUTHORITY_ADMIN_TOKEN ||
    process.env.ALPHA_ADMIN_TOKEN ||
    process.env.BETA_REVIEW_TOKEN ||
    '';
  if (!token) return true;
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || '';
  if (provided !== token) {
    res.status(401).json({ ok: false, error: 'Admin token required' });
    return false;
  }
  return true;
}

router.get('/command-center', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    res.json(getAdminCommandCenter());
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/scripture-review', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const data = getAdminCommandCenter();
    res.json(data.areas.scriptureAuthorityReview);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/engineering', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const data = getAdminCommandCenter();
    res.json(data.areas.engineeringIntelligence);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/executive', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const data = getAdminCommandCenter();
    res.json(data.areas.executiveGrowthDashboard);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/review-queue', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const status = req.query.status || null;
    const limit = Number(req.query.limit) || 100;
    const candidates = readSupportGraphCandidates({ limit, status });
    const results = evaluateCandidates(candidates).map(({ candidate, evaluation }) => ({
      pendingItem: {
        id: candidate.id,
        topic: candidate.topic,
        proposedClaim: candidate.proposedClaim,
        createdAt: candidate.createdAt,
      },
      reason: candidate.reason,
      confidence: evaluation.confidenceScore,
      evidence: candidate.scriptures,
      source: candidate.source,
      recommendation: evaluation.recommendation,
      classification: evaluation.classification,
      status: candidate.status,
      decision: candidate.decision,
      ruleResults: evaluation.ruleResults,
      // PHASE_6D.4 — Admin Exception Review extended fields (present when
      // the candidate originated from the governed IOG/ICOJ pipeline;
      // null/absent for older/internal candidate sources — additive only).
      discoverySource: candidate.discoverySource || null,
      sourceDocument: candidate.sourceDocument || null,
      sourceLocation: candidate.sourceLocation || null,
      extractedReference: candidate.extractedReference || null,
      actualKjvText: candidate.actualKjvText || null,
      proposedTopic: candidate.proposedTopic || candidate.topic || null,
      proposedRelationshipType: candidate.proposedRelationshipType || candidate.relationshipType || null,
      duplicateStatus: candidate.duplicateStatus || null,
      scriptureValidation: candidate.scriptureValidation || null,
      rulesDecision: candidate.rulesDecision || null,
      adminReviewRequired: candidate.adminReviewRequired !== undefined ? candidate.adminReviewRequired : true,
      productionStatus: candidate.productionStatus || null,
    }));
    res.json({ ok: true, count: results.length, items: results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PHASE_6D.4 — bulk admin action, permitted ONLY when every targeted
 * candidate shares an identical (status, rulesDecision/classification,
 * proposedTopic) fingerprint — i.e. a genuinely identical decision, never a
 * blanket approval across mixed candidates.
 *
 * Registered BEFORE the single-candidate '/review-queue/:id/:action' route
 * below so Express does not match "bulk" as an :id value.
 */
router.post('/review-queue/bulk/:action', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { action } = req.params;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ADMIN_ACTIONS.has(action)) {
      return res.status(400).json({ ok: false, error: `Unknown action "${action}".` });
    }
    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'ids[] is required.' });
    }

    const allCandidates = readSupportGraphCandidates({ limit: 10000 });
    const targets = ids.map((id) => allCandidates.find((c) => c.id === id)).filter(Boolean);
    if (targets.length !== ids.length) {
      return res.status(404).json({ ok: false, error: 'One or more candidate ids were not found.' });
    }

    const fingerprintOf = (c) => `${c.status}::${c.rulesDecision || 'n/a'}::${c.proposedTopic || c.topic || 'n/a'}`;
    const fingerprints = new Set(targets.map(fingerprintOf));
    if (fingerprints.size > 1) {
      return res.status(400).json({
        ok: false,
        error: 'Bulk actions require every selected candidate to share an identical status/rulesDecision/topic fingerprint. Selection was mixed.',
        fingerprints: [...fingerprints],
      });
    }

    const decidedBy = req.body?.decidedBy || 'admin';
    const decisions = targets.map((candidate) => {
      const evaluation = evaluateCandidate(candidate);
      const decision = recordCandidateDecision({
        candidateId: candidate.id,
        action,
        decidedBy,
        note: req.body?.note || 'bulk action — identical fingerprint verified',
        ruleEvaluation: evaluation,
      });
      appendAuditLog({
        action: 'ADMIN_BULK_DECISION',
        adminAction: action,
        candidateId: candidate.id,
        decidedBy,
        topic: candidate.proposedTopic || candidate.topic,
      });
      return decision;
    });

    res.json({ ok: true, count: decisions.length, decisions });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/review-queue/:id/:action', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { id, action } = req.params;
    if (!ADMIN_ACTIONS.has(action)) {
      return res.status(400).json({
        ok: false,
        error: `Unknown action "${action}". Expected one of: ${[...ADMIN_ACTIONS].join(', ')}`,
      });
    }

    const candidates = readSupportGraphCandidates({ limit: 10000 });
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) {
      return res.status(404).json({ ok: false, error: `Candidate "${id}" not found.` });
    }

    const evaluation = evaluateCandidate(candidate);
    const decidedBy = (req.body && req.body.decidedBy) || 'admin';
    const decision = recordCandidateDecision({
      candidateId: id,
      action,
      decidedBy,
      note: (req.body && req.body.note) || '',
      ruleEvaluation: evaluation,
      metadataPatch: (req.body && req.body.metadataPatch) || null,
    });

    appendAuditLog({
      action: 'ADMIN_DECISION',
      adminAction: action,
      candidateId: id,
      decidedBy,
      topic: candidate.proposedTopic || candidate.topic,
      reference: candidate.extractedReference || (candidate.scriptures || [])[0] || null,
    });

    res.json({ ok: true, decision });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/knowledge-audit-log', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const limit = Number(req.query.limit) || 200;
    res.json({ ok: true, entries: readKnowledgeAuditLog({ limit }) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PHASE_6E Part 10 — Knowledge Coverage Dashboard.
 *
 * READ-ONLY. This route NEVER recomputes coverage/queue/drift/pipeline
 * analytics during the request — it only reads whatever
 * scripts/alpha/phase6eBuildAnalyticsSnapshot.js last wrote to
 * data/analytics-snapshots/ (see services/knowledgeAnalyticsSnapshotStore.js).
 * If a snapshot is missing or stale, this honestly reports that rather than
 * silently computing a fresh one on the Admin's request thread.
 */
router.get('/knowledge-coverage-dashboard', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const snapshots = readAllSnapshots({ maxAgeMs: SNAPSHOT_MAX_AGE_MS });
    const staleOrMissing = Object.entries(snapshots).filter(([, s]) => !s.ok || s.stale).map(([name]) => name);

    const book = snapshots.BibleBookCoverage.data;
    const doctrine = snapshots.DoctrineTopicCoverage.data;
    const witness = snapshots.WitnessQualityReport.data;
    const originalLanguage = snapshots.OriginalLanguageCoverage.data;
    const historical = snapshots.HistoricalCoverage.data;
    const queue = snapshots.AdminQueueDiagnostics.data;
    const pipeline = snapshots.KnowledgePipelineAnalytics.data;
    const drift = snapshots.KnowledgeDriftReport.data;

    res.json({
      ok: true,
      staleOrMissing,
      generatedTimestamps: Object.fromEntries(Object.entries(snapshots).map(([name, s]) => [name, s.generatedAt])),
      overview: {
        books: book ? { total: book.books.length, byStatus: book.summary.byStatus, averageCoverageScore: book.summary.averageCoverageScore } : null,
        doctrineTopics: doctrine ? { total: doctrine.summary.totalTopics, averageCoverageScore: doctrine.summary.averageCoverageScore, noPrimaryWitness: doctrine.summary.noPrimaryWitness.length, lackingCrossReferences: doctrine.summary.lackingCrossReferences.length } : null,
        witnessQuality: witness ? witness.summary.byClassification : null,
        originalLanguage: originalLanguage ? { booksWithDataset: originalLanguage.summary.totalBooksWithAnyDataset, spotCheckFailures: originalLanguage.summary.spotCheckFailures.length } : null,
        historical: historical ? { totalRecords: historical.summary.totalRecords, approved: historical.summary.approvedCount } : null,
        queue: queue ? { totalPending: queue.summary.totalPending, safelyAutoRejectable: queue.summary.safelyAutoRejectableCount, genuineHumanJudgment: queue.summary.genuineHumanJudgmentCount } : null,
        pipeline: pipeline ? { finalCounts: pipeline.summary.finalCounts, bottleneck: pipeline.summary.bottleneckNote } : null,
        recentDrift: drift ? { riskLevel: drift.riskLevel, approvalRequired: drift.approvalRequired, changeId: drift.changeId } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * Drill-down: Book -> witnesses/cross-references/language/historical/
 * pending-candidates/production-lineage for one specific book. Still
 * read-only over the same precomputed snapshots — filters in memory, never
 * recomputes.
 */
router.get('/knowledge-coverage-dashboard/book/:bookName', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const bookName = String(req.params.bookName || '').toLowerCase();
    const snapshots = readAllSnapshots({ maxAgeMs: SNAPSHOT_MAX_AGE_MS });
    const book = snapshots.BibleBookCoverage.data;
    const doctrine = snapshots.DoctrineTopicCoverage.data;
    const originalLanguage = snapshots.OriginalLanguageCoverage.data;
    const queue = snapshots.AdminQueueDiagnostics.data;

    const bookRecord = book?.books.find((b) => b.book.toLowerCase() === bookName);
    if (!bookRecord) return res.status(404).json({ ok: false, error: `Book "${req.params.bookName}" not found in the latest snapshot.` });

    const relatedTopics = doctrine?.topics.filter((t) => (bookRecord.linkedTopics || []).includes(t.topicId)) || [];
    const olRecord = originalLanguage?.perBook.find((b) => b.book.toLowerCase() === bookName) || null;
    const pendingForBook = (queue?.candidates || []).filter((c) => (c.extractedReference || '').toLowerCase().startsWith(bookName));

    res.json({
      ok: true,
      book: bookRecord,
      doctrineTopics: relatedTopics,
      originalLanguage: olRecord,
      pendingCandidates: pendingForBook.slice(0, 50),
      pendingCandidateCount: pendingForBook.length,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PHASE_6E Part 11 — Founder Readiness Score. Read-only over the
 * precomputed FounderKnowledgeReadiness snapshot (written by
 * scripts/alpha/phase6eFinalizeReadiness.js after regression/performance/
 * security evidence is gathered).
 */
router.get('/founder-knowledge-readiness', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const snapshot = readSnapshot('FounderKnowledgeReadiness', { maxAgeMs: SNAPSHOT_MAX_AGE_MS });
    if (!snapshot.ok) return res.status(200).json({ ok: false, stale: true, reason: snapshot.reason });
    res.json({ ok: true, generatedAt: snapshot.generatedAt, stale: snapshot.stale, staleWarning: snapshot.staleWarning, ...snapshot.data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PHASE_6F Part 11 — Lesson / sermon Scripture-alignment paste-text
 * prototype. Admin/Founder-only (same role protection as every other
 * endpoint in this router). File upload is explicitly feature-flagged OFF
 * for this batch (see the Phase 6F Part 11 report for the exact blocker)
 * — this endpoint accepts pasted plain text only, never
 * a file, never executes/renders the input, and never promotes anything
 * to production knowledge (see services/lessonScriptureAlignmentAnalyzer.js
 * governance note).
 */
router.post('/lesson-alignment/analyze', express.json({ limit: '256kb' }), async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const { text, sourceLabel, submittedBy } = req.body || {};
    if (typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'Request body must include a "text" string field.' });
    }
    const result = await analyzeLessonText({
      text,
      sourceLabel: typeof sourceLabel === 'string' ? sourceLabel.slice(0, 200) : 'Untitled paste',
      submittedBy: typeof submittedBy === 'string' ? submittedBy.slice(0, 200) : null,
    });
    if (!result.ok) {
      return res.status(422).json({ ok: false, error: result.error, detail: result.detail || null });
    }
    // PHASE_6H Part 7 — Founder Observation Layer: count lesson-alignment
    // usage as an aggregate product-improvement signal only (no text or
    // identity persisted here beyond the existing analyzer report itself).
    try {
      recordFounderObservation({ category: 'lesson_alignment', lessonAlignmentUsed: true });
    } catch (_) { /* non-critical */ }
    // PHASE_6H Part 5 — Admin review visibility for Lesson Alignment.
    recordLessonAlignmentSubmission(result.report);
    res.json({ ok: true, report: result.report });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/lesson-alignment/limits', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const { MAX_TEXT_LENGTH, MAX_REFERENCES_PER_ANALYSIS } = require('../services/lessonScriptureAlignmentAnalyzer');
  res.json({
    ok: true,
    maxTextLength: MAX_TEXT_LENGTH,
    maxReferencesPerAnalysis: MAX_REFERENCES_PER_ANALYSIS,
    fileUploadEnabled: false,
    fileUploadBlockerNote: 'File upload is feature-flagged OFF for Founder Alpha. Only Admin/Founder paste-text is available in this batch — see Part 11 report for the exact blocker and remaining work.',
  });
});

// PHASE_6H Part 5 — Admin review visibility for Lesson Alignment. Read-only
// over the append-only log written by recordLessonAlignmentSubmission().
router.get('/lesson-alignment/submissions', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  res.json({ ok: true, submissions: readLessonAlignmentSubmissions({ limit }) });
});

/**
 * PHASE_6F Part 12 — Admin Experience Completion. Consolidates the
 * remaining Admin-visibility items (build/commit identity, feature-flag
 * disposition, provider health, privacy export/delete capability status,
 * safety-event logging status) that were not yet surfaced by any existing
 * endpoint. Purely read-only over existing data/functions — no new store.
 */
router.get('/founder-console', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    res.json({ ok: true, ...getFounderConsoleStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/provider-health', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const summary = await getProviderHealthSummary();
    res.json({ ok: true, generatedAt: new Date().toISOString(), providers: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * PHASE_6H — Admin Experience polish. Reads the most recently generated
 * `npm run founder-alpha:validate` report so the Admin console can display
 * the current regression/readiness status without re-running any suite
 * from the request thread (purely a static-file read, same pattern as the
 * knowledge-coverage-dashboard snapshot reads above — no new pipeline).
 */
router.get('/founder-readiness-report', (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const fs = require('fs');
    const path = require('path');
    const baseDir = path.join(__dirname, '..', 'docs', 'alpha', 'founder-readiness');
    if (!fs.existsSync(baseDir)) {
      return res.json({ ok: false, reason: 'No founder-readiness report has been generated yet. Run: npm run founder-alpha:validate' });
    }
    const runDirs = fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const latest = runDirs[runDirs.length - 1];
    if (!latest) {
      return res.json({ ok: false, reason: 'No founder-readiness report has been generated yet. Run: npm run founder-alpha:validate' });
    }
    const reportPath = path.join(baseDir, latest, 'FounderReadinessReport.json');
    if (!fs.existsSync(reportPath)) {
      return res.json({ ok: false, reason: `Report directory "${latest}" exists but FounderReadinessReport.json is missing.` });
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    res.json({ ok: true, runId: latest, report });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
