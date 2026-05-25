const { validateDoctrineContinuity } = require('./runtimeCanonicalDoctrineValidator');

function buildGenesisToRevelationTraversal({
  category = '',
  references = []
} = {}) {
  const traversalStages = {
    foundation: [],
    propheticExpansion: [],
    messiahFulfillment: [],
    apostolicWitness: [],
    revelationCompletion: []
  };

  references.forEach(ref => {
    const normalized = String(ref || '').toLowerCase();

    if (
      normalized.includes('genesis') ||
      normalized.includes('exodus') ||
      normalized.includes('leviticus') ||
      normalized.includes('deuteronomy')
    ) {
      traversalStages.foundation.push(ref);
    }

    if (
      normalized.includes('isaiah') ||
      normalized.includes('jeremiah') ||
      normalized.includes('ezekiel') ||
      normalized.includes('daniel') ||
      normalized.includes('micah')
    ) {
      traversalStages.propheticExpansion.push(ref);
    }

    if (
      normalized.includes('matthew') ||
      normalized.includes('mark') ||
      normalized.includes('luke') ||
      normalized.includes('john')
    ) {
      traversalStages.messiahFulfillment.push(ref);
    }

    if (
      normalized.includes('acts') ||
      normalized.includes('romans') ||
      normalized.includes('corinthians') ||
      normalized.includes('hebrews')
    ) {
      traversalStages.apostolicWitness.push(ref);
    }

    if (normalized.includes('revelation')) {
      traversalStages.revelationCompletion.push(ref);
    }
  });

  return {
    category,
    traversalStages,
    doctrineValidation: validateDoctrineContinuity({
      category,
      references
    })
  };
}

module.exports = {
  buildGenesisToRevelationTraversal
};
