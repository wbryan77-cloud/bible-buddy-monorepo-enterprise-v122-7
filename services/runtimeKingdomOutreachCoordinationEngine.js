const { buildMissionContinuity } = require('./runtimeScriptureContinuityMissionEngine');
const { buildFellowshipCommunity } = require('./runtimeCanonicalFellowshipCommunityEngine');

function buildKingdomOutreachCoordination({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const missionContinuity = buildMissionContinuity({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  const fellowshipCommunity = buildFellowshipCommunity({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    kingdomOutreachCoordination: {
      missionContinuity,
      fellowshipCommunity,
      outreachStructures: [
        'evangelism-team-coordination',
        'community-service-missions',
        'discipleship-outreach',
        'restoration-and-care-ministry',
        'kingdom-community-engagement'
      ]
    },
    outreachObjective:
      'Guide Genesis to Revelation kingdom outreach and discipleship coordination line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomOutreachCoordination
};
