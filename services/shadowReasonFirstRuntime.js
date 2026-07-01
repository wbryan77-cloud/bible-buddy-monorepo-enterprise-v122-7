/**
 * Shadow Reason-First Runtime — proof of concept ONLY.
 *
 * NOT wired to POST /buddy/chat. Does NOT modify production routing or buddyBrain.
 *
 * Flow:
 *   User Message → Conversation Understanding → Retrieve Memory → Retrieve Scripture
 *   → Retrieve History → OpenAI Composer → Validation → Final Reply
 *
 * Responders supply evidence only — never final prose.
 */

const openai = require('./openaiClient');
const {
  detectTopicFromMessage,
  detectTopicFromSessions,
  getBoundariesForTopic,
  violatesDoctrineBoundary,
  FORBIDDEN_TEACHINGS,
} = require('./doctrineBoundaries');
const { getScriptureChain } = require('./scriptureChainExpansion');
const { HISTORICAL_CHAIN, SCRIPTURE_BLOCK, detectQuestionFocus } = require('./sabbathHistoryDeepResponder');
const { buildReasoningSnapshot } = require('./reasoningSnapshot');
const { resolveQuestionIntent, resolveFollowUpQuestion } = require('./questionIntentResolver');
const { collectRelationshipMemoryHits, classifyRelationshipRecallQuery } = require('./relationshipRecallEngine');
const { matchAnswerToSnapshot, STRICT_REGEN_INSTRUCTION } = require('./answerMatchGate');
const { buildRuntimeContext } = require('./runtimeOrchestrator');
const {
  getUserCompanionProfile,
  enrichRuntimeContextWithMemory,
  classifySafety,
  buildSystemPrompt,
  safeJsonParse,
  normalizeStructured,
} = require('./buddyBrain');

const SHADOW_SYSTEM_APPEND = `
Shadow Reason-First Runtime:
- You are the ONLY prose composer. Retrieved evidence is facts-only — never paste canned blocks verbatim.
- Answer the user's EXACT question first. Restate what you heard in one sentence when correcting or on frustrated turns.
- On wording/meta questions: explain your phrasing choice — do NOT repeat Sabbath history unless they ask for history.
- On correction turns: acknowledge the mismatch before answering.
- Scripture first (KJV references); label historical claims as secondary history, not biblical command.
- Stay inside doctrine boundaries. No unsolicited study prompts.
- Be warm, curious, and human — not a template engine.
`.trim();

const TOPIC_TO_CHAIN = {
  sabbath: 'sabbath',
  sabbath_history: 'sabbath',
  dietary_law: 'dietaryLaw',
  feast_days: 'feastDays',
  traditions: 'traditions',
  resurrection_timeline: 'resurrection',
};

/** In-memory shadow sessions — never writes production session logs. */
const shadowSessions = new Map();
const shadowActiveConversation = new Map();

function getShadowRecentSessions(userId, limit = 10) {
  return (shadowSessions.get(userId) || []).slice(-limit).map((s) => ({
    message: s.message,
    reply: s.reply,
    createdAt: s.createdAt,
  }));
}

function appendShadowSession(userId, message, reply) {
  const list = shadowSessions.get(userId) || [];
  list.push({ message, reply, createdAt: new Date().toISOString() });
  shadowSessions.set(userId, list);
}

function clearShadowState(userId) {
  shadowSessions.delete(userId);
  shadowActiveConversation.delete(userId);
}

function updateShadowActiveConversation(userId, { message, reply, understanding }) {
  const prev = shadowActiveConversation.get(userId) || {};
  const topic =
    understanding.activeTopic ||
    detectTopicFromMessage(message) ||
    prev.topic ||
    null;

  shadowActiveConversation.set(userId, {
    topic,
    lastUserQuestion: message,
    lastDirectQuestion: message,
    correctionCount:
      understanding.isCorrection || understanding.questionType === 'correction'
        ? (prev.correctionCount || 0) + 1
        : prev.correctionCount || 0,
    strictAnswerMode: understanding.strictAnswerMode,
    lastAnswerSummary: String(reply || '').slice(0, 200),
  });
}

