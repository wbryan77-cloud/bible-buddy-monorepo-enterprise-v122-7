/**
 * FOUNDER_ALPHA_OPERATIONAL_INTELLIGENCE — Founder Intelligence Layer.
 *
 * This module NEVER modifies Scripture, creates doctrine, bypasses
 * governance/Admin/lineage, or publishes knowledge automatically. It is a
 * read-only aggregation layer that:
 *
 *   Observes    — reads existing telemetry, feedback, and submissions.
 *   Correlates  — cross-references requests against existing approved
 *                 knowledge (topic witness registry, relationship graph,
 *                 doctrine coverage, historical records, original-language
 *                 coverage).
 *   Recommends  — produces structured recommendation objects, every one of
 *                 which is `requiredApproval: true` and inert until an
 *                 Admin explicitly approves it via
 *                 founderIntelligenceRecommendationStore.
 *   Prioritizes / Summarizes / Organizes — turns raw counts into narrative
 *                 findings with a stated confidence and cites the exact
 *                 evidence used, never invented numbers.
 *   Learns      — see founderIntelligenceRecommendationStore's
 *                 effectiveness tracking (Part 7).
 *
 * Every existing engine this module calls (topicWitnessRegistry,
 * knowledgeCoverageAnalyticsEngine, scriptureRelationshipGraph,
 * historicalKnowledgeProvider, knowledgeApprovalRulesOptimizer with
 * dryRun:true) is a pure/read path already used elsewhere in the codebase.
 * This module adds no new production-mutating capability whatsoever.
 */

const {
  getRuntimeHealthSnapshot,
  getRuntimeHealthHistory,
} = require('./runtimeHealthMonitor');
const { readFeedback, VALID_TAGS } = require('./alphaFeedbackCapture');
const { readLessonAlignmentSubmissions } = require('./lessonScriptureAlignmentAnalyzer');
const { buildTopicWitnessRegistry, findTopicMatchesForReference } = require('./topicWitnessRegistry');
const {
  buildDoctrineTopicCoverageReport,
  buildWitnessQualityReport,
} = require('./knowledgeCoverageAnalyticsEngine');
const { buildScriptureRelationshipGraph } = require('./scriptureRelationshipGraph');
const { getAllHistoricalRecords, getHistoricalContextForReference } = require('./historicalKnowledgeProvider');
const { parseScriptureRef } = require('./scriptureReferenceNormalizer');

let rulesOptimizer = null;
function getRulesOptimizer() {
  if (!rulesOptimizer) {
    try {
      rulesOptimizer = require('./knowledgeApprovalRulesOptimizer');
    } catch (e) {
      rulesOptimizer = { unavailable: true, reason: e.message };
    }
  }
  return rulesOptimizer;
}

// ---------------------------------------------------------------------------
// Shared, memoized read-only lookups (built once per process tick, not per
// call — every source module here is already file/module-backed and safe
// to rebuild, but there is no reason to rebuild the same registry 12 times
// while composing one report).
// ---------------------------------------------------------------------------

function buildKnowledgeContext() {
  const registry = buildTopicWitnessRegistry();
  const coverage = buildDoctrineTopicCoverageReport();
  const witnessQuality = buildWitnessQualityReport();
  const relationshipGraph = buildScriptureRelationshipGraph();
  const topicsById = new Map(coverage.topics.map((t) => [t.topicId, t]));
  const witnessQualityById = new Map(witnessQuality.perTopic.map((t) => [t.topicId, t]));
  return { registry, coverage, witnessQuality, relationshipGraph, topicsById, witnessQualityById };
}

