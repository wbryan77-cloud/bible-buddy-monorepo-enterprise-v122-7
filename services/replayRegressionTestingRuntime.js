function runReplayRegression({ prior = [], current = [] }) {
  const regressionWarnings = [];

  if (current.length < prior.length) {
    regressionWarnings.push('scripture_chain_regression_detected');
  }

  return {
    regressionWarnings,
    regressionPassed: regressionWarnings.length === 0,
    replayMode: 'scripture_regression_testing'
  };
}

module.exports = { runReplayRegression };
