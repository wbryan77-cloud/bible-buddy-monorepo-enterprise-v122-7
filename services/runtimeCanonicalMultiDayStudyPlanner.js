const { recommendScriptureJourney } = require('./runtimeScriptureJourneyRecommendationEngine');
const { generateCanonicalStudy } = require('./runtimeCanonicalStudyGenerator');

function buildMultiDayStudyPlan({
  category = '',
  references = [],
  totalDays = 7
} = {}) {
  const journey = recommendScriptureJourney({
    category,
    references
  });

  const study = generateCanonicalStudy({
    category,
    references
  });

  const dailyPlan = [];

  for (let day = 1; day <= totalDays; day += 1) {
    dailyPlan.push({
      day,
      focusCategory: category,
      traversalFocus: [
        'foundation',
        'prophetic-expansion',
        'messiah-fulfillment',
        'apostolic-witness',
        'revelation-completion'
      ],
      recommendedDomains: journey.recommendedJourney.expandedDomains,
      studyFlow: study.studyFlow
    });
  }

  return {
    category,
    totalDays,
    dailyPlan,
    planningObjective:
      'Generate Genesis to Revelation continuity discipleship journeys line upon line and precept upon precept.'
  };
}

module.exports = {
  buildMultiDayStudyPlan
};
