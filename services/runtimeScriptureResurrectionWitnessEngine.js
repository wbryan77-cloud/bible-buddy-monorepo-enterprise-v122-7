const SCRIPTURE_RESURRECTION_WITNESS_ENGINE = {
  resurrection_promise_witness: {
    resurrectionNodes: [
      'promise-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    resurrectionReferences: [
      'Job 19:25-27',
      'Psalm 16:10',
      'Isaiah 26:19',
      'Daniel 12:2',
      'John 11:25-26',
      '1 Corinthians 15:20-22'
    ],
    resurrectionMode: 'genesis-to-revelation'
  },
  messiah_resurrection_witness: {
    resurrectionNodes: [
      'witness-anchor',
      'truth-anchor',
      'restoration-anchor'
    ],
    resurrectionReferences: [
      'Psalm 22',
      'Isaiah 53:10-12',
      'Matthew 28:1-10',
      'Luke 24:44-46',
      'Acts 2:22-36'
    ],
    resurrectionMode: 'precept-upon-precept'
  },
  assembly_resurrection_witness: {
    resurrectionNodes: [
      'assembly-anchor',
      'kingdom-anchor',
      'new-creation-anchor'
    ],
    resurrectionReferences: [
      'John 5:28-29',
      'Romans 6:3-5',
      '1 Thessalonians 4:13-17',
      '1 Corinthians 15:51-54',
      'Revelation 20:4-6'
    ],
    resurrectionMode: 'kingdom-continuity'
  },
  eternal_life_witness: {
    resurrectionNodes: [
      'light-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    resurrectionReferences: [
      'Isaiah 25:8',
      'John 3:16',
      'Romans 8:11',
      'Revelation 21:3-5',
      'Revelation 22:1-5'
    ],
    resurrectionMode: 'eternal-life-continuity'
  }
};

function getScriptureResurrectionWitness(key = '') {
  return SCRIPTURE_RESURRECTION_WITNESS_ENGINE[String(key || '').trim()] || null;
}

function listScriptureResurrectionWitnesses() {
  return SCRIPTURE_RESURRECTION_WITNESS_ENGINE;
}

module.exports = {
  getScriptureResurrectionWitness,
  listScriptureResurrectionWitnesses,
  SCRIPTURE_RESURRECTION_WITNESS_ENGINE
};
