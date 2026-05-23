function renderScriptureHistoryResponse({ scripture = [], parallels = [], history = [] }) {
  return {
    scripture,
    parallelVerses: parallels,
    historicalSupport: history,
    rendererMode: 'scripture_first_history_separated'
  };
}

module.exports = { renderScriptureHistoryResponse };
