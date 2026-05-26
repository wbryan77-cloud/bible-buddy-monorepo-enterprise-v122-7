const { buildKingdomEthics } = require('./runtimeCanonicalKingdomEthicsEngine');
const { buildMissionContinuity } = require('./runtimeScriptureContinuityMissionEngine');

function buildJusticeMercyContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const kingdomEthics = buildKingdomEthics({
    category,
    references,
    verses: [],
    question,
    completionKey: 'justice',
    prophecyKey: 'mercy'
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
    justiceMercyContinuity: {
      kingdomEthics,
      missionContinuity,
      justiceStructures: [
        'compassion-and-care',
        'justice-and-righteousness',
        'mercy-and-restoration',
        'servant-advocacy',
        'kingdom-compassion-continuity'
      ]
    },
    justiceObjective:
      'Guide Genesis to Revelation justice and mercy continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildJusticeMercyContinuity
};
