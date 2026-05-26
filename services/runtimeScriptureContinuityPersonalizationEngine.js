const { buildMultiDayStudyPlan } = require('./runtimeCanonicalMultiDayStudyPlanner');

function personalizeContinuityJourney({
  userProfile = {},
  category = '',
  references = []
} = {}) {
  const studyPlan = buildMultiDayStudyPlan({
    category,
    references,
    totalDays: userProfile.preferredStudyDays || 7
  });

  return {
    personalizedJourney: {
      preferredStudyDays: userProfile.preferredStudyDays || 7,
      focusMode: userProfile.focusMode || 'genesis-to-revelation',
      reinforcementPreference:
        userProfile.reinforcementPreference || 'line-upon-line',
      studyPlan
    },
    personalizationObjective:
      'Personalize Genesis to Revelation continuity discipleship journeys.'
  };
}

module.exports = {
  personalizeContinuityJourney
};
