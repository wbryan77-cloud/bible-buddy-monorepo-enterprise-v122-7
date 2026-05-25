const SCRIPTURE_DISCERNMENT_ENGINE = {
  discernment_foundation: {
    discernmentNodes: [
      'wisdom-anchor',
      'light-anchor',
      'word-anchor',
      'understanding-anchor'
    ],
    discernmentReferences: [
      'Proverbs 1:1-7',
      'Psalm 119:105',
      'Isaiah 8:20',
      'John 1:1-14',
      'James 1:5'
    ],
    discernmentMode: 'scripture-discernment'
  },
  prophetic_discernment: {
    discernmentNodes: [
      'prophet-anchor',
      'witness-anchor',
      'restoration-anchor'
    ],
    discernmentReferences: [
      'Deuteronomy 18:15-22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    discernmentMode: 'line-upon-line'
  },
  covenant_discernment: {
    discernmentNodes: [
      'promise-anchor',
      'covenant-anchor',
      'kingdom-anchor'
    ],
    discernmentReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Daniel 7',
      'Hebrews 8'
    ],
    discernmentMode: 'covenant-continuity'
  },
  restoration_discernment: {
    discernmentNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    discernmentReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    discernmentMode: 'restoration-continuity'
  }
};

function getScriptureDiscernment(key = '') {
  return SCRIPTURE_DISCERNMENT_ENGINE[String(key || '').trim()] || null;
}

function listScriptureDiscernments() {
  return SCRIPTURE_DISCERNMENT_ENGINE;
}

module.exports = {
  getScriptureDiscernment,
  listScriptureDiscernments,
  SCRIPTURE_DISCERNMENT_ENGINE
};
