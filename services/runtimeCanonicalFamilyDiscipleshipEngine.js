const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');

function buildFamilyDiscipleship({
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const formationJourney = buildSpiritualFormationJourney({
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
    familyDiscipleship: {
      formationJourney,
      discernment,
      familyStructures: [
        'marriage-discipleship',
        'parenting-guidance',
        'household-stewardship',
        'covenant-family-formation'
      ]
    },
    familyObjective:
      'Guide Genesis to Revelation covenant family discipleship line upon line and precept upon precept.'
  };
}

module.exports = {
  buildFamilyDiscipleship
};
