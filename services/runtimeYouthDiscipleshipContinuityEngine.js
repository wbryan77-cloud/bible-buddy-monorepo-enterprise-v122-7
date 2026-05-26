const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { buildDevotionalContinuity } = require('./runtimeScriptureContinuityDevotionalEngine');
const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');

function buildYouthDiscipleshipContinuity({
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

  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  return {
    category,
    ageRange,
    youthDiscipleshipContinuity: {
      spiritualFormation,
      devotionalContinuity,
      discernment,
      youthStructures: [
        'kingdom-identity-formation',
        'scripture-memory-development',
        'peer-discipleship-growth',
        'calling-and-purpose-discovery',
        'faithfulness-and-character-formation'
      ]
    },
    youthObjective:
      'Guide Genesis to Revelation youth discipleship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildYouthDiscipleshipContinuity
};
