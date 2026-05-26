const { buildDevotionalContinuity } = require('./runtimeScriptureContinuityDevotionalEngine');
const { buildLeadershipTraining } = require('./runtimeKingdomLeadershipTrainingEngine');

function buildKingdomEducationPathway({
  category = '',
  references = [],
  question = '',
  totalDays = 180,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const devotionalContinuity = buildDevotionalContinuity({
    category,
    references,
    question,
    totalDays,
    completionKey,
    prophecyKey,
    verses
  });

  const leadershipTraining = buildLeadershipTraining({
    category,
    references,
    question,
    mentorshipGoals: [],
    totalDays
  });

  return {
    category,
    kingdomEducationPathway: {
      devotionalContinuity,
      leadershipTraining,
      educationStructures: [
        'beginner-discipleship-foundations',
        'intermediate-scripture-formation',
        'advanced-leadership-development',
        'teacher-and-mentor-preparation',
        'lifelong-kingdom-learning'
      ]
    },
    educationObjective:
      'Guide Genesis to Revelation kingdom education continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomEducationPathway
};
