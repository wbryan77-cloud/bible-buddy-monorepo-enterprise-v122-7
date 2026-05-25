const GENEALOGY_TRAVERSALS = {
  adam_to_noah: {
    chain: [
      'Adam',
      'Seth',
      'Enos',
      'Cainan',
      'Mahalaleel',
      'Jared',
      'Enoch',
      'Methuselah',
      'Lamech',
      'Noah'
    ],
    scriptures: ['Genesis 5', '1 Chronicles 1', 'Luke 3']
  },
  noah_to_abraham: {
    chain: [
      'Noah',
      'Shem',
      'Arphaxad',
      'Salah',
      'Eber',
      'Peleg',
      'Reu',
      'Serug',
      'Nahor',
      'Terah',
      'Abram'
    ],
    scriptures: ['Genesis 10', 'Genesis 11', 'Luke 3']
  },
  abraham_lineage: {
    chain: [
      'Abraham',
      'Ishmael',
      'Isaac',
      'Jacob',
      'Esau'
    ],
    scriptures: ['Genesis 16', 'Genesis 17', 'Genesis 21', 'Genesis 25']
  },
  israel_tribes: {
    chain: [
      'Reuben',
      'Simeon',
      'Levi',
      'Judah',
      'Dan',
      'Naphtali',
      'Gad',
      'Asher',
      'Issachar',
      'Zebulun',
      'Joseph',
      'Benjamin'
    ],
    scriptures: ['Genesis 35:22-26', 'Exodus 1:1-7', 'Revelation 7:1-8']
  }
};

const GENEALOGY_GUIDANCE = {
  scriptureFirst: true,
  preserveGenesisToRevelationContinuity: true,
  preserveLineUponLineStructure: true,
  preserveGenealogicalFlow: true,
  separateScriptureFromHistoricalInterpretation: true,
  avoidUnsupportedIdentityClaims: true,
};

function buildGenealogyTraversal(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const traversal = Object.entries(GENEALOGY_TRAVERSALS).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    traversal: traversal ? traversal[1] : null,
    guidance: GENEALOGY_GUIDANCE,
    recommendations: {
      preserveGenealogicalContext: true,
      readConnectedChapters: true,
      preserveHistoricalFlow: true,
      preserveScriptureContinuity: true,
    },
  };
}

module.exports = {
  buildGenealogyTraversal,
  GENEALOGY_TRAVERSALS,
  GENEALOGY_GUIDANCE,
};
