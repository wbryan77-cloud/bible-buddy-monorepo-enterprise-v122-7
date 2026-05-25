const { getCanonicalDomain } = require('./runtimeCanonicalGraphRegistry');

function mapScriptureRelationships(category = '') {
  const normalized = String(category || '').trim().toLowerCase();
  const domain = getCanonicalDomain(normalized);

  if (!domain) {
    return {
      mapped: false,
      category: normalized,
      reason: 'No canonical relationship domain found.'
    };
  }

  return {
    mapped: true,
    category: normalized,
    relationships: {
      linkedDomains: domain.linkedDomains,
      continuityDepth: domain.linkedDomains.length,
      traversalPriority: domain.traversalPriority
    },
    relationshipObjective: 'Build connected Genesis to Revelation Scripture continuity.'
  };
}

function buildRelationshipNetwork(categories = []) {
  return categories.map(category => mapScriptureRelationships(category));
}

module.exports = {
  mapScriptureRelationships,
  buildRelationshipNetwork
};
