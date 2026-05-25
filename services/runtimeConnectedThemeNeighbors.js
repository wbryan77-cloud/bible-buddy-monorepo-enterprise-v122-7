const CONNECTED_THEME_NEIGHBORS = {
  creation_theme: {
    previousThemes: [],
    currentTheme: 'creation-theme',
    connectedThemes: ['light-theme', 'garden-theme', 'restoration-theme'],
    references: ['Genesis 1', 'Genesis 2', 'John 1:1-5', 'Revelation 21']
  },
  covenant_theme: {
    previousThemes: ['promise-theme'],
    currentTheme: 'covenant-theme',
    connectedThemes: ['kingdom-theme', 'assembly-theme'],
    references: ['Genesis 12', 'Exodus 19', 'Jeremiah 31', 'Hebrews 8']
  },
  kingdom_theme: {
    previousThemes: ['covenant-theme'],
    currentTheme: 'kingdom-theme',
    connectedThemes: ['restoration-theme', 'witness-theme'],
    references: ['Daniel 2', 'Daniel 7', 'Isaiah 9:6-7', 'Revelation 11:15']
  },
  witness_theme: {
    previousThemes: ['prophet-theme'],
    currentTheme: 'witness-theme',
    connectedThemes: ['word-theme', 'restoration-theme'],
    references: ['Psalm 22', 'Isaiah 53', 'Luke 24:25-27', 'John 5:39']
  },
  restoration_theme: {
    previousThemes: ['kingdom-theme'],
    currentTheme: 'restoration-theme',
    connectedThemes: ['new-creation-theme'],
    references: ['Isaiah 65', 'Romans 8:18-23', 'Revelation 21', 'Revelation 22']
  }
};

function getConnectedThemeNeighbors(key = '') {
  return CONNECTED_THEME_NEIGHBORS[String(key || '').trim()] || null;
}

function listConnectedThemeNeighbors() {
  return CONNECTED_THEME_NEIGHBORS;
}

module.exports = {
  getConnectedThemeNeighbors,
  listConnectedThemeNeighbors,
  CONNECTED_THEME_NEIGHBORS
};
