/**
 * Phase 6 — shared read-only aggregation of every witness/topic already
 * live in production (services/doctrineAuthorityContract.BASE_CONTRACTS,
 * services/bibleConceptConcordance.CONCEPTS,
 * services/bibleConceptGraph.MERGED_GRAPH).
 *
 * Used by:
 *   - scripts/alpha/phase6BibleCoverageAnalyzer.js (coverage measurement)
 *   - services/iogIcojGovernedIngestion.js (duplicate/overlap detection for
 *     the governed IOG/ICOJ candidate pipeline)
 *
 * Read-only. Never mutates any of the underlying production modules.
 */

const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');
const { CONCEPTS } = require('./bibleConceptConcordance');
const { MERGED_GRAPH } = require('./bibleConceptGraph');

function buildTopicWitnessRegistry() {
  const registry = new Map();

  function ensureTopic(id) {
    if (!registry.has(id)) {
      registry.set(id, {
        id,
        sources: [],
        primaryWitnesses: new Set(),
        supportingWitnesses: new Set(),
        crossReferenceTopicIds: new Set(),
      });
    }
    return registry.get(id);
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

  return registry;
}

/**
 * Locate every topic whose primary or supporting witness set shares the
 * same book+chapter as `reference` (Scripture's own structural context —
 * never an inferred/semantic match). Returns an array of
 * { topicId, matchKind: 'EXACT_DUPLICATE' | 'SAME_CHAPTER_AS_PRIMARY' |
 *   'SAME_CHAPTER_AS_SUPPORTING' | 'SAME_BOOK_ONLY', matchedWitness }.
 */
function findTopicMatchesForReference(reference, registry) {
  const parsed = parseScriptureRef(reference);
  if (!parsed) return [];

  const matches = [];
  for (const t of registry.values()) {
    const checkSet = (set, kindSameChapter) => {
      for (const w of set) {
        const wp = parseScriptureRef(w);
        if (!wp) continue;
        if (wp.book !== parsed.book) continue;
        if (wp.chapter === parsed.chapter) {
          const exact =
            wp.verseStart === parsed.verseStart && wp.verseEnd === parsed.verseEnd;
          matches.push({
            topicId: t.id,
            matchKind: exact ? 'EXACT_DUPLICATE' : kindSameChapter,
            matchedWitness: w,
          });
        } else {
          matches.push({ topicId: t.id, matchKind: 'SAME_BOOK_ONLY', matchedWitness: w });
        }
      }
    };
    checkSet(t.primaryWitnesses, 'SAME_CHAPTER_AS_PRIMARY');
    checkSet(t.supportingWitnesses, 'SAME_CHAPTER_AS_SUPPORTING');
  }
  return matches;
}

module.exports = {
  buildTopicWitnessRegistry,
  findTopicMatchesForReference,
};
