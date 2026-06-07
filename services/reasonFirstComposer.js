/**
 * OpenAI primary composer for reason-first runtime.
 */

const openai = require('./openaiClient');
const { buildSystemPrompt, safeJsonParse, normalizeStructured } = require('./buddyBrain');
const { buildRuntimeInstructions } = require('./runtimeOrchestrator');
const { validateReasonFirstReply } = require('./doctrineBoundaryValidator');
const { buildListeningComposerSignals } = require('./listeningSpecificityValidator');
const { polishCompanionReply } = require('./companionReplyPolish');
const { sanitizeDoctrineResponse } = require('./runtimeResponseSanitizer');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');
const {
  buildGoldenExamplesAppendix,
  isGoldenExamplesEnabled,
  selectGoldenExamplesForTurn,
} = require('./goldenCompanionExamples');
const { extractEmotionalCenter, isEcpEnabled } = require('./emotionalCenter');
const { validateEmotionalCenter } = require('./emotionalCenterValidator');
const { detectDangerousFallbackSpeaker } = require('./coreResponseGuards');

const SPECIFICITY_HINT =
  'Prefer specific details from the thread over general summaries. Use the user\'s wording where natural — not as a fixed opening template.';

/** Reason-first only — overrides legacy companion lines in buildSystemPrompt (buddyBrain unchanged for legacy). */
const LEGACY_REFLECT_LINE =
  "Reflect the user's actual situation in one sentence before advising.";
const PERSON_FIRST_REFLECT_LINE =
  "Reflect the user's situation using one concrete user detail whenever one is available.";
const LEGACY_COMFORT_LINE =
  'If the user seems overwhelmed, comfort first and keep Scripture light unless they ask for more.';
const PERSON_FIRST_COMFORT_LINE =
  'When offering comfort, anchor it to a concrete user detail whenever one is available.';

function applyPersonFirstCompanionHierarchy(systemPrompt = '') {
  return String(systemPrompt)
    .replace(LEGACY_REFLECT_LINE, PERSON_FIRST_REFLECT_LINE)
    .replace(LEGACY_COMFORT_LINE, PERSON_FIRST_COMFORT_LINE);
}

const COMPOSER_INSTRUCTION = `
Answer the user's latest message. Choose the right kind of response — not a complete mini-essay every turn.
Listen first when the user is sharing pain or uncertainty; answer directly when they ask a clear question or correction.
Use Scripture naturally when it helps; do not stack multiple verses mechanically.
Do not teach Sunday as biblical Sabbath, heaven at death, law abolished, dietary law abolished,
or man-made tradition as biblical command. History may explain practice but may not override Scripture.
Do not paste retrieved evidence verbatim. Do not add unsolicited study prompts.
${SPECIFICITY_HINT}
`.trim();

const COMPANION_TONE_INSTRUCTION = `
COMPANION TONE (prompt guidance only — you still author the final reply):
- Listen first; reflect the user's burden or question briefly before teaching.
- Stay warm and natural — not generic worldly advice, not a cold Q&A bot.
- Bring Scripture gently when it helps; do not stack verses mechanically.
- Avoid therapy claims, diagnosis labels, or stock empathy openers.
- When the user shares pain, acknowledge it in one concrete line, then Scripture.
`.trim();

