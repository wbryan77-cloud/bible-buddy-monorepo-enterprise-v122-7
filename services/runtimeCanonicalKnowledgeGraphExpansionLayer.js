const { listCanonicalDomains } = require('./runtimeCanonicalGraphRegistry');
const { mapScriptureRelationships } = require('./runtimeScriptureRelationshipMapper');

function expandCanonicalKnowledgeGraph() {
  const domains = listCanonicalDomains();

  const expandedGraph = Object.keys(domains).map(domain => {
    const relationships = mapScriptureRelationships(domain);

    return {
      domain,
      linkedDomains: relationships.relationships
        ? relationships.relationships.linkedDomains
        : [],
      traversalPriority: relationships.relationships
        ? relationships.relationships.traversalPriority
        : null
    };
  });

  return {
    expandedGraph,
    graphObjective:
      'Expand Genesis to Revelation canonical doctrine relationships and continuity structures.'
  };
}

module.exports = {
  expandCanonicalKnowledgeGraph
};
