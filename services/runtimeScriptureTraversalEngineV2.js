const SCRIPTURE_TRAVERSAL_ENGINE_V2 = {
  genesis_to_revelation_engine: {
    traversalNodes: [
      'creation-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor',
      'witness-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    traversalReferences: [
      'Genesis 1-3',
      'Genesis 12',
      'Exodus 19',
      'Daniel 7',
      'Luke 24:25-27',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    traversalMode: 'genesis-to-revelation'
  },
  witness_engine: {
    traversalNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    traversalReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'John 1:1-14',
      'John 5:39'
    ],
    traversalMode: 'cross-book-context'
  },
  covenant_engine: {
    traversalNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    traversalReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Acts 2',
      'Revelation 11:15'
    ],
    traversalMode: 'line-upon-line'
  },
  restoration_engine: {
    traversalNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    traversalReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    traversalMode: 'restoration-continuity'
  }
};

function getScriptureTraversalEngineV2(key = '') {
  return SCRIPTURE_TRAVERSAL_ENGINE_V2[String(key || '').trim()] || null;
}

function listScriptureTraversalEnginesV2() {
  return SCRIPTURE_TRAVERSAL_ENGINE_V2;
}

module.exports = {
  getScriptureTraversalEngineV2,
  listScriptureTraversalEnginesV2,
  SCRIPTURE_TRAVERSAL_ENGINE_V2
};
