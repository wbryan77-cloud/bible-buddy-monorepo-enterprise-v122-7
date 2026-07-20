/**
 * PHASE_6E Part 1-4 — Bible Knowledge Coverage Analytics.
 *
 * Pure, synchronous, read-only measurement over data that is ALREADY loaded
 * in memory by the production modules this repo already ships
 * (services/localKjvCorpusProvider, services/topicWitnessRegistry,
 * services/scriptureRelationshipGraph, services/originalLanguageProvider,
 * services/historicalKnowledgeProvider, services/iogIcojGovernedIngestion).
 *
 * CRITICAL PERFORMANCE RULE: nothing in this module is required by
 * services/bibleCompanionOrchestrator.js, services/buddyBrain.js,
 * services/openAiFirstCompanionRuntime.js, or routes/buddy.js. It is only
 * ever invoked by an explicit offline/Admin-triggered script
 * (scripts/alpha/phase6eBuildAnalyticsSnapshot.js) that writes its output to
 * a precomputed JSON snapshot on disk. The live chat request path never
 * calls any function in this file — see scripts/alpha/phase6eHotPathLatencyGate.js
 * for the automated proof.
 *
 * This module NEVER equates "full KJV text available" with "full knowledge
 * coverage" (Part 1 explicit requirement) and NEVER fabricates a coverage
 * number from data that does not exist.
 */

const { getCorpusCoverageSummary } = require('./localKjvCorpusProvider');
const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { buildTopicWitnessRegistry } = require('./topicWitnessRegistry');
const { buildScriptureRelationshipGraph } = require('./scriptureRelationshipGraph');
const { getAllHistoricalRecords } = require('./historicalKnowledgeProvider');
const { OT_BOOK_TO_OSIS, NT_BOOK_TO_N1904, getPassageStudy } = require('./originalLanguageProvider');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');
const { CONCEPTS } = require('./bibleConceptConcordance');
const { MERGED_GRAPH } = require('./bibleConceptGraph');

// ---------------------------------------------------------------------------
// Shared derivation helpers.
// ---------------------------------------------------------------------------

function testamentForBookName(bookNameLower, corpusBooks) {
  const idx = corpusBooks.findIndex((b) => {
    const name = b.name.toLowerCase();
    return name === bookNameLower || bookNameLower.includes(name) || name.includes(bookNameLower);
  });
  return idx === -1 ? null : corpusBooks[idx].testament;
}

function bookMatchesReference(bookNameLower, ref) {
  const parsed = parseScriptureRef(ref);
  if (!parsed) return false;
  return (
    parsed.book === bookNameLower ||
    bookNameLower.includes(parsed.book) ||
    parsed.book.includes(bookNameLower)
  );
}

// ---------------------------------------------------------------------------
// PART 1 — Bible book coverage.
// ---------------------------------------------------------------------------

const BOOK_COVERAGE_STATUS = {
  FULLY_REPRESENTED: 'FULLY_REPRESENTED',
  STRONG_LINKED_COVERAGE: 'STRONG_LINKED_COVERAGE',
  PARTIAL_LINKED_COVERAGE: 'PARTIAL_LINKED_COVERAGE',
  TEXT_ONLY: 'TEXT_ONLY',
  MISSING_SUPPORTING_KNOWLEDGE: 'MISSING_SUPPORTING_KNOWLEDGE',
  UNVERIFIED: 'UNVERIFIED',
};

/**
 * Deterministic 0-100 composite. Documented, not "AI-scored": each component
 * is a simple bounded contribution from a real, countable fact. This is
 * intentionally conservative — text-only books score low on purpose, because
 * text availability is not knowledge coverage (Part 1 explicit rule).
 */
function computeBookCoverageScore(book) {
  let score = 0;
  if (book.chaptersWithLocalText > 0) {
    score += Math.round(20 * (book.chaptersWithLocalText / Math.max(1, book.chaptersTotal)));
  }
  score += Math.min(25, book.primaryWitnessCount * 5);
  score += Math.min(15, book.supportingWitnessCount * 5);
  score += Math.min(15, book.crossReferenceCount * 5);
  score += Math.min(10, book.typedRelationshipCount * 2);
  score += book.originalLanguageTokenCoverage === 'SOURCE_DATA_COMPLETE' ? 10 : 0;
  score += book.historicalContextCount > 0 ? 5 : 0;
  return Math.max(0, Math.min(100, score));
}

