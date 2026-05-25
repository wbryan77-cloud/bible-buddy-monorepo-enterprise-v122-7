const NARRATIVE_THEME_TRAVERSAL = {
  light_theme: {
    references: [
      'Genesis 1:3-4',
      'Psalm 27:1',
      'Isaiah 9:2',
      'John 1:4-9',
      'Revelation 21:23'
    ],
    flow: 'light-language-continuity'
  },
  covenant_theme: {
    references: [
      'Genesis 12',
      'Genesis 17',
      'Exodus 19',
      'Jeremiah 31',
      'Hebrews 8'
    ],
    flow: 'covenant-language-continuity'
  },
  kingdom_theme: {
    references: [
      'Daniel 2',
      'Daniel 7',
      'Isaiah 9:6-7',
      'Luke 1:31-33',
      'Revelation 11:15'
    ],
    flow: 'kingdom-language-continuity'
  },
  restoration_theme: {
    references: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21',
      'Revelation 22'
    ],
    flow: 'restoration-language-continuity'
  },
  witness_theme: {
    references: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39'
    ],
    flow: 'witness-language-continuity'
  }
};

function getNarrativeThemeTraversal(key = '') {
  return NARRATIVE_THEME_TRAVERSAL[String(key || '').trim()] || null;
}

function listNarrativeThemeTraversals() {
  return NARRATIVE_THEME_TRAVERSAL;
}

module.exports = {
  getNarrativeThemeTraversal,
  listNarrativeThemeTraversals,
  NARRATIVE_THEME_TRAVERSAL
};
