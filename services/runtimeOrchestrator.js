function detectEmotion(message = '') {
  const text = String(message).toLowerCase();
  const checks = [
    { key: 'heartbreak', terms: ['heartbroken', 'breakup', 'broke up', 'relationship'] },
    { key: 'grief', terms: ['grief', 'loss', 'death'] },
    { key: 'anxiety', terms: ['anxious', 'panic', 'worried'] },
    { key: 'study', terms: ['scripture', 'bible', 'verse', 'sabbath'] },
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
  if (String(mode).toLowerCase().includes('pray') || text.includes('pray')) return 'prayer';
  if (text.includes('sabbath') || text.includes('resurrection') || text.includes('commandment')) return 'doctrinal_study';
  if (text.includes('study') || text.includes('scripture')) return 'study';
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
      sabbath: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Isaiah 58:13-14', 'Luke 4:16', 'Acts 17:2'],
      resurrection: ['Matthew 12:40', 'Matthew 28:1-6', 'Mark 16:1-6', 'Luke 24:1-6', 'John 20:1-8']
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
- Prioritize explicit Scripture references first.
- Distinguish biblical text from historical developments and later traditions.
- Use continuity across Scripture when discussing doctrine.
- Avoid vague consensus summaries.
- Continue analysis when challenged instead of repetitive fallback responses.
- Use prior conversation memory naturally when available.
- Explain where interpretations differ instead of presenting assumptions as fact.

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