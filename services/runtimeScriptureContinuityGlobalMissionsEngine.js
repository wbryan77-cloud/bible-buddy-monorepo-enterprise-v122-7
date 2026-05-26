const { buildMissionContinuity } = require('./runtimeScriptureContinuityMissionEngine');
const { buildKingdomOutreachCoordination } = require('./runtimeKingdomOutreachCoordinationEngine');

function buildGlobalMissionsContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 90
} = {}) {
  const missionContinuity = buildMissionContinuity({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  const outreachCoordination = buildKingdomOutreachCoordination({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    globalMissionsContinuity: {
      missionContinuity,
      outreachCoordination,
      missionsStructures: [
        'missions-discipleship',
        'global-scripture-outreach',
        'translation-and-accessibility',
        'compassion-and-service-missions',
        'kingdom-expansion-continuity'
      ]
    },
    missionsObjective:
      'Guide Genesis to Revelation global missions continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildGlobalMissionsContinuity
};
