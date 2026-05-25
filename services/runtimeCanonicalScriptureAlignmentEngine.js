const CANONICAL_SCRIPTURE_ALIGNMENT_ENGINE = {
  creation_alignment: {
    alignmentNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    alignmentReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'John 1:1-14',
      'Colossians 1:15-17',
      'Revelation 21:23'
    ],
    alignmentMode: 'genesis-to-revelation'
  },
  prophetic_alignment: {
    alignmentNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    alignmentReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    alignmentMode: 'line-upon-line'
  },
  covenant_alignment: {
    alignmentNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    alignmentReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    alignmentMode: 'covenant-continuity'
  },
  restoration_alignment: {
    alignmentNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    alignmentReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    alignmentMode: 'restoration-continuity'
  }
};

function getCanonicalScriptureAlignment(key = '') {
  return CANONICAL_SCRIPTURE_ALIGNMENT_ENGINE[String(key || '').trim()] || null;
}

function listCanonicalScriptureAlignments() {
  return CANONICAL_SCRIPTURE_ALIGNMENT_ENGINE;
}

module.exports = {
  getCanonicalScriptureAlignment,
  listCanonicalScriptureAlignments,
  CANONICAL_SCRIPTURE_ALIGNMENT_ENGINE
};
