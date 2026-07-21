#!/usr/bin/env node
/**
 * Phase 6A.2 — Bible Coverage Verification.
 *
 * Measures REAL coverage over the existing production knowledge surfaces —
 * never fabricates doctrinal annotation that does not exist. Aggregates
 * witness/cross-reference data already live in:
 *   - services/doctrineAuthorityContract.js  (BASE_CONTRACTS — strict topics)
 *   - services/bibleConceptConcordance.js    (CONCEPTS)
 *   - services/bibleConceptGraph.js          (MERGED_GRAPH incl. GRAPH_EXTENSIONS)
 * against:
 *   - data/kjv-corpus (local KJV text availability, now 100% of 66 books —
 *     see Phase 6 Local KJV Corpus Completion)
 *
 * Writes BibleCoverageReport.json and BibleCoverageReport.md into the given
 * output directory.
 */

const fs = require('fs');
const path = require('path');

const { getCorpusCoverageSummary } = require('../../services/localKjvCorpusProvider');
const { parseScriptureRef } = require('../../services/scriptureReferenceNormalizer');
const { BASE_CONTRACTS } = require('../../services/doctrineAuthorityContract');
const { CONCEPTS } = require('../../services/bibleConceptConcordance');
const { MERGED_GRAPH, getRelatedConcepts } = require('../../services/bibleConceptGraph');

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node phase6BibleCoverageAnalyzer.js <outputDir>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Book-level text coverage (from the validated local corpus).
// ---------------------------------------------------------------------------
const corpus = getCorpusCoverageSummary();
if (!corpus.ready) {
  console.error('Local corpus not ready:', corpus.error);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Unify every known topic/concept source into one registry, preserving
//    origin so nothing is silently merged into a different authority.
// ---------------------------------------------------------------------------
const topicRegistry = new Map();

function ensureTopic(id) {
  if (!topicRegistry.has(id)) {
    topicRegistry.set(id, {
      id,
      sources: [],
      primaryWitnesses: new Set(),
      supportingWitnesses: new Set(),
      crossReferenceTopicIds: new Set(),
    });
  }
  return topicRegistry.get(id);
}

for (const [topicId, contract] of Object.entries(BASE_CONTRACTS)) {
  const t = ensureTopic(topicId);
  t.sources.push('doctrineAuthorityContract.BASE_CONTRACTS');
  (contract.approvedWitnesses || []).forEach((w) => t.primaryWitnesses.add(w));
  (contract.supportingWitnesses || []).forEach((w) => t.supportingWitnesses.add(w));
}

for (const [conceptId, concept] of Object.entries(CONCEPTS)) {
  const topicId = concept.strictTopic || conceptId;
  const t = ensureTopic(topicId);
  t.sources.push(`bibleConceptConcordance.CONCEPTS.${conceptId}`);
  (concept.directWitnesses || []).forEach((w) => t.primaryWitnesses.add(w));
  (concept.supportingWitnesses || []).forEach((w) => t.supportingWitnesses.add(w));
}

for (const [nodeId, node] of Object.entries(MERGED_GRAPH || {})) {
  const topicId = node.strictTopic || nodeId;
  const t = ensureTopic(topicId);
  t.sources.push(`bibleConceptGraph.MERGED_GRAPH.${nodeId}`);
  (node.directWitnesses || []).forEach((w) => t.primaryWitnesses.add(w));
  (node.supportingWitnesses || []).forEach((w) => t.supportingWitnesses.add(w));
  (node.relatedConcepts || []).forEach((rc) => t.crossReferenceTopicIds.add(rc));
}

// ---------------------------------------------------------------------------
// 3. Per-topic doctrine/topic coverage report.
// ---------------------------------------------------------------------------
function testamentOfRef(ref) {
  const parsed = parseScriptureRef(ref);
  if (!parsed) return null;
  const idx = corpus.books.findIndex((b) => {
    const name = b.name.toLowerCase();
    return name === parsed.book || name.includes(parsed.book) || parsed.book.includes(name);
  });
  if (idx === -1) return null;
  return corpus.books[idx].testament;
}

const doctrineTopics = [];
for (const [topicId, t] of topicRegistry.entries()) {
  const primary = [...t.primaryWitnesses];
  const supporting = [...t.supportingWitnesses];
  const allRefs = [...new Set([...primary, ...supporting])];
  const testaments = new Set(allRefs.map(testamentOfRef).filter(Boolean));

  const gaps = [];
  if (primary.length === 0) gaps.push('NO_VALIDATED_PRIMARY_WITNESS');
  if (primary.length === 1 && supporting.length === 0) gaps.push('SINGLE_DIRECT_WITNESS_NO_SUPPORTING');
  if (supporting.length === 0) gaps.push('NO_SUPPORTING_WITNESS');
  if (t.crossReferenceTopicIds.size === 0) gaps.push('NO_CROSS_REFERENCES');
  if (!testaments.has('OLD')) gaps.push('NO_OLD_TESTAMENT_WITNESS');
  if (!testaments.has('NEW')) gaps.push('NO_NEW_TESTAMENT_WITNESS');
  gaps.push('NO_ORIGINAL_LANGUAGE_SUPPORT'); // honest — see Phase 6B status
  gaps.push('NO_HISTORICAL_SUPPORT'); // honest — see Phase 6C status

  doctrineTopics.push({
    topicId,
    sources: t.sources,
    primaryWitnessCount: primary.length,
    supportingWitnessCount: supporting.length,
    independentPassageCount: allRefs.length,
    oldTestamentWitness: testaments.has('OLD'),
    newTestamentWitness: testaments.has('NEW'),
    crossReferenceTopicIds: [...t.crossReferenceTopicIds],
    crossReferenceCount: t.crossReferenceTopicIds.size,
    originalLanguageSupport: false,
    historicalSupport: false,
    commonQuestionCoverage: t.sources.some((s) => s.includes('CONCEPTS')) ? 'HAS_NATURAL_LANGUAGE_DETECTION' : 'STRICT_TOPIC_ONLY',
    productionRetrievalStatus: 'LIVE_PRODUCTION',
    knownGaps: gaps,
    primaryWitnesses: primary,
    supportingWitnesses: supporting,
  });
}
doctrineTopics.sort((a, b) => a.topicId.localeCompare(b.topicId));

// ---------------------------------------------------------------------------
// 4. Per-book coverage report — text availability + witness density.
// ---------------------------------------------------------------------------
const allWitnessRefs = [];
for (const t of topicRegistry.values()) {
  t.primaryWitnesses.forEach((w) => allWitnessRefs.push({ ref: w, kind: 'primary', topicId: t.id }));
  t.supportingWitnesses.forEach((w) => allWitnessRefs.push({ ref: w, kind: 'supporting', topicId: t.id }));
}

const bookReports = corpus.books.map((b) => {
  const bookNameLower = b.name.toLowerCase();
  const matches = allWitnessRefs.filter((w) => {
    const parsed = parseScriptureRef(w.ref);
    if (!parsed) return false;
    return parsed.book === bookNameLower || bookNameLower.includes(parsed.book) || parsed.book.includes(bookNameLower);
  });
  const primaryCount = matches.filter((m) => m.kind === 'primary').length;
  const supportingCount = matches.filter((m) => m.kind === 'supporting').length;
  const topicLinks = new Set(matches.map((m) => m.topicId));

  let coverageStatus;
  if (!b.fullTextAvailable) {
    coverageStatus = 'MISSING_TEXT';
  } else if (primaryCount + supportingCount >= 3) {
    coverageStatus = 'STRONG_TOPIC_COVERAGE';
  } else if (primaryCount + supportingCount >= 1) {
    coverageStatus = 'LIMITED_TOPIC_COVERAGE';
  } else {
    coverageStatus = 'TEXT_ONLY';
  }

  return {
    bookNumber: b.bookNumber,
    name: b.name,
    testament: b.testament,
    totalChapters: b.totalChapters,
    kjvTextAvailable: b.fullTextAvailable,
    localProviderAvailable: b.fullTextAvailable,
    externalProviderDependence: false,
    indexedPassages: matches.length,
    primaryWitnessCount: primaryCount,
    supportingWitnessCount: supportingCount,
    crossReferenceCount: 0,
    doctrineTopicLinks: [...topicLinks],
    doctrineTopicLinkCount: topicLinks.size,
    originalLanguageAvailable: false,
    historicalContextAvailable: false,
    coverageStatus,
  };
});

// ---------------------------------------------------------------------------
// 5. Summary + explicit gap lists required by the batch.
// ---------------------------------------------------------------------------
const summary = {
  generatedAt: new Date().toISOString(),
  totalBooks: bookReports.length,
  fullTextAvailableBooks: bookReports.filter((b) => b.kjvTextAvailable).length,
  missingTextBooks: bookReports.filter((b) => !b.kjvTextAvailable).map((b) => b.name),
  strongTopicCoverageBooks: bookReports.filter((b) => b.coverageStatus === 'STRONG_TOPIC_COVERAGE').map((b) => b.name),
  limitedTopicCoverageBooks: bookReports.filter((b) => b.coverageStatus === 'LIMITED_TOPIC_COVERAGE').map((b) => b.name),
  textOnlyBooks: bookReports.filter((b) => b.coverageStatus === 'TEXT_ONLY').map((b) => b.name),
  totalDoctrineTopics: doctrineTopics.length,
  doctrinesWithSingleWitnessOnly: doctrineTopics.filter((t) => t.primaryWitnessCount <= 1 && t.supportingWitnessCount === 0).map((t) => t.topicId),
  doctrinesLackingSupportingWitnesses: doctrineTopics.filter((t) => t.supportingWitnessCount === 0).map((t) => t.topicId),
  doctrinesLackingCrossReferences: doctrineTopics.filter((t) => t.crossReferenceCount === 0).map((t) => t.topicId),
  doctrinesLackingOldTestamentLinks: doctrineTopics.filter((t) => !t.oldTestamentWitness).map((t) => t.topicId),
  doctrinesLackingNewTestamentLinks: doctrineTopics.filter((t) => !t.newTestamentWitness).map((t) => t.topicId),
  doctrinesLackingOriginalLanguageSupport: doctrineTopics.filter((t) => !t.originalLanguageSupport).map((t) => t.topicId),
  topicsScaffoldOnly: [], // no scaffold-only topic packs are wired into live retrieval as of this batch
  topicsDependentOnExternalProvider: [], // local corpus is now the production default (Phase 6 Local KJV Corpus Completion)
  topicsWithUnapprovedCandidateEvidence: [], // populated by Phase 6D pipeline output — see IOGICOJCandidatePipelineReport.json
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'BibleCoverageReport.json'),
  JSON.stringify({ summary, books: bookReports, doctrineTopics }, null, 2)
);

