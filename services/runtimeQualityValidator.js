const { CONTINUITY_RULES } = require('./doctrineContinuityRules');

function validateDoctrineResponse(reply = '', topic = '') {
  const lower = String(reply).toLowerCase();
  const issues = [];
  let score = 100;

  const rules = CONTINUITY_RULES[topic];

  if (!rules) {
    return {
      passed: true,
      score,
      issues,
    };
  }

  for (const phrase of rules.forbiddenPhrases || []) {
    if (lower.includes(String(phrase).toLowerCase())) {
      score -= 30;
      issues.push(`forbidden_phrase:${phrase}`);
    }
  }

  if (topic === 'dietaryLaw') {
    if (!lower.includes('acts 10:28') && !lower.includes('acts 11')) {
      score -= 15;
      issues.push('missing_contextual_explanation');
    }
  }

  if (topic === 'sabbath') {
    if (!lower.includes('genesis 2') || !lower.includes('exodus 20')) {
      score -= 15;
      issues.push('missing_foundation_chain');
    }
  }

  return {
    passed: score >= 75,
    score,
    issues,
  };
}

module.exports = {
  validateDoctrineResponse,
};