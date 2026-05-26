const { buildWorshipContinuity } = require('./runtimeCanonicalWorshipContinuityEngine');
const { buildKingdomCreativityPurpose } = require('./runtimeKingdomCreativityPurposeEngine');

function buildWorshipArtsContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30,
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const worshipContinuity = buildWorshipContinuity({
    sessionId,
    category,
    references,
    question,
    totalDays,
    completionKey,
    prophecyKey,
    verses
  });

  const creativityPurpose = buildKingdomCreativityPurpose({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    worshipArtsContinuity: {
      worshipContinuity,
      creativityPurpose,
      worshipArtsStructures: [
        'scripture-centered-songwriting',
        'visual-worship-expression',
        'creative-kingdom-storytelling',
        'worship-and-discipleship-media',
        'reverent-creative-stewardship'
      ]
    },
    worshipArtsObjective:
      'Guide Genesis to Revelation worship arts continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildWorshipArtsContinuity
};
