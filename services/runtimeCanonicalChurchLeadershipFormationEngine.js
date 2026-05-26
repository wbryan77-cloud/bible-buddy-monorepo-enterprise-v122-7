const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { buildFellowshipCommunity } = require('./runtimeCanonicalFellowshipCommunityEngine');

function buildChurchLeadershipFormation({
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

  const fellowship = buildFellowshipCommunity({
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    churchLeadershipFormation: {
      discernment,
      fellowship,
      leadershipStructures: [
        'elder-formation',
        'pastoral-shepherding',
        'servant-leadership',
        'church-accountability',
        'biblical-teaching-and-discipleship'
      ]
    },
    leadershipObjective:
      'Guide Genesis to Revelation church leadership formation line upon line and precept upon precept.'
  };
}

module.exports = {
  buildChurchLeadershipFormation
};
