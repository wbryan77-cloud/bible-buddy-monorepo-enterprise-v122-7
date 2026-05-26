const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { buildWisdomLiteratureContinuity } = require('./runtimeCanonicalWisdomLiteratureEngine');

function buildKingdomEthics({
  category = '',
  references = [],
  verses = [],
  question = '',
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  const wisdomContinuity = buildWisdomLiteratureContinuity({
    category,
    references,
    verses,
    question,
    completionKey,
    prophecyKey
  });

  return {
    category,
    kingdomEthics: {
      discernment,
      wisdomContinuity,
      ethicsStructures: [
        'integrity-and-honesty',
        'justice-and-mercy',
        'servant-leadership-ethics',
        'financial-and-workplace-integrity',
        'kingdom-accountability'
      ]
    },
    ethicsObjective:
      'Guide Genesis to Revelation kingdom ethics continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomEthics
};
