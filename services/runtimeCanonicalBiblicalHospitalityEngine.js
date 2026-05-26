const { buildFellowshipCommunity } = require('./runtimeCanonicalFellowshipCommunityEngine');
const { buildMissionContinuity } = require('./runtimeScriptureContinuityMissionEngine');

function buildBiblicalHospitality({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const fellowshipCommunity = buildFellowshipCommunity({
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
    biblicalHospitality: {
      fellowshipCommunity,
      missionContinuity,
      hospitalityStructures: [
        'welcoming-and-fellowship',
        'generosity-and-service',
        'care-for-strangers',
        'community-support',
        'kingdom-hospitality-continuity'
      ]
    },
    hospitalityObjective:
      'Guide Genesis to Revelation biblical hospitality continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildBiblicalHospitality
};
