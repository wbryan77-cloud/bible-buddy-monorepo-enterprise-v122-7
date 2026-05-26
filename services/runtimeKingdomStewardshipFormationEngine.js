const { applyCanonicalLifeGuidance } = require('./runtimeCanonicalLifeApplicationEngine');
const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');

function buildKingdomStewardshipFormation({
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const lifeGuidance = applyCanonicalLifeGuidance({
    category,
    references,
    question,
    totalDays
  });

  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  return {
    category,
    stewardshipFormation: {
      lifeGuidance,
      discernment,
      stewardshipAreas: [
        'health-stewardship',
        'financial-stewardship',
        'relationship-stewardship',
        'calling-and-service',
        'kingdom-responsibility'
      ]
    },
    stewardshipObjective:
      'Guide Genesis to Revelation kingdom stewardship and covenant responsibility line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomStewardshipFormation
};
