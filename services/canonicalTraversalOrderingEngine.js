function orderCanonicalTraversal(verses = []) {
  const canonicalOrder = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','Isaiah','Jeremiah','Ezekiel','Daniel','Matthew','Mark','Luke','John','Acts','Romans','Hebrews','James','Revelation'
  ];

  return [...verses].sort((a, b) => {
    const aBook = canonicalOrder.findIndex(book => a.startsWith(book));
    const bBook = canonicalOrder.findIndex(book => b.startsWith(book));
    return aBook - bBook;
  });
}

module.exports = { orderCanonicalTraversal };
