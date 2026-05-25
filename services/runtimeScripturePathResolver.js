const { getCanonicalDomain } = require('./runtimeCanonicalGraphRegistry');

function resolveScripturePath({
  category = ''
} = {}) {
  const normalized = String(category || '').trim().toLowerCase();
  const domain = getCanonicalDomain(normalized);

  if (!domain) {
    return {
      resolved: false,
      category: normalized,
      reason: 'No canonical domain found.'
    };
  }

  return {
    resolved: true,
    category: normalized,
    linkedDomains: domain.linkedDomains,
    traversalPriority: domain.traversalPriority,
    traversalStrategy: [
      'foundation',
      'prophetic-expansion',
      'messiah-fulfillment',
      'apostolic-witness',
      'revelation-completion'
    ]
  };
}

function buildConnectedPathMap(categories = []) {
  return categories.map(category => resolveScripturePath({ category }));
}

module.exports = {
  resolveScripturePath,
  buildConnectedPathMap
};