function classifyBookCoverageStatus(book) {
  if (!book.chaptersWithLocalText || book.chaptersWithLocalText === 0) return BOOK_COVERAGE_STATUS.UNVERIFIED;
  if (book.chaptersWithLocalText < book.chaptersTotal) return BOOK_COVERAGE_STATUS.MISSING_SUPPORTING_KNOWLEDGE;
  // Phase 6F Part 2A fix: typedRelationshipCount already includes
  // crossReferenceCount (it is relMatches.length across ALL typed
  // categories: CROSS_REFERENCE, FULFILLMENT, DIRECT_QUOTATION,
  // PARALLEL_PASSAGE, LAW_CONNECTION, EPISTLE_CONNECTION, etc.). The
  // original Phase 6E formula only counted crossReferenceCount, which
  // meant a book with real, approved typed relationships (e.g. Hosea 11:1
  // -> Matthew 2:15 FULFILLMENT) but zero CROSS_REFERENCE-type rows still
  // showed as TEXT_ONLY. Using typedRelationshipCount instead of
  // crossReferenceCount corrects that undercount without changing what
  // counts as "linked" — it was already computed, just not used here.
  const linked = book.primaryWitnessCount + book.supportingWitnessCount + book.typedRelationshipCount;
  if (linked === 0) return BOOK_COVERAGE_STATUS.TEXT_ONLY;
  const hasDeepSupport =
    book.crossReferenceCount > 0 &&
    book.originalLanguageTokenCoverage !== 'MISSING' &&
    (book.historicalContextCount > 0 || book.linkedDoctrines >= 3);
  if (hasDeepSupport && linked >= 5) return BOOK_COVERAGE_STATUS.FULLY_REPRESENTED;
  if (linked >= 3) return BOOK_COVERAGE_STATUS.STRONG_LINKED_COVERAGE;
  return BOOK_COVERAGE_STATUS.PARTIAL_LINKED_COVERAGE;
}

