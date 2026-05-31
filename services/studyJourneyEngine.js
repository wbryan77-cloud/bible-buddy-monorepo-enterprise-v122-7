const { getRecentStudySessions } = require('./continuityStudySessionRuntime');
const { getCompanionLearningProfile } = require('./companionLearningLayer');

const STUDY_JOURNEYS = Object.freeze({
  sabbath_to_new_jerusalem: {
    title: 'Sabbath → Feast Days → Kingdom → Resurrection → New Jerusalem',
    topics: ['sabbath', 'feast_days', 'kingdom', 'resurrection_timeline', 'heaven_heavens'],
  },
  messiah_to_resurrection: {
    title: 'Messiah → Covenant → Kingdom → Resurrection',
    topics: ['messiah', 'covenant', 'kingdom', 'death_resurrection'],
  },
  kingdom_forward: {
    title: 'Kingdom → Messiah → Resurrection → New Jerusalem',
    topics: ['kingdom', 'messiah', 'death_resurrection', 'heaven_heavens'],
  },
  covenant_path: {
    title: 'Covenant → Kingdom → Resurrection',
    topics: ['covenant', 'kingdom', 'death_resurrection', 'heaven_heavens'],
  },
});

const TOPIC_LABELS = {
  sabbath: 'Sabbath',
  feast_days: 'Feast Days',
  kingdom: 'Kingdom',
  resurrection_timeline: 'Resurrection',
  heaven_heavens: 'New Jerusalem / Heaven',
  messiah: 'Messiah',
  covenant: 'Covenant',
  death_resurrection: 'Death and Resurrection',
};

function normalizeTopic(topic = '') {
  return String(topic || '').toLowerCase().replace(/-/g, '_');
}

function highestStudiedIndex(journey, normalizedStudied) {
  let highest = -1;
  for (const topic of normalizedStudied) {
    const idx = journey.topics.indexOf(normalizeTopic(topic));
    if (idx > highest) highest = idx;
  }
  return highest;
}

function getForwardNextTopic(journey, normalizedStudied, currentTopic = null) {
  const currentNorm = normalizeTopic(currentTopic);
  const currentIdx = currentNorm ? journey.topics.indexOf(currentNorm) : -1;

  if (currentIdx >= 0 && currentIdx < journey.topics.length - 1) {
    return journey.topics[currentIdx + 1];
  }

  const highestIdx = highestStudiedIndex(journey, normalizedStudied);
  if (highestIdx >= 0 && highestIdx < journey.topics.length - 1) {
    return journey.topics[highestIdx + 1];
  }

  for (const topic of journey.topics) {
    if (!normalizedStudied.includes(topic)) return topic;
  }
  return null;
}

function findBestJourney(studiedTopics = [], currentTopic = null) {
  const normalized = studiedTopics.map(normalizeTopic).filter(Boolean);
  const currentNorm = normalizeTopic(currentTopic);
  let best = null;
  let bestScore = 0;
  let bestProgress = -1;

  for (const [key, journey] of Object.entries(STUDY_JOURNEYS)) {
    const score = journey.topics.filter((t) => normalized.includes(t)).length;
    if (score === 0) continue;

    const progress = currentNorm
      ? journey.topics.indexOf(currentNorm)
      : highestStudiedIndex(journey, normalized);

    if (
      score > bestScore ||
      (score === bestScore && progress > bestProgress)
    ) {
      bestScore = score;
      bestProgress = progress;
      best = { key, ...journey, matchedCount: score, progress };
    }
  }

  if (currentNorm === 'kingdom' && best?.key === 'sabbath_to_new_jerusalem') {
    const kingdomForward = STUDY_JOURNEYS.kingdom_forward;
    return {
      key: 'kingdom_forward',
      ...kingdomForward,
      matchedCount: 1,
      progress: 0,
    };
  }

  return best;
}

function getStudyJourneyContext({ userId, doctrineTopic = null }) {
  const sessions = getRecentStudySessions(userId, 30);
  const learning = getCompanionLearningProfile(userId);
  const topics = [
    ...sessions.map((s) => s.topic).filter(Boolean),
    ...(learning?.favoriteTopics ? Object.keys(learning.favoriteTopics) : []),
    doctrineTopic,
  ].filter(Boolean);

  const currentTopic = doctrineTopic || sessions[sessions.length - 1]?.topic || null;
  const journey = findBestJourney(topics, currentTopic);
  if (!journey || journey.matchedCount === 0) {
    return { enabled: false, journey: null, nextTopic: null, phrase: null };
  }

  const normalizedStudied = topics.map(normalizeTopic);
  const nextInPath = getForwardNextTopic(journey, normalizedStudied, currentTopic);
  const nextLabel = TOPIC_LABELS[nextInPath] || nextInPath;

  const phrase = nextInPath
    ? `You've been walking a study journey through ${journey.title.split('→').map((s) => s.trim()).slice(0, 3).join(', ')}. Would you like to continue into ${nextLabel}?`
    : `You're progressing along the ${journey.title} study journey. Would you like to compare the next related topic?`;

  return {
    enabled: true,
    journey: journey.key,
    journeyTitle: journey.title,
    topics: journey.topics,
    matchedCount: journey.matchedCount,
    nextTopic: nextInPath,
    nextLabel,
    phrase,
  };
}

module.exports = {
  STUDY_JOURNEYS,
  TOPIC_LABELS,
  getStudyJourneyContext,
  findBestJourney,
  getForwardNextTopic,
};
