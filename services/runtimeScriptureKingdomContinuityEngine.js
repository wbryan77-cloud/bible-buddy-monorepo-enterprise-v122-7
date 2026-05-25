const SCRIPTURE_KINGDOM_CONTINUITY_ENGINE = {
  kingdom_foundation: {
    kingdomNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor',
      'restoration-anchor'
    ],
    kingdomReferences: [
      'Genesis 12',
      '2 Samuel 7:12-16',
      'Isaiah 9:6-7',
      'Daniel 7:13-14',
      'Luke 1:31-33',
      'Revelation 11:15'
    ],
    kingdomMode: 'genesis-to-revelation'
  },
  messiah_kingdom_continuity: {
    kingdomNodes: [
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor',
      'new-creation-anchor'
    ],
    kingdomReferences: [
      'Psalm 2',
      'Isaiah 53',
      'Micah 5:2',
      'John 18:36-37',
      'Revelation 19:11-16',
      'Revelation 21-22'
    ],
    kingdomMode: 'precept-upon-precept'
  },
  covenant_kingdom_continuity: {
    kingdomNodes: [
      'promise-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    kingdomReferences: [
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Acts 2',
      'Revelation 5:10'
    ],
    kingdomMode: 'covenant-continuity'
  },
  restoration_kingdom_continuity: {
    kingdomNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'kingdom-anchor'
    ],
    kingdomReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      '1 Corinthians 15:24-28',
      'Revelation 20-22'
    ],
    kingdomMode: 'restoration-continuity'
  }
};

function getScriptureKingdomContinuity(key = '') {
  return SCRIPTURE_KINGDOM_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureKingdomContinuities() {
  return SCRIPTURE_KINGDOM_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureKingdomContinuity,
  listScriptureKingdomContinuities,
  SCRIPTURE_KINGDOM_CONTINUITY_ENGINE
};
