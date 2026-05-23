function runScriptureContinuityChecks(reply = '') {
  const lower = String(reply).toLowerCase();
  const findings = [];

  if (lower.includes('sabbath replaced')) {
    findings.push('review_sabbath_language');
  }

  if (lower.includes('dietary laws removed')) {
    findings.push('review_dietary_language');
  }

  if (lower.includes('law abolished')) {
    findings.push('review_law_language');
  }

  return {
    findings,
    passed: findings.length === 0,
  };
}

module.exports = { runScriptureContinuityChecks };
