const { buildSpiritualFormationJourney } = require('./runtimeCanonicalSpiritualFormationEngine');
const { buildBiblicalDecisionGuidance } = require('./runtimeCanonicalBiblicalDecisionEngine');

function buildMentorContinuity({
  category = '',
  references = [],
  question = '',
  mentorshipGoals = [],
  totalDays = 90
} = {}) {
  const spiritualFormation = buildSpiritualFormationJourney({
    category,
    references,
    question,
    totalDays
  });

  const decisionGuidance = buildBiblicalDecisionGuidance({
    category,
    references,
    question,
    decisionPaths: mentorshipGoals
  });

  return {
    category,
    mentorContinuity: {
      spiritualFormation,
      decisionGuidance,
      mentorshipGoals,
      mentorStructures: [
        'discipleship-coaching',
        'spiritual-maturity-progression',
        'leadership-development',
        'kingdom-accountability',
        'faithfulness-and-perseverance'
      ]
    },
    mentorObjective:
      'Guide Genesis to Revelation mentorship and discipleship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildMentorContinuity
};
