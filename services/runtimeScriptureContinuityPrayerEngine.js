const { provideCanonicalDiscernment } = require('./runtimeCanonicalWisdomDiscernmentLayer');
const { buildRestorationContinuity } = require('./runtimeCanonicalRevelationRestorationEngine');

function buildScripturePrayerGuidance({
  category = '',
  references = [],
  question = '',
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const discernment = provideCanonicalDiscernment({
    category,
    references,
    question
  });

  const restoration = buildRestorationContinuity({
    category,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    prayerGuidance: {
      discernment,
      restoration,
      prayerStructures: [
        'repentance-and-restoration',
        'thanksgiving-and-covenant-faithfulness',
        'kingdom-and-intercession',
        'hope-and-perseverance'
      ]
    },
    prayerObjective:
      'Guide Genesis to Revelation Scripture-centered prayer continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildScripturePrayerGuidance
};
