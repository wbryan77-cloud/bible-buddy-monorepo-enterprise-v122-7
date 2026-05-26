const { composeCanonicalResponse } = require('./runtimeCanonicalResponseComposer');
const { detectCanonicalContradictions } = require('./runtimeCanonicalContradictionDetectionEngine');

function provideCanonicalDiscernment({
  category = '',
  references = [],
  question = ''
} = {}) {
  const response = composeCanonicalResponse({
    category,
    references,
    question
  });

  const contradictionAnalysis = detectCanonicalContradictions({
    category,
    references
  });

  return {
    category,
    discernment: {
      canonicalResponse: response,
      contradictionAnalysis,
      discernmentFocus: [
        'scripture-first-guidance',
        'covenant-continuity',
        'messiah-fulfillment',
        'revelation-completion'
      ]
    },
    discernmentObjective:
      'Provide Genesis to Revelation continuity-aware discernment line upon line and precept upon precept.'
  };
}

module.exports = {
  provideCanonicalDiscernment
};
