const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { getConversationState } = require('./runtimeConversationStateEngine');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');

function buildPersonalizedFollowup({ userId, currentMessage = '' }) {
  const continuity = getContinuityMemory(userId);
  const state = getConversationState(userId);
  const studies = getRecentStudySessions(userId, 5);

  const suggestions = [];

  const unresolved = continuity.unresolvedThemes || [];

  unresolved.forEach((theme) => {
    if (theme === 'career') {
      suggestions.push('You mentioned work or résumé concerns earlier. Do you want to continue working through that today?');
    }

    if (theme === 'prayer') {
      suggestions.push('You asked for prayer previously. Would you like to continue that conversation?');
    }

    if (theme === 'study') {
      suggestions.push('You have ongoing Scripture studies. Would you like to continue one of those topics?');
    }
  });

  if (state.currentTopic) {
    suggestions.push(`Last time you were focused on ${state.currentTopic}. Do you want to continue there or move into a new topic?`);
  }

  studies.forEach((study) => {
    if (study.topic) {
      suggestions.push(`You recently studied ${study.topic}. Would you like to revisit or expand that study?`);
    }
  });

  return {
    scriptureFirst: true,
    relationalContinuityEnabled: true,
    currentMessage,
    suggestions: [...new Set(suggestions)].slice(0, 8),
    avoidGenericResponses: true,
  };
}

module.exports = {
  buildPersonalizedFollowup,
};
