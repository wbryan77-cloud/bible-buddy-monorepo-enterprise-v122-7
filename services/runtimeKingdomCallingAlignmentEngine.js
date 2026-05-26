const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { buildMissionContinuity } = require('./runtimeScriptureContinuityMissionEngine');

function buildKingdomCallingAlignment({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  const missionContinuity = buildMissionContinuity({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    kingdomCalling: {
      discernment,
      missionContinuity,
      callingStructures: [
        'purpose-and-identity',
        'spiritual-gifts-and-service',
        'kingdom-assignment',
        'faithfulness-and-perseverance'
      ]
    },
    callingObjective:
      'Guide Genesis to Revelation kingdom calling alignment line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomCallingAlignment
};
