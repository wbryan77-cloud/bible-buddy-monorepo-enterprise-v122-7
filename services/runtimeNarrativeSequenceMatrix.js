const NARRATIVE_SEQUENCE_MATRIX = {
  creation_sequence: {
    sequenceNodes: [
      'creation-anchor',
      'light-anchor',
      'garden-anchor',
      'promise-anchor'
    ],
    sequenceReferences: [
      'Genesis 1-3',
      'Psalm 33:6',
      'John 1:1-14',
      'Genesis 12'
    ],
    sequenceMode: 'genesis-to-revelation'
  },
  covenant_sequence: {
    sequenceNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    sequenceReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Acts 2',
      'Revelation 11:15'
    ],
    sequenceMode: 'line-upon-line'
  },
  witness_sequence: {
    sequenceNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    sequenceReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 21-22'
    ],
    sequenceMode: 'cross-book-context'
  },
  restoration_sequence: {
    sequenceNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    sequenceReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    sequenceMode: 'restoration-continuity'
  }
};

function getNarrativeSequenceMatrix(key = '') {
  return NARRATIVE_SEQUENCE_MATRIX[String(key || '').trim()] || null;
}

function listNarrativeSequenceMatrices() {
  return NARRATIVE_SEQUENCE_MATRIX;
}

module.exports = {
  getNarrativeSequenceMatrix,
  listNarrativeSequenceMatrices,
  NARRATIVE_SEQUENCE_MATRIX
};
