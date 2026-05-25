const SCRIPTURE_LIGHT_CONTINUITY_ENGINE = {
  creation_light_continuity: {
    lightNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'wisdom-anchor'
    ],
    lightReferences: [
      'Genesis 1:1-5',
      'Psalm 27:1',
      'Psalm 119:105',
      'Isaiah 9:2',
      'John 1:1-9',
      'Revelation 21:23'
    ],
    lightMode: 'genesis-to-revelation'
  },
  messiah_light_continuity: {
    lightNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    lightReferences: [
      'Isaiah 42:6',
      'Isaiah 49:6',
      'John 8:12',
      'John 12:35-36',
      'Revelation 22:5'
    ],
    lightMode: 'precept-upon-precept'
  },
  covenant_light_continuity: {
    lightNodes: [
      'promise-anchor',
      'assembly-anchor',
      'light-anchor'
    ],
    lightReferences: [
      'Exodus 13:21',
      'Psalm 36:9',
      'Isaiah 60:1-3',
      'Matthew 5:14-16',
      'Philippians 2:15'
    ],
    lightMode: 'covenant-continuity'
  },
  restoration_light_continuity: {
    lightNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    lightReferences: [
      'Isaiah 60:19-20',
      'Zechariah 14:7',
      '1 John 1:5',
      'Revelation 21:23',
      'Revelation 22:5'
    ],
    lightMode: 'restoration-continuity'
  }
};

function getScriptureLightContinuity(key = '') {
  return SCRIPTURE_LIGHT_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureLightContinuities() {
  return SCRIPTURE_LIGHT_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureLightContinuity,
  listScriptureLightContinuities,
  SCRIPTURE_LIGHT_CONTINUITY_ENGINE
};
