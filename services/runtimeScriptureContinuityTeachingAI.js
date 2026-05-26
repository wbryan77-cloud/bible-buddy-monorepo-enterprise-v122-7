const { continueCanonicalConversation } = require('./runtimeScriptureContinuityConversationEngine');
const { recommendScriptureJourney } = require('./runtimeScriptureJourneyRecommendationEngine');

function teachCanonicalContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = ''
} = {}) {
  const conversation = continueCanonicalConversation({
    sessionId,
    category,
    references,
    question
  });

  const recommendations = recommendScriptureJourney({
    category,
    references
  });

  return {
    teachingSession: {
      conversation,
      recommendations
    },
    teachingObjective:
      'Teach Genesis to Revelation continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  teachCanonicalContinuity
};
