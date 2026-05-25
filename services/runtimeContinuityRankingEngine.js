const { resolveScripturePath } = require('./runtimeScripturePathResolver');

function rankContinuityPaths(categories = []) {
  const resolved = categories
    .map(category => resolveScripturePath({ category }))
    .filter(result => result.resolved);

  return resolved.sort((a, b) => {
    return a.traversalPriority - b.traversalPriority;
  });
}

function buildTopContinuityChain(categories = []) {
  const ranked = rankContinuityPaths(categories);

  return {
    totalChains: ranked.length,
    rankedChains: ranked,
    continuityObjective: 'Preserve strongest Genesis to Revelation continuity.'
  };
}

module.exports = {
  rankContinuityPaths,
  buildTopContinuityChain
};
