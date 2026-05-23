function scoreContinuity(chain = []) {
  let score = 0;

  if (chain.length >= 3) score += 25;
  if (chain.length >= 6) score += 25;

  const hasOT = chain.some(v => /Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Isaiah|Jeremiah|Daniel/.test(v));
  const hasNT = chain.some(v => /Matthew|Mark|Luke|John|Acts|Romans|Hebrews|Revelation/.test(v));

  if (hasOT) score += 25;
  if (hasNT) score += 25;

  return {
    continuityScore: score,
    canonicalCoverage: hasOT && hasNT
  };
}

module.exports = { scoreContinuity };
