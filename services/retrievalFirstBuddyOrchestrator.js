const { expandParallelVerses } = require('./parallelVerseExpansionEngine');
const { orderCanonicalTraversal } = require('./canonicalTraversalOrderingEngine');
const { scoreContinuity } = require('./continuityScoringRuntime');
const { buildStructuredVerseChainResponse } = require('./structuredVerseChainResponseBuilder');
const { suppressFallback } = require('./runtimeFallbackSuppression');

async function orchestrateBuddyRuntime({ topic, scripture = [], catalogs = [] }) {
  const expanded = expandParallelVerses(topic, catalogs);
  const ordered = orderCanonicalTraversal([
    ...scripture,
    ...(expanded.parallelVerses || [])
  ]);

  const continuity = scoreContinuity(ordered);

  const response = buildStructuredVerseChainResponse({
    topic,
    verses: ordered,
    parallels: expanded.parallelVerses,
    continuity
  });

  return suppressFallback(response);
}

module.exports = { orchestrateBuddyRuntime };
