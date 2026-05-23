function trackRuntimeProvenance({ scripture = [], history = [] }) {
  return {
    scriptureSources: scripture.map(v => ({ type: 'scripture', ref: v })),
    historicalSources: history.map(v => ({ type: 'historical_support', ref: v })),
    provenanceMode: 'separated_tracking'
  };
}

module.exports = { trackRuntimeProvenance };
