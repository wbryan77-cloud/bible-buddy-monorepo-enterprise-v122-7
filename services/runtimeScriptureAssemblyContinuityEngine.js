const SCRIPTURE_ASSEMBLY_CONTINUITY_ENGINE = {
  assembly_foundation_continuity: {
    assemblyNodes: [
      'assembly-anchor',
      'covenant-anchor',
      'truth-anchor',
      'kingdom-anchor'
    ],
    assemblyReferences: [
      'Exodus 12:1-14',
      'Leviticus 23:1-4',
      'Deuteronomy 16:16',
      'Psalm 122:1',
      'Acts 2:42-47',
      'Hebrews 10:24-25'
    ],
    assemblyMode: 'genesis-to-revelation'
  },
  messiah_assembly_continuity: {
    assemblyNodes: [
      'witness-anchor',
      'truth-anchor',
      'assembly-anchor',
      'restoration-anchor'
    ],
    assemblyReferences: [
      'Isaiah 56:6-8',
      'Matthew 16:18',
      'John 17:20-23',
      'Acts 20:28',
      'Ephesians 2:19-22'
    ],
    assemblyMode: 'precept-upon-precept'
  },
  covenant_assembly_continuity: {
    assemblyNodes: [
      'assembly-anchor',
      'promise-anchor',
      'truth-anchor'
    ],
    assemblyReferences: [
      'Exodus 19:5-6',
      'Jeremiah 31:31-34',
      'Acts 2:38-39',
      '1 Corinthians 12:12-27',
      'Galatians 3:26-29'
    ],
    assemblyMode: 'covenant-continuity'
  },
  eternal_assembly_continuity: {
    assemblyNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    assemblyReferences: [
      'Isaiah 66:22-23',
      'Zechariah 14:16',
      'Revelation 7:9-17',
      'Revelation 21:1-4',
      'Revelation 22:1-5'
    ],
    assemblyMode: 'eternal-assembly'
  }
};

function getScriptureAssemblyContinuity(key = '') {
  return SCRIPTURE_ASSEMBLY_CONTINUITY_ENGINE[String(key || '').trim()] || null;
}

function listScriptureAssemblyContinuities() {
  return SCRIPTURE_ASSEMBLY_CONTINUITY_ENGINE;
}

module.exports = {
  getScriptureAssemblyContinuity,
  listScriptureAssemblyContinuities,
  SCRIPTURE_ASSEMBLY_CONTINUITY_ENGINE
};
