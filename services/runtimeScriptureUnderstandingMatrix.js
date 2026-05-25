const SCRIPTURE_UNDERSTANDING_MATRIX = {
  understanding_foundation: {
    understandingNodes: [
      'wisdom-anchor',
      'understanding-anchor',
      'word-anchor',
      'light-anchor'
    ],
    understandingReferences: [
      'Proverbs 2:1-6',
      'Psalm 119:105',
      'Isaiah 8:20',
      'John 1:1-14',
      '2 Timothy 3:16-17'
    ],
    understandingMode: 'scripture-understanding'
  },
  prophetic_understanding: {
    understandingNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor'
    ],
    understandingReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    understandingMode: 'line-upon-line'
  },
  covenant_understanding: {
    understandingNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    understandingReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    understandingMode: 'covenant-continuity'
  },
  restoration_understanding: {
    understandingNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    understandingReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    understandingMode: 'restoration-continuity'
  }
};

function getScriptureUnderstandingMatrix(key = '') {
  return SCRIPTURE_UNDERSTANDING_MATRIX[String(key || '').trim()] || null;
}

function listScriptureUnderstandingMatrices() {
  return SCRIPTURE_UNDERSTANDING_MATRIX;
}

module.exports = {
  getScriptureUnderstandingMatrix,
  listScriptureUnderstandingMatrices,
  SCRIPTURE_UNDERSTANDING_MATRIX
};
