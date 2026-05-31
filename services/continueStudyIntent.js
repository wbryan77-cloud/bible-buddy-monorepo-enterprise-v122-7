const { getRecentStudySessions, saveStudySession } = require('./continuityStudySessionRuntime');
const { buildContinueStudyOffer, buildContinueJourneyReply, getStepSignificance } = require('./continueStudyEngine');
const { buildLearningContext } = require('./companionLearningLayer');

const CONTINUE_STUDY_PATTERNS = [
  /continue our study/i,
  /pick up where we left off/i,
  /resume study/i,
  /where did we stop/i,
  /continue bible study/i,
  /continue studying/i,
];

const SHORT_CONTINUE_PATTERNS = [
  /^continue\.?$/i,
  /^go on\.?$/i,
  /^next\.?$/i,
  /^keep going\.?$/i,
  /^tell me more\.?$/i,
  /^continue please\.?$/i,
  /^what next\.?$/i,
];

const TOPIC_LABELS = {
  sabbath: 'Sabbath',
  feast_days: 'Feast Days',
  dietaryLaw: 'clean and unclean foods',
  dietary_law: 'clean and unclean foods',
  traditions: 'traditions and Scripture',
  resurrection_timeline: 'the resurrection timeline',
  kingdom: 'the Kingdom of God',
  covenant: 'covenant',
  messiah: 'the Messiah',
  death_resurrection: 'death and resurrection',
  heaven_heavens: 'heaven',
  captivity: 'captivity and exile',
  remnant: 'the remnant',
};

function classifyContinueStudyIntent(message = '', userId = null) {
  const lower = String(message).toLowerCase().trim();

  const explicit = CONTINUE_STUDY_PATTERNS.find((pattern) => pattern.test(lower));
  if (explicit) {
    return { isContinueStudy: true, matchedPattern: String(explicit), kind: 'explicit' };
  }

  const short = SHORT_CONTINUE_PATTERNS.find((pattern) => pattern.test(lower));
  if (short && userId) {
    const lastStudy = resolveLastStudyTopic(userId);
    if (lastStudy?.topic) {
      return { isContinueStudy: true, matchedPattern: String(short), kind: 'short' };
    }
  }

  return { isContinueStudy: false, matchedPattern: null, kind: null };
}

function resolveLastStudyTopic(userId) {
  const sessions = getRecentStudySessions(userId, 25);
  const learning = buildLearningContext(userId);
  const favoriteTopic = learning.favoriteTopics?.[0] || null;

  if (!sessions.length) {
    if (!favoriteTopic) return null;
    return {
      topic: favoriteTopic,
      references: [],
      studyStep: null,
      userQuestion: null,
      favoriteTopic,
    };
  }

  const last = sessions[sessions.length - 1];

  return {
    topic: last.topic || favoriteTopic || null,
    references: last.references || [],
    studyStep: last.studyStep || null,
    userQuestion: last.userQuestion || null,
    favoriteTopic,
  };
}

function formatTopicLabel(topic = '') {
  return TOPIC_LABELS[topic] || String(topic || 'Scripture').replace(/_/g, ' ');
}

function buildContinueStudyResponse({ userId, message = '' }) {
  const lastStudy = resolveLastStudyTopic(userId);

  if (!lastStudy?.topic) {
    return {
      reply:
        "I don't have a stored study session yet. If you'd like, we can begin with any Scripture topic — Sabbath, the Kingdom, covenant, or a passage you choose.",
      scripture: [{ reference: 'Isaiah 28:10', text: '', reason: 'line upon line study guidance' }],
      mode: 'study',
      confidence: 'medium',
      memory_used: false,
      admin_flags: ['continue_study_no_session'],
      runtime: { intent: 'continue_study', continueStudy: { enabled: false } },
    };
  }

  const offer = buildContinueStudyOffer({ userId, doctrineTopic: lastStudy.topic });
  const label = formatTopicLabel(lastStudy.topic);
  const lastRef =
    offer.lastReference ||
    lastStudy.studyStep ||
    (lastStudy.references || []).slice(-1)[0] ||
    null;

  let reply;
  if (lastRef && offer.nextReference) {
    reply = buildContinueJourneyReply({ label, lastRef, nextRef: offer.nextReference });
  } else if (lastRef) {
    const why = getStepSignificance(lastRef);
    reply = `Last time we were looking at ${lastRef} in our ${label} study, where ${why}. Would you like to continue from there?`;
  } else {
    reply = offer.phrase || `Would you like to pick up where we left off studying ${label}?`;
  }

  const chainRefs = [lastRef, offer.nextReference].filter(Boolean);

  if (offer.nextReference) {
    saveStudySession({
      userId,
      topic: lastStudy.topic,
      references: chainRefs.length ? chainRefs : [offer.nextReference],
      studyStep: offer.nextReference,
      studyProgress: `continued from ${lastRef || 'last session'} to ${offer.nextReference}`,
      userQuestion: message,
    });
  }
  const scripture = chainRefs.map((reference) => ({
    reference,
    text: '',
    reason: 'continue study path',
  }));

  return {
    reply,
    scripture,
    mode: 'study',
    confidence: 'medium',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: [
      offer.nextReference ? `Continue at ${offer.nextReference}.` : 'Name the next passage to study.',
      'Compare related passages in the continuity chain.',
    ],
    admin_flags: ['continue_study_intercept'],
    runtime: {
      intent: 'continue_study',
      continueStudy: {
        enabled: true,
        ...offer,
        lastStudyTopic: lastStudy.topic,
        lastReference: lastRef,
      },
    },
  };
}

module.exports = {
  CONTINUE_STUDY_PATTERNS,
  SHORT_CONTINUE_PATTERNS,
  classifyContinueStudyIntent,
  resolveLastStudyTopic,
  buildContinueStudyResponse,
};
