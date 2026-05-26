const { buildLeadershipTraining } = require('./runtimeKingdomLeadershipTrainingEngine');
const { buildSmallGroupStudy } = require('./runtimeCanonicalSmallGroupStudyEngine');

function buildMinistryOperations({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const leadershipTraining = buildLeadershipTraining({
    category,
    references,
    question,
    mentorshipGoals: [],
    totalDays: 180
  });

  const smallGroupStudy = buildSmallGroupStudy({
    sessionId,
    category,
    references,
    question,
    totalDays,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    ministryOperations: {
      leadershipTraining,
      smallGroupStudy,
      ministryStructures: [
        'church-workflow-coordination',
        'discipleship-tracking',
        'event-and-study-planning',
        'volunteer-and-service-alignment',
        'kingdom-operations-continuity'
      ]
    },
    ministryObjective:
      'Guide Genesis to Revelation ministry operations continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildMinistryOperations
};
