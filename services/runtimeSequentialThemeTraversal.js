const SEQUENTIAL_THEME_TRAVERSAL = {
  beginning_to_restoration: {
    sequence: [
      'creation-theme',
      'light-theme',
      'covenant-theme',
      'kingdom-theme',
      'restoration-theme',
      'new-creation-theme'
    ],
    references: [
      'Genesis 1-2',
      'Isaiah 9:2',
      'Genesis 17',
      'Daniel 7',
      'Romans 8:18-23',
      'Revelation 21-22'
    ]
  },
  witness_to_restoration: {
    sequence: [
      'prophet-theme',
      'witness-theme',
      'word-theme',
      'assembly-theme',
      'restoration-theme'
    ],
    references: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'John 1:1-14',
      'Acts 2',
      'Revelation 21'
    ]
  },
  covenant_to_kingdom: {
    sequence: [
      'promise-theme',
      'covenant-theme',
      'kingdom-theme',
      'restoration-theme'
    ],
    references: [
      'Genesis 12',
      'Exodus 19',
      'Isaiah 9:6-7',
      'Revelation 11:15'
    ]
  }
};

function getSequentialThemeTraversal(key = '') {
  return SEQUENTIAL_THEME_TRAVERSAL[String(key || '').trim()] || null;
}

function listSequentialThemeTraversals() {
  return SEQUENTIAL_THEME_TRAVERSAL;
}

module.exports = {
  getSequentialThemeTraversal,
  listSequentialThemeTraversals,
  SEQUENTIAL_THEME_TRAVERSAL
};
