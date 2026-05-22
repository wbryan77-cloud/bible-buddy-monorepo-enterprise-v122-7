function detectEmotion(message = '') {
  const text = String(message).toLowerCase();
  const checks = [
    { key: 'heartbreak', terms: ['heartbroken', 'breakup', 'broke up', 'relationship'] },
    { key: 'grief', terms: ['grief', 'loss', 'death'] },
    { key: 'anxiety', terms: ['anxious', 'panic', 'worried'] },
    { key: 'study', terms: ['scripture', 'bible', 'verse', 'sabbath', 'dietary law', 'leviticus'] },
    { key: 'prayer', terms: ['pray', 'prayer'] }
  ];

  for (const check of checks) {
    if (check.terms.some((term) => text.includes(term))) {
      return { primary: check.key, intensity: 'medium' };
    }
  }

  return { primary: 'general', intensity: 'low' };
}

function classifyIntent(message = '', mode = 'COMPANION') {
  const text = String(message).toLowerCase();

  if (String(mode).toLowerCase().includes('pray') || text.includes('pray')) {
    return 'prayer';
  }

  if (
    text.includes('sabbath') ||
    text.includes('dietary law') ||
    text.includes('unclean food') ||
    text.includes('commandment') ||
    text.includes('leviticus') ||
    text.includes('feast day') ||
    text.includes('high sabbath') ||
    text.includes('christmas') ||
    text.includes('easter') ||
    text.includes('resurrection') ||
    text.includes('traditions of men')
  ) {
    return 'doctrinal_study';
  }

  if (text.includes('study') || text.includes('scripture')) {
    return 'study';
  }

  return 'companion';
}

function detectLoopRisk(recentSessions = []) {
  const recentReplies = recentSessions.map((s) => String(s.reply || '').toLowerCase()).slice(-5);

  return {
    askOnlyLoop: recentReplies.filter((r) => r.includes('tell me more')).length >= 2,
    fallbackLoop: recentReplies.filter((r) => r.includes('slow this down together')).length >= 2
  };
}

function buildRuntimeContext({ message, mode, profile, recentSessions = [], recentInsights = [], safety }) {
  const emotion = detectEmotion(message);
  const intent = classifyIntent(message, mode);
  const loopRisk = detectLoopRisk(recentSessions);

  return {
    emotion,
    intent,
    loopRisk,
    doctrinalMode: intent === 'doctrinal_study',
    scriptureChains: {
      sabbath: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Isaiah 58:13-14', 'Luke 4:16', 'Acts 17:2', 'Hebrews 4:9'],
      dietaryLaw: ['Leviticus 11', 'Deuteronomy 14', 'Daniel 1', 'Acts 10:14', 'Acts 10:28', 'Acts 11:1-18', 'Isaiah 66:17'],
      feastDays: ['Leviticus 23', 'Zechariah 14:16', 'Acts 2', '1 Corinthians 5:7-8'],
      resurrection: ['Matthew 12:40', 'Matthew 28:1-6', 'Mark 16:1-6', 'Luke 24:1-6', 'John 20:1-8'],
      traditions: ['Jeremiah 10:1-4', 'Mark 7:6-13', 'Colossians 2:8']
    },
    memory: {
      enabled: profile.memoryEnabled !== false,
      recentSessions,
      recentInsights
    },
    safety
  };
}

function buildRuntimeInstructions(runtimeContext) {
  return `
PRIMARY FOUNDATION:
- Bible-first foundation.
- Line upon line. Precept upon precept.
- Use continuity from Genesis to Revelation.
- Prioritize explicit Scripture references first.
- Distinguish clearly between:
  1. Explicit biblical text
  2. Historical developments
  3. Traditions of men
  4. Interpretive conclusions
- NEVER present later church traditions as explicit commandments from God.
- NEVER blur or soften direct biblical continuity.
- If discussing Sabbath, dietary law, feast days, Christmas, Easter, Sunday worship, resurrection chronology, or traditions of men:
  - explain what Scripture explicitly states first
  - then explain historical developments separately
- Historical/pagan/Roman origins may be discussed AFTER biblical continuity is established.
- Avoid generalized denominational consensus framing.
- Continue analysis when challenged instead of repetitive emotional fallback responses.
- Use prior conversation memory naturally when available.

RESPONSE STRUCTURE:
1. What the biblical passages explicitly state
2. Related continuity passages
3. Historical developments/origins if relevant
4. Areas where interpretation differs
5. Clear distinction between biblical text and traditions of men

Runtime context:\n${JSON.stringify(runtimeContext, null, 2)}
`.trim();
}

function scoreCompanionQuality({ reply = '', runtimeContext = {} }) {
  const lower = String(reply).toLowerCase();
  const issues = [];
  let score = 100;

  if (runtimeContext?.loopRisk?.fallbackLoop && lower.includes('slow this down together')) {
    score -= 30;
    issues.push('fallback_loop_detected');
  }

  if (runtimeContext?.doctrinalMode) {
    if (!lower.includes('scripture') && !lower.includes('biblical')) {
      score -= 10;
      issues.push('missing_bible_grounding');
    }
  }

  return {
    score: Math.max(0, score),
    issues,
    passed: score >= 70
  };
}

module.exports = {
  buildRuntimeContext,
  buildRuntimeInstructions,
  scoreCompanionQuality,
  detectEmotion,
  classifyIntent
};