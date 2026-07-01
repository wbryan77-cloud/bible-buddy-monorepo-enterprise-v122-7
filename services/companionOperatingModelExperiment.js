/**
 * TEST-ONLY Companion Operating Model experiment.
 * NOT wired to production / buddyBrain.
 *
 * Uses existing RACL retrieval (buildRetrievalEvidencePack) unchanged.
 * Changes compose purpose: human moment first, then answer only as much as the moment needs.
 *
 * Use: scripts/companionOperatingModelExperiment.js
 */

const openai = require('./openaiClient');
const { safeJsonParse } = require('./buddyBrain');
const { buildRuntimeContext } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { validateDoctrineBoundaries } = require('./doctrineBoundaryValidator');
const { FORBIDDEN_TEACHINGS } = require('./doctrineBoundaries');
const {
  isCorrectionMessage,
  isMetaOrWordingTurn,
} = require('./correctionLedger');

const USER_NEEDS = [
  'needs_direct_answer',
  'needs_comfort',
  'needs_discernment',
  'needs_clarity',
  'needs_correction_repair',
  'needs_practical_next_step',
  'needs_to_be_heard',
  'needs_biblical_grounding',
];

const OUTPUT_SHAPES = [
  'Direct Answer',
  'Companion Reflection',
  'Discernment Conversation',
  'Practical Care',
  'Correction Repair',
];

const COMPOSER_GUIDANCE = `You are BibleBuddy, a warm biblical companion. First discern the human moment: does the user need a direct answer, comfort, correction repair, discernment, practical help, or to be heard? Respond to that need before teaching. Use Scripture as foundation when helpful, but do not turn every reply into a lesson. Do not force questions. Do not force empathy phrases. Do not force "you mentioned." Use the user's actual details naturally when they matter. If you previously missed the question, repair that first in fresh words.

Choose a natural reply shape when helpful (not mandatory structure):
- Direct Answer — factual, doctrine, history, wording questions.
- Companion Reflection — grief, fear, burden, loneliness, spiritual distance; stay with the person before advising.
- Discernment Conversation — job, calling, life decisions; understand the fork before prescribing.
- Practical Care — health, caregiver load, immediate life help.
- Correction Repair — brief, fresh, direct; no repeated rationale.

Return JSON only: {"reply":"your response"}`.trim();

const CRISIS_REPLY =
  "I'm really sorry you're carrying this. I am not a therapist or emergency service, but your safety matters right now. If you might hurt yourself or feel in immediate danger, please call emergency services now. If you're in the U.S., call or text 988 for the Suicide & Crisis Lifeline.";

const TEST_SESSION_CACHE = new Map();

function testAppendSession(entry) {
  const cached = TEST_SESSION_CACHE.get(entry.userId) || [];
  cached.push({ message: entry.message, reply: entry.reply, structured: entry.structured });
  TEST_SESSION_CACHE.set(entry.userId, cached.slice(-12));
}

function testGetRecentSessions(userId, limit = 10) {
  const cached = TEST_SESSION_CACHE.get(userId);
  return cached ? cached.slice(-limit) : [];
}

function clearTestSessions(userId) {
  TEST_SESSION_CACHE.delete(userId);
}

function estimateTokens(text = '') {
  return Math.ceil(String(text || '').length / 4);
}

function threadCorpus(evidencePack = {}) {
  const parts = [];
  for (const t of evidencePack.conversationHistory || []) {
    parts.push(t.user, t.assistant);
  }
  return parts.filter(Boolean).join(' ');
}

function detectTopic(message = '', evidencePack = {}) {
  const msg = String(message).toLowerCase();
  const corpus = `${msg} ${threadCorpus(evidencePack)}`.toLowerCase();
  const companionTopic = evidencePack.companionThreadContext?.companionTopic;
  if (companionTopic) return companionTopic;
  if (/\balzheimer|mom|caregiv|remember who/i.test(corpus)) return 'caregiver';
  if (/\bjob opportunity|job offer|push or wait|far away/i.test(corpus)) return 'discernment';
  if (/\bdistant|faith is failing|empty|pray but\b/i.test(corpus)) return 'distant_from_god';
  if (/\blost a friend|grief|bothering me\b/i.test(corpus)) return 'grief';
  if (/\bknee|hurt/i.test(corpus)) return 'health';
  if (/\bsabbath|roman church|roman catholic|wording\b/i.test(corpus)) return 'sabbath_meta';
  return 'general';
}

function isCorrectionTurn(message = '', evidencePack = {}) {
  const u = evidencePack.understanding || {};
  const ledger = evidencePack.correctionLedger || {};
  if (isCorrectionMessage(message) || isMetaOrWordingTurn(message, u)) return true;
  if (ledger.active && (ledger.correctionCount >= 1 || ledger.userCorrection)) return true;
  if (u.isCorrection || u.isMetaQuestion || u.requestedAnswerType === 'wording_explanation') return true;
  return /\bnot (my|what i) (question|asking|meant)\b|\bnot asking about\b|\bwhy are you not answering\b|\bare you not listening\b/i.test(
    message
  );
}

