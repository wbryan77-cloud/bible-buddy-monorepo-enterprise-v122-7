const { buildKingdomStewardshipFormation } = require('./runtimeKingdomStewardshipFormationEngine');
const { buildWisdomLiteratureContinuity } = require('./runtimeCanonicalWisdomLiteratureEngine');

function buildCreationStewardship({
  category = '',
  references = [],
  verses = [],
  question = '',
  totalDays = 60,
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const stewardshipFormation = buildKingdomStewardshipFormation({
    category,
    references,
    question,
    totalDays
  });

  const wisdomContinuity = buildWisdomLiteratureContinuity({
    category,
    references,
    verses,
    question,
    completionKey,
    prophecyKey
  });

  return {
    category,
    creationStewardship: {
      stewardshipFormation,
      wisdomContinuity,
      creationStructures: [
        'creation-care-and-responsibility',
        'resource-stewardship',
        'sustainable-kingdom-practices',
        'gratitude-for-creation',
        'creation-order-continuity'
      ]
    },
    creationObjective:
      'Guide Genesis to Revelation creation stewardship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildCreationStewardship
};
