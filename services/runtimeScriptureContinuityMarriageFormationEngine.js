const { buildFamilyDiscipleship } = require('./runtimeCanonicalFamilyDiscipleshipEngine');
const { buildPeacemakingReconciliation } = require('./runtimeCanonicalPeacemakingReconciliationEngine');

function buildMarriageFormation({
  category = '',
  references = [],
  question = '',
  reconciliationGoals = []
} = {}) {
  const familyDiscipleship = buildFamilyDiscipleship({
    category,
    references,
    question,
    totalDays: 60
  });

  const peacemaking = buildPeacemakingReconciliation({
    category,
    references,
    question,
    reconciliationGoals
  });

  return {
    category,
    marriageFormation: {
      familyDiscipleship,
      peacemaking,
      marriageStructures: [
        'covenant-marriage-discipleship',
        'communication-and-unity',
        'prayer-and-spiritual-growth',
        'conflict-restoration',
        'long-term-covenant-faithfulness'
      ]
    },
    marriageObjective:
      'Guide Genesis to Revelation marriage and covenant faithfulness continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildMarriageFormation
};
