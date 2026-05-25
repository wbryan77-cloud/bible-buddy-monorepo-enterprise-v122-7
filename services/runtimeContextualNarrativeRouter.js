const CONTEXTUAL_NARRATIVE_ROUTER = {
  creation_route: {
    startNode: 'creation-theme',
    nextNodes: ['light-theme', 'garden-theme', 'promise-theme'],
    references: [
      'Genesis 1-3',
      'Psalm 33:6',
      'John 1:1-5'
    ]
  },
  covenant_route: {
    startNode: 'promise-theme',
    nextNodes: ['covenant-theme', 'kingdom-theme', 'assembly-theme'],
    references: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Hebrews 8'
    ]
  },
  witness_route: {
    startNode: 'prophet-theme',
    nextNodes: ['witness-theme', 'word-theme', 'restoration-theme'],
    references: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ]
  },
  restoration_route: {
    startNode: 'restoration-theme',
    nextNodes: ['new-creation-theme'],
    references: [
      'Isaiah 65',
      'Romans 8:18-23',
      'Revelation 21-22'
    ]
  }
};

function getContextualNarrativeRoute(key = '') {
  return CONTEXTUAL_NARRATIVE_ROUTER[String(key || '').trim()] || null;
}

function listContextualNarrativeRoutes() {
  return CONTEXTUAL_NARRATIVE_ROUTER;
}

module.exports = {
  getContextualNarrativeRoute,
  listContextualNarrativeRoutes,
  CONTEXTUAL_NARRATIVE_ROUTER
};
