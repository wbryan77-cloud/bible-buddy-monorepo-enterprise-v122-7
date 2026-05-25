const SCRIPTURE_FAITH_CONTINUITY_ENGINE = {
  faith_foundation_continuity: {
    faithNodes: [
      'promise-anchor',
      'truth-anchor',
      'wisdom-anchor',
      'restoration-anchor'
    ],
    faithReferences: [
      'Genesis 15:6',
      'Habakkuk 2:4',
      'Psalm 46:10',
      'Isaiah 26:3-4',
      'Hebrews 11:1-6',
      'Revelation 14:12'
    ],
    faithMode: 'genesis-to-revelation'
  },
  messiah_faith_continuity: {
    faithNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'kingdom-anchor'
    ],
    faithReferences: [
      'Isaiah 53:11',
      'Matthew 8:10',
      'John 3:16',
      'Romans 3:21-26',
      'Galatians 2:20'
    ],
    faithMode: 'precept-upon-precept'
  },
  covenant_faith_continuity: {
    faithNodes: [
      'covenant-anchor',
      'assembly-anchor',
      'truth-anchor'
    ],
    faithReferences: [
      'Deuteronomy 32:20',
      'Psalm 119:30',
      'Acts 20:20-21',
      'Ephesians 2:8-10',
      'James 2:17-26'
    ],
    faithMode: 'covenant-continuity'
  },
  eternal_faith_continuity: {
    faithNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    faithReferences: [
      'Isaiah 25:9',
      'Romans 8:24-25',
      '1 Peter 1:3-9',
      'Revelation 21:1-7',
      'Revelation 22:3-5'
    ],
    faithMode: 'eternal-faith'
  }
};

function getScriptureFaithContinuity(key = '') {
  return SCRIPTURE_FAITH_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureFaithContinuities() {
  return SCRIPTURE_FAITH_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureFaithContinuity,
  listScriptureFaithContinuities,
  SCRIPTURE_FAITH_CONTINUITY_ENGINE
};
