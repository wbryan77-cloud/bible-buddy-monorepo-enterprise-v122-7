const SCRIPTURE_NARRATIVE_INTEGRITY_ENGINE = {
  creation_integrity: {
    integrityNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    integrityReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'John 1:1-14',
      'Colossians 1:15-17',
      'Revelation 21:1-23'
    ],
    integrityMode: 'genesis-to-revelation'
  },
  prophetic_integrity: {
    integrityNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    integrityReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    integrityMode: 'line-upon-line'
  },
  covenant_integrity: {
    integrityNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    integrityReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    integrityMode: 'covenant-continuity'
  },
  restoration_integrity: {
    integrityNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    integrityReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    integrityMode: 'restoration-continuity'
  }
};

function getScriptureNarrativeIntegrity(key = '') {
  return SCRIPTURE_NARRATIVE_INTEGRITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureNarrativeIntegrities() {
  return SCRIPTURE_NARRATIVE_INTEGRITY_ENGINE;
}

module.exports = {
  getScriptureNarrativeIntegrity,
  listScriptureNarrativeIntegrities,
  SCRIPTURE_NARRATIVE_INTEGRITY_ENGINE
};
