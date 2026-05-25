const CONTEXTUAL_VERSE_NEIGHBORS = {
  genesis_1_1: {
    before: [],
    focus: 'creation-beginning-language',
    after: ['Genesis 1:2', 'Genesis 1:3', 'Genesis 1:4']
  },
  exodus_20_8: {
    before: ['Exodus 20:7'],
    focus: 'sabbath-commandment-language',
    after: ['Exodus 20:9', 'Exodus 20:10', 'Exodus 20:11']
  },
  isaiah_53_5: {
    before: ['Isaiah 53:4'],
    focus: 'suffering-language',
    after: ['Isaiah 53:6', 'Isaiah 53:7']
  },
  john_1_1: {
    before: [],
    focus: 'word-language',
    after: ['John 1:2', 'John 1:3', 'John 1:4']
  },
  revelation_21_1: {
    before: ['Revelation 20:15'],
    focus: 'restoration-language',
    after: ['Revelation 21:2', 'Revelation 21:3', 'Revelation 21:4']
  }
};

function getContextualVerseNeighbors(key = '') {
  return CONTEXTUAL_VERSE_NEIGHBORS[String(key || '').trim()] || null;
}

function listContextualVerseNeighbors() {
  return CONTEXTUAL_VERSE_NEIGHBORS;
}

module.exports = {
  getContextualVerseNeighbors,
  listContextualVerseNeighbors,
  CONTEXTUAL_VERSE_NEIGHBORS
};
