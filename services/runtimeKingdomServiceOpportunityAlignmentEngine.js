const { buildKingdomCallingAlignment } = require('./runtimeKingdomCallingAlignmentEngine');
const { buildMissionContinuity } = require('./runtimeScriptureContinuityMissionEngine');

function buildServiceOpportunityAlignment({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  serviceInterests = [],
  totalDays = 30
} = {}) {
  const kingdomCalling = buildKingdomCallingAlignment({
    sessionId,
    category,
    references,
    question,
    totalDays
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
    kingdomServiceAlignment: {
      kingdomCalling,
      missionContinuity,
      serviceInterests,
      serviceStructures: [
        'spiritual-gifts-alignment',
        'volunteer-opportunity-pathways',
        'service-and-compassion-ministry',
        'discipleship-service-coordination',
        'kingdom-purpose-engagement'
      ]
    },
    serviceObjective:
      'Guide Genesis to Revelation kingdom service and ministry alignment line upon line and precept upon precept.'
  };
}

module.exports = {
  buildServiceOpportunityAlignment
};
