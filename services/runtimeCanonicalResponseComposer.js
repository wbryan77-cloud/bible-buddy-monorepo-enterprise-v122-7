function composeCanonicalResponse({
  category = '',
  references = [],
  question = ''
} = {}) {
  return {
    category,
    question,
    canonicalResponse: {
      category,
      references: Array.isArray(references) ? references : [],
      question
    },
    compositionObjective:
      'Compose a Genesis to Revelation canonical continuity response scaffold for the supplied category.'
  };
}

module.exports = {
  composeCanonicalResponse
};
