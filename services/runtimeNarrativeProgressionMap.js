const NARRATIVE_PROGRESSION_MAP = {
  beginning_progression: {
    stages: [
      'creation-theme',
      'garden-theme',
      'covenant-theme',
      'kingdom-theme',
      'restoration-theme'
    ],
    references: [
      'Genesis 1-2',
      'Genesis 3',
      'Genesis 12',
      'Daniel 7',
      'Revelation 21-22'
    ]
  },
  witness_progression: {
    stages: [
      'prophet-theme',
      'witness-theme',
      'word-theme',
      'assembly-theme'
    ],
    references: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'John 1:1-14',
      'Acts 2'
    ]
  },
  light_progression: {
    stages: [
      'light-theme',
      'word-theme',
      'restoration-theme',
      'new-creation-theme'
    ],
    references: [
      'Genesis 1:3-4',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ]
  },
  covenant_progression: {
    stages: [
      'promise-theme',
      'covenant-theme',
      'assembly-theme',
      'kingdom-theme'
    ],
    references: [
      'Genesis 12',
      'Exodus 19',
      'Acts 2',
      'Revelation 11:15'
    ]
  }
};

function getNarrativeProgression(key = '') {
  return NARRATIVE_PROGRESSION_MAP[String(key || '').trim()] || null;
}

function listNarrativeProgressions() {
  return NARRATIVE_PROGRESSION_MAP;
}

module.exports = {
  getNarrativeProgression,
  listNarrativeProgressions,
  NARRATIVE_PROGRESSION_MAP
};
