const SCRIPTURE_MERCY_CONTINUITY_ENGINE = {
  mercy_foundation_continuity: {
    mercyNodes: [
      'truth-anchor',
      'wisdom-anchor',
      'covenant-anchor',
      'restoration-anchor'
    ],
    mercyReferences: [
      'Exodus 34:6-7',
      'Psalm 103:8-18',
      'Micah 7:18-20',
      'Lamentations 3:22-23',
      'Luke 6:36',
      'Ephesians 2:4-5'
    ],
    mercyMode: 'genesis-to-revelation'
  },
  messiah_mercy_continuity: {
    mercyNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    mercyReferences: [
      'Isaiah 61:1-3',
      'Matthew 9:10-13',
      'Luke 4:18-19',
      'John 8:10-11',
      'Hebrews 2:17'
    ],
    mercyMode: 'precept-upon-precept'
  },
  covenant_mercy_continuity: {
    mercyNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor'
    ],
    mercyReferences: [
      'Hosea 6:6',
      'Zechariah 7:9-10',
      'Matthew 5:7',
      'James 2:13',
      '1 Peter 1:3'
    ],
    mercyMode: 'covenant-continuity'
  },
  eternal_mercy_continuity: {
    mercyNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    mercyReferences: [
      'Isaiah 54:7-10',
      'Romans 11:30-32',
      'Titus 3:4-7',
      'Revelation 21:3-4',
      'Revelation 22:1-5'
    ],
    mercyMode: 'eternal-mercy'
  }
};

function getScriptureMercyContinuity(key = '') {
  return SCRIPTURE_MERCY_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureMercyContinuities() {
  return SCRIPTURE_MERCY_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureMercyContinuity,
  listScriptureMercyContinuities,
  SCRIPTURE_MERCY_CONTINUITY_ENGINE
};