function isFactualOrTeachingTurn(message = '', evidencePack = {}) {
  const u = evidencePack.understanding || {};
  const msg = String(message).trim();
  if (evidencePack.history?.included && !evidencePack.companionThreadContext?.companionTopic) return true;
  if (u.strictAnswerMode && !u.isCorrection) return true;
  if (/^why should we keep sunday/i.test(msg)) return true;
  if (/^why do you call|^why are you using the term/i.test(msg)) return true;
  if (/^why |^how did |^what year /i.test(msg) && !/my mom|my faith|feel distant|job|knee|friend/i.test(msg)) {
    return true;
  }
  return false;
}

function isHeardFirstTurn(message = '', evidencePack = {}, topic = '') {
  const msg = String(message).toLowerCase();
  if (/\bstill bothering me\b/i.test(msg) && !/\?/.test(msg)) return true;
  if (topic === 'distant_from_god' && /\bfeel distant\b|\bfeels empty\b|\bpray but it feels\b/i.test(msg)) return true;
  if (/\bi feel\b|\bi'?m grieving\b|\bit is still\b/i.test(msg) && !/^how do i\b/i.test(msg)) return true;
  return false;
}

function isDiscernmentTurn(message = '', evidencePack = {}, topic = '') {
  if (topic === 'discernment') return true;
  const msg = String(message).toLowerCase();
  return /\bjob opportunity\b|\bnot sure whether to push\b|\bpush or wait\b|\bfar away from home\b/i.test(msg);
}

function isPracticalCareTurn(message = '', evidencePack = {}, topic = '') {
  if (topic === 'health' || topic === 'caregiver') return true;
  return /\bknee|hurting again|how can i help her\b/i.test(String(message).toLowerCase());
}

/**
 * Assess human moment before compose — does not generate prose.
 */
function assessHumanMoment(message = '', evidencePack = {}) {
  const topic = detectTopic(message, evidencePack);
  const msg = String(message);

  const moment = {
    userNeed: 'needs_clarity',
    emotionalWeight: 'medium',
    certaintyNeeded: 'medium',
    answerUrgency: 'medium',
    relationshipNeed: 'medium',
    shouldAnswerNow: false,
    shouldExplore: false,
    shouldComfort: false,
    shouldCorrectPriorMiss: false,
    shouldTeach: false,
    shouldKeepShort: false,
    why: 'default_balanced',
    recommendedShape: 'Companion Reflection',
  };

  if (isCorrectionTurn(message, evidencePack)) {
    moment.userNeed = 'needs_correction_repair';
    moment.emotionalWeight = 'high';
    moment.certaintyNeeded = 'high';
    moment.answerUrgency = 'high';
    moment.relationshipNeed = 'high';
    moment.shouldAnswerNow = true;
    moment.shouldCorrectPriorMiss = true;
    moment.shouldKeepShort = true;
    moment.shouldTeach = false;
    moment.shouldComfort = false;
    moment.shouldExplore = false;
    moment.recommendedShape = 'Correction Repair';
    moment.why = 'correction_or_meta_wording_turn';
    return moment;
  }

  if (isFactualOrTeachingTurn(message, evidencePack)) {
    const biblical =
      /\bsabbath|worship|scripture|doctrine|bible\b/i.test(msg) || evidencePack.history?.included;
    moment.userNeed = biblical ? 'needs_biblical_grounding' : 'needs_direct_answer';
    moment.emotionalWeight = 'low';
    moment.certaintyNeeded = 'high';
    moment.answerUrgency = 'high';
    moment.relationshipNeed = 'low';
    moment.shouldAnswerNow = true;
    moment.shouldTeach = biblical;
    moment.shouldKeepShort = false;
    moment.recommendedShape = 'Direct Answer';
    moment.why = 'factual_or_doctrinal_question';
    return moment;
  }

  if (isHeardFirstTurn(message, evidencePack, topic)) {
    moment.userNeed = /\?/.test(msg) && /faith is failing|does that mean/i.test(msg)
      ? 'needs_clarity'
      : 'needs_to_be_heard';
    moment.emotionalWeight = 'high';
    moment.certaintyNeeded = /\?/.test(msg) ? 'high' : 'low';
    moment.answerUrgency = /\?/.test(msg) ? 'high' : 'low';
    moment.relationshipNeed = 'high';
    moment.shouldComfort = true;
    moment.shouldAnswerNow = /\?/.test(msg);
    moment.shouldExplore = false;
    moment.shouldTeach = false;
    moment.shouldKeepShort = !/\?/.test(msg);
    moment.recommendedShape = 'Companion Reflection';
    moment.why = 'emotional_processing_before_teaching';
    return moment;
  }

  if (isDiscernmentTurn(message, evidencePack, topic)) {
    moment.userNeed = /\bnot sure whether\b/i.test(msg) ? 'needs_discernment' : 'needs_clarity';
    moment.emotionalWeight = 'medium';
    moment.certaintyNeeded = 'medium';
    moment.answerUrgency = 'medium';
    moment.relationshipNeed = 'high';
    moment.shouldAnswerNow = /\?/.test(msg);
    moment.shouldExplore = false;
    moment.shouldComfort = true;
    moment.shouldTeach = false;
    moment.recommendedShape = 'Discernment Conversation';
    moment.why = 'life_decision_needs_understanding_first';
    return moment;
  }

  if (isPracticalCareTurn(message, evidencePack, topic)) {
    moment.userNeed = /\?/.test(msg) ? 'needs_practical_next_step' : 'needs_comfort';
    moment.emotionalWeight = topic === 'caregiver' ? 'high' : 'medium';
    moment.certaintyNeeded = 'medium';
    moment.answerUrgency = 'medium';
    moment.relationshipNeed = 'medium';
    moment.shouldAnswerNow = /\?/.test(msg) || /\bhow can i help\b/i.test(msg);
    moment.shouldComfort = topic === 'caregiver';
    moment.recommendedShape = 'Practical Care';
    moment.why = 'health_or_caregiving_practical_moment';
    return moment;
  }

  if (/\?/.test(msg)) {
    moment.userNeed = 'needs_clarity';
    moment.shouldAnswerNow = true;
    moment.recommendedShape = 'Companion Reflection';
    moment.why = 'explicit_question';
    return moment;
  }

  moment.userNeed = 'needs_to_be_heard';
  moment.shouldComfort = true;
  moment.recommendedShape = 'Companion Reflection';
  moment.why = 'open_share_default';
  return moment;
}

function capScriptureReferences(scripture = {}) {
  const refs = scripture.references || [];
  if (refs.length <= 2) return { ...scripture, references: refs };
  return { ...scripture, references: refs.slice(0, 2), cappedFrom: refs.length };
}

function buildOperatingModelSystemPrompt({ evidencePack }) {
  const boundaries = evidencePack?.doctrine?.boundaries || [];
  const forbidden =
    evidencePack?.doctrine?.forbiddenTeachings || FORBIDDEN_TEACHINGS.map((t) => t.boundary);
  const boundaryBlock = [...boundaries, ...forbidden].filter(Boolean).slice(0, 12);

  return `${COMPOSER_GUIDANCE}

Doctrine boundaries (do not violate):
${boundaryBlock.map((b) => `- ${b}`).join('\n')}`;
}

function buildOperatingModelUserPayload({ message, evidencePack, humanMoment }) {
  const historyBlock = (evidencePack.conversationHistory || [])
    .map((t) => `Turn ${t.turn} user: ${t.user}\nTurn ${t.turn} assistant: ${t.assistant}`)
    .join('\n\n');

  const ledger = evidencePack.correctionLedger || {};
  const correctionFacts =
    ledger.active || ledger.priorAssistantQuote
      ? {
          priorAssistantQuote: ledger.priorAssistantQuote || null,
          correctedIntent: ledger.correctedIntent || message,
          forbiddenRepeatTopics: ledger.forbiddenRepeatTopics || [],
          correctionCount: ledger.correctionCount || 0,
        }
      : null;

  return {
    userMessage: message,
    conversationHistory: historyBlock || 'none',
    humanMoment,
    recommendedReplyShape: humanMoment.recommendedShape,
    threadLocal: evidencePack.threadLocal,
    companionThreadContext: evidencePack.companionThreadContext,
    correctionFacts,
    memory: evidencePack.memory,
    scripture: capScriptureReferences(evidencePack.scripture || {}),
    historicalEvidence: evidencePack.history?.included
      ? {
          included: true,
          focus: evidencePack.history.focus || null,
          chainSteps: (evidencePack.history.chainSteps || []).slice(0, 5),
          distinction: evidencePack.history.distinction || null,
        }
      : { included: false, reason: evidencePack.history?.reason || 'not_applicable' },
    regenInstruction: null,
  };
}

function buildOperatingModelPromptBundle({ message, evidencePack }) {
  const humanMoment = assessHumanMoment(message, evidencePack);
  const systemPrompt = buildOperatingModelSystemPrompt({ evidencePack });
  const userPayload = buildOperatingModelUserPayload({ message, evidencePack, humanMoment });
  const userJson = JSON.stringify(userPayload, null, 2);
  return {
    systemPrompt,
    userPayload,
    humanMoment,
    sizes: {
      systemPromptChars: systemPrompt.length,
      userPayloadTokensEst: estimateTokens(userJson),
      totalTokensEst: estimateTokens(systemPrompt) + estimateTokens(userJson),
    },
  };
}

async function callOperatingModelOpenAI({ systemPrompt, userPayload, temperature = 0.74 }) {
  if (!openai) {
    return { ok: false, error: 'openai_unavailable', raw: null };
  }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
    });
    return { ok: true, raw: completion?.choices?.[0]?.message?.content || '', error: null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), raw: null };
  }
}

