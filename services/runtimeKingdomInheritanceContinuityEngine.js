const { buildEternalKingdomContinuity } = require('./runtimeEternalKingdomContinuityEngine');
const { buildResurrectionContinuity } = require('./runtimeResurrectionContinuityEngine');

function buildKingdomInheritanceContinuity({
  category = '',
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const eternalKingdom = buildEternalKingdomContinuity({
    category,
    completionKey,
    prophecyKey,
    verses
  });

  const resurrection = buildResurrectionContinuity({
    category,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    kingdomInheritance: {
      eternalKingdom,
      resurrection,
      inheritanceStages: [
        'promise-of-inheritance',
        'covenant-heirs',
        'messiah-inheritance-confirmed',
        'resurrection-inheritance',
        'eternal-kingdom-inheritance'
      ]
    },
    inheritanceObjective:
      'Preserve Genesis to Revelation kingdom inheritance continuity canonically.'
  };
}

module.exports = {
  buildKingdomInheritanceContinuity
};
