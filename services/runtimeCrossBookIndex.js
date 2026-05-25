const CROSS_BOOK_INDEX = {
  birthLocation: {
    source: ['Micah 5:2'],
    related: ['Matthew 2:1-6', 'Luke 2:1-11']
  },
  throneLine: {
    source: ['2 Samuel 7:12-16', 'Psalm 89:3-4', 'Isaiah 11:1-10'],
    related: ['Luke 1:31-33', 'Acts 2:29-36']
  },
  lawProphetsPsalms: {
    source: ['Deuteronomy 18:15-19', 'Psalm 16:10', 'Psalm 22', 'Isaiah 53'],
    related: ['Luke 24:25-27', 'Luke 24:44-47', 'John 5:39']
  },
  wordTheme: {
    source: ['Genesis 1:1-3', 'Psalm 33:6', 'Isaiah 55:10-11'],
    related: ['John 1:1-14', 'Hebrews 1:1-3', 'Revelation 19:11-13']
  },
  visibleGloryTexts: {
    source: ['Exodus 24:9-11', 'Exodus 33:18-23', 'Numbers 12:6-8', 'Isaiah 6:1-5'],
    related: ['John 1:18', 'John 5:37', 'John 6:46']
  }
};

function getCrossBookIndex(key = '') {
  const normalized = String(key || '').trim();
  return CROSS_BOOK_INDEX[normalized] || null;
}

function listCrossBookIndex() {
  return CROSS_BOOK_INDEX;
}

module.exports = {
  getCrossBookIndex,
  listCrossBookIndex,
  CROSS_BOOK_INDEX
};
