const MESSIAH_WITNESS_MATRIX = {
  messiah_birth_witness: {
    witnessNodes: [
      'promise-anchor',
      'witness-anchor',
      'word-anchor'
    ],
    witnessReferences: [
      'Genesis 3:15',
      'Isaiah 7:14',
      'Micah 5:2',
      'Matthew 1:20-23',
      'Luke 2:10-11'
    ],
    witnessMode: 'birth-continuity'
  },
  messiah_suffering_witness: {
    witnessNodes: [
      'prophet-anchor',
      'witness-anchor',
      'restoration-anchor'
    ],
    witnessReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Zechariah 12:10',
      'John 19:34-37',
      'Luke 24:25-27'
    ],
    witnessMode: 'suffering-continuity'
  },
  messiah_word_witness: {
    witnessNodes: [
      'word-anchor',
      'light-anchor',
      'wisdom-anchor'
    ],
    witnessReferences: [
      'Genesis 1:1-3',
      'Psalm 33:6',
      'John 1:1-14',
      'Hebrews 1:1-3',
      'Revelation 19:13'
    ],
    witnessMode: 'word-continuity'
  },
  messiah_kingdom_witness: {
    witnessNodes: [
      'kingdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    witnessReferences: [
      'Daniel 7',
      'Isaiah 9:6-7',
      'Luke 1:31-33',
      'Revelation 11:15',
      'Revelation 21-22'
    ],
    witnessMode: 'kingdom-continuity'
  }
};

function getMessiahWitnessMatrix(key = '') {
  return MESSIAH_WITNESS_MATRIX[String(key || '').trim()] || null;
}

function listMessiahWitnessMatrices() {
  return MESSIAH_WITNESS_MATRIX;
}

module.exports = {
  getMessiahWitnessMatrix,
  listMessiahWitnessMatrices,
  MESSIAH_WITNESS_MATRIX
};
