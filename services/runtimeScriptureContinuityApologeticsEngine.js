const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { buildBiblicalDecisionGuidance } = require('./runtimeCanonicalBiblicalDecisionEngine');

function buildApologeticsContinuity({
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
    apologeticsContinuity: {
      discernment,
      decisionGuidance,
      apologeticsStructures: [
        'gentle-truth-defense',
        'respectful-dialogue',
        'doctrinal-clarity',
        'scripture-based-responses',
        'continuity-safe-explanations'
      ]
    },
    apologeticsObjective:
      'Guide Genesis to Revelation apologetics continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildApologeticsContinuity
};
