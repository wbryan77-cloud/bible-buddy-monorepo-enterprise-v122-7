const APOSTOLIC_CONTINUITIES = {
  gospel_foundation: {
    sequence: [
      'Matthew',
      'Mark',
      'Luke',
      'John'
    ],
    scriptures: [
      'Matthew 1',
      'Mark 1',
      'Luke 1',
      'John 1'
    ],
    focus: 'Life, teachings, death, and resurrection of Jesus Christ'
  },
  acts_and_assembly_growth: {
    sequence: [
      'Acts 1',
      'Acts 2',
      'Acts 9',
      'Acts 15',
      'Acts 28'
    ],
    scriptures: [
      'Acts 1',
      'Acts 2',
      'Acts 9',
      'Acts 15',
      'Acts 28'
    ],
    focus: 'Growth of the assemblies and apostolic continuity'
  },
  pastoral_epistles: {
    sequence: [
      '1 Timothy',
      '2 Timothy',
      'Titus'
    ],
    scriptures: [
      '1 Timothy 1',
      '2 Timothy 1',
      'Titus 1'
    ],
    focus: 'Instruction, stewardship, doctrine, and continuity'
  },
  final_revelation: {
    sequence: [
      'Hebrews',
      'James',
      '1 Peter',
      '1 John',
      'Revelation'
    ],
    scriptures: [
      'Hebrews 8',
      'James 1',
      '1 Peter 1',
      '1 John 2',
      'Revelation 22'
    ],
    focus: 'Faithfulness, endurance, restoration, and final kingdom continuity'
  }
};

const APOSTOLIC_GUIDANCE = {
  scriptureFirst: true,
  preserveGenesisToRevelationFlow: true,
  preserveLineUponLineStructure: true,
  preserveNarrativeContinuity: true,
  preserveAssemblyContinuity: true,
  avoidFragmentedDoctrineRendering: true,
};

function buildApostolicContinuity(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const continuity = Object.entries(APOSTOLIC_CONTINUITIES).find(([key]) => {
    return normalized.includes(key.replace(/_/g, ' ')) || key.includes(normalized);
  });

  return {
    topic,
    continuity: continuity ? continuity[1] : null,
    guidance: APOSTOLIC_GUIDANCE,
    recommendations: {
      preserveChapterFlow: true,
      preserveAssemblyContext: true,
      connectEpistleContinuity: true,
      preserveScriptureInterconnection: true,
    },
  };
}

module.exports = {
  buildApostolicContinuity,
  APOSTOLIC_CONTINUITIES,
  APOSTOLIC_GUIDANCE,
};
