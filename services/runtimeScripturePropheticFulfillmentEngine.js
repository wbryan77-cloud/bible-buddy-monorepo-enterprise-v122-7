const SCRIPTURE_PROPHETIC_FULFILLMENT_ENGINE = {
  messiah_birth_fulfillment: {
    fulfillmentNodes: [
      'promise-anchor',
      'prophet-anchor',
      'witness-anchor'
    ],
    fulfillmentReferences: [
      'Genesis 3:15',
      'Isaiah 7:14',
      'Micah 5:2',
      'Matthew 1:20-23',
      'Luke 2:10-11'
    ],
    fulfillmentMode: 'birth-fulfillment'
  },
  messiah_ministry_fulfillment: {
    fulfillmentNodes: [
      'light-anchor',
      'truth-anchor',
      'witness-anchor'
    ],
    fulfillmentReferences: [
      'Isaiah 61:1-2',
      'Matthew 4:13-17',
      'Luke 4:16-21',
      'John 8:12',
      'Acts 10:38'
    ],
    fulfillmentMode: 'ministry-fulfillment'
  },
  messiah_suffering_fulfillment: {
    fulfillmentNodes: [
      'prophet-anchor',
      'truth-anchor',
      'restoration-anchor'
    ],
    fulfillmentReferences: [
      'Psalm 22',
      'Isaiah 53',
      'Zechariah 12:10',
      'John 19:34-37',
      'Luke 24:25-27'
    ],
    fulfillmentMode: 'suffering-fulfillment'
  },
  messiah_kingdom_fulfillment: {
    fulfillmentNodes: [
      'kingdom-anchor',
      'restoration-anchor',
      'new-creation-anchor'
    ],
    fulfillmentReferences: [
      'Daniel 7:13-14',
      'Luke 1:31-33',
      'Revelation 11:15',
      'Revelation 21:1-5',
      'Revelation 22:1-5'
    ],
    fulfillmentMode: 'kingdom-fulfillment'
  }
};

function getScripturePropheticFulfillment(key = '') {
  return SCRIPTURE_PROPHETIC_FULFILLMENT_ENGINE[String(key || '').trim()] || null;
}

function listScripturePropheticFulfillments() {
  return SCRIPTURE_PROPHETIC_FULFILLMENT_ENGINE;
}

module.exports = {
  getScripturePropheticFulfillment,
  listScripturePropheticFulfillments,
  SCRIPTURE_PROPHETIC_FULFILLMENT_ENGINE
};
