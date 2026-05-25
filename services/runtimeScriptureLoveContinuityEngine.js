const SCRIPTURE_LOVE_CONTINUITY_ENGINE = {
  love_foundation_continuity: {
    loveNodes: [
      'truth-anchor',
      'wisdom-anchor',
      'covenant-anchor',
      'light-anchor'
    ],
    loveReferences: [
      'Deuteronomy 6:4-5',
      'Leviticus 19:18',
      'Psalm 136:1-26',
      'Micah 6:8',
      'Matthew 22:37-40',
      '1 John 4:7-12'
    ],
    loveMode: 'genesis-to-revelation'
  },
  messiah_love_continuity: {
    loveNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    loveReferences: [
      'Isaiah 63:7-9',
      'John 13:34-35',
      'John 15:12-13',
      'Romans 5:8',
      'Ephesians 3:17-19'
    ],
    loveMode: 'precept-upon-precept'
  },
  covenant_love_continuity: {
    loveNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    loveReferences: [
      'Deuteronomy 10:12-13',
      'Psalm 119:97',
      '1 Corinthians 13:1-13',
      'Galatians 5:13-14',
      '1 John 5:2-3'
    ],
    loveMode: 'covenant-continuity'
  },
  eternal_love_continuity: {
    loveNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    loveReferences: [
      'Isaiah 54:10',
      'Jeremiah 31:3',
      'Revelation 19:6-9',
      'Revelation 21:1-4',
      'Revelation 22:1-5'
    ],
    loveMode: 'eternal-love'
  }
};

function getScriptureLoveContinuity(key = '') {
  return SCRIPTURE_LOVE_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureLoveContinuities() {
  return SCRIPTURE_LOVE_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureLoveContinuity,
  listScriptureLoveContinuities,
  SCRIPTURE_LOVE_CONTINUITY_ENGINE
};
