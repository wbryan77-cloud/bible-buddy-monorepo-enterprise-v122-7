function detectEmotion(message = '') {
  const text = String(message).toLowerCase();
  const checks = [
    { key: 'heartbreak', terms: ['heartbroken', 'breakup', 'broke up', 'left me', 'relationship', 'still love', 'miss her', 'miss him'] },
    { key: 'grief', terms: ['grief', 'grieving', 'loss', 'lost someone', 'died', 'death'] },
    { key: 'anxiety', terms: ['anxious', 'anxiety', 'panic', 'worried', 'afraid', 'fear'] },
    { key: 'overwhelmed', terms: ['overwhelmed', 'too much', 'stressed', 'pressure', 'exhausted', 'tired'] },
    { key: 'confusion', terms: ['confused', 'don’t understand', "don't understand", 'unclear', 'what should i do'] },
    { key: 'study', terms: ['scripture', 'bible', 'verse', 'study', 'precept', 'sabbath', 'leviticus', 'commandments'] },
    { key: 'prayer', terms: ['pray', 'prayer', 'talk to god'] },
  ];

  for (const check of checks) {
    if (check.terms.some((term) => text.includes(term))) {
      return {
        primary: check.key,
        intensity: ['heartbreak', 'grief', 'anxiety', 'overwhelmed'].includes(check.key) ? 'high' : 'medium',
      };
    }
  }

  return { primary: 'general', intensity: 'low' };
}

function classifyIntent(message = '', mode = 'COMPANION') {
  const text = String(message).toLowerCase();
  if (String(mode).toLowerCase().includes('pray') || text.includes('pray')) return 'prayer';
  if (text.includes('recommend') || text.includes('what should') || text.includes('help me') || text.includes('next step')) return 'guidance';
  if (text.includes('study') || text.includes('scripture') || text.includes('bible') || text.includes('verse')) return 'study';
  if (text.includes('feel') || text.includes('hurt') || text.includes('heart') || text.includes('stress')) return 'support';
  return 'companion';
}

function detectLoopRisk(recentSessions = []) {
  const recentReplies = recentSessions.map((s) => String(s.reply || '').toLowerCase()).slice(-4);
  const askMoreCount = recentReplies.filter((r) => r.includes('tell me more') || r.includes('share more') || r.includes('what is on your heart')).length;
  return {
    askOnlyLoop: askMoreCount >= 2,
    recentReplyCount: recentReplies.length,
  };
}

function selectScripturePath(emotion, intent) {
  if (intent === 'prayer') {
    return [
      { reference: 'Psalm 34:18', reason: 'comfort when the heart is heavy' },
      { reference: 'Philippians 4:6-7', reason: 'prayer, peace, and guarded hearts' },
    ];
  }
  if (emotion.primary === 'heartbreak') {
    return [
      { reference: 'Psalm 34:18', reason: 'God near to the brokenhearted' },
      { reference: 'Proverbs 4:23', reason: 'guarding the heart wisely' },
      { reference: 'Ecclesiastes 3:1', reason: 'seasons, timing, and healing' },
    ];
  }
  if (emotion.primary === 'anxiety' || emotion.primary === 'overwhelmed') {
    return [
      { reference: 'Isaiah 26:3', reason: 'peace through a stayed mind' },
      { reference: 'Matthew 6:34', reason: 'daily burdens, one day at a time' },
    ];
  }
  if (intent === 'study') {
    return [
      { reference: 'Isaiah 28:10', reason: 'line upon line, precept upon precept' },
      { reference: '2 Timothy 2:15', reason: 'study and rightly dividing the word' },
    ];
  }
  return [
    { reference: 'Psalm 46:1', reason: 'God as refuge and present help' },
  ];
}

