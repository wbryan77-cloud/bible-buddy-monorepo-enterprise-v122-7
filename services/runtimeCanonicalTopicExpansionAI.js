const { mapScriptureRelationships } = require('./runtimeScriptureRelationshipMapper');
const { buildTopContinuityChain } = require('./runtimeContinuityRankingEngine');

function expandCanonicalTopic({
  category = ''
} = {}) {
  const relationships = mapScriptureRelationships(category);

  if (!relationships.mapped) {
    return {
      expanded: false,
      category,
      reason: 'No canonical relationship mappings found.'
    };
  }

  const rankedExpansion = buildTopContinuityChain(
    relationships.relationships.linkedDomains
  );

  return {
    expanded: true,
    category,
    linkedDomains: relationships.relationships.linkedDomains,
    rankedExpansion,
    expansionObjective:
      'Expand Genesis to Revelation canonical continuity pathways.'
  };
}

module.exports = {
  expandCanonicalTopic
};
