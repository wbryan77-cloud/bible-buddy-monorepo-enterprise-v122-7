const { buildPrayerJournal } = require('./runtimeCanonicalPrayerJournalEngine');
const { buildFamilyDiscipleship } = require('./runtimeCanonicalFamilyDiscipleshipEngine');

function buildFamilyPrayerContinuity({
  sessionId = '',
  category = '',
  references = [],
  question = '',
  prayerEntries = [],
  completionKey = '',
  prophecyKey = '',
  verses = []
} = {}) {
  const prayerJournal = buildPrayerJournal({
    sessionId,
    category,
    references,
    question,
    prayerEntries,
    completionKey,
    prophecyKey,
    verses
  });

  const familyDiscipleship = buildFamilyDiscipleship({
    category,
    references,
    question,
    totalDays: 30
  });

  return {
    category,
    familyPrayerContinuity: {
      prayerJournal,
      familyDiscipleship,
      familyPrayerStructures: [
        'household-prayer-rhythm',
        'marriage-prayer-continuity',
        'parent-child-discipleship',
        'generational-faithfulness',
        'family-scripture-reflection'
      ]
    },
    familyPrayerObjective:
      'Guide Genesis to Revelation family prayer and discipleship continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildFamilyPrayerContinuity
};
