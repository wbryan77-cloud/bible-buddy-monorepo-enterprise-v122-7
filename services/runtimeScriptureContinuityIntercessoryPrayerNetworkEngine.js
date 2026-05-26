const { buildPrayerJournal } = require('./runtimeCanonicalPrayerJournalEngine');
const { buildRevivalAwakeningPrayer } = require('./runtimeCanonicalRevivalAwakeningPrayerEngine');

function buildIntercessoryPrayerNetwork({
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

  const revivalPrayer = buildRevivalAwakeningPrayer({
    category,
    references,
    question,
    totalDays: 40,
    completionKey,
    prophecyKey,
    verses
  });

  return {
    category,
    intercessoryPrayerNetwork: {
      prayerJournal,
      revivalPrayer,
      prayerNetworkStructures: [
        'corporate-intercession',
        'prayer-group-coordination',
        'answered-prayer-continuity',
        'revival-prayer-alignment',
        'kingdom-intercession-continuity'
      ]
    },
    prayerNetworkObjective:
      'Guide Genesis to Revelation intercessory prayer continuity line upon line and precept upon precept.'
  };
}

module.exports = {
  buildIntercessoryPrayerNetwork
};
