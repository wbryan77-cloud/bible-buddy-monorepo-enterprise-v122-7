const { resolveRevelationCompletion } = require('./runtimeRevelationCompletionEngine');
const { mapDoctrineLineage } = require('./runtimeDynamicDoctrineLineageMapper');

function mapRevelationCompletion({
  completionKey = '',
  category = '',
  prophecyKey = ''
} = {}) {
  const completion = resolveRevelationCompletion(completionKey);

  const lineage = mapDoctrineLineage({
    category,
    prophecyKey
  });

  return {
    completionKey,
    category,
    revelationCompletion: completion || null,
    lineage,
    mappingObjective:
      'Map Genesis to Revelation fulfillment completion continuity canonically.'
  };
}

module.exports = {
  mapRevelationCompletion
};
