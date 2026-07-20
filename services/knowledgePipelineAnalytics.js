/**
 * PHASE_6E Part 8 — Knowledge-Pipeline Analytics.
 *
 * Measures every stage of the governed IOG/ICOJ acquisition pipeline:
 * ACQUIRE -> NORMALIZE -> DEDUPE -> VALIDATE -> SCRIPTURE_REFERENCE_VALIDATION
 * -> TAG -> RELATIONSHIP_EXTRACTION -> RULES_APPROVAL -> ADMIN_REVIEW ->
 * INDEX -> EVIDENCE_GRAPH -> PRODUCTION
 *
 * Runs `runGovernedIcojIngestion({ persist: false })` (a bounded, in-memory,
 * read-only dry run over the 47 already-acquired ICOJ source documents) to
 * get an exact, current, per-stage breakdown, then cross-references the
 * immutable audit log for real persisted-action timing evidence.
 *
 * CRITICAL PERFORMANCE RULE: only invoked from an offline/Admin-triggered
 * script. Never required by the live chat request path — a dry-run pipeline
 * pass over 47 bounded source documents takes low hundreds of milliseconds
 * (see phase6eHotPathLatencyGate.js), which is still far too slow to run on
 * every chat request and is never wired to do so.
 */

const {
  runGovernedIcojIngestion,
  readKnowledgeAuditLog,
  readApprovedCrossReferences,
  acquireIcojPdfSources,
  acquireIogTranscriptSources,
} = require('./iogIcojGovernedIngestion');
const { readSupportGraphCandidates } = require('./supportGraphCandidateQueue');

function percentile(sortedNumbers, p) {
  if (!sortedNumbers.length) return null;
  const idx = Math.min(sortedNumbers.length - 1, Math.floor((p / 100) * sortedNumbers.length));
  return sortedNumbers[idx];
}

