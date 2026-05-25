const GENESIS_REVELATION_WITNESS_FRAMEWORK = {
  creation_witness_framework: {
    frameworkNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'wisdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    frameworkReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'Proverbs 8:22-31',
      'John 1:1-14',
      'Colossians 1:15-17',
      'Revelation 21:1-23'
    ],
    frameworkMode: 'genesis-to-revelation'
  },
  prophetic_witness_framework: {
    frameworkNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    frameworkReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    frameworkMode: 'precept-upon-precept'
  },
  covenant_witness_framework: {
    frameworkNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    frameworkReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    frameworkMode: 'covenant-continuity'
  },
  restoration_witness_framework: {
    frameworkNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    frameworkReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    frameworkMode: 'restoration-continuity'
  }
};

function getGenesisRevelationWitnessFramework(key = '') {
  return GENESIS_REVELATION_WITNESS_FRAMEWORK[String(key || '').trim()] || null;
}

function listGenesisRevelationWitnessFrameworks() {
  return GENESIS_REVELATION_WITNESS_FRAMEWORK;
}

module.exports = {
  getGenesisRevelationWitnessFramework,
  listGenesisRevelationWitnessFrameworks,
  GENESIS_REVELATION_WITNESS_FRAMEWORK
};
