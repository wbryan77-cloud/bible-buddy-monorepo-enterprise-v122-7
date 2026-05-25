const CANONICAL_CONTEXT_ENGINE = {
  creation_context: {
    contextNodes: [
      'creation-anchor',
      'light-anchor',
      'garden-anchor',
      'word-anchor'
    ],
    contextReferences: [
      'Genesis 1-3',
      'Psalm 33:6',
      'John 1:1-14',
      'Romans 8:18-23'
    ],
    contextMode: 'genesis-to-revelation'
  },
  covenant_context: {
    contextNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    contextReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Acts 2',
      'Revelation 11:15'
    ],
    contextMode: 'line-upon-line'
  },
  witness_context: {
    contextNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    contextReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 21-22'
    ],
    contextMode: 'cross-book-context'
  },
  restoration_context: {
    contextNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    contextReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    contextMode: 'restoration-continuity'
  }
};

function getCanonicalContext(key = '') {
  return CANONICAL_CONTEXT_ENGINE[String(key || '').trim()] || null;
}

function listCanonicalContexts() {
  return CANONICAL_CONTEXT_ENGINE;
}

module.exports = {
  getCanonicalContext,
  listCanonicalContexts,
  CANONICAL_CONTEXT_ENGINE
};
