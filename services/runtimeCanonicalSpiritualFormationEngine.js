const { buildMultiDayStudyPlan } = require('./runtimeCanonicalMultiDayStudyPlanner');
const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');

function buildSpiritualFormationJourney({
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const studyPlan = buildMultiDayStudyPlan({
    category,
    references,
    totalDays
  });

  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  return {
    category,
    spiritualFormation: {
      studyPlan,
      discernment,
      formationStages: [
        'foundation-and-repentance',
        'covenant-understanding',
        'messiah-following',
        'apostolic-growth',
        'kingdom-perseverance'
      ]
    },
    formationObjective:
      'Guide Genesis to Revelation spiritual formation line upon line and precept upon precept.'
  };
}

module.exports = {
  buildSpiritualFormationJourney
};
