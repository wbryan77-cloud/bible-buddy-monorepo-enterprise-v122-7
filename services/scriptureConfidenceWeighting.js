function weightScriptureConfidence({ scripture = [], parallels = [], history = [] }) {
  const scriptureWeight = scripture.length * 5;
  const parallelWeight = parallels.length * 3;
  const historyWeight = history.length;

  return {
    scriptureWeight,
    parallelWeight,
    historyWeight,
    overallConfidence: scriptureWeight + parallelWeight - historyWeight,
    weightingMode: 'scripture_priority_weighting'
  };
}

module.exports = { weightScriptureConfidence };
