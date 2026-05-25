const CANONICAL_THEME_REGISTRY = {
  creation_theme: {
    anchorReferences: ['Genesis 1-2', 'John 1:1-5', 'Revelation 21:1-5'],
    connectedThemes: ['light-theme', 'restoration-theme', 'word-theme'],
    studyMode: 'contextual-sequence'
  },
  covenant_theme: {
    anchorReferences: ['Genesis 12', 'Exodus 19', 'Jeremiah 31', 'Hebrews 8'],
    connectedThemes: ['promise-theme', 'kingdom-theme', 'assembly-theme'],
    studyMode: 'line-upon-line'
  },
  kingdom_theme: {
    anchorReferences: ['Daniel 2', 'Daniel 7', 'Isaiah 9:6-7', 'Revelation 11:15'],
    connectedThemes: ['restoration-theme', 'witness-theme'],
    studyMode: 'narrative-continuity'
  },
  witness_theme: {
    anchorReferences: ['Psalm 22', 'Isaiah 53', 'Luke 24:25-27', 'John 5:39'],
    connectedThemes: ['word-theme', 'restoration-theme'],
    studyMode: 'cross-book-context'
  },
  restoration_theme: {
    anchorReferences: ['Isaiah 65', 'Romans 8:18-23', 'Revelation 21-22'],
    connectedThemes: ['new-creation-theme', 'kingdom-theme'],
    studyMode: 'genesis-to-revelation'
  }
};

function getCanonicalTheme(key = '') {
  return CANONICAL_THEME_REGISTRY[String(key || '').trim()] || null;
}

function listCanonicalThemes() {
  return CANONICAL_THEME_REGISTRY;
}

module.exports = {
  getCanonicalTheme,
  listCanonicalThemes,
  CANONICAL_THEME_REGISTRY
};
