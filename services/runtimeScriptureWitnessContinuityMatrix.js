const SCRIPTURE_WITNESS_CONTINUITY_MATRIX = {
  creation_witness_continuity: {
    continuityNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'wisdom-anchor',
      'restoration-anchor'
    ],
    continuityReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'Proverbs 8:22-31',
      'John 1:1-14',
      'Colossians 1:15-17',
      'Revelation 21:1-23'
    ],
    continuityMode: 'genesis-to-revelation'
  },
  prophetic_witness_continuity: {
    continuityNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    continuityReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    continuityMode: 'precept-upon-precept'
  },
  covenant_witness_continuity: {
    continuityNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    continuityReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    continuityMode: 'covenant-continuity'
  },
  restoration_witness_continuity: {
    continuityNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    continuityReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    continuityMode: 'restoration-continuity'
  }
};

function getScriptureWitnessContinuity(key = '') {
  return SCRIPTURE_WITNESS_CONTINUITY_MATRIX[String(key || '').trim()] || null;
}

function listScriptureWitnessContinuities() {
  return SCRIPTURE_WITNESS_CONTINUITY_MATRIX;
}

module.exports = {
  getScriptureWitnessContinuity,
  listScriptureWitnessContinuities,
  SCRIPTURE_WITNESS_CONTINUITY_MATRIX
};