const CORE_RESTORATION_INSTRUCTION = `
CORE RESTORATION (required):
- You author the final reply. Evidence is facts only — never paste "establishes the matter / confirms it alongside Scripture" triplet blocks.
- Answer line upon line, precept upon precept, from Scripture in the evidence pack. Genesis-to-Revelation when teaching doctrine.
- Answer the user's exact question first (HOW vs WHAT vs historical WHY).
- Do not open with prayer unless the user asked to pray or used clear prayer language.
- Do not use health-template language ("I'm not a doctor", "flaring up again") unless the user asked a medical/body question.
- History is secondary: only use history evidence when the user asked how practice changed (Constantine, Rome, Sunday shift).
- For practical Sabbath questions (how to keep holy), teach obedience from Scripture — not Sunday-change history.
- For yes/no questions (e.g. pork), answer yes or no in the first sentence, then Scripture support.
- Never open with "You've been studying…" or study continuation — those are forbidden as the answer body.
- Homework and correction turns: answer the exact question; do not redirect to study paths.
- For "how many" questions: state the count or biblical answer in the first sentence.
- For "can you search the Bible": answer honestly about Scripture evidence retrieval (not internet search).
- Approved Evidence Cards are frozen doctrine baseline — teach from them; never paste bibleFirstConclusion verbatim; discovery reinforcement is admin-review only.
- Use KJV references when citing Scripture; do not quote NIV/ESV/NLT-style wording.
- Heavens/kingdom: distinguish layered heavens (Gen 1); Paul's third heaven (2 Cor 12:2) is his vision — do not teach believers go to third heaven without proof.
- Kingdom hope: Matthew 6:10 on earth; Christ comes again (John 14:3, Acts 1:11); New Jerusalem comes down (Rev 21:1-3).
`.trim();

const ECP_INSTRUCTION = `
EMOTIONAL CENTER PRESERVATION (required when emotionalCenter is present in the user payload):
- The first meaningful thought must address emotionalCenter before topic teaching, scripture-first structure, advice, or generic comfort.
- Carry the same center through the entire first paragraph — do not name it once then immediately switch into lecture mode.
- You may witness, comfort, repair, answer, or guide — but do not bypass the emotional center.
- Do not require exact wording, "you mentioned", "it sounds like", forced questions, or stock empathy phrases.
- Use supportingDetail and detailCandidates only as anchors, in natural language.
`.trim();

function buildEcpComposerInstruction() {
  return `${COMPOSER_INSTRUCTION}\n\n${ECP_INSTRUCTION}`;
}

function lightPolish(reply = '') {
  return polishCompanionReply(sanitizeDoctrineResponse(stripInternalRuntimeLabels(String(reply || ''))));
}

function buildComposerSystemPrompt({
  mode,
  personaKey,
  profile,
  runtimeContext,
  evidencePack,
  userMessage = '',
  coreRestoration = false,
}) {
  const runtimeInstructions = buildRuntimeInstructions(runtimeContext);
  const base = applyPersonFirstCompanionHierarchy(
    buildSystemPrompt({ mode, personaKey, profile, runtimeInstructions })
  );
  const goldenBlock = buildGoldenExamplesAppendix({ message: userMessage });
  const evidenceSlice = {
    understanding: evidencePack.understanding,
    activeConversation: evidencePack.activeConversation,
    threadLocal: evidencePack.threadLocal,
    correctionLedger: evidencePack.correctionLedger,
    companionThreadContext: evidencePack.companionThreadContext,
    memory: evidencePack.memory,
    scripture: evidencePack.scripture,
    history: evidencePack.history,
    studyState: evidencePack.studyState,
    companionContext: evidencePack.companionContext,
    doctrine: evidencePack.doctrine,
    evidenceCards: evidencePack.evidenceCards,
    discoveryReinforcement: evidencePack.discoveryReinforcement,
    answerGuidance: evidencePack.answerGuidance,
    currentIntent: evidencePack.currentIntent,
    intentComposerGuidance: evidencePack.intentComposerGuidance,
    historyAllowed: evidencePack.historyAllowed,
  };

  const goldenSection = goldenBlock && !coreRestoration ? `${goldenBlock}\n\n` : '';
  let composerBlock = isEcpEnabled() && !coreRestoration ? buildEcpComposerInstruction() : COMPOSER_INSTRUCTION;
  if (coreRestoration) {
    composerBlock = `${COMPOSER_INSTRUCTION}\n\n${CORE_RESTORATION_INSTRUCTION}\n\n${COMPANION_TONE_INSTRUCTION}`;
  }
  return `${base}\n\n${goldenSection}${composerBlock}\n\nEvidence pack (facts only):\n${JSON.stringify(
    evidenceSlice,
    null,
    2
  )}`;
}

