const { buildTraversalContext, expandParallelVerses } = require('./topicContinuityTraversal');
const { sortCanonicalReferences } = require('./canonicalResponseFormatter');

function buildLiveTraversal({
  topic = '',
  references = [],
  includeParallel = true,
  includeCanonicalOrdering = true,
}) {
  const traversal = buildTraversalContext(topic);

  let finalReferences = [...references, ...traversal.primaryChain];

  if (includeParallel) {
    finalReferences.push(...expandParallelVerses(finalReferences));
  }

  finalReferences = [...new Set(finalReferences)];

  if (includeCanonicalOrdering) {
    finalReferences = sortCanonicalReferences(finalReferences);
  }

  return {
    topic,
    traversalEnabled: true,
    continuityScore: traversal.continuityScore,
    primaryChain: traversal.primaryChain,
    expandedParallelVerses: traversal.expandedParallelVerses,
    finalReferences,
    scriptureFirst: true,
    canonicalOrderingEnabled: includeCanonicalOrdering,
  };
}

function buildTraversalRendering(runtime = {}) {
  return [
    `Topic: ${runtime.topic || 'general-study'}`,
    '',
    'Scripture Continuity Chain:',
    ...(runtime.finalReferences || []).map((reference, index) => `${index + 1}. ${reference}`),
  ].join('\n');
}

module.exports = {
  buildLiveTraversal,
  buildTraversalRendering,
};
