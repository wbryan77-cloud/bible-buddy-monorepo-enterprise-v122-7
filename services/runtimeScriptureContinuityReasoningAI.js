const { composeCanonicalResponse } = require('./runtimeCanonicalResponseComposer');
const { detectCanonicalContradictions } = require('./runtimeCanonicalContradictionDetectionEngine');
const { expandCanonicalTopic } = require('./runtimeCanonicalTopicExpansionAI');

function reasonThroughCanonicalContinuity({
  category = '',
  references = [],
  question = ''
} = {}) {
  const response = composeCanonicalResponse({
    category,
    references,
    question
  });

  const contradictions = detectCanonicalContradictions({
    category,
    references
  });

  const expansion = expandCanonicalTopic({
    category
  });

  return {
    reasoningSession: {
      response,
      contradictions,
      expansion
    },
    reasoningObjective:
      'Reason through Genesis to Revelation continuity canonically line upon line and precept upon precept.'
  };
}

module.exports = {
  reasonThroughCanonicalContinuity
};
