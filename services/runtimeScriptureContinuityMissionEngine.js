const { buildFellowshipCommunity } = require('./runtimeCanonicalFellowshipCommunityEngine');
const { applyCanonicalLifeGuidance } = require('./runtimeCanonicalLifeApplicationEngine');

function buildMissionContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const fellowship = buildFellowshipCommunity({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  const lifeGuidance = applyCanonicalLifeGuidance({
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    missionContinuity: {
      fellowship,
      lifeGuidance,
      missionStructures: [
        'evangelism-and-outreach',
        'discipleship-and-teaching',
        'kingdom-service',
        'restoration-and-compassion'
      ]
    },
    missionObjective:
      'Guide Genesis to Revelation kingdom mission and discipleship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildMissionContinuity
};
