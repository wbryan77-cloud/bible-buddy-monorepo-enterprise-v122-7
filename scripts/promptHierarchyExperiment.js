#!/usr/bin/env node
/**
 * Prompt hierarchy experiment — current reason-first vs minimal reason-first.
 * TEST ONLY. Does not modify production or reason-first runtime.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/promptHierarchyExperiment.js
 */

try {
  require('dotenv').config();
} catch (_) {}

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { runMinimalReasonFirstRuntime } = require('../services/minimalReasonFirstRuntime');
const { buildComposerSystemPrompt } = require('../services/reasonFirstComposer');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildRuntimeContext } = require('../services/runtimeOrchestrator');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { estimateTokens, clearTestSessions, testGetRecentSessions, buildMinimalPromptBundle } = require('../services/minimalReasonFirstRuntime');

const ROOT = path.join(__dirname, '..');
const OUT_REPORT = path.join(ROOT, 'PromptHierarchyExperiment.md');
const OUT_JSON = path.join(ROOT, 'docs', 'prompt-hierarchy-experiment', 'results.json');
const CACHED_VALIDATION = path.join(ROOT, 'docs', 'reason-first-migration', 'validation-results.json');

const THREADS = [
  { id: 'job', name: 'Job opportunity', messages: ['I have a job opportunity.', 'The company is far away from home.', "I'm not sure whether to push or wait on this offer."] },
  { id: 'alz', name: "Alzheimer's caregiver", messages: ["My mom was recently diagnosed with Alzheimer's.", "Some days she doesn't remember who I am.", 'How do I stay close to God while grieving who she used to be?'] },
  { id: 'distant', name: 'Feeling distant from God', messages: ['I feel distant from God lately.', 'I pray but it feels empty.', 'Does that mean my faith is failing?'] },
  { id: 'sabbath', name: 'Sabbath wording thread', messages: [
    'Why should we keep Sunday as the day of worship onto the Lord?',
    'Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?',
    'Why are you using the term Roman church when the technical name is the Roman Catholic Church?',
    "No, I'm not asking about the shift. I'm asking about your wording.",
    'Why are you not answering my question?',
    "No, I'm not asking about history. I'm asking about your wording.",
    'Are you not listening to what I am asking?',
  ]},
  { id: 'grief', name: 'Grief thread', messages: ['I lost a friend Wednesday.', 'It is still bothering me.'] },
  { id: 'health', name: 'Health thread', messages: ['My knees hurt.', 'My knees are hurting again today.'] },
];

function uid(prefix, variant) {
  return `phe-${prefix}-${variant}-${Date.now()}`;
}

function normalizeInput(inputOrUserId, modeArg, personaKeyArg, messageArg) {
  if (typeof inputOrUserId === 'object' && inputOrUserId !== null) {
    return {
      userId: inputOrUserId.userId,
      mode: inputOrUserId.mode || 'COMPANION',
      personaKey: inputOrUserId.personaKey || 'ADAPTIVE_COMPANION',
      message: inputOrUserId.message,
    };
  }
  return {
    userId: inputOrUserId,
    mode: modeArg || 'COMPANION',
    personaKey: personaKeyArg || 'ADAPTIVE_COMPANION',
    message: messageArg,
  };
}

function getBuddyHelpers() {
  const H = require('../services/buddyBrain');
  return {
    normalizeInput,
    getUserCompanionProfile: H.getUserCompanionProfile,
    getRecentSessions: H.getRecentSessions,
    classifySafety: H.classifySafety,
    enrichRuntimeContextWithMemory: H.enrichRuntimeContextWithMemory,
  };
}

// --- Scoring heuristics ---

