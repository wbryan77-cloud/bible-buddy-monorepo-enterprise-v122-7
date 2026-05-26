const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { buildBiblicalDecisionGuidance } = require('./runtimeCanonicalBiblicalDecisionEngine');

function buildSpiritualWarfareDiscernment({
  category = '',
  references = [],
  question = '',
  decisionPaths = []
} = {}) {
  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  const decisionGuidance = buildBiblicalDecisionGuidance({
    category,
    references,
    question,
    decisionPaths
  });

  return {
    category,
    spiritualWarfareDiscernment: {
      discernment,
      decisionGuidance,
      warfareStructures: [
        'truth-testing',
        'temptation-resistance',
        'spiritual-alertness',
        'scripture-defense',
        'faithfulness-and-perseverance'
      ]
    },
    warfareObjective:
      'Guide Genesis to Revelation spiritual discernment and perseverance line upon line and precept upon precept.'
  };
}

module.exports = {
  buildSpiritualWarfareDiscernment
};
