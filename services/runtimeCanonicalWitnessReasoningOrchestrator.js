const CANONICAL_WITNESS_REASONING_ORCHESTRATOR = {
  creation_witness_reasoning: {
    reasoningNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'wisdom-anchor',
      'restoration-anchor'
    ],
    reasoningReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'Proverbs 8:22-31',
      'John 1:1-14',
      'Colossians 1:15-17',
      'Revelation 21:1-23'
    ],
    reasoningMode: 'genesis-to-revelation'
  },
  prophetic_witness_reasoning: {
    reasoningNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    reasoningReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    reasoningMode: 'precept-upon-precept'
  },
  covenant_witness_reasoning: {
    reasoningNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    reasoningReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    reasoningMode: 'covenant-continuity'
  },
  restoration_witness_reasoning: {
    reasoningNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    reasoningReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    reasoningMode: 'restoration-continuity'
  }
};

function getCanonicalWitnessReasoning(key = '') {
  return CANONICAL_WITNESS_REASONING_ORCHESTRATOR[String(key || '').trim()] || null;
}

function listCanonicalWitnessReasonings() {
  return CANONICAL_WITNESS_REASONING_ORCHESTRATOR;
}

module.exports = {
  getCanonicalWitnessReasoning,
  listCanonicalWitnessReasonings,
  CANONICAL_WITNESS_REASONING_ORCHESTRATOR
};
