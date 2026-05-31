function isDoctrineTopic(message = '') {
  const text = String(message).toLowerCase();

  const doctrineTerms = [
    'sabbath',
    'dietary law',
    'unclean',
    'acts 10',
    'acts 11',
    'leviticus',
    'feast day',
    'high sabbath',
    'passover',
    'unleavened bread',
    'tabernacles',
    'pentecost',
    'christmas',
    'easter',
    'traditions of men',
    'jeremiah 10',
    'commandments',
    'resurrection',
    'resurrection timeline',
    'three days and three nights',
    'matthew 12:40',
    'daniel 9:27',
    'midst of the week',
    'genesis to revelation',
    'line upon line',
    'precept upon precept',
  ];

  return doctrineTerms.some((term) => text.includes(term));
}

/**
 * Guardrails as boundaries — intercept only when user wants doctrine content,
 * not when asking history, evidence, correction, prayer, or grief.
 */
function shouldInterceptDoctrine(message = '', questionIntent = null) {
  if (!isDoctrineTopic(message) && !questionIntent?.topic) {
    return false;
  }

  if (questionIntent?.shouldSkipDoctrineIntercept) {
    return false;
  }

  const skipTypes = [
    'correction',
    'historical_causation',
    'historical_confirmation',
    'evidence_request',
    'prayer',
    'personal_help',
    'study_continuation',
  ];

  if (questionIntent && skipTypes.includes(questionIntent.questionType)) {
    return false;
  }

  if (questionIntent?.isHistoricalQuestion) {
    return false;
  }

  return isDoctrineTopic(message) || !!questionIntent?.topic;
}

module.exports = {
  isDoctrineTopic,
  shouldInterceptDoctrine,
};
