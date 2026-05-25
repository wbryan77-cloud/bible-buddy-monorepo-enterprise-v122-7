const CANONICAL_GRAPH_REGISTRY = {
  continuityDomains: {
    faith: {
      linkedDomains: ['hope', 'obedience', 'righteousness'],
      traversalPriority: 1
    },
    salvation: {
      linkedDomains: ['grace', 'mercy', 'resurrection'],
      traversalPriority: 2
    },
    messiah: {
      linkedDomains: ['kingdom', 'covenant', 'prophetic_fulfillment'],
      traversalPriority: 3
    },
    kingdom: {
      linkedDomains: ['restoration', 'judgment', 'new_jerusalem'],
      traversalPriority: 4
    },
    holiness: {
      linkedDomains: ['obedience', 'truth', 'assembly'],
      traversalPriority: 5
    }
  },
  canonicalTraversalOrder: [
    'foundation',
    'prophetic-expansion',
    'messiah-fulfillment',
    'apostolic-witness',
    'revelation-completion'
  ],
  continuityGuardrails: [
    'Preserve Genesis to Revelation continuity.',
    'Avoid isolated verse fragmentation.',
    'Prefer contextual chapter continuity.',
    'Maintain canonical traversal sequencing.',
    'Preserve prophetic fulfillment linkage.'
  ]
};

function getCanonicalDomain(key = '') {
  return CANONICAL_GRAPH_REGISTRY.continuityDomains[String(key || '').trim()] || null;
}

function listCanonicalDomains() {
  return CANONICAL_GRAPH_REGISTRY.continuityDomains;
}

module.exports = {
  CANONICAL_GRAPH_REGISTRY,
  getCanonicalDomain,
  listCanonicalDomains
};
