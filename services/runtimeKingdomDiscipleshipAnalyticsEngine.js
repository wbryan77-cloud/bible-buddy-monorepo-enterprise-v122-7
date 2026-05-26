const { buildMemoryCompanion } = require('./runtimeScriptureContinuityMemoryCompanion');
const { buildMentorContinuity } = require('./runtimeScriptureContinuityMentorEngine');

function buildDiscipleshipAnalytics({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  milestones = [],
  mentorshipGoals = []
} = {}) {
  const memoryCompanion = buildMemoryCompanion({
    sessionId,
    category,
    references,
    question,
    milestones
  });

  const mentorContinuity = buildMentorContinuity({
    category,
    references,
    question,
    mentorshipGoals,
    totalDays: 180
  });

  return {
    category,
    discipleshipAnalytics: {
      memoryCompanion,
      mentorContinuity,
      analyticsStructures: [
        'discipleship-growth-patterns',
        'scripture-engagement-progress',
        'formation-milestones',
        'continuity-learning-pathways',
        'kingdom-growth-insights'
      ]
    },
    analyticsObjective:
      'Track Genesis to Revelation discipleship growth continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildDiscipleshipAnalytics
};
