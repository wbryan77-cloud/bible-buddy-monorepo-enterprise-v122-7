const { getConversationState } = require('./runtimeConversationStateEngine');
const { buildRelationalContinuityPrompt } = require('./relationalContinuityPromptBuilder');
const { buildPrayerContinuityContext } = require('./runtimePrayerContinuityEngine');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');

function buildCompanionPresence({
  userId,
  currentMessage = '',
  mode = 'talk',
}) {
  const state = getConversationState(userId);

  const relational = buildRelationalContinuityPrompt({
    userId,
    currentMessage,
  });

  const prayer = buildPrayerContinuityContext(userId);

  const studies = getRecentStudySessions(userId, 3);

  const gentlePresence = [];

  if (state.currentTopic) {
    gentlePresence.push(
      `I remember you were talking about ${state.currentTopic}.`
    );
  }

  if (prayer.activePrayerTopics?.length) {
    gentlePresence.push(
      `We still have ongoing prayer topics that matter to you.`
    );
  }

  if (studies.length) {
    const latest = studies[studies.length - 1];

    if (latest?.topic) {
      gentlePresence.push(
        `You were recently studying ${latest.topic}.`
      );
    }
  }

  return {
    scriptureFirst: true,
    continuityEnabled: true,
    companionPresenceEnabled: true,
    mode,
    relational,
    prayer,
    gentlePresence,
    guidance: {
      avoidRoboticLanguage: true,
      avoidRepeatingFallbackPhrases: true,
      prioritizeRelationalContinuity: true,
      maintainGentleTone: true,
      preserveScriptureCenteredConversation: true,
    },
  };
}

module.exports = {
  buildCompanionPresence,
};
