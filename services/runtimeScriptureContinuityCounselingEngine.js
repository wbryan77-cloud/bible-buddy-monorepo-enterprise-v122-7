const { applyCanonicalLifeGuidance } = require('./runtimeCanonicalLifeApplicationEngine');
const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');

function buildScriptureCounseling({
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const lifeGuidance = applyCanonicalLifeGuidance({
    category,
    references,
    question,
    totalDays
  });

  const formationJourney = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    scriptureCounseling: {
      lifeGuidance,
      formationJourney,
      counselingStructures: [
        'grief-restoration',
        'anxiety-and-peace',
        'forgiveness-and-reconciliation',
        'spiritual-healing',
        'identity-and-hope'
      ]
    },
    counselingObjective:
      'Guide Genesis to Revelation Scripture-centered counseling continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildScriptureCounseling
};
