function suppressContradictions(response = {}) {
  const warnings = [];

  if (response.historicalSupport && response.scripture && response.historicalSupport.length > response.scripture.length) {
    warnings.push('historical_support_exceeds_scripture_weight');
  }

  return {
    ...response,
    contradictionWarnings: warnings,
    suppressionMode: 'scripture_priority'
  };
}

module.exports = { suppressContradictions };
