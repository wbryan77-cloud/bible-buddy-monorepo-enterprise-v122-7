const SCRIPTURE_ANCHOR_NETWORK = {
  creation_anchor: {
    anchorReferences: [
      'Genesis 1-2',
      'Psalm 33:6',
      'John 1:1-5',
      'Revelation 21:1-5'
    ],
    connectedAnchors: ['light-anchor', 'word-anchor', 'restoration-anchor'],
    traversalMode: 'genesis-to-revelation'
  },
  covenant_anchor: {
    anchorReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Hebrews 8'
    ],
    connectedAnchors: ['promise-anchor', 'kingdom-anchor', 'assembly-anchor'],
    traversalMode: 'line-upon-line'
  },
  kingdom_anchor: {
    anchorReferences: [
      'Daniel 2',
      'Daniel 7',
      'Isaiah 9:6-7',
      'Revelation 11:15'
    ],
    connectedAnchors: ['restoration-anchor', 'witness-anchor'],
    traversalMode: 'narrative-continuity'
  },
  witness_anchor: {
    anchorReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    connectedAnchors: ['word-anchor', 'restoration-anchor'],
    traversalMode: 'cross-book-context'
  },
  restoration_anchor: {
    anchorReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    connectedAnchors: ['new-creation-anchor', 'kingdom-anchor'],
    traversalMode: 'restoration-continuity'
  }
};

function getScriptureAnchor(key = '') {
  return SCRIPTURE_ANCHOR_NETWORK[String(key || '').trim()] || null;
}

function listScriptureAnchors() {
  return SCRIPTURE_ANCHOR_NETWORK;
}

module.exports = {
  getScriptureAnchor,
  listScriptureAnchors,
  SCRIPTURE_ANCHOR_NETWORK
};
