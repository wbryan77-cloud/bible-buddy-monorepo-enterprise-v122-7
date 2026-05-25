const { buildCanonicalTraversalResponse } = require('./runtimeCanonicalContinuityOrchestrator');

function validateDoctrineContinuity({
  category = '',
  references = [],
  response = ''
} = {}) {
  const validation = {
    category,
    valid: true,
    warnings: [],
    continuityChecks: {
      hasGenesisReference: false,
      hasMessiahReference: false,
      hasApostolicReference: false,
      hasRevelationReference: false
    }
  };

  references.forEach(ref => {
    const normalized = String(ref || '').toLowerCase();

    if (normalized.includes('genesis')) {
      validation.continuityChecks.hasGenesisReference = true;
    }

    if (
      normalized.includes('matthew') ||
      normalized.includes('mark') ||
      normalized.includes('luke') ||
      normalized.includes('john')
    ) {
      validation.continuityChecks.hasMessiahReference = true;
    }

    if (
      normalized.includes('acts') ||
      normalized.includes('romans') ||
      normalized.includes('corinthians') ||
      normalized.includes('hebrews')
    ) {
      validation.continuityChecks.hasApostolicReference = true;
    }

    if (normalized.includes('revelation')) {
      validation.continuityChecks.hasRevelationReference = true;
    }
  });

  Object.entries(validation.continuityChecks).forEach(([key, value]) => {
    if (!value) {
      validation.warnings.push(`Missing continuity checkpoint: ${key}`);
    }
  });

  validation.traversal = buildCanonicalTraversalResponse({
    category,
    references
  });

  validation.responseLength = String(response || '').length;

  return validation;
}

module.exports = {
  validateDoctrineContinuity
};
