const SCRIPTURE_CONTINUITY_ORCHESTRATOR = {
  creation_orchestration: {
    orchestrationNodes: [
      'creation-anchor',
      'light-anchor',
      'word-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    orchestrationReferences: [
      'Genesis 1:1-5',
      'Psalm 33:6',
      'John 1:1-14',
      'Colossians 1:15-17',
      'Revelation 21:1-23'
    ],
    orchestrationMode: 'genesis-to-revelation'
  },
  prophetic_orchestration: {
    orchestrationNodes: [
      'prophet-anchor',
      'witness-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    orchestrationReferences: [
      'Isaiah 53',
      'Daniel 7',
      'Micah 5:2',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 19:10'
    ],
    orchestrationMode: 'line-upon-line'
  },
  covenant_orchestration: {
    orchestrationNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    orchestrationReferences: [
      'Genesis 12',
      'Exodus 19-20',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    orchestrationMode: 'covenant-continuity'
  },
  restoration_orchestration: {
    orchestrationNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    orchestrationReferences: [
      'Isaiah 65',
      'Ezekiel 37',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    orchestrationMode: 'restoration-continuity'
  }
};

function getScriptureContinuityOrchestration(key = '') {
  return SCRIPTURE_CONTINUITY_ORCHESTRATOR[String(key || '').trim()] || null;
}

function listScriptureContinuityOrchestrations() {
  return SCRIPTURE_CONTINUITY_ORCHESTRATOR;
}

module.exports = {
  getScriptureContinuityOrchestration,
  listScriptureContinuityOrchestrations,
  SCRIPTURE_CONTINUITY_ORCHESTRATOR
};
