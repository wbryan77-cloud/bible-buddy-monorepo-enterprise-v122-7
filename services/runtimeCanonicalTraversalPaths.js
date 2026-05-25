const CANONICAL_TRAVERSAL_PATHS = {
  genesis_to_restoration_path: {
    pathNodes: [
      'creation-anchor',
      'light-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    references: [
      'Genesis 1-3',
      'Genesis 12',
      'Exodus 19',
      'Daniel 7',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    traversalType: 'genesis-to-revelation'
  },
  witness_to_word_path: {
    pathNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'assembly-anchor'
    ],
    references: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'John 1:1-14',
      'Acts 2'
    ],
    traversalType: 'cross-book-context'
  },
  covenant_to_kingdom_path: {
    pathNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor',
      'restoration-anchor'
    ],
    references: [
      'Genesis 12',
      'Jeremiah 31',
      'Daniel 7',
      'Revelation 11:15'
    ],
    traversalType: 'line-upon-line'
  },
  light_to_restoration_path: {
    pathNodes: [
      'light-anchor',
      'word-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    references: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ],
    traversalType: 'narrative-continuity'
  }
};

function getCanonicalTraversalPath(key = '') {
  return CANONICAL_TRAVERSAL_PATHS[String(key || '').trim()] || null;
}

function listCanonicalTraversalPaths() {
  return CANONICAL_TRAVERSAL_PATHS;
}

module.exports = {
  getCanonicalTraversalPath,
  listCanonicalTraversalPaths,
  CANONICAL_TRAVERSAL_PATHS
};