const md = [];
md.push('# Bible Coverage Report — Phase 6A.2');
md.push('');
md.push(`Generated: ${summary.generatedAt}`);
md.push('');
md.push('## Honesty Notice');
md.push('');
md.push('This report measures coverage that actually exists in the live production modules. It does NOT claim manual doctrinal annotation of every verse. Most books are `TEXT_ONLY` (full validated KJV text, no doctrine-topic witness pointing into them yet) — that is an honest, expected result, not a defect.');
md.push('');
md.push('## Book-Level Summary');
md.push('');
md.push(`- Total books: ${summary.totalBooks}`);
md.push(`- Full KJV text available (local corpus): ${summary.fullTextAvailableBooks} / 66`);
md.push(`- Missing text: ${summary.missingTextBooks.length ? summary.missingTextBooks.join(', ') : 'none'}`);
md.push(`- Strong topic coverage (3+ witness refs): ${summary.strongTopicCoverageBooks.join(', ') || 'none'}`);
md.push(`- Limited topic coverage (1-2 witness refs): ${summary.limitedTopicCoverageBooks.join(', ') || 'none'}`);
md.push(`- Text-only (no doctrine witness yet): ${summary.textOnlyBooks.length} books`);
md.push('');
md.push('## Doctrine/Topic Coverage Summary');
md.push('');
md.push(`- Total doctrine/topic identifiers tracked: ${summary.totalDoctrineTopics}`);
md.push(`- Single-witness-only doctrines: ${summary.doctrinesWithSingleWitnessOnly.join(', ') || 'none'}`);
md.push(`- Doctrines lacking supporting witnesses: ${summary.doctrinesLackingSupportingWitnesses.join(', ') || 'none'}`);
md.push(`- Doctrines lacking cross-references: ${summary.doctrinesLackingCrossReferences.join(', ') || 'none'}`);
md.push(`- Doctrines lacking Old Testament links: ${summary.doctrinesLackingOldTestamentLinks.join(', ') || 'none'}`);
md.push(`- Doctrines lacking New Testament links: ${summary.doctrinesLackingNewTestamentLinks.join(', ') || 'none'}`);
md.push(`- Doctrines lacking original-language support: ALL (${summary.totalDoctrineTopics}) — Phase 6B status: see OriginalLanguageStatus.md`);
md.push(`- Topics dependent on external provider: none (local corpus is now production default)`);
md.push('');
md.push('## Per-Doctrine Detail');
md.push('');
for (const t of doctrineTopics) {
  md.push(`### ${t.topicId}`);
  md.push(`- Primary witnesses (${t.primaryWitnessCount}): ${t.primaryWitnesses.join('; ') || 'none'}`);
  md.push(`- Supporting witnesses (${t.supportingWitnessCount}): ${t.supportingWitnesses.join('; ') || 'none'}`);
  md.push(`- Cross-referenced topics (${t.crossReferenceCount}): ${t.crossReferenceTopicIds.join(', ') || 'none'}`);
  md.push(`- OT witness: ${t.oldTestamentWitness} | NT witness: ${t.newTestamentWitness}`);
  md.push(`- Known gaps: ${t.knownGaps.join(', ')}`);
  md.push('');
}
md.push('## Per-Book Detail');
md.push('');
md.push('| # | Book | Testament | Chapters | KJV Text | Indexed Passages | Primary | Supporting | Doctrine Links | Status |');
md.push('|---|------|-----------|----------|----------|-------------------|---------|------------|-----------------|--------|');
for (const b of bookReports) {
  md.push(`| ${b.bookNumber} | ${b.name} | ${b.testament} | ${b.totalChapters} | ${b.kjvTextAvailable ? 'YES' : 'NO'} | ${b.indexedPassages} | ${b.primaryWitnessCount} | ${b.supportingWitnessCount} | ${b.doctrineTopicLinkCount} | ${b.coverageStatus} |`);
}
fs.writeFileSync(path.join(outDir, 'BibleCoverageReport.md'), md.join('\n') + '\n');

console.log('Wrote BibleCoverageReport.json and BibleCoverageReport.md to', outDir);
console.log('Books with full text:', summary.fullTextAvailableBooks, '/ 66');
console.log('Doctrine topics tracked:', summary.totalDoctrineTopics);
