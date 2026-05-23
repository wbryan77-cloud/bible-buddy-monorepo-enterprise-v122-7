function scoreContinuityPersistence({ scriptures = [], reply = '' }) {
  let score = 100;
  const issues = [];

  if (!Array.isArray(scriptures) || scriptures.length === 0) {
    score -= 25;
    issues.push('missing_scripture_chain');
  }

  const lower = String(reply).toLowerCase();

  if (lower.includes('tradition changed')) {
    score -= 20;
    issues.push('tradition_override_language');
  }

  if (lower.includes('law abolished')) {
    score -= 30;
    issues.push('abolished_language');
  }

  return {
    score,
    issues,
    passed: score >= 75,
  };
}

module.exports = {
  scoreContinuityPersistence,
};