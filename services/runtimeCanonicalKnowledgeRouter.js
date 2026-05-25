const CANONICAL_KNOWLEDGE_ROUTER = {
  foundational_router: {
    routerNodes: [
      'creation-anchor',
      'garden-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    routerReferences: [
      'Genesis 1-3',
      'Genesis 12',
      'Genesis 17',
      'Exodus 19-20',
      'Daniel 7'
    ],
    routerMode: 'foundational-continuity'
  },
  witness_router: {
    routerNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'assembly-anchor'
    ],
    routerReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'John 1:1-14',
      'Acts 2'
    ],
    routerMode: 'cross-book-context'
  },
  restoration_router: {
    routerNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    routerReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    routerMode: 'restoration-continuity'
  },
  light_router: {
    routerNodes: [
      'light-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    routerReferences: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ],
    routerMode: 'narrative-sequence'
  }
};

function getCanonicalKnowledgeRoute(key = '') {
  return CANONICAL_KNOWLEDGE_ROUTER[String(key || '').trim()] || null;
}

function listCanonicalKnowledgeRoutes() {
  return CANONICAL_KNOWLEDGE_ROUTER;
}

module.exports = {
  getCanonicalKnowledgeRoute,
  listCanonicalKnowledgeRoutes,
  CANONICAL_KNOWLEDGE_ROUTER
};