async function callOpenAI({ systemPrompt, userPayload, temperature = 0.72 }) {
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
    const raw = completion?.choices?.[0]?.message?.content || '';
    return { ok: true, raw, error: null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e), raw: null };
  }
}

/**
 * Compose reply via OpenAI with validation and optional regen.
 */
async function composeReasonFirstReply({
  userId,
  mode,
  personaKey,
  message,
  safety,
  profile,
  runtimeContext,
  evidencePack,
  maxAttempts = 2,
  coreRestoration = false,
  regenInstruction = null,
} = {}) {
  const attemptCap = coreRestoration ? Math.min(maxAttempts, regenInstruction ? 1 : 2) : maxAttempts;
  const historyBlock = (evidencePack.conversationHistory || [])
    .map((t) => `Turn ${t.turn} user: ${t.user}\nTurn ${t.turn} assistant: ${t.assistant}`)
    .join('\n\n');

  const ledger = evidencePack.correctionLedger || {};
  const listeningSignals = buildListeningComposerSignals(evidencePack, message);
  const emotionalCenter = extractEmotionalCenter(evidencePack, message);
  const userPayload = {
    userMessage: message,
    conversationHistory: historyBlock || 'none',
    activeConversation: evidencePack.activeConversation,
    threadLocal: evidencePack.threadLocal,
    emotionalCenter: emotionalCenter.emotionalCenter ? emotionalCenter : null,
    detailCandidates: listeningSignals.detailCandidates,
    listeningGuidance: listeningSignals.listeningGuidance,
    correctionLedger: ledger.active
      ? {
          priorAssistantQuote: ledger.priorAssistantQuote,
          correctedIntent: ledger.correctedIntent,
          forbiddenRepeatTopics: ledger.forbiddenRepeatTopics,
          correctionCount: ledger.correctionCount,
          requireDirectAnswerFirst: ledger.requireDirectAnswerFirst,
        }
      : null,
    companionThreadContext: evidencePack.companionThreadContext,
    evidence: {
      memory: evidencePack.memory,
      scripture: evidencePack.scripture,
      history: evidencePack.history,
      doctrine: evidencePack.doctrine,
      evidenceCards: evidencePack.evidenceCards,
      discoveryReinforcement: evidencePack.discoveryReinforcement,
      understanding: evidencePack.understanding,
      companionContext: evidencePack.companionContext,
      answerGuidance: evidencePack.answerGuidance,
    },
    regenInstruction: regenInstruction || null,
    intentComposerGuidance: evidencePack.intentComposerGuidance || null,
    currentIntent: evidencePack.currentIntent || null,
    ecpEnabled: isEcpEnabled(),
  };

  const goldenExamples = isGoldenExamplesEnabled()
    ? selectGoldenExamplesForTurn({ message, limit: 2 })
    : [];
  userPayload.goldenExamplesEnabled = isGoldenExamplesEnabled();
  userPayload.goldenExampleIds = goldenExamples.map((e) => e.id);

  const systemPrompt = buildComposerSystemPrompt({
    mode,
    personaKey,
    profile,
    runtimeContext,
    evidencePack,
    userMessage: message,
    coreRestoration,
  });

  let lastValidation = null;
  let ecValidation = { passed: true, skipped: true };
  let structured = null;
  let attemptsUsed = 0;

  for (let attempt = 0; attempt < attemptCap; attempt += 1) {
    attemptsUsed = attempt + 1;
    const result = await callOpenAI({
      systemPrompt,
      userPayload: { ...userPayload, regenInstruction: userPayload.regenInstruction },
      temperature: attempt > 0 ? 0.55 : 0.72,
    });

    if (!result.ok) {
      return {
        structured: {
          reply: '',
          mode: 'companion',
          confidence: 'low',
          memory_used: false,
          safety_level: safety?.level || 'standard',
          runtime: { masterRoute: 'core_openai_api_error', openaiCalled: false },
        },
        openaiCalled: false,
        apiError: result.error,
        validation: { passed: false, doctrineValidationResult: 'skipped', issues: [result.error] },
        attempts: attemptsUsed,
      };
    }

    const parsed = safeJsonParse(result.raw) || { reply: result.raw, confidence: 'low' };
    structured = normalizeStructured(
      parsed,
      { reply: parsed.reply || result.raw, safety_level: safety?.level || 'standard' },
      safety,
      runtimeContext,
      {}
    );

    const packForValidation = {
      ...evidencePack,
      userMessage: message,
    };
    lastValidation = validateReasonFirstReply({
      reply: structured.reply,
      evidencePack: packForValidation,
      historyAllowed: !!evidencePack.historyAllowed,
    });

    ecValidation = { passed: true, skipped: true, metrics: null };
    if (isEcpEnabled() && emotionalCenter.emotionalCenter) {
      ecValidation = validateEmotionalCenter({
        reply: structured.reply,
        emotionalCenter,
      });
    }

    const danger = detectDangerousFallbackSpeaker(structured.reply);
    const composePassed = lastValidation.passed && ecValidation.passed && !danger.detected;
    if (composePassed) break;

    if (danger.detected) {
      userPayload.regenInstruction =
        'Remove study-loop phrases ("You\'ve been studying", "continue that study") and witness triplet blocks. Answer the user\'s exact question first from evidence.';
    } else {
      userPayload.regenInstruction =
        ecValidation.regenHint ||
        lastValidation.regenHint ||
        (coreRestoration
          ? 'Answer the exact user question first. Use answerGuidance in the payload.'
          : 'Address the user emotional center in the opening and first paragraph.');
    }
  }

  structured.reply = lightPolish(structured.reply);
  structured.memory_used = (evidencePack.memory?.snippets?.length || 0) > 0 || (evidencePack.memory?.hits?.length || 0) > 0;
  let ecMetrics = null;
  if (isEcpEnabled() && emotionalCenter.emotionalCenter) {
    const { evaluateEmotionalCenterPresence } = require('./emotionalCenterValidator');
    ecMetrics = evaluateEmotionalCenterPresence({
      reply: structured.reply,
      emotionalCenter,
    });
  }

  let masterRoute = 'reason_first_openai';
  if (isEcpEnabled()) masterRoute = 'reason_first_openai_ecp';
  else if (isGoldenExamplesEnabled()) masterRoute = 'reason_first_openai_golden';

  structured.runtime = {
    ...(structured.runtime || {}),
    masterRoute,
    openaiCalled: true,
    composerAttempts: attemptsUsed,
    ecpEnabled: isEcpEnabled(),
    emotionalCenter,
    ecPreservationMetrics: ecMetrics,
    goldenExamplesEnabled: isGoldenExamplesEnabled(),
    goldenExampleIds: goldenExamples.map((e) => e.id),
    validation: lastValidation,
    ecValidation: isEcpEnabled() ? ecValidation : undefined,
    listeningRecommendations: lastValidation?.listening?.recommendationMessages || [],
  };

  return {
    structured,
    openaiCalled: true,
    validation: lastValidation,
    attempts: attemptsUsed,
    apiError: null,
  };
}

module.exports = {
  COMPOSER_INSTRUCTION,
  ECP_INSTRUCTION,
  buildEcpComposerInstruction,
  composeReasonFirstReply,
  lightPolish,
  buildComposerSystemPrompt,
  applyPersonFirstCompanionHierarchy,
  PERSON_FIRST_REFLECT_LINE,
  PERSON_FIRST_COMFORT_LINE,
  isGoldenExamplesEnabled,
  isEcpEnabled,
};
