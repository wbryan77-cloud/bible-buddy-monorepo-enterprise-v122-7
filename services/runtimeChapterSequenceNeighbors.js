const CHAPTER_SEQUENCE_NEIGHBORS = {
  genesis_1: {
    previous: [],
    current: 'Genesis 1',
    next: ['Genesis 2', 'Genesis 3'],
    themes: ['creation', 'light', 'beginning']
  },
  exodus_19: {
    previous: ['Exodus 18'],
    current: 'Exodus 19',
    next: ['Exodus 20', 'Exodus 21'],
    themes: ['covenant', 'mountain', 'commandments']
  },
  isaiah_53: {
    previous: ['Isaiah 52'],
    current: 'Isaiah 53',
    next: ['Isaiah 54'],
    themes: ['suffering-language', 'restoration-language']
  },
  john_1: {
    previous: [],
    current: 'John 1',
    next: ['John 2', 'John 3'],
    themes: ['word-language', 'light-language']
  },
  revelation_21: {
    previous: ['Revelation 20'],
    current: 'Revelation 21',
    next: ['Revelation 22'],
    themes: ['restoration', 'new-creation', 'new-jerusalem']
  }
};

function getChapterSequenceNeighbors(key = '') {
  return CHAPTER_SEQUENCE_NEIGHBORS[String(key || '').trim()] || null;
}

function listChapterSequenceNeighbors() {
  return CHAPTER_SEQUENCE_NEIGHBORS;
}

module.exports = {
  getChapterSequenceNeighbors,
  listChapterSequenceNeighbors,
  CHAPTER_SEQUENCE_NEIGHBORS
};
