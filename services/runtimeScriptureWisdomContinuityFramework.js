const SCRIPTURE_WISDOM_CONTINUITY_FRAMEWORK = {
  creation_wisdom_continuity: {
    wisdomNodes: [
      'creation-anchor',
      'wisdom-anchor',
      'light-anchor',
      'word-anchor'
    ],
    wisdomReferences: [
      'Genesis 1:1-5',
      'Proverbs 3:19-20',
      'Proverbs 8:22-31',
      'Psalm 104:24',
      'John 1:1-14',
      'Colossians 2:2-3'
    ],
    wisdomMode: 'genesis-to-revelation'
  },
  messiah_wisdom_continuity: {
    wisdomNodes: [
      'witness-anchor',
      'truth-anchor',
      'wisdom-anchor',
      'restoration-anchor'
    ],
    wisdomReferences: [
      'Isaiah 11:1-5',
      'Matthew 7:28-29',
      'Luke 2:40',
      '1 Corinthians 1:24',
      'Colossians 2:3'
    ],
    wisdomMode: 'precept-upon-precept'
  },
  covenant_wisdom_continuity: {
    wisdomNodes: [
      'promise-anchor',
      'assembly-anchor',
      'wisdom-anchor'
    ],
    wisdomReferences: [
      'Deuteronomy 4:5-8',
      'Psalm 111:10',
      'Ecclesiastes 12:13',
      'James 1:5',
      '2 Timothy 3:15'
    ],
    wisdomMode: 'covenant-continuity'
  },
  restoration_wisdom_continuity: {
    wisdomNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'wisdom-anchor'
    ],
    wisdomReferences: [
      'Isaiah 33:5-6',
      'Daniel 12:3',
      'Romans 11:33',
      'Revelation 5:12',
      'Revelation 22:1-5'
    ],
    wisdomMode: 'restoration-continuity'
  }
};

function getScriptureWisdomContinuity(key = '') {
  return SCRIPTURE_WISDOM_CONTINUITY_FRAMEWORK[String(key || '').trim()] || null;
}

function listScriptureWisdomContinuities() {
  return SCRIPTURE_WISDOM_CONTINUITY_FRAMEWORK;
}

module.exports = {
  getScriptureWisdomContinuity,
  listScriptureWisdomContinuities,
  SCRIPTURE_WISDOM_CONTINUITY_FRAMEWORK
};
