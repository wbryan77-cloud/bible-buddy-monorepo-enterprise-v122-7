const { buildCanonicalRelationshipGraph } = require('./canonicalRelationshipGraph');
const { buildLiveTraversal } = require('./liveRuntimeTraversalEngine');
const { buildScriptureChainContext } = require('./runtimeScriptureChainMemory');

function buildCanonicalStudyFlow({
  userId,
  topic = '',
  references = [],
}) {
  const relationshipGraph = buildCanonicalRelationshipGraph(topic);

  const traversal = buildLiveTraversal({
    topic,
    references: [
      ...references,
      ...(relationshipGraph.canonicalFlow || []),
    ],
    includeParallel: true,
    includeCanonicalOrdering: true,
  });

  const chainMemory = buildScriptureChainContext({
    userId,
    topic,
  });

  return {
    scriptureFirst: true,
    canonicalFlowEnabled: true,
    topic,
    relationshipGraph,
    traversal,
    chainMemory,
    recommendedStudyOrder: traversal.finalReferences,
    continuityReferences: chainMemory.priorReferences || [],
  };
}

function renderCanonicalStudyFlow(flow = {}) {
  return [
    `Topic: ${flow.topic || 'general-study'}`,
    '',
    'Recommended Canonical Study Flow:',
    ...((flow.recommendedStudyOrder || []).map((reference, index) => `${index + 1}. ${reference}`)),
  ].join('\n');
}

module.exports = {
  buildCanonicalStudyFlow,
  renderCanonicalStudyFlow,
};