function humanizeTopicId(topicId) {
  return String(topicId || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Small, explicit alias table — deliberately NOT a semantic/AI matcher.
// Maps common free-text phrasing onto the exact topicId keys that already
// exist in services/doctrineAuthorityContract.BASE_CONTRACTS /
// bibleConceptConcordance / bibleConceptGraph. Extending this list never
// creates new doctrine — it only helps free-text requests find topics that
// already exist.
const TOPIC_TEXT_ALIASES = {
  heaven: 'heavens',
  heavens: 'heavens',
  sabbath: 'sabbath',
  'acts 10': 'acts_10',
  acts10: 'acts_10',
  resurrection: 'resurrection',
  'holy spirit': 'holy_spirit',
  david: 'david',
  'new jerusalem': 'new_jerusalem',
  'death state': 'death_state',
  death: 'death_state',
  'dietary law': 'dietary_law',
  clean: 'dietary_law',
  unclean: 'dietary_law',
  kingdom: 'kingdom',
};

function matchFreeTextToTopicId(text, registry) {
  if (!text) return null;
  const norm = String(text).toLowerCase().trim();
  if (TOPIC_TEXT_ALIASES[norm]) return TOPIC_TEXT_ALIASES[norm];
  for (const [alias, topicId] of Object.entries(TOPIC_TEXT_ALIASES)) {
    if (norm.includes(alias)) return topicId;
  }
  const directKey = norm.replace(/\s+/g, '_');
  if (registry.has(directKey)) return directKey;
  return null;
}

/**
 * Given a Scripture reference, determine whether it is already covered by
 * existing approved knowledge, and if so, by which topic(s) and with what
 * known gaps remaining on that topic.
 */
function resolveCoverageForReference(reference, ctx) {
  const matches = findTopicMatchesForReference(reference, ctx.registry);
  if (!matches.length) {
    return { satisfied: false, topicIds: [], matches: [] };
  }
  const topicIds = [...new Set(matches.map((m) => m.topicId))];
  const exact = matches.filter((m) => m.matchKind === 'EXACT_DUPLICATE' || m.matchKind === 'SAME_CHAPTER_AS_PRIMARY' || m.matchKind === 'SAME_CHAPTER_AS_SUPPORTING');
  return {
    satisfied: exact.length > 0,
    topicIds,
    matches,
    gaps: topicIds.flatMap((id) => (ctx.topicsById.get(id)?.knownGaps || []).map((g) => ({ topicId: id, gap: g }))),
  };
}

// ---------------------------------------------------------------------------
// PART 2 — Trend analysis (real numbers only; honestly reports insufficient
// history rather than fabricating a percentage).
// ---------------------------------------------------------------------------

const OBSERVATION_COUNTER_LABELS = {
  witnessRetrievalCount: 'Scripture witness retrieval',
  historicalContextUsedCount: 'Historical context usage',
  originalLanguageUsedCount: 'Original-language usage',
  prayerUsageCount: 'Prayer usage',
  lessonAlignmentUsageCount: 'Lesson Alignment usage',
  continuationUsageCount: 'Conversation continuation usage',
};

function computeTrendAnalysis({ historyLimit = 1000 } = {}) {
  const snapshot = getRuntimeHealthSnapshot();
  const history = getRuntimeHealthHistory({ limit: historyLimit });
  const withObservation = history.filter((h) => h.observation);

  if (withObservation.length < 2) {
    return {
      ok: true,
      status: 'BASELINE_ESTABLISHING',
      message:
        'Session-level observation history was only recently added to runtime-health-history.jsonl (FOUNDER_ALPHA_OPERATIONAL_INTELLIGENCE Part 2). At least two recorded snapshots with an `observation` field are required to compute a real trend; fabricating a percentage would violate the no-fabrication rule for this batch.',
      currentTotals: snapshot.observation,
      trends: [],
    };
  }

  const baseline = withObservation[0];
  const latest = withObservation[withObservation.length - 1];
  const windowStart = baseline.at;
  const windowEnd = latest.at;

  const trends = Object.entries(OBSERVATION_COUNTER_LABELS).map(([key, label]) => {
    const before = baseline.observation[key] || 0;
    const after = latest.observation[key] || 0;
    const delta = after - before;
    const percentChange = before > 0 ? Math.round((delta / before) * 10000) / 100 : (after > 0 ? null : 0);
    let narrative;
    if (before === 0 && after > 0) {
      narrative = `${label} recorded ${after} use(s) since ${windowStart} (no prior baseline usage to compute a percentage from).`;
    } else if (percentChange === null) {
      narrative = `${label}: no activity recorded in this window.`;
    } else {
      const direction = delta > 0 ? 'increased' : delta < 0 ? 'decreased' : 'held steady';
      narrative = `${label} ${direction} ${Math.abs(percentChange)}% (from ${before} to ${after}) between ${windowStart} and ${windowEnd}.`;
    }
    return { key, label, before, after, delta, percentChange, narrative, confidence: withObservation.length >= 10 ? 'MEDIUM' : 'LOW' };
  });

  const transitionCounts = latest.observation.categoryTransitionCounts || {};
  const topTransitions = Object.entries(transitionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => {
      const [from, to] = pair.split('->');
      return {
        fromCategory: from,
        toCategory: to,
        count,
        narrative: `Founders who asked about "${from}" went on to ask about "${to}" in the same session ${count} time(s).`,
      };
    });

  return {
    ok: true,
    status: 'COMPUTED',
    windowStart,
    windowEnd,
    snapshotsInWindow: withObservation.length,
    currentTotals: snapshot.observation,
    trends,
    topTopicTransitions: topTransitions,
    topicTransitionNote:
      topTransitions.length === 0
        ? 'No same-session topic transitions have been recorded yet. This is a real (not fabricated) absence — the counter was added in this batch and only grows from new sessions going forward.'
        : null,
  };
}

// ---------------------------------------------------------------------------
// PART 2/3 — Recurring pattern detection across feedback + lesson alignment
// + question categories, all from real recorded data.
// ---------------------------------------------------------------------------

function computeRecurringPatterns({ feedbackLimit = 500, lessonLimit = 200 } = {}) {
  const snapshot = getRuntimeHealthSnapshot();
  const feedback = readFeedback({ limit: feedbackLimit });
  const submissions = readLessonAlignmentSubmissions({ limit: lessonLimit });

  const categoryCounts = snapshot.observation.questionCategoryCounts || {};
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category, count]) => ({ category, count }));

  const feedbackByTag = VALID_TAGS.reduce((acc, tag) => {
    acc[tag] = feedback.filter((f) => f.tag === tag).length;
    return acc;
  }, {});

  // Recurring Scripture references from Lesson Alignment claims: misquotes
  // and unresolved references are exactly the signal a Founder needed help
  // with — these are real user-submitted data points, not synthesized ones.
  const referenceRequestCounts = new Map(); // reference -> { count, submitters:Set, claimTypes:Set }
  for (const sub of submissions) {
    const submitter = sub.submittedBy || 'unknown';
    for (const claim of sub.claims || []) {
      if (!claim.reference) continue;
      const key = claim.reference;
      if (!referenceRequestCounts.has(key)) {
        referenceRequestCounts.set(key, { reference: key, count: 0, submitters: new Set(), claimTypes: new Set(), sampleQuote: null });
      }
      const entry = referenceRequestCounts.get(key);
      entry.count += 1;
      entry.submitters.add(submitter);
      entry.claimTypes.add(claim.claimType);
      if (!entry.sampleQuote && claim.quotedInLesson) entry.sampleQuote = claim.quotedInLesson;
    }
  }

  const recurringReferences = [...referenceRequestCounts.values()]
    .map((e) => ({
      reference: e.reference,
      requestCount: e.count,
      distinctSubmitters: e.submitters.size,
      claimTypes: [...e.claimTypes],
      sampleQuote: e.sampleQuote,
    }))
    .sort((a, b) => b.requestCount - a.requestCount);

  return {
    ok: true,
    topQuestionCategories: topCategories,
    feedbackByTag,
    totalFeedbackEntries: feedback.length,
    totalLessonAlignmentSubmissions: submissions.length,
    recurringScriptureReferencesFromLessons: recurringReferences,
  };
}

