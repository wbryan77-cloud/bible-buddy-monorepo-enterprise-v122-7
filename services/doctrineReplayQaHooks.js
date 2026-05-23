function runDoctrineReplayQA(response = {}) {
  const checks = [];

  if (!response.scripture || response.scripture.length === 0) {
    checks.push('missing_scripture_chain');
  }

  if (response.historicalSupport && response.historicalSupport.length > 0 && (!response.scripture || response.scripture.length < response.historicalSupport.length)) {
    checks.push('history_outweighs_scripture');
  }

  return {
    qaChecks: checks,
    qaPassed: checks.length === 0,
    qaMode: 'scripture_replay_validation'
  };
}

module.exports = { runDoctrineReplayQA };
