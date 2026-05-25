const SCRIPTURE_CONTINUITY_MATRIX = {
  creation_matrix: {
    anchors: ['creation-anchor', 'light-anchor', 'word-anchor'],
    continuityReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'John 1:1-14',
      'Hebrews 1:1-3'
    ],
    continuityMode: 'cross-book-sequence'
  },
  covenant_matrix: {
    anchors: ['promise-anchor', 'covenant-anchor', 'assembly-anchor'],
    continuityReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Hebrews 8'
    ],
    continuityMode: 'line-upon-line'
  },
  kingdom_matrix: {
    anchors: ['kingdom-anchor', 'restoration-anchor'],
    continuityReferences: [
      'Daniel 2',
      'Daniel 7',
      'Isaiah 9:6-7',
      'Revelation 11:15'
    ],
    continuityMode: 'narrative-continuity'
  },
  witness_matrix: {
    anchors: ['prophet-anchor', 'witness-anchor', 'word-anchor'],
    continuityReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    continuityMode: 'contextual-reading'
  },
  restoration_matrix: {
    anchors: ['restoration-anchor', 'new-creation-anchor'],
    continuityReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    continuityMode: 'genesis-to-revelation'
  }
};

function getScriptureContinuityMatrix(key = '') {
  return SCRIPTURE_CONTINUITY_MATRIX[String(key || '').trim()] || null;
}

function listScriptureContinuityMatrices() {
  return SCRIPTURE_CONTINUITY_MATRIX;
}

module.exports = {
  getScriptureContinuityMatrix,
  listScriptureContinuityMatrices,
  SCRIPTURE_CONTINUITY_MATRIX
};