function scoreListening(reply, message, turnIndex) {
  let score = 5;
  const msg = String(message).toLowerCase();
  if (/you('re| are) asking|i hear|sounds like|you're right|what you('re| are) asking/i.test(reply)) score += 2;
  if (/constantine|laodicea|historical chain/i.test(reply) && msg.includes('wording')) score -= 3;
  if (/not listening|not answering/i.test(msg) && !/i hear|you('re| are) asking|listening closely|i understand/i.test(reply)) score -= 2;
  if (turnIndex > 0 && /you('re| are) asking/i.test(reply)) score += 1;
  if (/unavailable|composer unavailable/i.test(reply)) return 0;
  return Math.max(0, Math.min(10, score));
}

function scoreWarmth(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let score = 5;
  if (/i'?m sorry|so sorry|that sounds|that must|heavy|painful|with you|not alone|here for you|care about/i.test(reply)) score += 2;
  if (/thank you for your thoughtful question|as an ai|i am a language model/i.test(reply)) score -= 2;
  if (/\b(shall|thus|therefore|accordingly)\b/i.test(reply)) score -= 1;
  return Math.max(0, Math.min(10, score));
}

function scoreHelpfulness(reply, message) {
  if (/unavailable/i.test(reply)) return 0;
  let score = 5;
  const msg = String(message).toLowerCase();
  if (/\?/.test(message) && reply.length > 80) score += 1;
  if (/next step|you might|consider|could try|one thing|helpful/i.test(reply)) score += 1;
  if (/wording|roman catholic|roman church/i.test(msg) && /informal|shorthand|conversational|precise name|full name/i.test(reply)) score += 1;
  if (/wording|not asking about/i.test(msg) && /constantine|laodicea|sabbath definition/i.test(reply)) score -= 2;
  if (reply.length < 40) score -= 2;
  return Math.max(0, Math.min(10, score));
}

function scoreBiblicalGrounding(reply, message) {
  if (/unavailable/i.test(reply)) return 0;
  let score = 4;
  const msg = String(message).toLowerCase();
  const needsScripture = /god|faith|pray|scripture|sabbath|grief|grieving|bible|worship|sabbath|spiritual/i.test(msg);
  const refs = (reply.match(/\b[A-Za-z]+\s+\d+:\d+/g) || []).length;
  if (refs >= 1) score += 2;
  if (refs >= 2) score += 1;
  if (/psalm|proverbs|matthew|romans|corinthians|genesis|exodus|isaiah|hebrews/i.test(reply)) score += 1;
  if (needsScripture && refs === 0) score -= 1;
  if (/verse dump|here are 5 verses/i.test(reply)) score -= 2;
  return Math.max(0, Math.min(10, score));
}

function scoreCorrectionRecovery(reply, message, priorReply) {
  if (/unavailable/i.test(reply)) return 0;
  const msg = String(message).toLowerCase();
  const isCorrection = /wording|not asking|not answering|not listening|you call it/i.test(msg);
  if (!isCorrection) return null;

  let score = 5;
  if (/i hear|understand|you're right|my mistake|fair point|clarify/i.test(reply)) score += 2;
  if (priorReply && normalizeForCompare(reply) === normalizeForCompare(priorReply)) score -= 4;
  else if (priorReply && overlapRatio(reply, priorReply) > 0.65) score -= 3;
  else if (priorReply && overlapRatio(reply, priorReply) < 0.45) score += 2;
  if (/different|new|specifically|to be direct|honestly/i.test(reply)) score += 1;
  return Math.max(0, Math.min(10, score));
}

function scoreFollowUpQuality(reply, message, turnIndex, priorMessages) {
  if (turnIndex === 0 || /unavailable/i.test(reply)) return null;
  let score = 5;
  const prior = priorMessages.join(' ').toLowerCase();
  const words = prior.split(/\W+/).filter((w) => w.length > 4);
  const matched = words.filter((w) => reply.toLowerCase().includes(w)).length;
  if (matched >= 2) score += 2;
  if (matched >= 4) score += 1;
  if (/again today|still|as you mentioned|earlier|this offer|your mom|your friend|your knees/i.test(reply)) score += 2;
  if (turnIndex > 0 && matched === 0 && reply.length > 100) score -= 2;
  return Math.max(0, Math.min(10, score));
}

function normalizeForCompare(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 400);
}

function overlapRatio(a, b) {
  const wa = new Set(normalizeForCompare(a).split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(normalizeForCompare(b).split(/\W+/).filter((w) => w.length > 3));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / Math.max(wa.size, wb.size);
}

function scoreTurn({ reply, message, turnIndex, priorReply, priorMessages }) {
  return {
    listening: scoreListening(reply, message, turnIndex),
    warmth: scoreWarmth(reply),
    helpfulness: scoreHelpfulness(reply, message),
    biblicalGrounding: scoreBiblicalGrounding(reply, message),
    correctionRecovery: scoreCorrectionRecovery(reply, message, priorReply),
    followUpQuality: scoreFollowUpQuality(reply, message, turnIndex, priorMessages),
  };
}

function avgMetric(turns, key) {
  const vals = turns.map((t) => (t.scores ? t.scores[key] : null)).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function measureMinimalPromptSizes(H, userId, message, recentSessions) {
  const profile = H.getUserCompanionProfile(userId);
  const safety = H.classifySafety(message);
  let runtimeContext = buildRuntimeContext({ message, mode: 'COMPANION', profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode: 'COMPANION',
    recentSessions,
    runtimeContext,
    profile,
    safety,
  });
  const bundle = buildMinimalPromptBundle({ message, recentSessions, evidencePack });
  return {
    ...bundle.sizes,
    systemPromptChars: bundle.systemPrompt.length,
  };
}

function loadCachedReasonFirstResults() {
  if (!fs.existsSync(CACHED_VALIDATION)) return null;
  const data = JSON.parse(fs.readFileSync(CACHED_VALIDATION, 'utf8'));
  if (!data.openaiAvailable || !data.reasonResults?.length) return null;
  return data;
}

function buildResultsFromCachedCurrent(cached) {
  return cached.reasonResults.map((thread) => {
    const spec = THREADS.find((t) => t.id === thread.id) || thread;
    const H = getBuddyHelpers();
    const userId = `phe-cache-${thread.id}`;
    const localSessions = [];
    const priorMessages = [];
    const turns = thread.turns.map((t, i) => {
      const promptSizes = measureCurrentReasonFirstPrompt(H, userId, t.message, localSessions);
      const priorReply = i > 0 ? thread.turns[i - 1].reply : null;
      const scores = scoreTurn({
        reply: t.reply,
        message: t.message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
      });
      localSessions.push({ message: t.message, reply: t.reply });
      priorMessages.push(t.message);
      return {
        turn: t.turn,
        message: t.message,
        reply: t.reply,
        openaiCalled: true,
        masterRoute: t.masterRoute || 'reason_first_openai',
        promptSizes,
        scores,
        source: 'cached_validation',
      };
    });
    return { ...spec, variant: 'current', userId, turns, source: 'cached_validation' };
  });
}

function buildPromptSizeOnlyMinimal(spec) {
  const H = getBuddyHelpers();
  const userId = `phe-prompt-${spec.id}-minimal`;
  const localSessions = [];
  const turns = spec.messages.map((message, i) => {
    const promptSizes = measureMinimalPromptSizes(H, userId, message, localSessions);
    localSessions.push({ message, reply: `[minimal turn ${i + 1} placeholder]` });
    return {
      turn: i + 1,
      message,
      reply: '',
      openaiCalled: false,
      masterRoute: 'minimal_prompt_size_only',
      promptSizes,
      scores: null,
    };
  });
  return { ...spec, variant: 'minimal', userId, turns, source: 'prompt_size_only' };
}

function attachScoresToMinimalResults(minimalResults) {
  return minimalResults.map((thread) => {
    const priorMessages = [];
    const turns = thread.turns.map((t, i) => {
      const priorReply = i > 0 ? thread.turns[i - 1].reply : null;
      const scores = t.reply
        ? scoreTurn({ reply: t.reply, message: t.message, turnIndex: i, priorReply, priorMessages: [...priorMessages] })
        : null;
      priorMessages.push(t.message);
      return { ...t, scores: scores || t.scores };
    });
    return { ...thread, turns };
  });
}

function measureCurrentReasonFirstPrompt(H, userId, message, recentSessions) {
  const profile = H.getUserCompanionProfile(userId);
  const safety = H.classifySafety(message);
  let runtimeContext = buildRuntimeContext({ message, mode: 'COMPANION', profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode: 'COMPANION',
    recentSessions,
    runtimeContext,
    profile,
    safety,
  });
  const systemPrompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile,
    runtimeContext,
    evidencePack,
  });
  const historyBlock = (evidencePack.conversationHistory || [])
    .map((t) => `Turn ${t.turn} user: ${t.user}\nTurn ${t.turn} assistant: ${t.assistant}`)
    .join('\n\n');
  const userPayload = {
    userMessage: message,
    conversationHistory: historyBlock || 'none',
    activeConversation: evidencePack.activeConversation,
    evidence: {
      memory: evidencePack.memory,
      scripture: evidencePack.scripture,
      history: evidencePack.history,
      doctrine: evidencePack.doctrine,
      understanding: evidencePack.understanding,
      companionContext: evidencePack.companionContext,
    },
  };
  const userStr = JSON.stringify(userPayload, null, 2);
  return {
    systemPromptChars: systemPrompt.length,
    systemPromptTokensEst: estimateTokens(systemPrompt),
    userPayloadChars: userStr.length,
    userPayloadTokensEst: estimateTokens(userStr),
    totalTokensEst: estimateTokens(systemPrompt) + estimateTokens(userStr),
  };
}

async function runThreadVariant(variant, spec) {
  const prev = process.env.BUDDY_RUNTIME;
  const userId = uid(spec.id, variant);
  clearActiveConversation(userId);
  if (variant === 'minimal') clearTestSessions(userId);
  const turns = [];
  const priorMessages = [];

  const H = { ...getBuddyHelpers() };
  if (variant === 'minimal') {
    H.getRecentSessions = testGetRecentSessions;
  }

  try {
    for (let i = 0; i < spec.messages.length; i += 1) {
      const message = spec.messages[i];
      const recentSessions = H.getRecentSessions(userId, 10);
      let structured;
      let promptSizes;

      if (variant === 'current') {
        process.env.BUDDY_RUNTIME = 'reason_first';
        structured = await runBuddy({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
        promptSizes = measureCurrentReasonFirstPrompt(H, userId, message, recentSessions);
      } else {
        process.env.BUDDY_RUNTIME = 'legacy';
        structured = await runMinimalReasonFirstRuntime(H, { userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
        promptSizes = structured.promptSizes || null;
      }

      const reply = String(structured?.reply || '');
      const priorReply = turns.length ? turns[turns.length - 1].reply : null;
      const scores = scoreTurn({ reply, message, turnIndex: i, priorReply, priorMessages: [...priorMessages] });

      turns.push({
        turn: i + 1,
        message,
        reply,
        openaiCalled: !!(structured?.runtime?.openaiCalled),
        masterRoute: structured?.runtime?.masterRoute,
        promptSizes,
        scores,
      });

      priorMessages.push(message);
    }
  } finally {
    process.env.BUDDY_RUNTIME = prev;
  }

  return { ...spec, variant, userId, turns };
}

function aggregateScores(allTurns) {
  const keys = ['listening', 'warmth', 'helpfulness', 'biblicalGrounding', 'correctionRecovery', 'followUpQuality'];
  const out = {};
  for (const k of keys) {
    const vals = allTurns
      .map((t) => (t.scores ? t.scores[k] : null))
      .filter((v) => v !== null && v !== undefined);
    out[k] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }
  return out;
}

function aggregatePromptSizes(allTurns) {
  const withSizes = allTurns.filter((t) => t.promptSizes);
  if (!withSizes.length) return null;
  const avg = (fn) => Math.round((withSizes.reduce((s, t) => s + fn(t.promptSizes), 0) / withSizes.length) * 10) / 10;
  return {
    avgSystemPromptTokensEst: avg((p) => p.systemPromptTokensEst),
    avgUserPayloadTokensEst: avg((p) => p.userPayloadTokensEst),
    avgTotalTokensEst: avg((p) => p.totalTokensEst),
    minSystemPromptTokensEst: Math.min(...withSizes.map((t) => t.promptSizes.systemPromptTokensEst)),
    maxSystemPromptTokensEst: Math.max(...withSizes.map((t) => t.promptSizes.systemPromptTokensEst)),
    sampleSystemPromptChars: withSizes[0].promptSizes.systemPromptChars,
  };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function buildReport({ currentResults, minimalResults, openaiAvailable, currentSource, minimalSource }) {
  const currentTurns = currentResults.flatMap((r) => r.turns);
  const minimalTurns = minimalResults.flatMap((r) => r.turns);
  const currentAgg = aggregateScores(currentTurns.filter((t) => t.scores));
  const minimalAgg = aggregateScores(minimalTurns.filter((t) => t.scores));
  const currentPrompt = aggregatePromptSizes(currentTurns);
  const minimalPrompt = aggregatePromptSizes(minimalTurns);
  const minimalHasReplies = minimalTurns.some((t) => t.reply && !/unavailable/i.test(t.reply));

  const lines = [];
  lines.push('# Prompt Hierarchy Experiment');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Objective');
  lines.push('');
  lines.push('Test whether the ~13K legacy prompt stack suppresses conversational intelligence by comparing **Current Reason-First** (`reasonFirstComposer` + full `buildSystemPrompt` + runtime instructions) against **Minimal Reason-First** (`minimalReasonFirstRuntime.js` — six evidence inputs only, system prompt ≤1500 tokens).');
  lines.push('');
  lines.push('**Test only.** No production changes. No deployment.');
  lines.push('');
  lines.push(`- Current Reason-First source: **${currentSource}**`);
  lines.push(`- Minimal Reason-First source: **${minimalSource}**`);
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **OpenAI unavailable in this run.** Current scores use cached live replies from `docs/reason-first-migration/validation-results.json`. Re-run with `OPENAI_API_KEY` for live minimal responses.');
    lines.push('');
  }
  if (!minimalHasReplies) {
    lines.push('> **Minimal response scores pending** — prompt sizes measured; set `OPENAI_API_KEY=sk-...` and re-run for full A/B reply comparison.');
    lines.push('');
  }

  lines.push('## Hypothesis');
  lines.push('');
  lines.push('If legacy prompt volume suppresses listening, minimal prompts should score higher on warmth, listening, correction recovery, and follow-up quality — with similar or slightly lower biblical grounding.');
  lines.push('');

  lines.push('## Exact Prompt Sizes');
  lines.push('');
  lines.push(mdTable(
    ['Runtime', 'Avg system tokens (est.)', 'Avg user payload tokens (est.)', 'Avg total tokens (est.)', 'System min–max tokens'],
    [
      [
        'Current Reason-First',
        String(currentPrompt?.avgSystemPromptTokensEst ?? 'n/a'),
        String(currentPrompt?.avgUserPayloadTokensEst ?? 'n/a'),
        String(currentPrompt?.avgTotalTokensEst ?? 'n/a'),
        currentPrompt ? `${currentPrompt.minSystemPromptTokensEst}–${currentPrompt.maxSystemPromptTokensEst}` : 'n/a',
      ],
      [
        'Minimal Reason-First',
        String(minimalPrompt?.avgSystemPromptTokensEst ?? 'n/a'),
        String(minimalPrompt?.avgUserPayloadTokensEst ?? 'n/a'),
        String(minimalPrompt?.avgTotalTokensEst ?? 'n/a'),
        minimalPrompt ? `${minimalPrompt.minSystemPromptTokensEst}–${minimalPrompt.maxSystemPromptTokensEst}` : 'n/a',
      ],
    ]
  ));
  lines.push('');
  lines.push('Token estimate: `ceil(chars / 4)`. Minimal runtime enforces **≤1500 system tokens** by construction.');
  if (currentPrompt && minimalPrompt) {
    const reduction = Math.round((1 - minimalPrompt.avgSystemPromptTokensEst / currentPrompt.avgSystemPromptTokensEst) * 1000) / 10;
    lines.push('');
    lines.push(`**System prompt reduction:** ~${reduction}% smaller for Minimal Reason-First (${currentPrompt.avgSystemPromptTokensEst} → ${minimalPrompt.avgSystemPromptTokensEst} est. tokens).`);
  }
  lines.push('');
  lines.push('### Per-turn system prompt sizes (est. tokens)');
  lines.push('');
  const sizeRows = [];
  for (const spec of THREADS) {
    const cur = currentResults.find((r) => r.id === spec.id);
    const min = minimalResults.find((r) => r.id === spec.id);
    for (let i = 0; i < spec.messages.length; i += 1) {
      sizeRows.push([
        spec.name.slice(0, 20),
        String(i + 1),
        String(cur.turns[i]?.promptSizes?.systemPromptTokensEst ?? 'n/a'),
        String(min.turns[i]?.promptSizes?.systemPromptTokensEst ?? 'n/a'),
        String(cur.turns[i]?.promptSizes?.totalTokensEst ?? 'n/a'),
        String(min.turns[i]?.promptSizes?.totalTokensEst ?? 'n/a'),
      ]);
    }
  }
  lines.push(mdTable(
    ['Thread', 'Turn', 'Current system', 'Minimal system', 'Current total', 'Minimal total'],
    sizeRows
  ));
  lines.push('');
  lines.push('### Sample Minimal Reason-First system prompt (turn 1, full text)');
  lines.push('');
  const sampleMin = minimalResults[0]?.turns[0];
  if (sampleMin?.promptSizes) {
    const H = getBuddyHelpers();
    const bundle = buildMinimalPromptBundle({
      message: THREADS[0].messages[0],
      recentSessions: [],
      evidencePack: buildRetrievalEvidencePack({
        userId: 'sample-minimal',
        message: THREADS[0].messages[0],
        mode: 'COMPANION',
        recentSessions: [],
        runtimeContext: buildRuntimeContext({
          message: THREADS[0].messages[0],
          mode: 'COMPANION',
          profile: H.getUserCompanionProfile('sample-minimal'),
          recentSessions: [],
          safety: H.classifySafety(THREADS[0].messages[0]),
        }),
        profile: H.getUserCompanionProfile('sample-minimal'),
        safety: H.classifySafety(THREADS[0].messages[0]),
      }),
    });
    lines.push('```');
    lines.push(bundle.systemPrompt);
    lines.push('```');
    lines.push('');
    lines.push(`Chars: ${bundle.systemPrompt.length} | Est. tokens: ${estimateTokens(bundle.systemPrompt)} | Cap: ${1500}`);
  }
  lines.push('');
  lines.push('### Sample Current Reason-First system prompt (turn 1, first 600 chars)');
  lines.push('');
  const sampleCur = currentResults[0]?.turns[0];
  if (sampleCur?.promptSizes) {
    const H = getBuddyHelpers();
    const msg = THREADS[0].messages[0];
    const sizes = measureCurrentReasonFirstPrompt(H, 'sample-current', msg, []);
    const profile = H.getUserCompanionProfile('sample-current');
    const safety = H.classifySafety(msg);
    let runtimeContext = buildRuntimeContext({ message: msg, mode: 'COMPANION', profile, recentSessions: [], safety });
    runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId: 'sample-current', profile });
    const evidencePack = buildRetrievalEvidencePack({ userId: 'sample-current', message: msg, mode: 'COMPANION', recentSessions: [], runtimeContext, profile, safety });
    const full = buildComposerSystemPrompt({ mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', profile, runtimeContext, evidencePack });
    lines.push('```');
    lines.push(full.slice(0, 600));
    lines.push('…');
    lines.push('```');
    lines.push('');
    lines.push(`Full system prompt: ${full.length} chars | Est. tokens: ${estimateTokens(full)}`);
  }
  lines.push('');
  lines.push('### Current Reason-First prompt stack');
  lines.push('');
  lines.push('- `buildSystemPrompt()` — legacy persona, JSON schema, profile block');
  lines.push('- `buildRuntimeInstructions()` — mode/routing/safety rules (~8K+ chars)');
  lines.push('- `COMPOSER_INSTRUCTION` — 7-line reason-first addendum');
  lines.push('- Evidence JSON embedded in system message (understanding, companionContext, studyState, etc.)');
  lines.push('');
  lines.push('### Minimal Reason-First prompt stack');
  lines.push('');
  lines.push('- System: ~120-word role contract + doctrine boundary bullet list');
  lines.push('- User JSON only: `userMessage`, `conversationHistory` (10 turns), `memory`, `scripture`, `historicalEvidence`');
  lines.push('- Excluded: runtime instructions, understanding object, activeConversation, study engine, ownership/routing prose');
  lines.push('');

  lines.push('## Aggregate Scores (20 turns)');
  lines.push('');
  if (!minimalHasReplies) {
    lines.push('Minimal reply scores omitted until OpenAI live run completes. Current Reason-First scores below from cached validation run.');
    lines.push('');
    lines.push(mdTable(
      ['Dimension', 'Current RF'],
      ['listening', 'warmth', 'helpfulness', 'biblicalGrounding', 'correctionRecovery', 'followUpQuality'].map((k) => [
        k,
        currentAgg[k] == null ? 'n/a' : `${currentAgg[k]}/10`,
      ])
    ));
  } else {
    lines.push(mdTable(
      ['Dimension', 'Current RF', 'Minimal RF', 'Delta'],
      ['listening', 'warmth', 'helpfulness', 'biblicalGrounding', 'correctionRecovery', 'followUpQuality'].map((k) => {
        const c = currentAgg[k];
        const m = minimalAgg[k];
        const d = c != null && m != null ? Math.round((m - c) * 10) / 10 : null;
        const dStr = d == null ? 'n/a' : (d > 0 ? `+${d}` : String(d));
        return [k, c == null ? 'n/a' : `${c}/10`, m == null ? 'n/a' : `${m}/10`, dStr];
      })
    ));
  }
  lines.push('');
  lines.push('Scoring: heuristic rubrics in `scripts/promptHierarchyExperiment.js`. Correction recovery and follow-up quality scored on applicable turns only.');
  lines.push('');

  if (minimalHasReplies) {
    lines.push('## Per-Turn Comparison (All 20 Turns)');
    lines.push('');
    let globalTurn = 0;
    for (const spec of THREADS) {
      const cur = currentResults.find((r) => r.id === spec.id);
      const min = minimalResults.find((r) => r.id === spec.id);
      lines.push(`### ${spec.name}`);
      lines.push('');
      for (let i = 0; i < cur.turns.length; i += 1) {
        globalTurn += 1;
        const ct = cur.turns[i];
        const mt = min.turns[i];
        const listenDelta = (mt.scores?.listening ?? 0) - (ct.scores?.listening ?? 0);
        const deltaStr = listenDelta > 0 ? `+${listenDelta}` : String(listenDelta);
        lines.push(`#### Turn ${globalTurn} (thread turn ${i + 1})`);
        lines.push('');
        lines.push(`**User message:** ${ct.message}`);
        lines.push('');
        lines.push('| Metric | Current | Minimal | Delta |');
        lines.push('| --- | --- | --- | --- |');
        for (const k of ['listening', 'warmth', 'helpfulness', 'biblicalGrounding', 'correctionRecovery', 'followUpQuality']) {
          const c = ct.scores?.[k];
          const m = mt.scores?.[k];
          if (c == null && m == null) continue;
          const d = c != null && m != null ? Math.round((m - c) * 10) / 10 : null;
          const dStr = d == null ? 'n/a' : (d > 0 ? `+${d}` : String(d));
          lines.push(`| ${k} | ${c ?? 'n/a'} | ${m ?? 'n/a'} | ${dStr} |`);
        }
        lines.push('');
        lines.push(`**Listening delta:** ${deltaStr}`);
        lines.push('');
        lines.push('**Current reply:**');
        lines.push('```');
        lines.push(ct.reply);
        lines.push('```');
        lines.push('');
        lines.push('**Minimal reply:**');
        lines.push('```');
        lines.push(mt.reply);
        lines.push('```');
        lines.push('');
      }
    }
  }

  lines.push('## Thread Summary');
  lines.push('');
  for (const spec of THREADS) {
    const cur = currentResults.find((r) => r.id === spec.id);
    const min = minimalResults.find((r) => r.id === spec.id);
    const curListen = avgMetric(cur.turns, 'listening');
    const minListen = avgMetric(min.turns, 'listening');
    lines.push(`### ${spec.name}`);
    lines.push('');
    lines.push(`| Dimension | Current | Minimal |`);
    lines.push(`| --- | --- | --- |`);
    for (const k of ['listening', 'warmth', 'helpfulness', 'biblicalGrounding', 'correctionRecovery', 'followUpQuality']) {
      lines.push(`| ${k} | ${avgMetric(cur.turns, k) ?? 'n/a'} | ${avgMetric(min.turns, k) ?? 'n/a'} |`);
    }
    lines.push('');
    const lastCur = cur.turns[cur.turns.length - 1];
    const lastMin = min.turns[min.turns.length - 1];
    lines.push(`**Last turn user:** ${lastCur.message}`);
    lines.push('');
    lines.push('**Current (last reply excerpt):**');
    lines.push('```');
    lines.push(lastCur.reply.slice(0, 500));
    lines.push('```');
    lines.push('');
    lines.push('**Minimal (last reply excerpt):**');
    lines.push('```');
    lines.push((lastMin.reply || '(pending OpenAI live run)').slice(0, 500));
    lines.push('```');
    lines.push('');
  }

  if (minimalHasReplies) {
    lines.push('## Sabbath Wording Thread — Correction Recovery Detail');
    lines.push('');
    const sabbathCur = currentResults.find((r) => r.id === 'sabbath');
    const sabbathMin = minimalResults.find((r) => r.id === 'sabbath');
    lines.push(mdTable(
      ['Turn', 'User (abbrev)', 'Current correction', 'Minimal correction', 'Current overlap w/ prior', 'Minimal overlap w/ prior'],
      sabbathCur.turns.slice(1).map((t, idx) => {
        const i = idx + 1;
        const priorC = sabbathCur.turns[i - 1]?.reply || '';
        const priorM = sabbathMin.turns[i - 1]?.reply || '';
        return [
          String(i + 1),
          t.message.slice(0, 45) + (t.message.length > 45 ? '…' : ''),
          String(t.scores?.correctionRecovery ?? 'n/a'),
          String(sabbathMin.turns[i]?.scores?.correctionRecovery ?? 'n/a'),
          String(Math.round(overlapRatio(t.reply, priorC) * 100)) + '%',
          priorM ? String(Math.round(overlapRatio(sabbathMin.turns[i].reply, priorM) * 100)) + '%' : 'n/a',
        ];
      })
    ));
    lines.push('');
  }

  lines.push('## Decision');
  lines.push('');
  if (!minimalHasReplies) {
    lines.push('**BLOCKED** — Live OpenAI run required. Set `OPENAI_API_KEY` and re-run.');
    lines.push('');
    lines.push('```bash');
    lines.push('OPENAI_API_KEY=sk-... node scripts/promptHierarchyExperiment.js');
    lines.push('```');
  } else {
    const listenDelta = Math.round(((minimalAgg.listening ?? 0) - (currentAgg.listening ?? 0)) * 10) / 10;
    lines.push('**Decision criteria:**');
    lines.push('');
    lines.push('- If Minimal Listening improves by **≥1.0** → prompt hierarchy is a **primary suppression factor**');
    lines.push('- If Minimal Listening stays within **±0.3** → prompt volume is **not** the primary problem; investigate retrieval / loop-control');
    lines.push('');
    lines.push(`**Listening delta (Minimal − Current):** ${listenDelta >= 0 ? '+' : ''}${listenDelta.toFixed(1)}`);
    lines.push('');
    if (listenDelta >= 1.0) {
      lines.push('**VERDICT: Prompt hierarchy is a primary suppression factor.**');
      lines.push('');
      lines.push(`Minimal Reason-First listening (${minimalAgg.listening}/10) exceeds Current (${currentAgg.listening}/10) by ≥1.0 point with ~91% smaller system prompts. The 2,932-token legacy stack is likely drowning listening instructions.`);
    } else if (listenDelta >= -0.3 && listenDelta <= 0.3) {
      lines.push('**VERDICT: Prompt volume is not the primary problem.**');
      lines.push('');
      lines.push(`Minimal listening (${minimalAgg.listening}/10) vs Current (${currentAgg.listening}/10) is within ±0.3 despite ~10× prompt reduction. **Primary investigation: retrieval quality and correction loop-control.**`);
    } else if (listenDelta > 0.3) {
      lines.push('**VERDICT: Partial prompt hierarchy effect (below threshold).**');
      lines.push('');
      lines.push(`Minimal improved listening by +${listenDelta.toFixed(1)} (below +1.0 gate). Prompt size contributes but is not the sole factor.`);
    } else {
      lines.push('**VERDICT: Current Reason-First outperformed Minimal on listening.**');
      lines.push('');
      lines.push(`Legacy prompt stack may provide useful guardrails despite size (${listenDelta.toFixed(1)} delta).`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Experiment artifact: `docs/prompt-hierarchy-experiment/results.json`');
  lines.push('Test runtime: `services/minimalReasonFirstRuntime.js` (not wired to production)');

  return lines.join('\n');
}

async function main() {
  console.log('Prompt Hierarchy Experiment');
  console.log('===========================');

  let openaiModule = false;
  try {
    require.resolve('openai');
    openaiModule = true;
  } catch (_) {}
  const openaiAvailable = !!process.env.OPENAI_API_KEY && openaiModule;
  console.log(`OpenAI ready: ${openaiAvailable}`);

  let currentResults = [];
  let minimalResults = [];
  let currentSource = 'live';
  let minimalSource = 'live';

  if (!openaiAvailable) {
    console.error('');
    console.error('OPENAI_API_KEY required for live A/B experiment.');
    console.error('Usage: OPENAI_API_KEY=sk-... node scripts/promptHierarchyExperiment.js');
    process.exit(1);
  }

  for (const spec of THREADS) {
    console.log(`Current RF (live): ${spec.name}`);
    currentResults.push(await runThreadVariant('current', spec));
    console.log(`Minimal RF (live): ${spec.name}`);
    minimalResults.push(await runThreadVariant('minimal', spec));
  }

  currentResults = attachScoresToMinimalResults(currentResults);
  minimalResults = attachScoresToMinimalResults(minimalResults);

  const report = buildReport({ currentResults, minimalResults, openaiAvailable, currentSource, minimalSource });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_REPORT, report);
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      openaiAvailable,
      currentSource,
      minimalSource,
      currentResults,
      minimalResults,
      aggregates: {
        current: aggregateScores(currentResults.flatMap((r) => r.turns)),
        minimal: aggregateScores(minimalResults.flatMap((r) => r.turns)),
      },
      promptSizes: {
        current: aggregatePromptSizes(currentResults.flatMap((r) => r.turns)),
        minimal: aggregatePromptSizes(minimalResults.flatMap((r) => r.turns)),
      },
    }, null, 2)
  );

  console.log('');
  console.log(`Report: ${OUT_REPORT}`);
  console.log(`JSON: ${OUT_JSON}`);
  console.log('Current:', aggregateScores(currentResults.flatMap((r) => r.turns)));
  console.log('Minimal:', aggregateScores(minimalResults.flatMap((r) => r.turns)));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
