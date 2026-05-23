function calculateDoctrineConfidence({ scriptures = [], findings = [] }) {
  let score = 50;

  score += Math.min(scriptures.length * 5, 40);

  if (findings.length > 0) {
    score -= findings.length * 10;
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    score,
    confidence: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
  };
}

module.exports = { calculateDoctrineConfidence };
