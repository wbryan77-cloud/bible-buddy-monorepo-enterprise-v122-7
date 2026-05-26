const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { continueCanonicalConversation } = require('./runtimeScriptureContinuityConversationEngine');

function buildFellowshipCommunity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const formationJourney = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays
  });

  const continuityConversation = continueCanonicalConversation({
    sessionId,
    category,
    references,
    question
  });

  return {
    category,
    fellowshipCommunity: {
      formationJourney,
      continuityConversation,
      fellowshipStructures: [
        'shared-scripture-study',
        'community-discipleship',
        'accountability-and-growth',
        'kingdom-encouragement'
      ]
    },
    fellowshipObjective:
      'Build Genesis to Revelation Scripture-centered fellowship and discipleship continuity.'
  };
}

module.exports = {
  buildFellowshipCommunity
};