async function composeOperatingModelReply({ message, evidencePack, maxAttempts = 2 } = {}) {
  const bundle = buildOperatingModelPromptBundle({ message, evidencePack });
  let lastValidation = { passed: true, issues: [] };
  let reply = '';

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await callOperatingModelOpenAI({
      systemPrompt: bundle.systemPrompt,
      userPayload: {
        ...bundle.userPayload,
        regenInstruction:
          attempt > 0 && lastValidation.issues?.length
            ? `Fix doctrine only: ${lastValidation.issues.join('; ')}`
            : null,
      },
      temperature: attempt > 0 ? 0.58 : 0.74,
    });

    if (!result.ok) {
      return {
        reply: `[Companion operating model experiment unavailable: ${result.error}]`,
        openaiCalled: false,
        validation: lastValidation,
        humanMoment: bundle.humanMoment,
        promptSizes: bundle.sizes,
        bundle,
      };
    }

    const parsed = safeJsonParse(result.raw) || { reply: result.raw };
    reply = String(parsed.reply || result.raw || '').trim();
    lastValidation = validateDoctrineBoundaries(reply);
    if (lastValidation.passed) break;
  }

  return {
    reply,
    openaiCalled: true,
    validation: lastValidation,
    humanMoment: bundle.humanMoment,
    promptSizes: bundle.sizes,
    bundle,
  };
}

