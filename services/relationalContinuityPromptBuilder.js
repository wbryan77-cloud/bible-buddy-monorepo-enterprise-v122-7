const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { getPersonalityContinuity } = require('./runtimePersonalityContinuity');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');

function buildRelationalContinuityPrompt({ userId, currentMessage = '' }) {
  const continuity = getContinuityMemory(userId);
  const personality = getPersonalityContinuity(userId);
  const studies = getRecentStudySessions(userId, 5);

  const unresolvedThemes = continuity.unresolvedThemes || [];

  const recentStudyTopics = studies.map((s) => s.topic).filter(Boolean);

  return {
    scriptureFirst: true,
    avoidGenericTherapyLanguage: true,
    relationalContinuityEnabled: true,
    currentMessage,
    unresolvedThemes,
    recentStudyTopics,
    communicationStyle: personality.communicationStyle || {},
    guidance: {
      rememberPriorTopics: true,
      referencePriorConversationsNaturally: true,
      avoidRepeatingFallbackPhrases: true,
      avoidRoboticTone: true,
      prioritizeScriptureContinuity: true,
      maintainLineUponLineStructure: true,
    },
    relationalSuggestions: buildSuggestions({
      unresolvedThemes,
      recentStudyTopics,
    }),
  };
}

function buildSuggestions({ unresolvedThemes = [], recentStudyTopics = [] }) {
  const suggestions = [];

  unresolvedThemes.forEach((theme) => {
    suggestions.push(`Reconnect naturally to prior ${theme} continuity if relevant.`);
  });

  recentStudyTopics.forEach((topic) => {
    suggestions.push(`Reference previous study on ${topic} if contextually appropriate.`);
  });

  return suggestions.slice(0, 10);
}

module.exports = {
  buildRelationalContinuityPrompt,
};
