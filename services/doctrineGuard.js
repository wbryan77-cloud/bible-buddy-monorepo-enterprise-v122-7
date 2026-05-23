function isDoctrineTopic(message = '') {
  const text = String(message).toLowerCase();

  const doctrineTerms = [
    'sabbath',
    'dietary law',
    'unclean',
    'acts 10',
    'acts 11',
    'leviticus',
    'feast day',
    'high sabbath',
    'christmas',
    'easter',
    'traditions of men',
    'jeremiah 10',
    'commandments',
    'resurrection',
    'genesis to revelation',
    'line upon line',
    'precept upon precept'
  ];

  return doctrineTerms.some((term) => text.includes(term));
}

module.exports = {
  isDoctrineTopic,
};