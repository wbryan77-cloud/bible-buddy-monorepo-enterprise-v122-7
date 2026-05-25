const SCRIPTURE_RESTORATION_CONTINUITY_FRAMEWORK = {
  creation_restoration_continuity: {
    restorationNodes: [
      'creation-anchor',
      'restoration-anchor',
      'new-creation-anchor',
      'kingdom-anchor'
    ],
    restorationReferences: [
      'Genesis 1:26-31',
      'Isaiah 65:17-25',
      'Ezekiel 37:1-14',
      'Romans 8:18-23',
      'Revelation 21:1-5'
    ],
    restorationMode: 'genesis-to-revelation'
  },
  messiah_restoration_continuity: {
    restorationNodes: [
      'witness-anchor',
      'truth-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    restorationReferences: [
      'Isaiah 61:1-3',
      'Luke 4:18-21',
      'John 11:25-26',
      '1 Corinthians 15:20-28',
      'Revelation 22:1-5'
    ],
    restorationMode: 'precept-upon-precept'
  },
  covenant_restoration_continuity: {
    restorationNodes: [
      'promise-anchor',
      'assembly-anchor',
      'restoration-anchor'
    ],
    restorationReferences: [
      'Deuteronomy 30:1-10',
      'Jeremiah 31:31-34',
      'Acts 3:19-21',
      'Hebrews 8:10-12',
      'Revelation 7:9-17'
    ],
    restorationMode: 'covenant-continuity'
  },
  eternal_restoration_continuity: {
    restorationNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    restorationReferences: [
      'Isaiah 60:19-21',
      'Daniel 12:2-3',
      '1 John 3:1-3',
      'Revelation 21:22-27',
      'Revelation 22:1-5'
    ],
    restorationMode: 'eternal-restoration'
  }
};

function getScriptureRestorationContinuity(key = '') {
  return SCRIPTURE_RESTORATION_CONTINUITY_FRAMEWORK[String(key || '').trim()] || null;
}

function listScriptureRestorationContinuities() {
  return SCRIPTURE_RESTORATION_CONTINUITY_FRAMEWORK;
}

module.exports = {
  getScriptureRestorationContinuity,
  listScriptureRestorationContinuities,
  SCRIPTURE_RESTORATION_CONTINUITY_FRAMEWORK
};
