const REFERENCE_CONNECTION_INDEX = {
  son_language: {
    early: ['Psalm 2:7', 'Proverbs 30:4', 'Isaiah 9:6-7'],
    later: ['Matthew 3:16-17', 'Matthew 16:15-17', 'Mark 14:61-62', 'John 10:36', 'Romans 1:3-4'],
    mode: 'reference-index-only'
  },
  word_language: {
    early: ['Genesis 1:1-3', 'Psalm 33:6', 'Isaiah 55:10-11'],
    later: ['John 1:1-14', 'Hebrews 1:1-3', '1 John 1:1-3', 'Revelation 19:11-13'],
    mode: 'reference-index-only'
  },
  name_and_title_language: {
    early: ['Isaiah 7:14', 'Isaiah 9:6-7', 'Jeremiah 23:5-6', 'Micah 5:2'],
    later: ['Matthew 1:21-23', 'Luke 1:31-33', 'John 1:29', 'John 14:6', 'Acts 4:10-12', 'Philippians 2:9-11'],
    mode: 'reference-index-only'
  },
  scripture_witness_language: {
    early: ['Deuteronomy 18:15-19', 'Psalm 16:10', 'Psalm 22', 'Isaiah 53', 'Isaiah 61:1-2'],
    later: ['Luke 4:16-21', 'Luke 24:25-27', 'Luke 24:44-47', 'John 5:39', 'Acts 3:22-26'],
    mode: 'reference-index-only'
  },
  birth_place_language: {
    early: ['Micah 5:2'],
    later: ['Matthew 2:1-6', 'Luke 2:1-11'],
    mode: 'reference-index-only'
  },
  glory_and_seen_language: {
    early: ['Exodus 24:9-11', 'Exodus 33:18-23', 'Numbers 12:6-8', 'Isaiah 6:1-5'],
    later: ['John 1:18', 'John 5:37', 'John 6:46', 'John 14:6-11'],
    mode: 'reference-index-only'
  }
};

const REFERENCE_CONNECTION_GUIDANCE = {
  scriptureFirst: true,
  referencesOnly: true,
  noDoctrinalAssertion: true,
  preserveChapterContext: true,
  preserveEarlyLaterBookContinuity: true,
  preserveLineUponLineStudy: true,
  separateCommentaryFromReferences: true,
  keepHistoryInSeparateLayer: true
};

function getReferenceConnection(key = '') {
  return REFERENCE_CONNECTION_INDEX[String(key || '').trim()] || null;
}

function listReferenceConnections() {
  return {
    index: REFERENCE_CONNECTION_INDEX,
    guidance: REFERENCE_CONNECTION_GUIDANCE
  };
}

function buildReferenceConnectionStudy(key = '') {
  const connection = getReferenceConnection(key);
  return {
    key,
    connection,
    guidance: REFERENCE_CONNECTION_GUIDANCE,
    outputMode: 'reference-map'
  };
}

module.exports = {
  getReferenceConnection,
  listReferenceConnections,
  buildReferenceConnectionStudy,
  REFERENCE_CONNECTION_INDEX,
  REFERENCE_CONNECTION_GUIDANCE
};
