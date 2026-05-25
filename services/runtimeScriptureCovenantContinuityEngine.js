const SCRIPTURE_COVENANT_CONTINUITY_ENGINE = {
  creation_covenant_continuity: {
    covenantNodes: [
      'creation-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    covenantReferences: [
      'Genesis 9:8-17',
      'Genesis 12:1-3',
      'Genesis 17:1-8',
      'Exodus 19:3-6',
      'Jeremiah 31:31-34',
      'Hebrews 8:6-13'
    ],
    covenantMode: 'genesis-to-revelation'
  },
  messiah_covenant_continuity: {
    covenantNodes: [
      'witness-anchor',
      'truth-anchor',
      'covenant-anchor',
      'restoration-anchor'
    ],
    covenantReferences: [
      'Isaiah 42:6',
      'Matthew 26:26-28',
      'Luke 22:20',
      'Hebrews 9:11-15',
      'Revelation 5:9-10'
    ],
    covenantMode: 'precept-upon-precept'
  },
  assembly_covenant_continuity: {
    covenantNodes: [
      'assembly-anchor',
      'promise-anchor',
      'covenant-anchor'
    ],
    covenantReferences: [
      'Deuteronomy 7:6-9',
      'Psalm 89:28-34',
      'Acts 2:38-39',
      'Romans 11:25-29',
      'Galatians 3:26-29'
    ],
    covenantMode: 'covenant-continuity'
  },
  eternal_covenant_continuity: {
    covenantNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    covenantReferences: [
      'Isaiah 55:3',
      'Ezekiel 37:26-28',
      'Hebrews 13:20-21',
      'Revelation 21:3-7',
      'Revelation 22:3-5'
    ],
    covenantMode: 'eternal-covenant'
  }
};

function getScriptureCovenantContinuity(key = '') {
  return SCRIPTURE_COVENANT_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureCovenantContinuities() {
  return SCRIPTURE_COVENANT_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureCovenantContinuity,
  listScriptureCovenantContinuities,
  SCRIPTURE_COVENANT_CONTINUITY_ENGINE
};
