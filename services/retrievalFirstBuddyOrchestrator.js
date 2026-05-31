const { expandParallelVerses } = require('./parallelVerseExpansionEngine');
const { orderCanonicalTraversal } = require('./canonicalTraversalOrderingEngine');
const { scoreContinuity } = require('./continuityScoringRuntime');
const { buildStructuredVerseChainResponse } = require('./structuredVerseChainResponseBuilder');
const { suppressFallback } = require('./runtimeFallbackSuppression');
const { resolveDoctrineStudyChains } = require('./doctrineStudyCatalogResolver');
const { BIBLE_TOPIC_CATALOG } = require('./bibleTopicCatalog');
const { FEASTS_AND_PROPHECY_CATALOG } = require('./feastsAndProphecyCatalog');

async function orchestrateBuddyRuntime({ topic, scripture = [], message = '', catalogs = [] }) {
  const primaryScripture = scripture.map((ref) => ref.reference || ref).filter(Boolean);
  const resolved = resolveDoctrineStudyChains({
    topic,
    message,
    primaryScripture,
  });

  const catalogPayload = [
    ...catalogs,
    { bibleTopic: resolved.bibleKey ? { [resolved.bibleKey]: BIBLE_TOPIC_CATALOG[resolved.bibleKey] } : {} },
    {
      feasts: Object.fromEntries(
        (resolved.feastCatalogKeys || []).map((key) => [key, FEASTS_AND_PROPHECY_CATALOG[key]])
      ),
    },
  ];

  const expanded = expandParallelVerses(topic, catalogPayload);
  const ordered = orderCanonicalTraversal([
    ...resolved.scriptureChain,
    ...resolved.continuityChain,
    ...(expanded.parallelVerses || []),
    ...resolved.approvedStudyChain,
  ]);

  const continuity = scoreContinuity(ordered);

  const response = buildStructuredVerseChainResponse({
    topic,
    verses: ordered,
    parallels: expanded.parallelVerses,
    continuity,
  });

  return suppressFallback({
    ...response,
    bibleTopicChain: resolved.bibleTopicChain,
    continuityChain: resolved.continuityChain,
    approvedStudyChain: resolved.approvedStudyChain,
    genesisToRevelationPath: resolved.genesisToRevelationPath,
    genesisToRevelationSteps: resolved.genesisToRevelationSteps,
    authorityOrder: resolved.authorityOrder,
    feastCatalogKeys: resolved.feastCatalogKeys,
  });
}

module.exports = { orchestrateBuddyRuntime };