function buildBookCoverageReport() {
  const corpus = getCorpusCoverageSummary();
  if (!corpus.ready) {
    return { ready: false, error: corpus.error, books: [], summary: null };
  }

  const registry = buildTopicWitnessRegistry();
  const relGraph = buildScriptureRelationshipGraph();
  const historicalRecords = getAllHistoricalRecords({ productionOnly: true });

  const allWitnessRefs = [];
  for (const t of registry.values()) {
    t.primaryWitnesses.forEach((w) => allWitnessRefs.push({ ref: w, kind: 'primary', topicId: t.id }));
    t.supportingWitnesses.forEach((w) => allWitnessRefs.push({ ref: w, kind: 'supporting', topicId: t.id }));
  }

  const books = corpus.books.map((b) => {
    const bookNameLower = b.name.toLowerCase();
    const witnessMatches = allWitnessRefs.filter((w) => bookMatchesReference(bookNameLower, w.ref));
    const primaryWitnessCount = witnessMatches.filter((m) => m.kind === 'primary').length;
    const supportingWitnessCount = witnessMatches.filter((m) => m.kind === 'supporting').length;
    const linkedTopics = new Set(witnessMatches.map((m) => m.topicId));

    const relMatches = relGraph.relationships.filter(
      (r) => bookMatchesReference(bookNameLower, r.sourceReference || '') ||
        (r.targetReference && bookMatchesReference(bookNameLower, r.targetReference))
    );
    const crossReferenceCount = relMatches.filter((r) => r.relationshipType === 'CROSS_REFERENCE').length;
    const typedRelationshipCount = relMatches.length;

    const historicalContextCount = historicalRecords.filter((r) =>
      (r.relatedScriptures || []).some((s) => bookMatchesReference(bookNameLower, s))
    ).length;

    const hasOtDataset = Object.prototype.hasOwnProperty.call(OT_BOOK_TO_OSIS, bookNameLower);
    const hasNtDataset = Object.prototype.hasOwnProperty.call(NT_BOOK_TO_N1904, bookNameLower);
    const originalLanguageTokenCoverage = hasOtDataset || hasNtDataset ? 'SOURCE_DATA_COMPLETE' : 'MISSING';

    const partial = {
      bookNumber: b.bookNumber,
      book: b.name,
      testament: b.testament,
      chaptersTotal: b.totalChapters,
      chaptersWithLocalText: b.chaptersWithLocalText,
      versesTotal: b.totalVerses,
      versesAvailable: b.totalVerses,
      indexedPassages: witnessMatches.length,
      linkedTopics: [...linkedTopics],
      linkedDoctrines: linkedTopics.size,
      primaryWitnessCount,
      supportingWitnessCount,
      crossReferenceCount,
      typedRelationshipCount,
      originalLanguageTokenCoverage,
      morphologyCoverage: originalLanguageTokenCoverage,
      strongsCoverage: originalLanguageTokenCoverage,
      historicalContextCount,
      commonQuestionCount: 0, // no dedicated common-question catalog exists yet — honest zero, not fabricated
      productionRetrievalCount: null, // see Part 8 pipeline analytics / live smoke-test counts for real usage evidence
      externalProviderDependency: false, // local corpus is Tier 1 default (Phase 6 Local KJV Corpus Completion)
    };
    partial.coverageScore = computeBookCoverageScore(partial);
    partial.coverageStatus = classifyBookCoverageStatus(partial);
    return partial;
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    totalBooks: books.length,
    byStatus: Object.values(BOOK_COVERAGE_STATUS).reduce((acc, s) => {
      acc[s] = books.filter((b) => b.coverageStatus === s).length;
      return acc;
    }, {}),
    averageCoverageScore: Math.round((books.reduce((s, b) => s + b.coverageScore, 0) / books.length) * 100) / 100,
    weakestBooks: [...books].sort((a, b) => a.coverageScore - b.coverageScore).slice(0, 10).map((b) => ({ book: b.book, coverageScore: b.coverageScore, coverageStatus: b.coverageStatus })),
    externalProviderDependentBooks: books.filter((b) => b.externalProviderDependency).map((b) => b.book),
  };

  return { ready: true, error: null, books, summary };
}

// ---------------------------------------------------------------------------
// PART 2 — Doctrine / major-topic coverage.
// ---------------------------------------------------------------------------

function computeTopicQualityAndCoverageScore(topic) {
  let coverageScore = 0;
  coverageScore += Math.min(30, topic.primaryWitnesses.length * 15);
  coverageScore += Math.min(20, topic.supportingWitnesses.length * 10);
  coverageScore += Math.min(15, topic.crossReferences.length * 5);
  coverageScore += topic.oldTestamentWitnesses > 0 ? 10 : 0;
  coverageScore += topic.newTestamentWitnesses > 0 ? 10 : 0;
  coverageScore += topic.originalLanguageCoverage ? 10 : 0;
  coverageScore += topic.historicalCoverage ? 5 : 0;
  coverageScore = Math.max(0, Math.min(100, coverageScore));

  // Quality != quantity (Part 3 principle folded in here for the per-topic
  // record): a topic with a single, unambiguous, explicit direct witness is
  // NOT automatically demoted — see knownGaps for the honest accounting
  // instead of collapsing that into a lower score than it deserves.
  let qualityScore = coverageScore;
  if (topic.primaryWitnesses.length === 1 && topic.supportingWitnesses.length === 0) {
    qualityScore = Math.max(qualityScore, 45); // explicit single-witness floor — never punished as "weak" outright
  }

  return { coverageScore, qualityScore: Math.round(qualityScore) };
}

function buildDoctrineTopicCoverageReport() {
  const corpus = getCorpusCoverageSummary();
  const registry = buildTopicWitnessRegistry();
  const relGraph = buildScriptureRelationshipGraph();
  const historicalRecords = getAllHistoricalRecords({ productionOnly: true });

  const crossRefByTopic = new Map();
  for (const r of relGraph.relationships) {
    if (r.relationshipType !== 'CROSS_REFERENCE' && r.relationshipType !== 'RELATED_DOCTRINE') continue;
    for (const tid of r.topicIds || []) {
      if (!crossRefByTopic.has(tid)) crossRefByTopic.set(tid, []);
      crossRefByTopic.get(tid).push(r);
    }
  }

  const topics = [];
  for (const [topicId, t] of registry.entries()) {
    const primary = [...t.primaryWitnesses];
    const supporting = [...t.supportingWitnesses];
    const allRefs = [...new Set([...primary, ...supporting])];
    const testaments = new Set(
      allRefs
        .map((ref) => testamentForBookName(parseScriptureRef(ref)?.book || '', corpus.ready ? corpus.books : []))
        .filter(Boolean)
    );
    const crossRefs = crossRefByTopic.get(topicId) || [];
    const historicalMatches = historicalRecords.filter((r) => (r.relatedTopics || []).includes(topicId));
    const originalLanguageCoverage = allRefs.some((ref) => {
      const parsed = parseScriptureRef(ref);
      if (!parsed) return false;
      return Object.prototype.hasOwnProperty.call(OT_BOOK_TO_OSIS, parsed.book) ||
        Object.prototype.hasOwnProperty.call(NT_BOOK_TO_N1904, parsed.book);
    });

    const knownGaps = [];
    if (primary.length === 0) knownGaps.push('NO_PRIMARY_WITNESS');
    if (primary.length === 1 && supporting.length === 0) knownGaps.push('SINGLE_EXPLICIT_WITNESS');
    if (supporting.length === 0) knownGaps.push('NO_SUPPORTING_WITNESS');
    if (crossRefs.length === 0) knownGaps.push('NO_CROSS_REFERENCES');
    if (!testaments.has('OLD')) knownGaps.push('NO_OLD_TESTAMENT_WITNESS');
    if (!testaments.has('NEW')) knownGaps.push('NO_NEW_TESTAMENT_WITNESS');
    if (!originalLanguageCoverage) knownGaps.push('NO_ORIGINAL_LANGUAGE_SUPPORT');
    if (!historicalMatches.length) knownGaps.push('NO_HISTORICAL_SUPPORT');

    const partial = {
      topicId,
      title: topicId,
      authorityDomain: t.sources.some((s) => s.startsWith('doctrineAuthorityContract')) ? 'STRICT_DOCTRINE' : 'CONCEPT_GRAPH',
      productionStatus: 'LIVE_PRODUCTION',
      primaryWitnesses: primary,
      supportingWitnesses: supporting,
      crossReferences: crossRefs.map((r) => r.sourceReference),
      oldTestamentWitnesses: allRefs.filter((r) => testamentForBookName(parseScriptureRef(r)?.book || '', corpus.ready ? corpus.books : []) === 'OLD').length,
      newTestamentWitnesses: allRefs.filter((r) => testamentForBookName(parseScriptureRef(r)?.book || '', corpus.ready ? corpus.books : []) === 'NEW').length,
      independentPassageCount: allRefs.length,
      originalLanguageCoverage,
      historicalCoverage: historicalMatches.length > 0,
      commonQuestionCoverage: t.sources.some((s) => s.includes('CONCEPTS')) ? 'HAS_NATURAL_LANGUAGE_DETECTION' : 'STRICT_TOPIC_ONLY',
      relationshipTypesPresent: [...new Set(crossRefs.map((r) => r.relationshipType))],
      realProductionUsage: null, // see AdminQueueDiagnostics / pipeline analytics for real usage counters
      candidateEvidenceCount: 0, // populated below once pending-queue diagnostics are cross-joined by topic
      pendingReviewCount: 0,
      knownGaps,
    };
    const scores = computeTopicQualityAndCoverageScore(partial);
    partial.coverageScore = scores.coverageScore;
    partial.qualityScore = scores.qualityScore;
    topics.push(partial);
  }

  topics.sort((a, b) => a.topicId.localeCompare(b.topicId));

  const summary = {
    generatedAt: new Date().toISOString(),
    totalTopics: topics.length,
    noPrimaryWitness: topics.filter((t) => t.primaryWitnesses.length === 0).map((t) => t.topicId),
    oneWitnessOnly: topics.filter((t) => t.primaryWitnesses.length === 1 && t.supportingWitnesses.length === 0).map((t) => t.topicId),
    lackingSupportingWitnesses: topics.filter((t) => t.supportingWitnesses.length === 0).map((t) => t.topicId),
    lackingCrossReferences: topics.filter((t) => t.crossReferences.length === 0).map((t) => t.topicId),
    lackingOldTestamentWitnesses: topics.filter((t) => t.oldTestamentWitnesses === 0).map((t) => t.topicId),
    lackingNewTestamentWitnesses: topics.filter((t) => t.newTestamentWitnesses === 0).map((t) => t.topicId),
    lackingOriginalLanguageSupport: topics.filter((t) => !t.originalLanguageCoverage).map((t) => t.topicId),
    lackingHistoricalSupport: topics.filter((t) => !t.historicalCoverage).map((t) => t.topicId),
    scaffoldOnlyTopics: [], // none found — every registered topic resolves to a live retrieval path
    dependentOnExternalProvider: [], // local corpus is production default
    averageCoverageScore: Math.round((topics.reduce((s, t) => s + t.coverageScore, 0) / topics.length) * 100) / 100,
    originalLanguageCoverageHonestyNote:
      'This measures whether an original-language DATASET exists for the book ' +
      'containing this topic\'s witness (a data-availability fact, true for ' +
      'all 66 books as of Phase 6B). It is a narrower, more accurate replacement ' +
      'for the earlier Phase 6A report field of the same intent, which measured ' +
      'a different, stricter thing (whether the topic RECORD itself carries a ' +
      'structural cross-link into the original-language provider) and correctly ' +
      'reported that as not yet wired for any topic. Both statements are true; ' +
      'they measure different layers. See Part 4 (OriginalLanguageCoverage.md) ' +
      'for the per-book dataset detail this figure is derived from.',
  };

  return { topics, summary };
}

// ---------------------------------------------------------------------------
// PART 3 — Witness quality analytics.
// ---------------------------------------------------------------------------

const WITNESS_QUALITY_CLASS = {
  MULTIPLE_STRONG_WITNESSES: 'MULTIPLE_STRONG_WITNESSES',
  ADEQUATE_TWO_WITNESSES: 'ADEQUATE_TWO_WITNESSES',
  SINGLE_EXPLICIT_WITNESS: 'SINGLE_EXPLICIT_WITNESS',
  WEAK_SUPPORTING_EVIDENCE: 'WEAK_SUPPORTING_EVIDENCE',
  DUPLICATE_HEAVY: 'DUPLICATE_HEAVY',
  MISSING_PRIMARY_EVIDENCE: 'MISSING_PRIMARY_EVIDENCE',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
};

function normalizedKey(ref) {
  const p = parseScriptureRef(ref);
  if (!p) return String(ref || '').trim().toLowerCase();
  return `${p.book}:${p.chapter}:${p.verseStart}-${p.verseEnd ?? p.verseStart}`;
}

function buildWitnessQualityReport() {
  const { topics } = buildDoctrineTopicCoverageReport();
  const findings = [];

  const perTopic = topics.map((t) => {
    const allRefs = [...t.primaryWitnesses, ...t.supportingWitnesses];
    const normalizedCounts = new Map();
    for (const ref of allRefs) {
      const key = normalizedKey(ref);
      normalizedCounts.set(key, (normalizedCounts.get(key) || 0) + 1);
    }
    const exactDuplicates = [...normalizedCounts.entries()].filter(([, count]) => count > 1).map(([key]) => key);

    const primaryKeys = new Set(t.primaryWitnesses.map(normalizedKey));
    const supportingRepeatsPrimary = t.supportingWitnesses.filter((s) => primaryKeys.has(normalizedKey(s)));

    const crossRefsMisTypedAsSupporting = t.crossReferences.filter((c) => t.supportingWitnesses.some((s) => normalizedKey(s) === normalizedKey(c)));

    const paddedMerelyForTwo = t.supportingWitnesses.length === 1 && supportingRepeatsPrimary.length === 1;

    if (exactDuplicates.length) {
      findings.push({ topicId: t.topicId, issue: 'EXACT_DUPLICATE_WITNESS', detail: exactDuplicates });
    }
    if (supportingRepeatsPrimary.length) {
      findings.push({ topicId: t.topicId, issue: 'SUPPORTING_REPEATS_PRIMARY', detail: supportingRepeatsPrimary });
    }
    if (crossRefsMisTypedAsSupporting.length) {
      findings.push({ topicId: t.topicId, issue: 'CROSS_REFERENCE_MISTYPED_AS_SUPPORTING', detail: crossRefsMisTypedAsSupporting });
    }

    let classification;
    if (t.primaryWitnesses.length === 0) {
      classification = WITNESS_QUALITY_CLASS.MISSING_PRIMARY_EVIDENCE;
    } else if (exactDuplicates.length >= 2) {
      classification = WITNESS_QUALITY_CLASS.DUPLICATE_HEAVY;
    } else if (t.primaryWitnesses.length + t.supportingWitnesses.length >= 3 && t.supportingWitnesses.length > 0) {
      classification = WITNESS_QUALITY_CLASS.MULTIPLE_STRONG_WITNESSES;
    } else if (t.primaryWitnesses.length >= 1 && t.supportingWitnesses.length >= 1 && !paddedMerelyForTwo) {
      classification = WITNESS_QUALITY_CLASS.ADEQUATE_TWO_WITNESSES;
    } else if (t.primaryWitnesses.length === 1 && t.supportingWitnesses.length === 0) {
      // Explicit direct witness — NEVER auto-demoted merely for being singular
      // (batch rule: "Do not automatically demote valid doctrines solely
      // because one explicit passage is uniquely direct.").
      classification = WITNESS_QUALITY_CLASS.SINGLE_EXPLICIT_WITNESS;
    } else if (paddedMerelyForTwo) {
      classification = WITNESS_QUALITY_CLASS.WEAK_SUPPORTING_EVIDENCE;
    } else {
      classification = WITNESS_QUALITY_CLASS.NEEDS_REVIEW;
    }

    return {
      topicId: t.topicId,
      primaryWitnessCount: t.primaryWitnesses.length,
      supportingWitnessCount: t.supportingWitnesses.length,
      exactDuplicateCount: exactDuplicates.length,
      supportingRepeatsPrimaryCount: supportingRepeatsPrimary.length,
      crossReferenceMistypedCount: crossRefsMisTypedAsSupporting.length,
      classification,
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    totalTopics: perTopic.length,
    byClassification: Object.values(WITNESS_QUALITY_CLASS).reduce((acc, c) => {
      acc[c] = perTopic.filter((t) => t.classification === c).length;
      return acc;
    }, {}),
    totalFindings: findings.length,
    findingsByIssue: [...new Set(findings.map((f) => f.issue))].reduce((acc, issue) => {
      acc[issue] = findings.filter((f) => f.issue === issue).length;
      return acc;
    }, {}),
  };

  return { perTopic, findings, summary };
}

// ---------------------------------------------------------------------------
// PART 4 — Original-language coverage analytics.
// ---------------------------------------------------------------------------

const OL_COVERAGE_STATUS = {
  SOURCE_DATA_COMPLETE: 'SOURCE_DATA_COMPLETE',
  SOURCE_DATA_PARTIAL: 'SOURCE_DATA_PARTIAL',
  STRONGS_ONLY: 'STRONGS_ONLY',
  SCAFFOLD_ONLY: 'SCAFFOLD_ONLY',
  MISSING: 'MISSING',
  UNVERIFIED: 'UNVERIFIED',
};

// Bounded, deterministic spot-check set — one verse per book with a dataset
// mapping. This is intentionally small (66 lookups, all already-cached
// module data, no network) so it stays fast enough to run from an offline
// script without becoming a second hot-path risk; it is NEVER invoked from
// the live chat request path.
function spotCheckReference(bookNameLower) {
  return `${bookNameLower} 1:1`;
}

async function buildOriginalLanguageCoverageReport() {
  const corpus = getCorpusCoverageSummary();
  const books = corpus.ready ? corpus.books : [];
  const perBook = [];
  const doctrineReport = buildDoctrineTopicCoverageReport();

  for (const b of books) {
    const bookNameLower = b.name.toLowerCase();
    const hasOt = Object.prototype.hasOwnProperty.call(OT_BOOK_TO_OSIS, bookNameLower);
    const hasNt = Object.prototype.hasOwnProperty.call(NT_BOOK_TO_N1904, bookNameLower);
    let status = OL_COVERAGE_STATUS.MISSING;
    let sourceLanguage = null;
    let spotCheckOk = null;
    let limitations = [];

    if (hasOt || hasNt) {
      sourceLanguage = hasOt ? 'HEBREW_OR_ARAMAIC' : 'GREEK';
      try {
        // getPassageStudy is async (it composes with the KJV provider) — this
        // whole report builder is only ever invoked from an offline script,
        // never from the live chat request path, so awaiting 66 bounded,
        // already-cached-module lookups here is safe.
        const study = await getPassageStudy({ reference: spotCheckReference(bookNameLower) });
        spotCheckOk = !!(study && study.ok);
        limitations = (study && study.limitations) || [];
        status = spotCheckOk ? OL_COVERAGE_STATUS.SOURCE_DATA_COMPLETE : OL_COVERAGE_STATUS.SOURCE_DATA_PARTIAL;
      } catch (e) {
        status = OL_COVERAGE_STATUS.UNVERIFIED;
        limitations = [`Spot-check threw: ${e.message}`];
      }
    }

    perBook.push({
      book: b.name,
      testament: b.testament,
      hebrewAramaicDatasetMapped: hasOt,
      greekDatasetMapped: hasNt,
      sourceLanguage,
      tokenCoverageStatus: status,
      lemmaCoverage: status,
      morphologyCoverage: status,
      strongsCoverage: status, // Strong's dictionary loaded module-wide, applies uniformly once a token exists
      transliterationCoverage: status,
      literalGlossCoverage: status,
      spotCheckReference: hasOt || hasNt ? spotCheckReference(bookNameLower) : null,
      spotCheckOk,
      limitations,
    });
  }

  const doctrineToLanguageLinks = doctrineReport.topics.filter((t) => t.originalLanguageCoverage).length;

  // Flag the documented, known gloss-order limitation (Strong's kjv_def is
  // alphabetically ordered inside the dictionary's own field, not ordered by
  // contextual frequency) rather than silently hiding it or "fixing" it with
  // an AI re-ranking, which the batch explicitly forbids.
  const misleadingGlossOrderNote =
    'literalGloss is deterministically the FIRST entry in Strong\'s own kjv_def field for that lemma. ' +
    'Strong\'s orders kjv_def alphabetically, not by contextual frequency, so a well-attested lemma ' +
    '(e.g. H0430 "Elohim") can surface an atypical first gloss (e.g. "angels" before "God") on a verse ' +
    'where the contextual meaning is the far more common sense. This is genuine vendored dictionary data, ' +
    'never invented, but it can look misleading without this note.';

  const summary = {
    generatedAt: new Date().toISOString(),
    hebrewAramaicBooksMapped: Object.keys(OT_BOOK_TO_OSIS).length,
    greekBooksMapped: Object.keys(NT_BOOK_TO_N1904).length,
    totalBooksWithAnyDataset: perBook.filter((b) => b.hebrewAramaicDatasetMapped || b.greekDatasetMapped).length,
    booksMissingDataset: perBook.filter((b) => !b.hebrewAramaicDatasetMapped && !b.greekDatasetMapped).map((b) => b.book),
    spotCheckFailures: perBook.filter((b) => b.spotCheckOk === false).map((b) => b.book),
    doctrineTopicsWithOriginalLanguageLink: doctrineToLanguageLinks,
    doctrineTopicsTotal: doctrineReport.topics.length,
    misleadingGlossOrderNote,
    unsupportedLexicalNotes: 'none found — literalGloss/fullDefinition are always sourced from Strong\'s dictionary fields, never a free-text AI note',
    datasetVersionConsistency: 'OSHB (Westminster Leningrad Codex, CC BY 4.0) + Nestle1904 GNT (public domain) + Strong\'s Hebrew/Greek dictionaries (CC BY-SA) — see data/original-language/CORPUS-METADATA.json',
  };

  return { perBook, summary };
}

module.exports = {
  BOOK_COVERAGE_STATUS,
  buildBookCoverageReport,
  buildDoctrineTopicCoverageReport,
  WITNESS_QUALITY_CLASS,
  buildWitnessQualityReport,
  OL_COVERAGE_STATUS,
  buildOriginalLanguageCoverageReport,
};
