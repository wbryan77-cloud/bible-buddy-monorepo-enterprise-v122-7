const { buildSabbathHistoryDeepResponse } = require('./sabbathHistoryDeepResponder');

function buildSabbathHistoryResponse(options = {}) {
  return buildSabbathHistoryDeepResponse(options);
}

module.exports = {
  buildSabbathHistoryResponse,
};
