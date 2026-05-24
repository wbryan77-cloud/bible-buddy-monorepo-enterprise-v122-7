const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { getConversationState } = require('./runtimeConversationStateEngine');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');

function buildReflectionPrompt({ userId, currentMessage = '' }) {
  const continuity = getContinuityMemory(userId);
  const state = getConversationState(userId);
  const studies = getRecentStudySessions(userId, 5);

  const prompts = [];

  if (state.currentTopic) {
    prompts.push(`You were thinking about ${state.currentTopic} recently. Has anything changed for you there?`);
  }

  if ((continuity.unresolvedThemes || []).includes('career')) {
    prompts.push('You mentioned work-related pressure before. How are you feeling about that today?');
  }

  if ((continuity.unresolvedThemes || []).includes('prayer')) {
    prompts.push('Would you like to continue in prayer about what has been weighing on you lately?');
  }

  if (studies.length) {
    const recent = studies[studies.length - 1];
    if (recent?.topic) {
      prompts.push(`You recently studied ${recent.topic}. Did anything from that study stay with you afterward?`);
    }
  }

  if (!prompts.length) {
    prompts.push('What has been on your mind most lately?');
  }

  return {
    scriptureFirst: true,
    relationalContinuityEnabled: true,
    currentMessage,
    prompts: prompts.slice(0, 5),
    avoidGenericTherapyLanguage: true,
  };
}

module.exports = {
  buildReflectionPrompt,
};
