function escalateAmbiguity({ topic, scripture = [] }) {
  const escalationFlags = [];

  if (!scripture || scripture.length < 2) {
    escalationFlags.push('insufficient_scripture_support');
  }

  return {
    topic,
    escalationFlags,
    escalationRequired: escalationFlags.length > 0,
    escalationMode: 'scripture_ambiguity_review'
  };
}

module.exports = { escalateAmbiguity };