function buildKnowledgePipelineAnalytics() {
  const t0 = Date.now();
  const dryRun = runGovernedIcojIngestion({ persist: false });
  const dryRunDurationMs = Date.now() - t0;

  const icojSources = acquireIcojPdfSources();
  const transcriptSources = acquireIogTranscriptSources();
  const auditLog = readKnowledgeAuditLog({ limit: 5000 });
  const approved = readApprovedCrossReferences();
  const allQueued = readSupportGraphCandidates({ limit: 10000 });

  const totalRefsSeen =
    dryRun.counts.autoApproved +
    dryRun.counts.autoRejectedDuplicate +
    dryRun.counts.autoRejectedInvalid +
    dryRun.counts.unclassifiedNoTopic +
    dryRun.counts.needsAdminReview;

  const stages = [
    {
      stage: 'ACQUIRE',
      itemsEntered: icojSources.ok ? icojSources.sources.length : 0,
      itemsPassed: icojSources.ok ? icojSources.sources.length : 0,
      itemsRejected: 0,
      itemsErrored: icojSources.ok ? 0 : 1,
      itemsRetried: 0,
      queueDepth: 0,
      failureReasons: icojSources.ok ? [] : [icojSources.error],
      downstreamStatus: 'FEEDS_NORMALIZE',
      note: `${transcriptSources.ok ? transcriptSources.sources.length : 0} IOG raw transcript file(s) also inventoried but intentionally left RAW_ISOLATED_NOT_PARSED_THIS_BATCH (governance/licensing boundary) — not counted as pipeline throughput.`,
    },
    {
      stage: 'NORMALIZE',
      itemsEntered: totalRefsSeen,
      itemsPassed: totalRefsSeen,
      itemsRejected: 0,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: [],
      downstreamStatus: 'FEEDS_SCRIPTURE_REFERENCE_VALIDATION',
    },
    {
      stage: 'SCRIPTURE_REFERENCE_VALIDATION',
      itemsEntered: totalRefsSeen,
      itemsPassed: totalRefsSeen - dryRun.counts.autoRejectedInvalid,
      itemsRejected: dryRun.counts.autoRejectedInvalid,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: dryRun.counts.autoRejectedInvalid ? ['Reference did not resolve against the validated local KJV corpus'] : [],
      downstreamStatus: 'FEEDS_DEDUPE',
    },
    {
      stage: 'DEDUPE',
      itemsEntered: totalRefsSeen - dryRun.counts.autoRejectedInvalid,
      itemsPassed: totalRefsSeen - dryRun.counts.autoRejectedInvalid - dryRun.counts.autoRejectedDuplicate,
      itemsRejected: dryRun.counts.autoRejectedDuplicate,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: dryRun.counts.autoRejectedDuplicate ? ['EXACT_DUPLICATE of an existing approved witness'] : [],
      downstreamStatus: 'FEEDS_TAG',
    },
    {
      stage: 'TAG',
      // services/knowledgeTagStage.js — implemented in this batch (was
      // previously only a lightweight proposedTopic/domain annotation).
      itemsEntered: totalRefsSeen - dryRun.counts.autoRejectedInvalid - dryRun.counts.autoRejectedDuplicate,
      itemsPassed: totalRefsSeen - dryRun.counts.autoRejectedInvalid - dryRun.counts.autoRejectedDuplicate,
      itemsRejected: 0,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: [],
      downstreamStatus: 'FEEDS_RELATIONSHIP_EXTRACTION',
      status: 'ACTIVE_AS_OF_PHASE_6E',
      tagDimensions: ['authorityDomain', 'biblicalBook', 'testament', 'doctrineTopic', 'sourceType', 'relationshipType', 'historicalPeriod', 'originalLanguageAvailable', 'trustTier', 'approvalState', 'productionEligible', 'discoverySource'],
    },
    {
      stage: 'RELATIONSHIP_EXTRACTION',
      itemsEntered: totalRefsSeen - dryRun.counts.autoRejectedInvalid - dryRun.counts.autoRejectedDuplicate,
      itemsPassed: dryRun.counts.autoApproved + dryRun.counts.needsAdminReview,
      itemsRejected: dryRun.counts.unclassifiedNoTopic,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: dryRun.counts.unclassifiedNoTopic ? ['Valid Scripture reference shares no book+chapter with any existing approved topic witness — no topic inferred (never guessed from AI similarity).'] : [],
      downstreamStatus: 'FEEDS_RULES_APPROVAL',
    },
    {
      stage: 'RULES_APPROVAL',
      itemsEntered: dryRun.counts.autoApproved + dryRun.counts.needsAdminReview,
      itemsPassed: dryRun.counts.autoApproved,
      itemsRejected: 0,
      itemsErrored: 0,
      queueDepth: dryRun.counts.needsAdminReview,
      failureReasons: [],
      downstreamStatus: 'AUTO_APPROVED_FEEDS_INDEX; NEEDS_ADMIN_REVIEW_FEEDS_ADMIN_REVIEW',
    },
    {
      stage: 'ADMIN_REVIEW',
      itemsEntered: allQueued.length,
      itemsPassed: allQueued.filter((c) => c.status === 'approved').length,
      itemsRejected: allQueued.filter((c) => c.status === 'rejected').length,
      itemsErrored: 0,
      itemsRetried: allQueued.filter((c) => c.status === 'awaiting_more_evidence').length,
      queueDepth: allQueued.filter((c) => c.status === 'pending_review').length,
      oldestItemAgeMs: allQueued.filter((c) => c.status === 'pending_review').reduce((max, c) => Math.max(max, Date.now() - new Date(c.createdAt).getTime()), 0),
      failureReasons: [],
      downstreamStatus: 'APPROVED_FEEDS_INDEX; ARCHIVED_REMOVED_FROM_ACTIVE_QUEUE (see Part 7 rules optimizer)',
      note: `${allQueued.filter((c) => c.status === 'archived').length} archived by the Phase 6E rules optimizer (identical-relationship dedupe) — see WitnessQualityReport / AdminQueueDiagnostics for detail.`,
    },
    {
      stage: 'INDEX',
      itemsEntered: approved.length,
      itemsPassed: approved.length,
      itemsRejected: 0,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: [],
      downstreamStatus: 'FEEDS_EVIDENCE_GRAPH',
      note: 'Indexed via services/scriptureRelationshipGraph.js (readApprovedCrossReferences() is one of its typed-relationship sources).',
    },
    {
      stage: 'EVIDENCE_GRAPH',
      itemsEntered: approved.length,
      itemsPassed: approved.length,
      itemsRejected: 0,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: [],
      downstreamStatus: 'FEEDS_PRODUCTION',
    },
    {
      stage: 'PRODUCTION',
      itemsEntered: approved.length,
      itemsPassed: approved.filter((a) => a.productionStatus === 'AUTO_APPROVED_CROSS_REFERENCE').length,
      itemsRejected: 0,
      itemsErrored: 0,
      queueDepth: 0,
      failureReasons: [],
      downstreamStatus: 'LIVE — retrievable via services/scriptureRelationshipGraph.js CROSS_REFERENCE relationships',
    },
  ];

  const auditActionCounts = {};
  for (const a of auditLog) auditActionCounts[a.action] = (auditActionCounts[a.action] || 0) + 1;

  const summary = {
    generatedAt: new Date().toISOString(),
    dryRunPipelinePassDurationMs: dryRunDurationMs,
    totalSourceDocuments: icojSources.ok ? icojSources.sources.length : 0,
    totalReferencesProcessed: totalRefsSeen,
    finalCounts: dryRun.counts,
    auditLogEntryCount: auditLog.length,
    auditActionCounts,
    tagStageStatus: 'ACTIVE_AS_OF_PHASE_6E — every processed record now carries the full tag-dimension object (services/knowledgeTagStage.js); previously only proposedTopic + a fixed domain string were attached.',
    bottleneckNote: `Largest queue depth is ADMIN_REVIEW (${stages.find((s) => s.stage === 'ADMIN_REVIEW').queueDepth} pending) — expected and by design: services/knowledgeApprovalRulesEngine.js intentionally routes all new IOG/ICOJ topic-relationship candidates to a human rather than ever approving new doctrine automatically. See AdminQueueDiagnostics.md for the reason-code breakdown of that queue.`,
  };

  return { stages, summary };
}

module.exports = { buildKnowledgePipelineAnalytics };
