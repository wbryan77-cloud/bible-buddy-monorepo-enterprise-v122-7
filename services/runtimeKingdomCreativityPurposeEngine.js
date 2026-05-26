const { buildKingdomCallingAlignment } = require('./runtimeKingdomCallingAlignmentEngine');
const { applyCanonicalLifeGuidance } = require('./runtimeCanonicalLifeApplicationEngine');

function buildKingdomCreativityPurpose({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  totalDays = 30
} = {}) {
  const kingdomCalling = buildKingdomCallingAlignment({
    sessionId,
    category,
    references,
    question,
    totalDays
  });

  const lifeGuidance = applyCanonicalLifeGuidance({
    category,
    references,
    question,
    totalDays
  });

  return {
    category,
    kingdomCreativityPurpose: {
      kingdomCalling,
      lifeGuidance,
      creativityStructures: [
        'kingdom-art-and-storytelling',
        'business-and-stewardship',
        'technology-and-innovation',
        'media-and-discipleship',
        'creative-purpose-alignment'
      ]
    },
    creativityObjective:
      'Guide Genesis to Revelation kingdom creativity and purpose continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildKingdomCreativityPurpose
};
