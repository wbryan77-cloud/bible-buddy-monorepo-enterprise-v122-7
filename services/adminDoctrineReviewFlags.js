function buildDoctrineReviewFlags({ reply = '', score = 100, issues = [] }) {
  const flags = [];

  if (score < 80) {
    flags.push('low_doctrine_score');
  }

  if (Array.isArray(issues) && issues.length) {
    flags.push('continuity_issues_detected');
  }

  if (String(reply).toLowerCase().includes('interpretation')) {
    flags.push('interpretation_language_detected');
  }

  return flags;
}

module.exports = {
  buildDoctrineReviewFlags,
};