function scoreCanonicalContinuity({
  category = '',
  references = []
} = {}) {
  const referenceCount = Array.isArray(references) ? references.length : 0;
  const continuityScore = referenceCount > 0 ? Math.min(1, referenceCount / 5) : 0;

  return {
    category,
    continuityScore,
    referenceCount,
    scoringObjective:
      'Score Genesis to Revelation canonical continuity strength for the supplied references.'
  };
}

module.exports = {
  scoreCanonicalContinuity
};
