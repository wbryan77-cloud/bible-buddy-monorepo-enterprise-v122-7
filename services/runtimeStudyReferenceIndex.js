const STUDY_REFERENCE_INDEX = {
  creation_restoration: [
    'Genesis 1-2',
    'Isaiah 65',
    'Romans 8:18-23',
    'Revelation 21-22'
  ],
  covenant_sequence: [
    'Genesis 12',
    'Genesis 17',
    'Exodus 19',
    'Jeremiah 31',
    'Hebrews 8'
  ],
  kingdom_sequence: [
    'Daniel 2',
    'Daniel 7',
    'Isaiah 9:6-7',
    'Matthew 24',
    'Revelation 11:15'
  ],
  assembly_sequence: [
    'Acts 2',
    'Acts 15',
    'Romans 12',
    '1 Corinthians 12',
    'Revelation 2-3'
  ],
  witness_sequence: [
    'Deuteronomy 18:15-19',
    'Psalm 22',
    'Isaiah 53',
    'Luke 24:25-27',
    'John 5:39'
  ]
};

function getStudyReference(key = '') {
  return STUDY_REFERENCE_INDEX[String(key || '').trim()] || null;
}

function listStudyReferences() {
  return STUDY_REFERENCE_INDEX;
}

module.exports = {
  getStudyReference,
  listStudyReferences,
  STUDY_REFERENCE_INDEX
};
