function detectAmbiguousRequest(message = '') {
  const text = String(message || '').toLowerCase();

  const indicators = [
    'what does this mean',
    'explain this',
    'which law',
    'what should i do',
    'is this right',
    'help me understand'
  ];

  return indicators.some((item) => text.includes(item));
}

function buildClarificationQuestions(message = '') {
  const text = String(message || '').toLowerCase();

  if (text.includes('law')) {
    return [
      'Are you asking about sacrificial law, moral law, dietary law, or Sabbath continuity?',
      'Would you like Old Testament and New Testament continuity verses together?'
    ];
  }

  if (text.includes('salvation')) {
    return [
      'Would you like to study repentance, baptism, obedience, faith, or resurrection continuity?'
    ];
  }

  return [
    'Would you like to continue your previous study topic or begin a new Scripture study?'
  ];
}

function buildClarificationRuntime({ message, continuity = null }) {
  return {
    ambiguous: detectAmbiguousRequest(message),
    clarificationQuestions: buildClarificationQuestions(message),
    continuityThemes: continuity?.unresolvedThemes || [],
    scriptureFirst: true,
  };
}

module.exports = {
  detectAmbiguousRequest,
  buildClarificationQuestions,
  buildClarificationRuntime,
};
