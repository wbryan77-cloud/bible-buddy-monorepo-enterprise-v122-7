const { listHistoricalScriptureEras } = require('./runtimeScriptureContinuityHistoricalEngine');

function buildCanonicalTimeline() {
  const eras = listHistoricalScriptureEras();

  const timeline = Object.entries(eras).map(([eraKey, eraValue], index) => ({
    order: index + 1,
    era: eraKey,
    books: eraValue.books,
    continuityFocus: eraValue.continuityFocus
  }));

  return {
    timeline,
    timelineObjective:
      'Render Genesis to Revelation covenant chronology and continuity sequencing.'
  };
}

module.exports = {
  buildCanonicalTimeline
};