function buildActionPlan({ emotion, intent }) {
  if (emotion.primary === 'heartbreak') {
    return [
      'Name the pain plainly without shaming yourself.',
      'Do not chase clarity from someone who is giving confusion; seek peace first.',
      'Pray for a guarded heart and wise boundaries.',
      'Take one stabilizing action today: walk, journal, rest, or call someone grounded.',
    ];
  }
  if (emotion.primary === 'anxiety' || emotion.primary === 'overwhelmed') {
    return [
      'Slow your breathing for one minute before making decisions.',
      'Write down the one thing that must be handled next, not everything at once.',
      'Pray simply for peace, clarity, and strength for today.',
    ];
  }
  if (intent === 'study') {
    return [
      'Start with the direct passage first.',
      'List repeated words or commands.',
      'Find cross-references before applying commentary.',
      'Separate Scripture, history, and personal application clearly.',
    ];
  }
  if (intent === 'prayer') {
    return [
      'Begin with honesty before God.',
      'Ask for peace, wisdom, and correction where needed.',
      'End with one obedient next step.',
    ];
  }
  return [
    'Listen to what the user is actually carrying.',
    'Offer one practical next step, not only another question.',
    'Keep the response warm, grounded, and simple.',
  ];
}

function buildRuntimeContext({ message, mode, profile, recentSessions = [], recentInsights = [], safety }) {
  const emotion = detectEmotion(message);
  const intent = classifyIntent(message, mode);
  const loopRisk = detectLoopRisk(recentSessions);
  const scripturePath = selectScripturePath(emotion, intent);
  const actionPlan = buildActionPlan({ emotion, intent });
  const lastUserMessage = recentSessions.length ? recentSessions[recentSessions.length - 1]?.message : null;

  return {
    emotion,
    intent,
    loopRisk,
    scripturePath,
    actionPlan,
    memory: {
      enabled: profile.memoryEnabled !== false,
      recentSessionCount: recentSessions.length,
      lastUserMessage,
      recentSessions,
      recentInsights,
    },
    pacing: {
      responseLength: emotion.intensity === 'high' ? 'medium_short' : 'medium',
      questionsAllowed: loopRisk.askOnlyLoop ? 0 : 1,
      mustGiveActionableGuidance: true,
      scriptureDensity: intent === 'study' ? 'deeper' : emotion.intensity === 'high' ? 'light_to_balanced' : profile.scriptureDepth || 'balanced',
    },
    safety,
  };
}

function buildRuntimeInstructions(runtimeContext) {
  return `
Runtime orchestration rules:
- Do not give a canned response.
- Do not only ask questions. Give at least two concrete next steps when the user asks for help or seems emotionally burdened.
- Use recent memory when available. If memory is used, naturally reference what the user said earlier without sounding mechanical.
- If a loop risk is detected, stop asking "tell me more" and move into guidance.
- Match pacing to emotional state: high emotion means calmer, shorter, steadier, less verbose.
- Include Scripture only when it helps the moment; distinguish Scripture from explanation.
- The response should feel like a present companion: listen, reflect specifically, guide, then offer one gentle choice.
- Avoid overpromising therapy or medical help. Encourage qualified human support when needed.
- End with either one clear next step or one gentle question, not both repeatedly.

Runtime context:
${JSON.stringify(runtimeContext, null, 2)}
`.trim();
}

function scoreCompanionQuality({ message = '', reply = '', runtimeContext = {} }) {
  const lower = String(reply).toLowerCase();
  const issues = [];
  let score = 100;

  if (lower.includes('tell me more') || lower.includes('share more')) {
    score -= 12;
    issues.push('generic_followup_phrase');
  }
  if (!/\b(step|today|try|pray|write|call|rest|walk|read|start|pause|boundary|plan)\b/i.test(reply)) {
    score -= 20;
    issues.push('low_actionable_guidance');
  }
  if (runtimeContext?.emotion?.intensity === 'high' && reply.length > 1800) {
    score -= 12;
    issues.push('too_verbose_for_high_emotion');
  }
  if (runtimeContext?.loopRisk?.askOnlyLoop && /\?\s*$/.test(reply.trim())) {
    score -= 18;
    issues.push('continued_question_loop');
  }
  if (String(message).length > 40 && reply.length < 120) {
    score -= 18;
    issues.push('too_shallow_for_user_context');
  }

  return {
    score: Math.max(0, score),
    issues,
    passed: score >= 72,
  };
}

module.exports = {
  buildRuntimeContext,
  buildRuntimeInstructions,
  scoreCompanionQuality,
  detectEmotion,
  classifyIntent,
};
