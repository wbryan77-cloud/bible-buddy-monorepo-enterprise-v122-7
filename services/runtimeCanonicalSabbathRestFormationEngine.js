const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { buildWorshipContinuity } = require('./runtimeCanonicalWorshipContinuityEngine');

function buildSabbathRestFormation({
  sessionId = '',
  category = '',
  references = [],
  question = '',
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

  const worshipContinuity = buildWorshipContinuity({
    sessionId,
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
    sabbathRestFormation: {
      spiritualFormation,
      worshipContinuity,
      restStructures: [
        'biblical-rest-rhythms',
        'restoration-and-renewal',
        'burnout-prevention-and-balance',
        'worshipful-rest-practices',
        'kingdom-rest-continuity'
      ]
    },
    restObjective:
      'Guide Genesis to Revelation Sabbath and spiritual rest continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildSabbathRestFormation
};
