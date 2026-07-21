/**
 * BibleBuddy Lite — experiment runtime ONLY.
 *
 * User Message → Conversation History → System Prompt → Bible Boundaries → OpenAI → Response
 *
 * Does NOT call route responders, doctrine presenters, or fallback templates for prose.
 * Memory, scripture, and doctrine boundaries are retrieval/evidence only.
 *
 * NOT wired to POST /buddy/chat — use scripts/bibleBuddyLiteBaselineExperiment.js
 */

const openai = require('./openaiClient');
const {
  detectTopicFromMessage,
  detectTopicFromSessions,
  getBoundariesForTopic,
  violatesDoctrineBoundary,
} = require('./doctrineBoundaries');
const { getScriptureChain } = require('./scriptureChainExpansion');
const {
  getUserCompanionProfile,
  getRecentSessions,
  enrichRuntimeContextWithMemory,
  classifySafety,
  buildSystemPrompt,
  safeJsonParse,
  normalizeStructured,
} = require('./buddyBrain');
const { buildRuntimeContext } = require('./runtimeOrchestrator');

const LITE_SYSTEM_APPEND = `
BibleBuddy Lite experiment mode:
- Answer the user's actual question in plain, warm language.
- Use retrieved Scripture references when relevant; do not invent verses.
- Stay inside the supplied doctrine boundaries.
- Do not deflect to study prompts unless the user asks to study.
- Do not repeat canned historical blocks when the user asks about wording or listening.
- Reflect what you heard before advising.
`.trim();

const TOPIC_TO_CHAIN = {
  sabbath: 'sabbath',
  dietary_law: 'dietaryLaw',
  feast_days: 'feastDays',
  traditions: 'traditions',
  resurrection_timeline: 'resurrection',
};

function buildConversationHistory(recentSessions = [], limit = 8) {
  return recentSessions
    .slice(-limit)
    .map((s) => ({
      role: 'user',
      content: String(s.message || ''),
      assistant: String(s.reply || s.structured?.reply || '').slice(0, 1200),
    }))
    .filter((t) => t.content.trim());
}

function retrieveEvidence({ message, recentSessions, runtimeContext, profile }) {
  const topic =
    detectTopicFromMessage(message) ||
    detectTopicFromSessions(recentSessions) ||
    runtimeContext?.activeConversation?.topic ||
    null;

  const chainKey = TOPIC_TO_CHAIN[topic] || (topic === 'sabbath_history' ? 'sabbath' : null);
  const scriptureChain = chainKey ? getScriptureChain(chainKey) : [];

  const memorySnippets = [];
  if (profile?.memoryEnabled !== false && runtimeContext?.memory) {
    const summaries = runtimeContext.memory.recentSummaries || runtimeContext.memory.summaries || [];
    for (const s of summaries.slice(-3)) {
      memorySnippets.push(typeof s === 'string' ? s : s.summary || s.text || JSON.stringify(s));
    }
    const openLoops = runtimeContext.memory.openLoops || [];
    for (const loop of openLoops.slice(-3)) {
      memorySnippets.push(loop.label || loop.detail || loop.summary || '');
    }
  }

  const boundaries = getBoundariesForTopic(topic || '');

  return {
    topic,
    boundaries,
    scriptureChain: scriptureChain.slice(0, 8),
    memorySnippets: memorySnippets.filter(Boolean).slice(0, 5),
  };
}

function buildLiteSystemPrompt({ mode, personaKey, profile, evidence }) {
  const base = buildSystemPrompt({
    mode,
    personaKey,
    profile,
    runtimeInstructions: `
Retrieved evidence (use for grounding; do not paste verbatim blocks):
- Topic: ${evidence.topic || 'general'}
- Doctrine boundaries: ${evidence.boundaries.join(' | ')}
- Scripture chain: ${evidence.scriptureChain.map((s) => s.reference || s).join(', ') || 'none'}
- Memory snippets: ${evidence.memorySnippets.join(' | ') || 'none'}
`.trim(),
  });
  return `${base}\n\n${LITE_SYSTEM_APPEND}`;
}

/**
 * Run a single Lite turn. Returns structured reply with runtime.lite = true.
 */
async function runBibleBuddyLite({
  userId = 'lite-experiment',
  mode = 'COMPANION',
  personaKey = 'ADAPTIVE_COMPANION',
  message = '',
} = {}) {
  const startedAt = Date.now();

  if (!message || !String(message).trim()) {
    return {
      reply: '',
      runtime: { lite: true, error: 'empty_message', masterRoute: 'lite_blocked' },
      experimentStatus: 'blocked',
    };
  }

  const safety = classifySafety(message);
  const profile = getUserCompanionProfile(userId);
  const recentSessions = getRecentSessions(userId, 10);
  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });

  const evidence = retrieveEvidence({ message, recentSessions, runtimeContext, profile });
  const history = buildConversationHistory(recentSessions, 8);

  if (!openai) {
    return {
      reply:
        '[BibleBuddy Lite experiment: OpenAI unavailable. Set OPENAI_API_KEY to compare reason-first composition against current runtime.]',
      scripture: evidence.scriptureChain.slice(0, 3),
      mode: 'companion',
      confidence: 'low',
      memory_used: evidence.memorySnippets.length > 0,
      safety_level: safety.level,
      runtime: {
        lite: true,
        masterRoute: 'lite_openai_required',
        evidenceOnly: true,
        topic: evidence.topic,
        boundaries: evidence.boundaries,
        historyTurns: history.length,
        elapsedMs: Date.now() - startedAt,
      },
      experimentStatus: 'openai_unavailable',
    };
  }

  const systemPrompt = buildLiteSystemPrompt({ mode, personaKey, profile, evidence });

  const historyBlock = history
    .map((t, i) => `Turn ${i + 1} user: ${t.content}\nTurn ${i + 1} assistant: ${t.assistant}`)
    .join('\n\n');

  const userPayload = {
    message,
    conversationHistory: historyBlock || 'none',
    retrievedEvidence: evidence,
    safety,
  };

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.72,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) },
      ],
    });

    const raw = completion?.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw) || { reply: raw, confidence: 'low' };
    let structured = normalizeStructured(parsed, { reply: raw, safety_level: safety.level }, safety, runtimeContext, {});

    const boundaryViolations = violatesDoctrineBoundary(structured.reply);
    if (boundaryViolations.length) {
      structured.admin_flags = [...(structured.admin_flags || []), 'doctrine_boundary_review'];
      structured.runtime = {
        ...(structured.runtime || {}),
        boundaryViolations,
      };
    }

    structured.runtime = {
      ...(structured.runtime || {}),
      lite: true,
      masterRoute: 'lite_openai',
      evidenceOnly: true,
      topic: evidence.topic,
      historyTurns: history.length,
      elapsedMs: Date.now() - startedAt,
    };
    structured.experimentStatus = 'openai_composed';

    return structured;
  } catch (e) {
    return {
      reply: `[BibleBuddy Lite experiment: OpenAI error — ${e?.message || e}]`,
      runtime: {
        lite: true,
        masterRoute: 'lite_openai_error',
        error: String(e?.message || e),
        elapsedMs: Date.now() - startedAt,
      },
      experimentStatus: 'openai_error',
    };
  }
}

module.exports = {
  runBibleBuddyLite,
  retrieveEvidence,
  buildConversationHistory,
};
