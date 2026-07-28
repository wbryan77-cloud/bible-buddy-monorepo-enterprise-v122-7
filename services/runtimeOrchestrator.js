const { SCRIPTURE_CHAINS } = require('./scriptureChainExpansion');

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
    scriptureChains: SCRIPTURE_CHAINS,
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

function scoreCompanionQuality({ message = '', reply = '', runtimeContext = {} } = {}) {
  const text = String(reply || '');
  const lower = text.toLowerCase();
  const msg = String(message || '').toLowerCase();
  const issues = [];
  const dimensions = {
    intentUnderstanding: 100,
    conversationFlow: 100,
    warmth: 100,
    helpfulness: 100,
    memoryContinuity: 100,
    correctionRecovery: 100,
    scriptureFidelity: 100,
    evidenceClarity: 100,
    historicalClarity: 100,
    formatting: 100,
    readability: 100,
    responseProportionality: 100,
    naturalDialogue: 100,
  };

  if (runtimeContext?.loopRisk?.fallbackLoop && lower.includes('slow this down together')) {
    dimensions.conversationFlow -= 40;
    issues.push('fallback_loop_detected');
  }

  if (/make sure i answer the right thing|bible passage, a life situation/i.test(text) &&
      /\b(capital of|photosynthesis|president|world war|what year)\b/i.test(msg)) {
    dimensions.intentUnderstanding -= 50;
    dimensions.helpfulness -= 40;
    issues.push('factual_question_clarifier');
  }

  if (runtimeContext?.doctrinalMode) {
    if (!lower.includes('scripture') && !lower.includes('biblical') && !/\b(genesis|exodus|matthew|john|romans)\b/i.test(lower)) {
      dimensions.scriptureFidelity -= 15;
      issues.push('missing_bible_grounding');
    }
  }

  if (/historical context/i.test(text) && /scripture (explicitly )?(says|states)/i.test(text)) {
    // rewarded — categories present
  } else if (/constantine|laodicea/i.test(text) && !/historical context|supplemental/i.test(text)) {
    dimensions.historicalClarity -= 20;
    dimensions.evidenceClarity -= 10;
    issues.push('history_unlabeled');
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount > 420) {
    dimensions.responseProportionality -= 25;
    dimensions.readability -= 15;
    issues.push('wall_of_text');
  }
  if (wordCount < 3 && msg.includes('?')) {
    dimensions.helpfulness -= 20;
    issues.push('too_thin');
  }

  if (/\bi apologize|i'm sorry(?!,?\s*(to hear|for your))/i.test(text) && !/grief|sorry for your loss/i.test(msg)) {
    dimensions.naturalDialogue -= 10;
    issues.push('unnecessary_apology');
  }
  if (/that's a thoughtful question|let's explore that together|let's build this carefully/i.test(text)) {
    dimensions.warmth -= 10;
    dimensions.naturalDialogue -= 10;
    issues.push('transactional_opener');
  }

  if (/\n{4,}/.test(text) || text.length > 3500) {
    dimensions.formatting -= 15;
    issues.push('formatting_dense');
  }

  const dimScores = Object.values(dimensions);
  let score = Math.round(dimScores.reduce((a, b) => a + Math.max(0, b), 0) / dimScores.length);
  // Critical failures dominate the headline score
  if (issues.includes('factual_question_clarifier')) score = Math.min(score, 55);
  if (issues.includes('fallback_loop_detected')) score = Math.min(score, 60);
  if (issues.includes('wall_of_text')) score = Math.min(score, 75);

  return {
    score: Math.max(0, Math.min(100, score)),
    dimensions,
    issues,
    passed: score >= 70,
  };
}

module.exports = {
  buildRuntimeContext,
  buildRuntimeInstructions,
  scoreCompanionQuality,
  detectEmotion,
  classifyIntent
};