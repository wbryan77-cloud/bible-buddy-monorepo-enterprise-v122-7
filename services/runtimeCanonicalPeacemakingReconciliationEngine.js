const { buildScriptureCounseling } = require('./runtimeScriptureContinuityCounselingEngine');
const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');

function buildPeacemakingReconciliation({
  category = '',
  references = [],
  question = '',
  reconciliationGoals = []
} = {}) {
  const scriptureCounseling = buildScriptureCounseling({
    category,
    references,
    question,
    totalDays: 30
  });

  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  return {
    category,
    peacemakingReconciliation: {
      scriptureCounseling,
      discernment,
      reconciliationGoals,
      reconciliationStructures: [
        'conflict-resolution',
        'forgiveness-and-restoration',
        'truth-and-grace-balance',
        'reconciliation-conversations',
        'covenant-healing'
      ]
    },
    reconciliationObjective:
      'Guide Genesis to Revelation peacemaking and reconciliation continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildPeacemakingReconciliation
};
