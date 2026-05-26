const { resolveScripturePath } = require('./runtimeScripturePathResolver');
const { resolvePropheticFulfillment } = require('./runtimePropheticFulfillmentResolver');

function mapDoctrineLineage({
  category = '',
  prophecyKey = ''
} = {}) {
  const scripturePath = resolveScripturePath({ category });
  const propheticLineage = resolvePropheticFulfillment(prophecyKey);

  return {
    category,
    prophecyKey,
    lineageMap: {
      doctrineConnections: scripturePath.linkedDomains || [],
      propheticLineage: propheticLineage || null,
      lineageStages: [
        'foundation',
        'prophetic-expansion',
        'messiah-fulfillment',
        'apostolic-witness',
        'revelation-completion'
      ]
    },
    lineageObjective:
      'Map Genesis to Revelation doctrine ancestry and fulfillment continuity.'
  };
}

module.exports = {
  mapDoctrineLineage
};