// ---------------------------------------------------------------------------
// PART 3 — Knowledge Recommendation Engine: for each recurring signal,
// determine SATISFIED (recommend connecting to existing knowledge) vs GAP
// (recommend new work), using ONLY approved knowledge already registered in
// topicWitnessRegistry / doctrine coverage.
// ---------------------------------------------------------------------------

function buildKnowledgeRecommendations(patterns, ctx) {
  const recommendations = [];

  for (const item of patterns.recurringScriptureReferencesFromLessons) {
    const coverage = resolveCoverageForReference(item.reference, ctx);
    const misquoteOrUnresolved = item.claimTypes.some((t) => t === 'QUOTED_TEXT_DOES_NOT_MATCH_KJV' || t === 'REFERENCE_UNRESOLVED');
    if (coverage.satisfied) {
      recommendations.push({
        type: 'KNOWLEDGE_SATISFIED',
        title: `Connect ${item.reference} to existing approved knowledge`,
        reference: item.reference,
        topicIds: coverage.topicIds,
        confidence: item.distinctSubmitters >= 2 ? 'HIGH' : 'MEDIUM',
        supportingEvidence: [
          `${item.requestCount} occurrence(s) across ${item.distinctSubmitters} distinct Lesson Alignment submission(s).`,
          `Claim type(s) observed: ${item.claimTypes.join(', ')}.`,
        ],
        sourceSessions: item.distinctSubmitters,
        reasoning: `${item.reference} already matches ${coverage.topicIds.length} approved topic(s) (${coverage.topicIds.map(humanizeTopicId).join(', ')}) in the live topic witness registry. No new knowledge is required — the existing evidence chain already answers this.`,
        existingProductionCoverage: `Already live: ${coverage.topicIds.join(', ')}`,
        suggestedAction: `Attach ${coverage.topicIds.map(humanizeTopicId).join(' / ')} evidence chain when this reference recurs in Lesson Alignment or chat.`,
        priority: 'LOW',
        requiredApproval: true,
      });
    } else if (misquoteOrUnresolved) {
      recommendations.push({
        type: 'KNOWLEDGE_GAP',
        title: `Potential Knowledge Opportunity: ${item.reference}`,
        reference: item.reference,
        topicIds: [],
        confidence: item.distinctSubmitters >= 3 ? 'HIGH' : item.distinctSubmitters >= 2 ? 'MEDIUM' : 'LOW',
        supportingEvidence: [
          `Requested/misquoted/unresolved in ${item.requestCount} Lesson Alignment submission(s) from ${item.distinctSubmitters} distinct submitter(s).`,
          item.sampleQuote ? `Sample lesson text: "${String(item.sampleQuote).slice(0, 160)}"` : null,
        ].filter(Boolean),
        sourceSessions: item.distinctSubmitters,
        reasoning: `${item.reference} does not currently match any topic in the live topic witness registry (services/topicWitnessRegistry.js), and Founders keep encountering it as a misquote or unresolved reference in submitted lessons.`,
        existingProductionCoverage: 'None found in topicWitnessRegistry.',
        suggestedAction: 'Consider evaluating whether this reference should be added as a supporting witness to an existing topic, or proposed as a new evidence-pack candidate through the existing IOG/ICOJ governed ingestion pipeline (never auto-added).',
        priority: item.distinctSubmitters >= 3 ? 'HIGH' : item.distinctSubmitters >= 2 ? 'MEDIUM' : 'LOW',
        requiredApproval: true,
      });
    }
  }

  // Recurring free-text question categories mapped onto existing topics.
  for (const cat of patterns.topQuestionCategories) {
    const topicId = matchFreeTextToTopicId(cat.category, ctx.registry);
    if (!topicId || !ctx.topicsById.has(topicId)) continue;
    const topic = ctx.topicsById.get(topicId);
    const wq = ctx.witnessQualityById.get(topicId);
    if ((topic.knownGaps || []).length === 0) continue; // nothing to recommend if fully covered
    recommendations.push({
      type: 'KNOWLEDGE_GAP',
      title: `Expand coverage for recurring topic: ${humanizeTopicId(topicId)}`,
      reference: null,
      topicIds: [topicId],
      confidence: cat.count >= 10 ? 'HIGH' : cat.count >= 4 ? 'MEDIUM' : 'LOW',
      supportingEvidence: [
        `${cat.count} question(s) categorized under "${cat.category}" in Founder Observation Layer counters.`,
        `Known gaps on this topic: ${(topic.knownGaps || []).join(', ')}.`,
        wq ? `Witness quality classification: ${wq.classification}.` : null,
      ].filter(Boolean),
      sourceSessions: cat.count,
      reasoning: `Founders are actively asking about "${humanizeTopicId(topicId)}" and the doctrine coverage report already lists specific, named gaps for this topic (not a guess — computed by services/knowledgeCoverageAnalyticsEngine.js).`,
      existingProductionCoverage: `${topic.primaryWitnesses.length} primary witness(es), ${topic.supportingWitnesses.length} supporting witness(es), ${topic.crossReferences.length} cross reference(s).`,
      suggestedAction: `Expand ${(topic.knownGaps || []).join(' / ')} for this topic through the existing knowledge-authoring process.`,
      priority: cat.count >= 10 ? 'HIGH' : cat.count >= 4 ? 'MEDIUM' : 'LOW',
      requiredApproval: true,
    });
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// PART 4 — Automated Evidence Correlation for individual submissions.
// ---------------------------------------------------------------------------

function correlateEvidenceForSubmission(submission, ctx) {
  const correlations = [];
  for (const claim of submission.claims || []) {
    if (!claim.reference) continue;
    const coverage = resolveCoverageForReference(claim.reference, ctx);
    const historical = (() => {
      try {
        return getHistoricalContextForReference(claim.reference);
      } catch {
        return null;
      }
    })();
    const parsed = parseScriptureRef(claim.reference);
    const relatedRelationships = ctx.relationshipGraph.relationships.filter((r) => (r.topicIds || []).some((t) => coverage.topicIds.includes(t)));

    // Confidence is a function of: reference actually resolved (parseable),
    // whether it matches existing approved knowledge, and whether the
    // quoted text overlap ratio is high (near-exact quote) — every factor
    // is a real, already-computed value, never a semantic guess.
    let confidenceScore = 0;
    if (parsed) confidenceScore += 30;
    if (coverage.satisfied) confidenceScore += 30;
    if (typeof claim.overlapRatio === 'number' && claim.overlapRatio >= 0.85) confidenceScore += 25;
    if (relatedRelationships.length > 0) confidenceScore += 15;

    correlations.push({
      reference: claim.reference,
      claimType: claim.claimType,
      overlapRatio: claim.overlapRatio ?? null,
      matchedTopics: coverage.topicIds,
      matchedTopicsHuman: coverage.topicIds.map(humanizeTopicId),
      relatedRelationshipCount: relatedRelationships.length,
      historicalContextAvailable: !!historical,
      confidenceScore,
      recommendAdminReview: confidenceScore >= 70,
    });
  }
  return correlations;
}

const EVIDENCE_CORRELATION_ADMIN_THRESHOLD = 70;

function buildEvidenceCorrelationRecommendations({ lessonLimit = 50 } = {}, ctx) {
  const submissions = readLessonAlignmentSubmissions({ limit: lessonLimit });
  const recommendations = [];
  for (const submission of submissions) {
    const correlations = correlateEvidenceForSubmission(submission, ctx);
    for (const c of correlations) {
      if (!c.recommendAdminReview) continue;
      recommendations.push({
        type: 'EVIDENCE_CORRELATION',
        title: `Evidence correlation: ${c.reference} (${submission.sourceLabel || 'submitted lesson'})`,
        reference: c.reference,
        topicIds: c.matchedTopics,
        confidence: c.confidenceScore >= 85 ? 'HIGH' : 'MEDIUM',
        supportingEvidence: [
          `Claim type: ${c.claimType}.`,
          c.overlapRatio != null ? `KJV text overlap ratio: ${c.overlapRatio}.` : null,
          `Matched approved topic(s): ${c.matchedTopicsHuman.join(', ') || 'none'}.`,
          `Related relationship-graph entries: ${c.relatedRelationshipCount}.`,
          c.historicalContextAvailable ? 'Historical context record exists for this reference.' : null,
        ].filter(Boolean),
        sourceSessions: 1,
        reasoning: `Automated correlation score ${c.confidenceScore}/100 (>= ${EVIDENCE_CORRELATION_ADMIN_THRESHOLD} threshold) computed from reference resolution, existing topic match, KJV quote precision, and relationship-graph adjacency — never a semantic/AI guess.`,
        existingProductionCoverage: c.matchedTopics.length ? `Already live: ${c.matchedTopics.join(', ')}` : 'Not currently matched to any approved topic.',
        suggestedAction: 'Review this submission and its correlated reference in the Admin dashboard; approve only if the connection should be pursued through the existing knowledge-authoring process.',
        priority: c.confidenceScore >= 85 ? 'HIGH' : 'MEDIUM',
        requiredApproval: true,
        sourceSubmission: { at: submission.at, sourceLabel: submission.sourceLabel, submittedBy: submission.submittedBy },
      });
    }
  }
  return recommendations;
}

// ---------------------------------------------------------------------------
// PART 5 — Admin AI Assistant sections that reuse existing engines verbatim.
// ---------------------------------------------------------------------------

function buildDuplicateEvidenceRecommendations(ctx) {
  return ctx.witnessQuality.findings
    .filter((f) => f.issue === 'EXACT_DUPLICATE_WITNESS' || f.issue === 'SUPPORTING_REPEATS_PRIMARY' || f.issue === 'CROSS_REFERENCE_MISTYPED_AS_SUPPORTING')
    .map((f) => ({
      type: 'DUPLICATE_EVIDENCE',
      title: `Potential duplicate evidence on ${humanizeTopicId(f.topicId)}`,
      reference: null,
      topicIds: [f.topicId],
      confidence: 'HIGH',
      supportingEvidence: [`Issue: ${f.issue}`, `Detail: ${JSON.stringify(f.detail)}`],
      sourceSessions: null,
      reasoning: `services/knowledgeCoverageAnalyticsEngine.js buildWitnessQualityReport() already deterministically detected this — same normalized (book:chapter:verse) key appearing more than once, or a cross reference mistyped as a supporting witness, on ${humanizeTopicId(f.topicId)}.`,
      existingProductionCoverage: 'Already live (this is a quality finding about existing coverage, not a gap).',
      suggestedAction: 'Review and, if confirmed, consolidate the duplicate witness entry for this topic.',
      priority: 'MEDIUM',
      requiredApproval: true,
    }));
}

function buildRuleImprovementRecommendations() {
  const optimizer = getRulesOptimizer();
  if (optimizer.unavailable) {
    return { available: false, reason: optimizer.reason, recommendations: [] };
  }
  let report;
  try {
    report = optimizer.replay({ dryRun: true });
  } catch (e) {
    return { available: false, reason: e.message, recommendations: [] };
  }
  // The candidate queue can legitimately contain thousands of matching
  // actions at once (this is real backlog, not fabricated). Summarizing and
  // organizing means surfacing the aggregate impact plus a bounded, useful
  // sample — not flooding the Admin recommendation index with one row per
  // action when the existing supportGraphCandidateQueue already tracks
  // every individual candidate.
  const MAX_SAMPLE_ACTIONS = 15;
  const recommendations = (report.actions || []).slice(0, MAX_SAMPLE_ACTIONS).map((a) => ({
    type: 'RULE_IMPROVEMENT',
    title: `Rule-based candidate-queue action: ${a.rule}`,
    reference: null,
    topicIds: [],
    confidence: 'HIGH',
    supportingEvidence: [`Rule: ${a.rule}`, `Reason: ${a.reason}`],
    sourceSessions: null,
    reasoning: 'services/knowledgeApprovalRulesOptimizer.js replay(dryRun:true) — a deterministic, non-doctrinal, evidence-proven rule (dedupe or already-approved-evidence rejection), never a semantic guess.',
    existingProductionCoverage: 'N/A — this concerns pending IOG/ICOJ candidate-queue review burden, not live doctrine.',
    suggestedAction: 'Apply via the existing rules-optimizer script (dryRun:false) if Admin confirms.',
    priority: 'LOW',
    requiredApproval: true,
  }));
  const summaryRecommendation = {
    type: 'RULE_IMPROVEMENT',
    title: `Candidate-queue rule sweep: ${report.actionsPlanned} action(s) available`,
    reference: null,
    topicIds: [],
    confidence: 'HIGH',
    supportingEvidence: [
      `Rules evaluated: ${report.rulesEvaluated.join(', ')}.`,
      `Actions by rule: ${JSON.stringify(report.actionsByRule)}.`,
      `Would reduce active pending-review queue by ${report.manualWorkReduction.candidatesRemovedFromActiveQueue} (${report.manualWorkReduction.percentReduction}%).`,
    ],
    sourceSessions: null,
    reasoning: 'Aggregate dry-run result of services/knowledgeApprovalRulesOptimizer.js — deterministic, non-doctrinal, zero-false-positive-by-design rules only (see falsePositiveRisk in the underlying report).',
    existingProductionCoverage: 'N/A — this concerns pending IOG/ICOJ candidate-queue review burden, not live doctrine.',
    suggestedAction: `Run the existing rules-optimizer script with dryRun:false if Admin confirms; ${MAX_SAMPLE_ACTIONS} of ${report.actionsPlanned} individual actions are sampled below for review.`,
    priority: report.actionsPlanned > 0 ? 'MEDIUM' : 'LOW',
    requiredApproval: true,
  };

  return {
    available: true,
    rulesEvaluated: report.rulesEvaluated,
    actionsPlanned: report.actionsPlanned,
    manualWorkReduction: report.manualWorkReduction,
    recommendations: report.actionsPlanned > 0 ? [summaryRecommendation, ...recommendations] : recommendations,
  };
}

function buildRelationshipAndCrossReferenceSuggestions(ctx) {
  const relationshipLinks = [];
  const crossReferences = [];
  for (const topic of ctx.coverage.topics) {
    if (!(topic.knownGaps || []).includes('NO_CROSS_REFERENCES')) continue;
    const allWitnesses = [...topic.primaryWitnesses, ...topic.supportingWitnesses];
    const otherTopicMatches = new Map();
    for (const witness of allWitnesses) {
      const matches = findTopicMatchesForReference(witness, ctx.registry).filter((m) => m.topicId !== topic.topicId);
      for (const m of matches) {
        if (!otherTopicMatches.has(m.topicId)) otherTopicMatches.set(m.topicId, []);
        otherTopicMatches.get(m.topicId).push({ witness, matchKind: m.matchKind, matchedWitness: m.matchedWitness });
      }
    }
    for (const [otherTopicId, matchDetails] of otherTopicMatches.entries()) {
      const rec = {
        type: 'RELATIONSHIP_LINK',
        title: `Link ${humanizeTopicId(topic.topicId)} to ${humanizeTopicId(otherTopicId)}`,
        reference: matchDetails[0].witness,
        topicIds: [topic.topicId, otherTopicId],
        confidence: matchDetails.length >= 2 ? 'HIGH' : 'MEDIUM',
        supportingEvidence: matchDetails.map((m) => `${m.witness} shares book/chapter structure with ${m.matchedWitness} (${m.matchKind}), which is already an approved witness on ${humanizeTopicId(otherTopicId)}.`),
        sourceSessions: null,
        reasoning: `${humanizeTopicId(topic.topicId)} currently has no cross references recorded, but its own approved witness set already structurally overlaps with ${humanizeTopicId(otherTopicId)}'s approved witness set (same book+chapter — Scripture's own structure, not a semantic inference).`,
        existingProductionCoverage: `Both topics already live; only the explicit cross-reference link is missing.`,
        suggestedAction: `Consider adding an explicit RELATED_DOCTRINE / CROSS_REFERENCE relationship between ${topic.topicId} and ${otherTopicId} through the existing relationship-authoring process.`,
        priority: matchDetails.length >= 2 ? 'MEDIUM' : 'LOW',
        requiredApproval: true,
      };
      relationshipLinks.push(rec);
      crossReferences.push({ ...rec, type: 'CROSS_REFERENCE', title: `Suggested cross reference: ${humanizeTopicId(topic.topicId)} ↔ ${humanizeTopicId(otherTopicId)}` });
    }
  }
  return { relationshipLinks, crossReferences };
}

function buildOriginalLanguageAndHistoricalSuggestions(patterns, ctx) {
  const originalLanguage = [];
  const historical = [];
  const requestedTopicIds = new Set(
    patterns.topQuestionCategories.map((c) => matchFreeTextToTopicId(c.category, ctx.registry)).filter(Boolean)
  );
  for (const topic of ctx.coverage.topics) {
    if (!requestedTopicIds.has(topic.topicId)) continue;
    const cat = patterns.topQuestionCategories.find((c) => matchFreeTextToTopicId(c.category, ctx.registry) === topic.topicId);
    if ((topic.knownGaps || []).includes('NO_ORIGINAL_LANGUAGE_SUPPORT')) {
      originalLanguage.push({
        type: 'ORIGINAL_LANGUAGE_EXPANSION',
        title: `Suggested original-language expansion: ${humanizeTopicId(topic.topicId)}`,
        reference: topic.primaryWitnesses[0] || null,
        topicIds: [topic.topicId],
        confidence: cat && cat.count >= 5 ? 'MEDIUM' : 'LOW',
        supportingEvidence: [`Requested ${cat ? cat.count : 0} time(s) as "${cat ? cat.category : topic.topicId}".`, `knownGaps includes NO_ORIGINAL_LANGUAGE_SUPPORT (computed by knowledgeCoverageAnalyticsEngine.js).`],
        sourceSessions: cat ? cat.count : null,
        reasoning: `Founders are asking about this topic and it currently has no Strong's/original-language-eligible witness registered.`,
        existingProductionCoverage: 'No original-language coverage found for this topic\'s witnesses.',
        suggestedAction: 'Consider whether an existing witness for this topic has original-language data available via services/originalLanguageProvider.js that is simply not yet surfaced, or flag for research.',
        priority: 'LOW',
        requiredApproval: true,
      });
    }
    if ((topic.knownGaps || []).includes('NO_HISTORICAL_SUPPORT')) {
      historical.push({
        type: 'HISTORICAL_RESEARCH',
        title: `Suggested historical research: ${humanizeTopicId(topic.topicId)}`,
        reference: topic.primaryWitnesses[0] || null,
        topicIds: [topic.topicId],
        confidence: cat && cat.count >= 5 ? 'MEDIUM' : 'LOW',
        supportingEvidence: [`Requested ${cat ? cat.count : 0} time(s) as "${cat ? cat.category : topic.topicId}".`, 'knownGaps includes NO_HISTORICAL_SUPPORT.'],
        sourceSessions: cat ? cat.count : null,
        reasoning: `Founders are asking about this topic and no production-approved historical record (services/historicalKnowledgeProvider.js) currently references it.`,
        existingProductionCoverage: 'No historical record found for this topic.',
        suggestedAction: 'Consider historical-source research for this topic through the existing IOG/ICOJ historical-investigation pipeline.',
        priority: 'LOW',
        requiredApproval: true,
      });
    }
  }
  return { originalLanguage, historical };
}

function buildScripturePackAndTestCaseSuggestions(patterns, ctx) {
  const scripturePacks = [];
  const testCases = [];

  for (const [topicId, wq] of ctx.witnessQualityById.entries()) {
    if (wq.classification !== 'WEAK_SUPPORTING_EVIDENCE' && wq.classification !== 'NEEDS_REVIEW') continue;
    const requested = patterns.topQuestionCategories.find((c) => matchFreeTextToTopicId(c.category, ctx.registry) === topicId);
    if (!requested) continue; // only surface where Founders have actually asked
    scripturePacks.push({
      type: 'SCRIPTURE_PACK',
      title: `Suggested Scripture pack expansion: ${humanizeTopicId(topicId)}`,
      reference: null,
      topicIds: [topicId],
      confidence: requested.count >= 5 ? 'MEDIUM' : 'LOW',
      supportingEvidence: [`Witness quality classification: ${wq.classification}.`, `Requested ${requested.count} time(s).`],
      sourceSessions: requested.count,
      reasoning: `This topic is actively requested but its witness-quality classification indicates thin supporting evidence.`,
      existingProductionCoverage: `${wq.primaryWitnessCount} primary / ${wq.supportingWitnessCount} supporting witness(es) currently.`,
      suggestedAction: 'Consider expanding supporting witnesses for this topic through the existing knowledge-authoring process.',
      priority: 'MEDIUM',
      requiredApproval: true,
    });
  }

  // Suggested test cases: from real misquote/unresolved claims — every one
  // is a candidate regression-suite addition, following the same pattern as
  // scripts/alpha/decisionOwnershipSmoke.js and similar existing suites.
  for (const item of patterns.recurringScriptureReferencesFromLessons) {
    if (!item.claimTypes.includes('QUOTED_TEXT_DOES_NOT_MATCH_KJV')) continue;
    testCases.push({
      type: 'TEST_CASE',
      title: `Suggested regression test case: ${item.reference} misquote detection`,
      reference: item.reference,
      topicIds: [],
      confidence: item.distinctSubmitters >= 2 ? 'MEDIUM' : 'LOW',
      supportingEvidence: [`Observed as a KJV mismatch in ${item.requestCount} Lesson Alignment submission(s).`, item.sampleQuote ? `Sample: "${String(item.sampleQuote).slice(0, 140)}"` : null].filter(Boolean),
      sourceSessions: item.distinctSubmitters,
      reasoning: 'A recurring real-world misquote is a strong candidate for a permanent regression test guarding against future false-positive "matches" for this exact reference.',
      existingProductionCoverage: 'N/A — this proposes a new test, not a knowledge change.',
      suggestedAction: 'Add a case to the Lesson Alignment regression suite asserting this reference is correctly flagged as QUOTED_TEXT_DOES_NOT_MATCH_KJV.',
      priority: 'LOW',
      requiredApproval: true,
    });
  }

  return { scripturePacks, testCases };
}

// ---------------------------------------------------------------------------
// Top-level composition — the full Founder Operational Intelligence report.
// ---------------------------------------------------------------------------

function buildFounderOperationalIntelligenceReport(options = {}) {
  const ctx = buildKnowledgeContext();
  const trendAnalysis = computeTrendAnalysis(options);
  const patterns = computeRecurringPatterns(options);
  const knowledgeRecommendations = buildKnowledgeRecommendations(patterns, ctx);
  const evidenceCorrelationRecommendations = buildEvidenceCorrelationRecommendations(options, ctx);
  const duplicateEvidence = buildDuplicateEvidenceRecommendations(ctx);
  const ruleImprovements = buildRuleImprovementRecommendations();
  const { relationshipLinks, crossReferences } = buildRelationshipAndCrossReferenceSuggestions(ctx);
  const { originalLanguage, historical } = buildOriginalLanguageAndHistoricalSuggestions(patterns, ctx);
  const { scripturePacks, testCases } = buildScripturePackAndTestCaseSuggestions(patterns, ctx);

  const allRecommendations = [
    ...knowledgeRecommendations,
    ...evidenceCorrelationRecommendations,
    ...duplicateEvidence,
    ...ruleImprovements.recommendations,
    ...relationshipLinks,
    ...crossReferences,
    ...originalLanguage,
    ...historical,
    ...scripturePacks,
    ...testCases,
  ];

  const dailyOperationalSummary = {
    generatedAt: new Date().toISOString(),
    narrative: [
      `${patterns.totalFeedbackEntries} Founder feedback entries and ${patterns.totalLessonAlignmentSubmissions} Lesson Alignment submissions on record.`,
      trendAnalysis.status === 'COMPUTED'
        ? `Trend window: ${trendAnalysis.windowStart} to ${trendAnalysis.windowEnd} (${trendAnalysis.snapshotsInWindow} snapshots).`
        : 'Trend analysis is establishing its baseline (see foundertrends section).',
      `${allRecommendations.length} recommendation(s) generated this run across ${new Set(allRecommendations.map((r) => r.type)).size} categories — every one requires explicit Admin approval before any action is taken.`,
    ],
    totalRecommendations: allRecommendations.length,
    recommendationsByType: allRecommendations.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {}),
    recommendationsByPriority: allRecommendations.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {}),
  };

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    dailyOperationalSummary,
    founderTrends: trendAnalysis,
    recurringQuestions: {
      topQuestionCategories: patterns.topQuestionCategories,
      feedbackByTag: patterns.feedbackByTag,
    },
    knowledgeOpportunities: knowledgeRecommendations.filter((r) => r.type === 'KNOWLEDGE_GAP'),
    possibleExistingSolutions: knowledgeRecommendations.filter((r) => r.type === 'KNOWLEDGE_SATISFIED'),
    evidenceCorrelation: evidenceCorrelationRecommendations,
    potentialDuplicateEvidence: duplicateEvidence,
    potentialRuleImprovements: ruleImprovements,
    suggestedRelationshipLinks: relationshipLinks,
    suggestedCrossReferences: crossReferences,
    suggestedOriginalLanguageExpansions: originalLanguage,
    suggestedHistoricalResearch: historical,
    suggestedScripturePacks: scripturePacks,
    suggestedTestCases: testCases,
    allRecommendations,
  };
}

module.exports = {
  buildKnowledgeContext,
  computeTrendAnalysis,
  computeRecurringPatterns,
  resolveCoverageForReference,
  matchFreeTextToTopicId,
  humanizeTopicId,
  correlateEvidenceForSubmission,
  buildFounderOperationalIntelligenceReport,
};
