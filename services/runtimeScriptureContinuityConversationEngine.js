const { composeCanonicalResponse } = require('./runtimeCanonicalResponseComposer');
const {
  storeStudySession,
  storeContinuityHistory
} = require('./runtimeCanonicalMemoryLayer');

function continueCanonicalConversation({
  sessionId = '',
  category = '',
  references = [],
  question = ''
} = {}) {
  const response = composeCanonicalResponse({
    category,
    references,
    question
  });

  const storedSession = storeStudySession({
    sessionId,
    category,
    traversal: response.canonicalResponse
  });

  const continuityHistory = storeContinuityHistory({
    category,
    references
  });

  return {
    sessionId,
    category,
    response,
    storedSession,
    continuityHistory,
    conversationObjective:
      'Maintain Genesis to Revelation continuity conversations line upon line and precept upon precept.'
  };
}

module.exports = {
  continueCanonicalConversation
};
