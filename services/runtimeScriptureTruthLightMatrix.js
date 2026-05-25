const SCRIPTURE_TRUTH_LIGHT_MATRIX = {
  creation_truth_light: {
    truthLightNodes: [
      'creation-anchor',
      'truth-anchor',
      'light-anchor',
      'word-anchor'
    ],
    truthLightReferences: [
      'Genesis 1:1-5',
      'Psalm 27:1',
      'Psalm 119:142',
      'Isaiah 8:20',
      'John 1:1-9',
      'John 17:17'
    ],
    truthLightMode: 'genesis-to-revelation'
  },
  messiah_truth_light: {
    truthLightNodes: [
      'witness-anchor',
      'truth-anchor',
      'light-anchor',
      'restoration-anchor'
    ],
    truthLightReferences: [
      'Isaiah 42:6',
      'Isaiah 49:6',
      'John 8:12',
      'John 14:6',
      'Revelation 22:5'
    ],
    truthLightMode: 'precept-upon-precept'
  },
  covenant_truth_light: {
    truthLightNodes: [
      'promise-anchor',
      'assembly-anchor',
      'truth-anchor'
    ],
    truthLightReferences: [
      'Exodus 13:21',
      'Psalm 43:3',
      'Psalm 119:160',
      'Matthew 5:14-16',
      'Philippians 2:15'
    ],
    truthLightMode: 'covenant-continuity'
  },
  restoration_truth_light: {
    truthLightNodes: [
      'restoration-anchor',
      'new-creation-anchor',
      'light-anchor'
    ],
    truthLightReferences: [
      'Isaiah 60:19-20',
      'Zechariah 14:7',
      '1 John 1:5',
      'Revelation 21:23',
      'Revelation 22:5'
    ],
    truthLightMode: 'restoration-continuity'
  }
};

function getScriptureTruthLight(key = '') {
  return SCRIPTURE_TRUTH_LIGHT_MATRIX[String(key || '').trim()] || null;
}

function listScriptureTruthLights() {
  return SCRIPTURE_TRUTH_LIGHT_MATRIX;
}

module.exports = {
  getScriptureTruthLight,
  listScriptureTruthLights,
  SCRIPTURE_TRUTH_LIGHT_MATRIX
};