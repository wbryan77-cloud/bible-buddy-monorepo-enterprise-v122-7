const SCRIPTURE_MESSIAH_WITNESS_ENGINE = {
  messiah_identity_witness: {
    witnessNodes: [
      'word-anchor',
      'truth-anchor',
      'witness-anchor',
      'kingdom-anchor'
    ],
    witnessReferences: [
      'Genesis 3:15',
      'Isaiah 7:14',
      'Isaiah 9:6-7',
      'Micah 5:2',
      'John 1:1-14',
      'John 20:30-31'
    ],
    witnessMode: 'genesis-to-revelation'
  },
  messiah_son_of_god_witness: {
    witnessNodes: [
      'truth-anchor',
      'light-anchor',
      'witness-anchor',
      'restoration-anchor'
    ],
    witnessReferences: [
      'Psalm 2:7',
      'Isaiah 42:1',
      'Matthew 3:16-17',
      'Matthew 16:15-17',
      'John 10:36',
      'Hebrews 1:1-5'
    ],
    witnessMode: 'precept-upon-precept'
  },
  messiah_word_of_god_witness: {
    witnessNodes: [
      'word-anchor',
      'light-anchor',
      'wisdom-anchor'
    ],
    witnessReferences: [
      'Genesis 1:1-3',
      'Psalm 33:6',
      'John 1:1-14',
      '1 John 1:1-2',
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
      'Daniel 7:13-14',
      'Luke 1:31-33',
      'John 18:36-37',
      'Revelation 11:15',
      'Revelation 22:1-5'
    ],
    witnessMode: 'kingdom-continuity'
  }
};

function getScriptureMessiahWitness(key = '') {
  return SCRIPTURE_MESSIAH_WITNESS_ENGINE[String(key || '').trim()] || null;
}

function listScriptureMessiahWitnesses() {
  return SCRIPTURE_MESSIAH_WITNESS_ENGINE;
}

module.exports = {
  getScriptureMessiahWitness,
  listScriptureMessiahWitnesses,
  SCRIPTURE_MESSIAH_WITNESS_ENGINE
};
