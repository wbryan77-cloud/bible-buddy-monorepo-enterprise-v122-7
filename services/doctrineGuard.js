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
    'passover',
    'unleavened bread',
    'tabernacles',
    'pentecost',
    'christmas',
    'easter',
    'traditions of men',
    'jeremiah 10',
    'commandments',
    'resurrection',
    'resurrection timeline',
    'three days and three nights',
    'matthew 12:40',
    'daniel 9:27',
    'midst of the week',
    'genesis to revelation',
    'line upon line',
    'precept upon precept'
  ];

  return doctrineTerms.some((term) => text.includes(term));
}

module.exports = {
  isDoctrineTopic,
};