function getShadowActiveConversation(userId) {
  return shadowActiveConversation.get(userId) || null;
}

function parseHistoricalFacts() {
  const chainLines = HISTORICAL_CHAIN.split('\n').filter((l) => /^[A-E]\./.test(l.trim()));

  return {
    chainSteps: chainLines,
    sources: [
      'Constantine, Codex Justinianus 3.12.2 (AD 321 Sunday rest law)',
      'Council of Laodicea, Canon 29 (circa AD 364)',
      'Eusebius, Life of Constantine (early first-day imperial favor)',
      'Roman Catholic catechisms and liturgical tradition on Sunday obligation',
    ],
    distinction: 'Historical developments are not the same as biblical commands.',
    tier: 'historical_secondary',
  };
}

function parseScriptureFacts(topic) {
  const chainKey = TOPIC_TO_CHAIN[topic] || null;
  const chain = chainKey ? getScriptureChain(chainKey) : [];
  if (chain.length) return chain;

  const lines = SCRIPTURE_BLOCK.split('\n').filter((l) => /\d/.test(l) && /—/.test(l));
  return lines.map((line) => {
    const [reference, ...rest] = line.split('—');
    return { reference: reference.trim(), theme: rest.join('—').trim() };
  });
}

function retrieveMemoryFacts({ userId, message, runtimeContext, profile, understanding }) {
  const facts = { snippets: [], hits: [], recallRequested: false };

  if (profile?.memoryEnabled === false) return facts;

  if (runtimeContext?.memory) {
    const summaries = runtimeContext.memory.recentSummaries || runtimeContext.memory.summaries || [];
    for (const s of summaries.slice(-4)) {
      facts.snippets.push(typeof s === 'string' ? s : s.summary || s.text || '');
    }
    for (const loop of (runtimeContext.memory.openLoops || []).slice(-4)) {
      facts.snippets.push(loop.label || loop.detail || loop.summary || '');
    }
  }

  const recall = classifyRelationshipRecallQuery(message);
  if (recall.isRecallQuery || understanding.shouldUseMemory) {
    facts.recallRequested = true;
    const hits = collectRelationshipMemoryHits({ userId, recallType: recall.recallType || 'relationship_status' });
    facts.hits = hits.slice(0, 6).map((h) => ({
      category: h.category,
      summary: h.summary || h.detail || h.label,
      when: h.when || h.timestamp || null,
    }));
  }

  facts.snippets = facts.snippets.filter(Boolean).slice(0, 6);
  return facts;
}

function retrieveScriptureFacts({ message, recentSessions, understanding }) {
  const topic =
    understanding.activeTopic ||
    detectTopicFromMessage(message) ||
    detectTopicFromSessions(recentSessions) ||
    null;

  const include =
    understanding.shouldUseScripture ||
    /sabbath|scripture|bible|verse|leviticus|resurrection|feast|dietary|kingdom/i.test(message);

  if (!include) return { topic, references: [] };

  return {
    topic,
    references: parseScriptureFacts(topic).slice(0, 10),
  };
}

function retrieveHistoryFacts({ message, understanding }) {
  if (!understanding.shouldUseHistory || understanding.shouldUseHistory === 'minimal') {
    if (understanding.requestedAnswerType === 'wording_explanation') {
      return { included: false, reason: 'wording_question_no_history_dump' };
    }
    if (understanding.shouldUseHistory === 'minimal') {
      return { included: false, reason: 'minimal_history_only' };
    }
    return { included: false, reason: 'not_historical_question' };
  }

  const focus = detectQuestionFocus(message);
  const facts = parseHistoricalFacts();
  return {
    included: true,
    focus,
    ...facts,
  };
}

