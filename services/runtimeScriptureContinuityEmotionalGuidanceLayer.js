const { composeCanonicalResponse } = require('./runtimeCanonicalResponseComposer');

function provideScriptureGuidance({
  emotionalState = '',
  category = '',
  references = [],
  question = ''
} = {}) {
  const canonicalResponse = composeCanonicalResponse({
    category,
    references,
    question
  });

  return {
    emotionalState,
    guidanceResponse: canonicalResponse,
    guidanceObjective:
      'Provide Genesis to Revelation Scripture-first guidance line upon line and precept upon precept.'
  };
}

module.exports = {
  provideScriptureGuidance
};
