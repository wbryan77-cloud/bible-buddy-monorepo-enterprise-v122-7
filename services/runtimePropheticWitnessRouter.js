const PROPHETIC_WITNESS_ROUTER = {
  messiah_birth_route: {
    routeNodes: [
      'promise-anchor',
      'prophet-anchor',
      'witness-anchor'
    ],
    routeReferences: [
      'Genesis 3:15',
      'Isaiah 7:14',
      'Micah 5:2',
      'Matthew 1:20-23',
      'Luke 2:10-11'
    ],
    routeMode: 'birth-continuity'
  },
  messiah_suffering_route: {
    routeNodes: [
      'prophet-anchor',
      'witness-anchor',
      'restoration-anchor'
    ],
    routeReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Zechariah 12:10',
      'John 19:34-37',
      'Luke 24:25-27'
    ],
    routeMode: 'suffering-continuity'
  },
  messiah_word_route: {
    routeNodes: [
      'word-anchor',
      'light-anchor',
      'wisdom-anchor'
    ],
    routeReferences: [
      'Genesis 1:1-3',
      'Psalm 33:6',
      'John 1:1-14',
      'Hebrews 1:1-3',
      'Revelation 19:13'
    ],
    routeMode: 'word-continuity'
  },
  messiah_kingdom_route: {
    routeNodes: [
      'kingdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    routeReferences: [
      'Daniel 7',
      'Isaiah 9:6-7',
      'Luke 1:31-33',
      'Revelation 11:15',
      'Revelation 21-22'
    ],
    routeMode: 'kingdom-continuity'
  }
};

function getPropheticWitnessRoute(key = '') {
  return PROPHETIC_WITNESS_ROUTER[String(key || '').trim()] || null;
}

function listPropheticWitnessRoutes() {
  return PROPHETIC_WITNESS_ROUTER;
}

module.exports = {
  getPropheticWitnessRoute,
  listPropheticWitnessRoutes,
  PROPHETIC_WITNESS_ROUTER
};
