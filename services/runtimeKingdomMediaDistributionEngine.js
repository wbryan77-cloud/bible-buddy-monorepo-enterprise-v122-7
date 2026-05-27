const { buildTeachingGeneration } = require('./runtimeCanonicalMediaTeachingGenerationEngine');
const { buildWorshipArtsContinuity } = require('./runtimeScriptureContinuityWorshipArtsEngine');

function buildKingdomMediaDistribution({
  sessionId = '',
  category = '',
  references = [],
  verses = [],
  question = '',
  completionKey = '',
  prophecyKey = ''
} = {}) {
  const teachingGeneration = buildTeachingGeneration({
    category,
    verses,
    completionKey,
    prophecyKey
  });

  const worshipArtsContinuity = buildWorshipArtsContinuity({
    sessionId,
    category,
    references,
    question,
    totalDays: 30,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    kingdomMediaDistribution: {
      teachingGeneration,
      worshipArtsContinuity,
      mediaStructures: [
        'sermon-distribution-pathways',
        'discipleship-media-streams',
        'podcast-and-audio-ministry',
        'worship-content-distribution',
        'kingdom-message-continuity'
      ]
    },
    mediaObjective:
      'Guide Genesis to Revelation kingdom media distribution continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomMediaDistribution
};