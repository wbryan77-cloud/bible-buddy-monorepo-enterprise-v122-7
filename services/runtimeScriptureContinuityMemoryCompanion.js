const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { continueCanonicalConversation } = require('./runtimeScriptureContinuityConversationEngine');

function buildMemoryCompanion({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  milestones = []
} = {}) {
  const spiritualFormation = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays: 30
  });

  const continuityConversation = continueCanonicalConversation({
    sessionId,
    category,
    references,
    question
  });

  return {
    category,
    memoryCompanion: {
      spiritualFormation,
      continuityConversation,
      milestones,
      memoryStructures: [
        'answered-prayers',
        'discipleship-growth',
        'scripture-milestones',
        'formation-progress',
        'kingdom-journey'
      ]
    },
    memoryObjective:
      'Preserve Genesis to Revelation spiritual formation continuity and discipleship memory line upon line and precept upon precept.'
  };
}

module.exports = {
  buildMemoryCompanion
};