function buildConversationUnderstanding({ message, recentSessions, userId }) {
  const activeConversation = getShadowActiveConversation(userId);
  const questionIntent = resolveQuestionIntent({ message, recentSessions, activeConversation });
  const followUp = resolveFollowUpQuestion({ message, activeConversation });

  if (followUp.isFollowUp && followUp.inheritedTopic) {
    questionIntent.topic = followUp.inheritedTopic;
    questionIntent.isFollowUp = true;
    if (followUp.correction) questionIntent.isCorrection = true;
  }

  const safety = classifySafety(message);
  const understanding = buildReasoningSnapshot({
    message,
    activeConversation,
    recentSessions,
    questionIntent,
    followUp,
    safety,
  });

  return { understanding, questionIntent, followUp, safety, activeConversation };
}

function buildEvidenceBundle({ message, recentSessions, runtimeContext, profile, userId, understanding }) {
  const topic =
    understanding.activeTopic ||
    detectTopicFromMessage(message) ||
    detectTopicFromSessions(recentSessions) ||
    null;

  return {
    topic,
    boundaries: getBoundariesForTopic(topic || ''),
    forbiddenTeachings: FORBIDDEN_TEACHINGS.map((t) => t.boundary),
    memory: retrieveMemoryFacts({ userId, message, runtimeContext, profile, understanding }),
    scripture: retrieveScriptureFacts({ message, recentSessions, understanding }),
    history: retrieveHistoryFacts({ message, understanding }),
    understanding: {
      exactUserQuestion: understanding.exactUserQuestion,
      plainEnglishRestatement: understanding.plainEnglishRestatement,
      questionType: understanding.questionType,
      requestedAnswerType: understanding.requestedAnswerType,
      forbiddenDistractions: understanding.forbiddenDistractions,
      strictAnswerMode: understanding.strictAnswerMode,
      isMetaQuestion: understanding.isMetaQuestion,
      isCorrection: understanding.isCorrection,
    },
  };
}

function buildShadowSystemPrompt({ mode, personaKey, profile, evidence }) {
  const base = buildSystemPrompt({
    mode,
    personaKey,
    profile,
    runtimeInstructions: `
Retrieved evidence bundle (facts only — compose fresh prose):
${JSON.stringify(evidence, null, 2)}
`.trim(),
  });
  return `${base}\n\n${SHADOW_SYSTEM_APPEND}`;
}

function buildHistoryBlock(recentSessions) {
  return recentSessions
    .map((s, i) => `Turn ${i + 1} user: ${s.message}\nTurn ${i + 1} assistant: ${String(s.reply || '').slice(0, 1000)}`)
    .join('\n\n');
}

async function composeWithOpenAI({ systemPrompt, message, evidence, historyBlock, regenInstruction = null }) {
  const userPayload = {
    message,
    conversationHistory: historyBlock || 'none',
    evidence,
    regenInstruction,
  };

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: regenInstruction ? 0.55 : 0.72,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userPayload, null, 2) },
    ],
  });

  return completion?.choices?.[0]?.message?.content || '';
}

function validateShadowReply({ reply, understanding, questionIntent, followUp }) {
  const issues = [];

  const boundaryViolations = violatesDoctrineBoundary(reply);
  if (boundaryViolations.length) {
    issues.push(...boundaryViolations.map((b) => `doctrine:${b}`));
  }

  const match = matchAnswerToSnapshot({
    reply,
    reasoningSnapshot: understanding,
    questionIntent,
    followUp,
  });
  if (!match.passes) {
    issues.push(...match.issues);
  }

  const templateMarkers = [
    /Historical chain \(secondary to Scripture\):/,
    /Sources and references \(historical, secondary\):/,
    /Would you like to continue studying/i,
    /Genesis-to-Revelation path/i,
  ];
  if (templateMarkers.some((p) => p.test(reply))) {
    issues.push('template_block_pasted');
  }

  return { passes: issues.length === 0, issues };
}

/**
 * Run one shadow reason-first turn. Isolated from production.
 */
