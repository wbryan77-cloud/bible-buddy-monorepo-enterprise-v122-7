const BUTTON_MODES = {
  TALK: { mode: 'companion', hint: 'Use recent continuity before asking a new question.' },
  REFLECT: { mode: 'reflection', hint: 'Offer one focused reflection question with no canned phrasing.' },
  PRAY: { mode: 'prayer', hint: 'Use recent burdens to offer a short personalized response.' },
  STUDY: { mode: 'study', hint: 'Use retrieved study continuity before explaining.' },
  WELLNESS: { mode: 'wellness', hint: 'Frame care as stewardship, not medical advice.' },
  JOURNAL: { mode: 'reflection', hint: 'Help capture a journal entry for later continuity.' },
  DAILY_JOURNEY: { mode: 'study', hint: 'Open today readings and progress continuity.' },
};

function normalizeButtonMode(mode = '') {
  const key = String(mode || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (BUTTON_MODES[key]) return key;
  if (key.includes('TALK')) return 'TALK';
  if (key.includes('REFLECT')) return 'REFLECT';
  if (key.includes('PRAY')) return 'PRAY';
  if (key.includes('STUDY')) return 'STUDY';
  if (key.includes('WELLNESS')) return 'WELLNESS';
  if (key.includes('JOURNAL')) return 'JOURNAL';
  if (key.includes('DAILY') || key.includes('JOURNEY')) return 'DAILY_JOURNEY';
  return 'TALK';
}

function buildButtonRuntimeContext({ mode, recentSessions = [], studyContext = null, journeyContext = null }) {
  const key = normalizeButtonMode(mode);
  const config = BUTTON_MODES[key];
  return {
    key,
    mode: config.mode,
    hint: config.hint,
    continuity: {
      recent: recentSessions.slice(-5).map((entry) => ({ mode: entry.mode, message: entry.message, createdAt: entry.createdAt })),
      priorStudyCount: studyContext?.prior?.length || 0,
      priorStudyTopic: studyContext?.topic || null,
      journeyDay: journeyContext?.day || null,
      journeyCompletedDays: journeyContext?.completedDays || 0,
    },
  };
}

module.exports = { buildButtonRuntimeContext, normalizeButtonMode };
