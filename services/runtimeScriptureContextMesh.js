const SCRIPTURE_CONTEXT_MESH = {
  creation_mesh: {
    meshNodes: [
      'creation-anchor',
      'light-anchor',
      'garden-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    meshReferences: [
      'Genesis 1-3',
      'Psalm 33:6',
      'John 1:1-14',
      'Romans 8:18-23',
      'Revelation 21-22'
    ],
    meshMode: 'genesis-to-revelation'
  },
  covenant_mesh: {
    meshNodes: [
      'promise-anchor',
      'covenant-anchor',
      'assembly-anchor',
      'kingdom-anchor'
    ],
    meshReferences: [
      'Genesis 12',
      'Exodus 19',
      'Jeremiah 31',
      'Hebrews 8',
      'Revelation 11:15'
    ],
    meshMode: 'line-upon-line'
  },
  witness_mesh: {
    meshNodes: [
      'prophet-anchor',
      'witness-anchor',
      'word-anchor',
      'restoration-anchor'
    ],
    meshReferences: [
      'Deuteronomy 18:15-19',
      'Psalm 22',
      'Isaiah 53',
      'Luke 24:25-27',
      'John 5:39',
      'Revelation 21-22'
    ],
    meshMode: 'cross-book-context'
  },
  restoration_mesh: {
    meshNodes: [
      'restoration-anchor',
      'new-creation-anchor'
    ],
    meshReferences: [
      'Isaiah 65',
      'Romans 8:18-23',
      '1 Corinthians 15',
      'Revelation 21-22'
    ],
    meshMode: 'restoration-continuity'
  }
};

function getScriptureContextMesh(key = '') {
  return SCRIPTURE_CONTEXT_MESH[String(key || '').trim()] || null;
}

function listScriptureContextMeshes() {
  return SCRIPTURE_CONTEXT_MESH;
}

module.exports = {
  getScriptureContextMesh,
  listScriptureContextMeshes,
  SCRIPTURE_CONTEXT_MESH
};