async function runShadowReasonFirst({
  userId = 'shadow-poc',
  mode = 'COMPANION',
  personaKey = 'ADAPTIVE_COMPANION',
  message = '',
} = {}) {
  const startedAt = Date.now();

  if (!message || !String(message).trim()) {
    return {
      reply: '',
      runtime: { shadow: true, masterRoute: 'shadow_empty' },
      experimentStatus: 'blocked',
    };
  }

  const profile = getUserCompanionProfile(userId);
  const recentSessions = getShadowRecentSessions(userId, 10);
  const safety = classifySafety(message);

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });

  const { understanding, questionIntent, followUp } = buildConversationUnderstanding({
    message,
    recentSessions,
    userId,
  });

  if (safety.level === 'crisis') {
    const crisisReply =
      'I hear that you are in deep pain right now. Please reach out immediately to someone you trust, a local crisis line, or 988 in the U.S. You are not alone, and urgent help matters more than anything I can say here.';
    appendShadowSession(userId, message, crisisReply);
    return {
      reply: crisisReply,
      safety_level: 'crisis',
      runtime: { shadow: true, masterRoute: 'shadow_crisis', elapsedMs: Date.now() - startedAt },
      experimentStatus: 'crisis_protocol',
    };
  }

  const evidence = buildEvidenceBundle({
    message,
    recentSessions,
    runtimeContext,
    profile,
    userId,
    understanding,
  });

  if (!openai) {
    return {
      reply:
        '[Shadow runtime: OpenAI unavailable. Install openai package and set OPENAI_API_KEY to run reason-first composition.]',
      runtime: {
        shadow: true,
        masterRoute: 'shadow_openai_required',
        evidence,
        elapsedMs: Date.now() - startedAt,
      },
      experimentStatus: 'openai_unavailable',
    };
  }

  const systemPrompt = buildShadowSystemPrompt({ mode, personaKey, profile, evidence });
  const historyBlock = buildHistoryBlock(recentSessions);

  let raw = '';
  let structured = null;
  let validation = { passes: false, issues: ['not_validated'] };
  let regenInstruction = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      raw = await composeWithOpenAI({
        systemPrompt,
        message,
        evidence,
        historyBlock,
        regenInstruction,
      });
    } catch (e) {
      return {
        reply: `[Shadow runtime: OpenAI error — ${e?.message || e}]`,
        runtime: { shadow: true, masterRoute: 'shadow_openai_error', error: String(e?.message || e) },
        experimentStatus: 'openai_error',
      };
    }

    const parsed = safeJsonParse(raw) || { reply: raw, confidence: 'low' };
    structured = normalizeStructured(parsed, { reply: raw, safety_level: safety.level }, safety, runtimeContext, {});

    validation = validateShadowReply({
      reply: structured.reply,
      understanding,
      questionIntent,
      followUp,
    });

    if (validation.passes) break;

    regenInstruction = `${STRICT_REGEN_INSTRUCTION} Fix these issues: ${validation.issues.join('; ')}`;
  }

  appendShadowSession(userId, message, structured.reply);
  updateShadowActiveConversation(userId, { message, reply: structured.reply, understanding });

  structured.runtime = {
    ...(structured.runtime || {}),
    shadow: true,
    masterRoute: 'shadow_reason_first',
    understanding: evidence.understanding,
    validation,
    validationAttempts: regenInstruction ? 'regenerated' : 'first_pass',
    elapsedMs: Date.now() - startedAt,
  };
  structured.experimentStatus = validation.passes ? 'openai_composed' : 'openai_composed_with_issues';
  structured.memory_used = evidence.memory.snippets.length > 0 || evidence.memory.hits.length > 0;

  return structured;
}

module.exports = {
  runShadowReasonFirst,
  clearShadowState,
  getShadowRecentSessions,
  buildEvidenceBundle,
  buildConversationUnderstanding,
  validateShadowReply,
};
