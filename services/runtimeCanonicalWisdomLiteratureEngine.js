const { generateContinuityInsights } = require('./runtimeScriptureContinuityInsightGenerator');
const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');

function buildWisdomLiteratureContinuity({
  category = '',
  references = [],
  verses = [],
  question = '',
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const continuityInsights = generateContinuityInsights({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  return {
    category,
    wisdomLiteratureContinuity: {
      continuityInsights,
      discernment,
      wisdomStructures: [
        'proverbs-practical-wisdom',
        'ecclesiastes-eternal-perspective',
        'job-suffering-and-faithfulness',
        'psalms-worship-and-lament',
        'kingdom-wisdom-application'
      ]
    },
    wisdomObjective:
      'Guide Genesis to Revelation wisdom literature continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildWisdomLiteratureContinuity
};
