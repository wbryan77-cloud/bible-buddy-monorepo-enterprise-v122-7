const HISTORICAL_SCRIPTURE_ERAS = {
  patriarchs: {
    books: ['Genesis'],
    continuityFocus: 'foundation'
  },
  exodus_and_covenant: {
    books: ['Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
    continuityFocus: 'covenant-establishment'
  },
  prophets_and_kings: {
    books: ['Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel'],
    continuityFocus: 'prophetic-expansion'
  },
  messiah_ministry: {
    books: ['Matthew', 'Mark', 'Luke', 'John'],
    continuityFocus: 'messiah-fulfillment'
  },
  apostolic_witness: {
    books: ['Acts', 'Romans', 'Hebrews'],
    continuityFocus: 'apostolic-witness'
  },
  revelation_completion: {
    books: ['Revelation'],
    continuityFocus: 'revelation-completion'
  }
};

function buildHistoricalContinuity({
  era = ''
} = {}) {
  return HISTORICAL_SCRIPTURE_ERAS[String(era || '').trim()] || null;
}

function listHistoricalScriptureEras() {
  return HISTORICAL_SCRIPTURE_ERAS;
}

module.exports = {
  HISTORICAL_SCRIPTURE_ERAS,
  buildHistoricalContinuity,
  listHistoricalScriptureEras
};
