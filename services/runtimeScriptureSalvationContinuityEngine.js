const SCRIPTURE_SALVATION_CONTINUITY_ENGINE = {
  salvation_promise_continuity: {
    salvationNodes: [
      'promise-anchor',
      'truth-anchor',
      'restoration-anchor',
      'kingdom-anchor'
    ],
    salvationReferences: [
      'Genesis 3:15',
      'Exodus 15:2',
      'Psalm 27:1',
      'Isaiah 12:2',
      'Luke 2:28-32',
      'Revelation 7:9-17'
    ],
    salvationMode: 'genesis-to-revelation'
  },
  messiah_salvation_continuity: {
    salvationNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    salvationReferences: [
      'Isaiah 53:4-6',
      'Matthew 1:21',
      'John 3:16-17',
      'Acts 4:10-12',
      'Romans 5:8-11'
    ],
    salvationMode: 'precept-upon-precept'
  },
  covenant_salvation_continuity: {
    salvationNodes: [
      'covenant-anchor',
      'assembly-anchor',
      'truth-anchor'
    ],
    salvationReferences: [
      'Deuteronomy 30:15-20',
      'Jeremiah 31:31-34',
      'Acts 2:37-39',
      'Ephesians 2:8-10',
      'Hebrews 5:8-9'
    ],
    salvationMode: 'covenant-continuity'
  },
  eternal_salvation_continuity: {
    salvationNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    salvationReferences: [
      'Isaiah 45:17',
      'Daniel 12:2-3',
      'John 10:27-30',
      'Revelation 21:1-7',
      'Revelation 22:1-5'
    ],
    salvationMode: 'eternal-salvation'
  }
};

function getScriptureSalvationContinuity(key = '') {
  return SCRIPTURE_SALVATION_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureSalvationContinuities() {
  return SCRIPTURE_SALVATION_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureSalvationContinuity,
  listScriptureSalvationContinuities,
  SCRIPTURE_SALVATION_CONTINUITY_ENGINE
};
