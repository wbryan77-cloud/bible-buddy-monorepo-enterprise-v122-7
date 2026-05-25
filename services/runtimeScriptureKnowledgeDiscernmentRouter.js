const SCRIPTURE_KNOWLEDGE_DISCERNMENT_ROUTER = {
  wisdom_discernment_route: {
    routeNodes: [
      'wisdom-anchor',
      'understanding-anchor',
      'light-anchor',
      'word-anchor'
    ],
    routeReferences: [
      'Proverbs 2:1-6',
      'Psalm 119:105',
      'Isaiah 8:20',
      'John 1:1-14',
      'James 1:5'
    ],
    routeMode: 'scripture-discernment'
  },
  prophetic_discernment_route: {
    routeNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor'
    ],
    routeReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    routeMode: 'line-upon-line'
  },
  covenant_discernment_route: {
    routeNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    routeReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    routeMode: 'covenant-continuity'
  },
  restoration_discernment_route: {
    routeNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    routeReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    routeMode: 'restoration-continuity'
  }
};

function getScriptureKnowledgeDiscernmentRoute(key = '') {
  return SCRIPTURE_KNOWLEDGE_DISCERNMENT_ROUTER[String(key || '').trim()] || null;
}

function listScriptureKnowledgeDiscernmentRoutes() {
  return SCRIPTURE_KNOWLEDGE_DISCERNMENT_ROUTER;
}

module.exports = {
  getScriptureKnowledgeDiscernmentRoute,
  listScriptureKnowledgeDiscernmentRoutes,
  SCRIPTURE_KNOWLEDGE_DISCERNMENT_ROUTER
};
