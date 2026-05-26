const { buildScripturePrayerGuidance } = require('./runtimeScriptureContinuityPrayerEngine');
const { buildMemoryCompanion } = require('./runtimeScriptureContinuityMemoryCompanion');

function buildPrayerJournal({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  prayerEntries = [],
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const prayerGuidance = buildScripturePrayerGuidance({
    category,
    references,
    question,
    completionKey,
    prophecyKey,
    verses
  });

  const memoryCompanion = buildMemoryCompanion({
    sessionId,
    category,
    references,
    question,
    milestones: prayerEntries
  });

  return {
    category,
    prayerJournal: {
      prayerGuidance,
      memoryCompanion,
      prayerStructures: [
        'daily-prayer-records',
        'answered-prayer-tracking',
        'intercession-history',
        'scripture-prayer-reflections',
        'kingdom-prayer-journey'
      ]
    },
    prayerJournalObjective:
      'Preserve Genesis to Revelation prayer journaling continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildPrayerJournal
};
