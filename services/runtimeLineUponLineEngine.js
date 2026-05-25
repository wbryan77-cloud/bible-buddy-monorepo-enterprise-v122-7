const LINE_UPON_LINE_ENGINE = {
  foundational_lineage: {
    sequenceNodes: [
      'creation-anchor',
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    sequenceReferences: [
      'Genesis 1-3',
      'Genesis 12',
      'Exodus 19-20',
      'Daniel 7'
    ],
    sequenceMode: 'line-upon-line'
  },
  messiah_lineage: {
    sequenceNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    sequenceReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Micah 5:2',
      'John 1:1-14',
      'Luke 24:25-27',
      'Revelation 21-22'
    ],
    sequenceMode: 'cross-book-context'
  },
  wisdom_lineage: {
    sequenceNodes: [
      'wisdom-anchor',
      'light-anchor',
      'word-anchor'
    ],
    sequenceReferences: [
      'Proverbs 1',
      'Psalm 119:105',
      'John 1:4-9',
      'James 1:5'
    ],
    sequenceMode: 'wisdom-continuity'
  },
  restoration_lineage: {
    sequenceNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    sequenceReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    sequenceMode: 'restoration-continuity'
  }
};

function getLineUponLineSequence(key = '') {
  return LINE_UPON_LINE_ENGINE[String(key || '').trim()] || null;
}

function listLineUponLineSequences() {
  return LINE_UPON_LINE_ENGINE;
}

module.exports = {
  getLineUponLineSequence,
  listLineUponLineSequences,
  LINE_UPON_LINE_ENGINE
};