async function runCompanionOperatingModelExperimentRuntime(
  H,
  inputOrUserId,
  modeArg,
  personaKeyArg,
  messageArg
) {
  const { userId, mode, personaKey, message } = H.normalizeInput(
    inputOrUserId,
    modeArg,
    personaKeyArg,
    messageArg
  );

  if (!message || !String(message).trim()) {
    return {
      reply: '',
      runtime: {
        masterRoute: 'companion_operating_model_experiment_empty',
        openaiCalled: false,
        buddyRuntime: 'companion_operating_model_experiment_test',
      },
    };
  }

  const profile = H.getUserCompanionProfile(userId);
  const getSessions = H.getRecentSessions || testGetRecentSessions;
  const recentSessions = getSessions(userId, 10);
  const safety = H.classifySafety(message);

  if (safety.level === 'crisis') {
    const append = H.appendSession || testAppendSession;
    append({
      userId,
      mode,
      personaKey,
      message,
      reply: CRISIS_REPLY,
      structured: { reply: CRISIS_REPLY },
      safety,
      runtime: { masterRoute: 'companion_operating_model_experiment_crisis' },
    });
    return {
      reply: CRISIS_REPLY,
      runtime: {
        masterRoute: 'companion_operating_model_experiment_crisis',
        openaiCalled: false,
        buddyRuntime: 'companion_operating_model_experiment_test',
      },
    };
  }

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;

  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode,
    recentSessions,
    runtimeContext,
    profile,
    safety,
  });

  const composed = await composeOperatingModelReply({ message, evidencePack });

  const append = H.appendSession || testAppendSession;
  append({
    userId,
    mode,
    personaKey,
    message,
    reply: composed.reply,
    structured: {
      reply: composed.reply,
      runtime: {
        masterRoute: 'companion_operating_model_experiment_openai',
        openaiCalled: composed.openaiCalled,
        humanMoment: composed.humanMoment,
      },
    },
    safety,
    runtime: { masterRoute: 'companion_operating_model_experiment_openai' },
  });

  return {
    reply: composed.reply,
    runtime: {
      masterRoute: composed.openaiCalled
        ? 'companion_operating_model_experiment_openai'
        : 'companion_operating_model_experiment_unavailable',
      openaiCalled: composed.openaiCalled,
      buddyRuntime: 'companion_operating_model_experiment_test',
      validation: composed.validation,
      humanMoment: composed.humanMoment,
    },
    promptSizes: composed.promptSizes,
  };
}

module.exports = {
  USER_NEEDS,
  OUTPUT_SHAPES,
  assessHumanMoment,
  buildOperatingModelPromptBundle,
  composeOperatingModelReply,
  runCompanionOperatingModelExperimentRuntime,
  clearTestSessions,
  testGetRecentSessions,
  COMPOSER_GUIDANCE,
};
