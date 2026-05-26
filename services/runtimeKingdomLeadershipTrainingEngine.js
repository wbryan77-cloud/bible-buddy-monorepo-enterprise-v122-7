const { buildChurchLeadershipFormation } = require('./runtimeCanonicalChurchLeadershipFormationEngine');
const { buildMentorContinuity } = require('./runtimeScriptureContinuityMentorEngine');

function buildLeadershipTraining({
  category = '',
  references = [],
  question = '',
  mentorshipGoals = [],
  totalDays = 180
} = {}) {
  const churchLeadership = buildChurchLeadershipFormation({
    category,
    references,
    question,
    totalDays
  });

  const mentorContinuity = buildMentorContinuity({
    category,
    references,
    question,
    mentorshipGoals,
    totalDays
  });

  return {
    category,
    leadershipTraining: {
      churchLeadership,
      mentorContinuity,
      leadershipTrainingStructures: [
        'ministry-leadership-development',
        'teacher-and-mentor-training',
        'small-group-leadership',
        'discipleship-coordination',
        'kingdom-service-preparation'
      ]
    },
    leadershipTrainingObjective:
      'Guide Genesis to Revelation kingdom leadership training line upon line and precept upon precept.'
  };
}

module.exports = {
  buildLeadershipTraining
};
