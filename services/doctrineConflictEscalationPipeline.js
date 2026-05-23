function escalateDoctrineConflict({ score = 100, issues = [], reply = '' }) {
  const escalation = {
    escalate: false,
    level: 'none',
    reasons: [],
  };

  if (score < 70) {
    escalation.escalate = true;
    escalation.level = 'high';
    escalation.reasons.push('low_continuity_score');
  }

  if (Array.isArray(issues) && issues.length > 0) {
    escalation.escalate = true;
    escalation.level = escalation.level === 'high' ? 'high' : 'medium';
    escalation.reasons.push(...issues);
  }

  if (String(reply).toLowerCase().includes('abolished')) {
    escalation.escalate = true;
    escalation.level = 'high';
    escalation.reasons.push('abolished_language_detected');
  }

  return escalation;
}

module.exports = {
  escalateDoctrineConflict,
};