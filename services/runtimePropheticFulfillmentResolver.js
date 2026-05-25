const PROPHETIC_FULFILLMENT_REGISTRY = {
  messiah_birth: {
    prophecy: ['Isaiah 7:14', 'Micah 5:2'],
    fulfillment: ['Matthew 1:22-23', 'Luke 2:10-11'],
    completion: ['Revelation 12:1-5']
  },
  suffering_servant: {
    prophecy: ['Isaiah 53:1-12', 'Psalm 22:1-18'],
    fulfillment: ['John 19:23-37', '1 Peter 2:21-25'],
    completion: ['Revelation 5:6-14']
  },
  kingdom_restoration: {
    prophecy: ['Isaiah 2:2-4', 'Daniel 7:13-14'],
    fulfillment: ['Luke 1:31-33', 'Acts 1:6-8'],
    completion: ['Revelation 11:15', 'Revelation 21:1-5']
  }
};

function resolvePropheticFulfillment(key = '') {
  return PROPHETIC_FULFILLMENT_REGISTRY[String(key || '').trim()] || null;
}

function listPropheticFulfillments() {
  return PROPHETIC_FULFILLMENT_REGISTRY;
}

module.exports = {
  resolvePropheticFulfillment,
  listPropheticFulfillments,
  PROPHETIC_FULFILLMENT_REGISTRY
};
