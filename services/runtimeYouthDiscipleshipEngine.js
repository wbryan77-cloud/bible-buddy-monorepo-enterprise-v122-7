const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { buildDevotionalContinuity } = require('./runtimeScriptureContinuityDevotionalEngine');

function buildYouthDiscipleship({
  category = '',
  references = [],
  question = '',
  ageRange = 'teen',
  totalDays = 30,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const spiritualFormation = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays
  });

  const devotionalContinuity = buildDevotionalContinuity({
    category,
    references,
    question,
    totalDays,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    ageRange,
    youthDiscipleship: {
      spiritualFormation,
      devotionalContinuity,
      youthStructures: [
        'kingdom-identity-formation',
        'scripture-memory-and-growth',
        'peer-discipleship',
        'purpose-and-calling-development',
        'faithfulness-and-character'
      ]
    },
    youthObjective:
      'Guide Genesis to Revelation youth discipleship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildYouthDiscipleship
};
