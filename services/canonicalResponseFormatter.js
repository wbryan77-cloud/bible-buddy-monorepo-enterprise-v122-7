function canonicalOrder(reference = '') {
  const books = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
  ];

  const book = books.find((b) => reference.startsWith(b)) || '';
  return books.indexOf(book);
}

function sortCanonicalReferences(references = []) {
  return [...new Set(references)]
    .sort((a, b) => canonicalOrder(a) - canonicalOrder(b));
}

function buildCanonicalResponse({ topic = '', summary = '', references = [], continuity = null }) {
  const ordered = sortCanonicalReferences(references);

  return {
    topic,
    summary,
    canonicalReferences: ordered,
    continuityThemes: continuity?.unresolvedThemes || [],
    scriptureFirst: true,
    canonicalOrdering: true,
    rendered: [
      `Topic: ${topic}`,
      summary ? `Summary: ${summary}` : '',
      'Canonical Scripture Chain:',
      ...ordered.map((ref, index) => `${index + 1}. ${ref}`),
    ].filter(Boolean).join('\n\n')
  };
}

module.exports = {
  buildCanonicalResponse,
  sortCanonicalReferences,
};
