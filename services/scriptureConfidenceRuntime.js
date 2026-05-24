const { buildTraversalContext } = require('./topicContinuityTraversal');

function calculateScriptureConfidence({ references = [], continuityScore = 0, scriptureFirst = true }) {
  let confidence = 50;

  if (scriptureFirst) confidence += 15;
  if (references.length >= 3) confidence += 15;
  if (references.length >= 6) confidence += 10;
  if (continuityScore >= 80) confidence += 10;

  return Math.min(confidence, 100);
}

function buildConfidenceRuntime({ topic = '', references = [], continuityScore = 0 }) {
  const traversal = buildTraversalContext(topic);

  return {
    topic,
    continuityScore,
    canonicalTraversalScore: traversal.continuityScore,
    scriptureConfidence: calculateScriptureConfidence({
      references,
      continuityScore,
      scriptureFirst: true,
    }),
    scriptureFirst: true,
    canonicalTraversalEnabled: true,
    references,
    expandedParallelVerses: traversal.expandedParallelVerses,
  };
}

module.exports = {
  calculateScriptureConfidence,
  buildConfidenceRuntime,
};
