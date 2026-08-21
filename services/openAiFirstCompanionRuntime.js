/**
 * Core BibleBuddy path — OpenAI authors every normal turn.
 * Evidence only; no template responders or study-loop fallback speakers.
 */

const { buildRuntimeContext, scoreCompanionQuality } = require('./runtimeOrchestrator');
const { buildRetrievalEvidencePack } = require('./retrievalEvidencePack');
const { composeReasonFirstReply } = require('./reasonFirstComposer');
const { validateReasonFirstReply } = require('./doctrineBoundaryValidator');
const { polishCompanionReply } = require('./companionReplyPolish');
const { sanitizeDoctrineResponse } = require('./runtimeResponseSanitizer');
const { stripInternalRuntimeLabels } = require('./runtimeLabelStripper');
const {
  isCoreRestorationDebugEnabled,
  buildCoreRestorationDebug,
} = require('./coreRestorationDebug');
const {
  detectDangerousFallbackSpeaker,
  stripDangerousFallbackSpeaker,
  buildConnectionErrorReply,
} = require('./coreResponseGuards');
const { validateOwnershipReply } = require('./ownershipAntiOverrideGuard');
const { evaluateDirectness } = require('./directnessGuard');
const { detectForbiddenProse, stripForbiddenProse } = require('./forbiddenProseGuard');
const { validateBibleOnlyAuthority } = require('./bibleOnlyAuthorityValidator');
const { logRequestMemory } = require('./requestMemoryLogger');
const { normalizeClaims } = require('./claimNormalizer');
const { validateClaimToScripture, applyClaimDegradation } = require('./claimToScriptureValidator');
const { formatDirectDoctrineReply } = require('./directAnswerFormatter');
const { buildDoctrineAnswerTrace, writeDoctrineAnswerTrace } = require('./doctrineAnswerTrace');
const { attachDoctrineStrictContract } = require('./doctrineAuthorityContract');
const { validateDoctrineStrictReply } = require('./doctrineStrictValidator');
const { buildDoctrineStrictSafeAnswer } = require('./doctrineStrictSafeAnswer');
const { logDoctrineStrictFailure } = require('./phase4c1RuntimeDiagnostics');
const {
  syncUsedWitnessesFromReply,
} = require('./doctrineWitnessInventory');
const { setActiveDoctrineConversation, recordUserTurn } = require('./doctrineConversationState');
const { containsMemoryDenial, buildDoctrineMemoryRecallReply } = require('./doctrineLivePathHandlers');
const {
  planCompanionDoctrineRouting,
  applyDoctrineRoutingSideEffects,
  buildCompanionLaneFallbackReply,
  buildRoutingContext,
} = require('./companionDoctrineRouter');
const {
  recordUserCorrection,
  getUserAnswerPreferences,
} = require('./userCorrectionMemory');
const { runBibleCompanionOrchestrator } = require('./bibleCompanionOrchestrator');

/**
 * BIE Phase 1A — Runtime adapter (smallest wiring).
 * Builds a Verified Lesson Packet from the live evidence pack and attaches it
 * nested on evidencePack for composer/OpenAI payload survival.
 * Does not modify Lesson Engine / Study Chain / schema / governance — only calls them.
 */
let _topicWitnessRegistryCache = null;
function pickOriginalLanguageReference(message = '', refs = []) {
  const msg = String(message || '');
  const verseInMessage = msg.match(
    /\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Matthew|Mark|Luke|John|Acts|Romans|Isaiah|Jeremiah|Ezekiel|Daniel|Zechariah|Psalm|Psalms|Revelation|1\s*Corinthians|2\s*Corinthians|Hebrews|1\s*Thessalonians|Revelation)\s+\d+:\d+(?:-\d+)?/i,
  );
  if (verseInMessage) return verseInMessage[0].replace(/\s+/g, ' ').trim();
  // Chapter-only asks (e.g. Leviticus 23 forever) — prefer a representative verse in that chapter
  const chapterInMessage = msg.match(/\b(Leviticus)\s+(23)\b/i);
  if (chapterInMessage) return 'Leviticus 23:21';
  for (const ref of refs) {
    if (/:\d+/.test(ref) && !/:\d+-\d+/.test(ref) && !/\d+:\d+-\d+/.test(ref)) return ref;
    const m = String(ref).match(/^(.+?\d+:\d+)/);
    if (m) return m[1];
  }
  return refs[0] || null;
}

async function attachVerifiedLessonPacketToEvidencePack(evidencePack, message = '') {
  if (!evidencePack || typeof evidencePack !== 'object') return evidencePack;
  if (evidencePack.verifiedLessonPacket) return evidencePack;
  try {
    const { buildVerifiedLessonPacket, assembleLessonFromStudyChain } = require('./lessonEngine');
    const { evaluateStudyChain } = require('./studyChainEvaluation');
    const { buildTopicWitnessRegistry } = require('./topicWitnessRegistry');
    const { RULES_DECISION } = require('./iogIcojGovernedIngestion');

    const topic = evidencePack.effectiveTopic || evidencePack.topic || 'unknown';
    const refs = [];
    for (const r of evidencePack.scripture?.references || []) {
      const ref =
        typeof r === 'string'
          ? r
          : r.reference || r.normalizedReference || r.displayReference || null;
      if (ref) refs.push(String(ref));
    }
    if (!_topicWitnessRegistryCache) _topicWitnessRegistryCache = buildTopicWitnessRegistry();

    const chain = evaluateStudyChain(
      {
        corpus: 'RuntimeAdapter',
        sourceDocument: String(topic),
        sourceLocation: 'openAiFirstCompanionRuntime.attachVerifiedLessonPacketToEvidencePack',
        sourceTopic: String(topic),
        scriptureReferencesSourceOrder: refs.slice(0, 40),
        originalEvaluatorDecisions: [
          { matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW },
        ],
      },
      { registry: _topicWitnessRegistryCache },
    );
    const lesson = assembleLessonFromStudyChain(chain);
    const packet = buildVerifiedLessonPacket(lesson, message || evidencePack.userMessage || null);
    packet.openAiMayApproveEvidence = false;
    packet.openAiMayDetermineDoctrine = false;
    packet.productionActivation = false;
    packet.persist = false;

    // BIE Phase 1C — fill existing languageEvidence field when OL-relevant (no schema change)
    try {
      const { isOriginalLanguageRequest } = require('./originalLanguageResponseFormatter');
      const { getPassageStudy } = require('./originalLanguageProvider');
      const olAsk =
        isOriginalLanguageRequest(message || evidencePack.userMessage || '') ||
        (evidencePack.semanticUnderstanding?.requestedEvidence || []).includes('original_language');
      const studyRef = pickOriginalLanguageReference(message || evidencePack.userMessage || '', refs);
      if (olAsk && studyRef) {
        const study = await getPassageStudy({ reference: studyRef, baselineTranslation: 'KJV' });
        if (study && study.ok) {
          const bounded = {
            reference: study.reference,
            sourceLanguage: study.sourceLanguage,
            kjvText: study.kjvText || null,
            originalText: study.originalText || null,
            literalRendering: study.literalRendering || null,
            tokens: (study.tokens || []).slice(0, 24).map((t) => ({
              surface: t.surface,
              lemma: t.lemma,
              morphology: t.morphology,
              strongs: t.strongs,
              literalGloss: t.literalGloss,
              transliteration: t.transliteration,
            })),
            provenance: study.provenance || null,
            limitations: study.limitations || [],
            authorityNote:
              'Original-language support is bounded and secondary to full Scripture context; it does not silently override doctrine.',
          };
          packet.languageEvidence = [bounded];
          packet.languageStatus = 'ATTACHED_BOUNDED';
          evidencePack.languageEvidence = [bounded];
          evidencePack.originalLanguageStudy = bounded;
        } else if (study) {
          evidencePack.originalLanguageStudy = {
            reference: study.reference,
            ok: false,
            limitations: study.limitations || [study.error || 'study_unavailable'],
          };
        }
      }
    } catch (_) {
      /* OL attach is best-effort */
    }

    evidencePack.verifiedLessonPacket = packet;
    evidencePack.verifiedLessonPacketAttach = {
      attached: true,
      studyChainId: chain.studyChainId || null,
      lessonId: lesson.lessonId || null,
      passageRoleCount: (packet.passageRoles || []).length,
      scriptureBlockCount: (packet.scriptureBlocks || []).length,
      hierarchyPreserved: true,
      languageEvidenceAttached: Array.isArray(packet.languageEvidence) && packet.languageEvidence.length > 0,
    };
  } catch (err) {
    evidencePack.verifiedLessonPacket = null;
    evidencePack.verifiedLessonPacketAttach = {
      attached: false,
      error: String(err && err.message ? err.message : err),
    };
  }
  return evidencePack;
}

/**
 * Product Sprint D — user-visible structured Scripture study for EXPLICIT
 * study intents only. Reuses attached VLP/Study Chain; does not invent
 * Scripture; does not activate doctrine; protected routes stay higher priority.
 */
async function tryBuildStructuredStudyReply(evidencePack, message = '', userId = '') {
  const {
    detectExplicitStructuredStudyIntent,
    packetUsableForStructuredStudy,
    renderUserFacingStructuredStudy,
    enrichEvidencePackForStructuredStudy,
    humanizeStudyTheme,
  } = require('./lessonEngine');

  if (!detectExplicitStructuredStudyIntent(message)) {
    return null;
  }

  const need = detectHumanNeed(message);
  if (
    need === 'emotional_support' ||
    need === 'health_support' ||
    need === 'prayer' ||
    need === 'grief_comfort' ||
    need === 'anxiety_support' ||
    need === 'open_life' ||
    need === 'next_steps'
  ) {
    return null;
  }

  try {
    const { isExplicitHistoricalCausationAsk } = require('./historicalCausationAsk');
    if (isExplicitHistoricalCausationAsk(message)) return null;
  } catch (_) {
    /* historical detector optional */
  }

  // Enrich empty catalog packs with corpus-verified seed refs, then rebuild VLP.
  const enrich = enrichEvidencePackForStructuredStudy(evidencePack, message);
  if (enrich.enriched) {
    await attachVerifiedLessonPacketToEvidencePack(evidencePack, message);
  }

  const packet = evidencePack && evidencePack.verifiedLessonPacket;
  if (!packetUsableForStructuredStudy(packet)) {
    return {
      ok: false,
      fallback: true,
      reason: 'packet_not_usable',
      enrichReason: enrich.reason || null,
    };
  }

  // Mark activation only for this user-visible study turn (packet otherwise stays inactive).
  packet.productionActivation = true;
  packet.userFacingStructuredStudy = true;

  let preferShorter = false;
  if (userId) {
    try {
      const { getPins } = require('./explicitRememberPin');
      const pins = getPins(userId) || [];
      preferShorter = pins.some((p) => /\bshorter\b/i.test(String(p.text || '')) && /\bstud/i.test(String(p.text || '')));
    } catch (_) {
      preferShorter = false;
    }
  }

  const theme = humanizeStudyTheme(packet.topic?.normalizedTopic || enrich.topicKey || 'this topic');
  const reply = renderUserFacingStructuredStudy(
    {
      lessonSummary: packet.lesson?.lessonSummary,
      reflectionQuestions: preferShorter
        ? [
            `What do these passages say about ${theme}?`,
            'What would it look like to live this out this week?',
          ]
        : [
            `What do these passages say about ${theme}?`,
            'Which passage defines, commands, or clarifies the subject most clearly?',
            'What would it look like to live this out this week?',
          ],
      normalizedTopic: packet.topic?.normalizedTopic,
    },
    packet,
    message,
    { preferShorter },
  );

  const scripture = (packet.scriptureBlocks || [])
    .filter((b) => b && b.reference && b.text)
    .slice(0, 6)
    .map((b) => ({
      reference: b.displayReference || b.reference,
      text: b.text,
      translation: 'KJV',
    }));

  return {
    ok: true,
    reply,
    scripture,
    mode: 'study',
    confidence: 'high',
    memory_used: false,
    orb_state: 'speaking',
    safety_level: 'standard',
    runtime: {
      masterRoute: 'structured_scripture_study',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      structuredStudy: true,
      verifiedLessonPacketActivated: true,
      lessonId: packet.lesson?.lessonId || null,
      topic: packet.topic?.normalizedTopic || enrich.topicKey || null,
      studySeedUsed: !!enrich.enriched,
      companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
    },
  };
}

const { validateFinalityReply, stripFinalityViolations } = require('./doctrineFinalityMode');
const { applyDoctrineErrorFirewall, mapInternalErrorToUserMessage } = require('./doctrineErrorFirewall');
const { applyDoctrineFinalityPipeline } = require('./doctrineFinalityContract');
const { runStrictDoctrineGate, mustBlockOpenAi } = require('./strictDoctrineGate');
const { logPhase4eLivePathError } = require('./phase4eRuntimeDiagnostics');
const {
  logPhase4d1CircuitBreaker,
  logPhase4d1OpenAiTimeout,
} = require('./phase4d1RuntimeDiagnostics');
const { buildConversationAnchor } = require('./conversationAnchorEngine');
const { detectHumanNeed } = require('./humanNeedDetector');
const { getDoctrineConversationState } = require('./doctrineConversationState');
const { getRelationshipContext } = require('./relationshipMemoryEngine');
const { buildIdentityReply } = require('./companionIdentityEngine');
const { buildPrayerCompanionResponse } = require('./prayerCompanionEngine');
const { buildPracticalWisdomResponse } = require('./practicalWisdomEngine');
const { buildPresenceResponse } = require('./companionPresenceEngine');
const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const {
  buildCorrectionAckReply,
} = require('./singleCompanionContract');

const PROTECTED_COMPANION_NEEDS = new Set([
  'app_identity',
  'prayer',
  'practical_words_to_say',
  'memory_recall',
  'memory_update',
  'correction_repair',
  'emotional_support',
  'anxiety_support',
  'conflict_guidance',
  'temptation_boundary',
  'one_anchor_verse',
  'next_steps',
]);

function annotateLiveTruthReturn(structured, liveTruthTrace, selectedReturn, message) {
  if (liveTruthTrace) {
    structured.runtime = { ...(structured.runtime || {}), liveTruthTrace };
  }
  console.log(
    '[LIVE_TRUTH_RETURN]',
    JSON.stringify({
      message,
      selectedReturn,
      replyPreview: String(structured?.reply || '').slice(0, 200),
      route: structured?.runtime?.masterRoute || null,
      doctrineTopic: structured?.runtime?.doctrineTopic || null,
      humanNeed: liveTruthTrace?.orchestratorHumanNeed || null,
    }),
  );
  return structured;
}

function applyProtectedCompanionReroute(orchestratorResult, humanNeed, { userId, message, safety }) {
  const doctrineState = getDoctrineConversationState(userId);
  const relContext = getRelationshipContext({ userId });
  const mergedState = { ...doctrineState, ...relContext };
  const anchor = buildConversationAnchor({ userId, message, state: mergedState });
  const conceptMatch = detectSemanticConcept(message, mergedState);
  const stableConcept =
    mergedState.sessionMemory?.activeConcept ||
    mergedState.lastAnsweredConcept ||
    anchor.currentDoctrineConcept ||
    conceptMatch?.id;

  let reply = '';
  let scripture = [];
  let masterRoute = 'companion_protected_reroute';

  if (humanNeed === 'app_identity') {
    const identity = buildIdentityReply(message);
    reply = identity.reply;
    masterRoute = identity.masterRoute || 'app_identity';
  } else if (humanNeed === 'prayer') {
    const prayer = buildPrayerCompanionResponse({ message, anchor, userId });
    reply = prayer.reply;
    scripture = prayer.scripture || [];
    masterRoute = prayer.masterRoute || 'prayer_companion';
  } else if (
    humanNeed === 'practical_words_to_say' ||
    humanNeed === 'conflict_guidance' ||
    humanNeed === 'next_steps' ||
    humanNeed === 'one_anchor_verse'
  ) {
    const wisdom = buildPracticalWisdomResponse({
      message,
      anchor,
      state: mergedState,
      conceptId: stableConcept,
    });
    if (wisdom) {
      reply = wisdom.reply;
      scripture = wisdom.scripture || [];
      masterRoute = wisdom.masterRoute || 'practical_wisdom';
    }
  } else if (
    humanNeed === 'emotional_support' ||
    humanNeed === 'anxiety_support' ||
    humanNeed === 'temptation_boundary'
  ) {
    const presence = buildPresenceResponse({ message, anchor, state: mergedState });
    if (presence) {
      reply = presence.reply;
      scripture = presence.scripture || [];
      masterRoute = presence.masterRoute || 'companion_presence';
    }
  } else if (humanNeed === 'correction_repair') {
    const corr = buildCorrectionAckReply(userId, message);
    reply = corr.reply;
    scripture = corr.scripture || [];
    masterRoute = 'correction_repair';
  } else {
    const existing = orchestratorResult.ctx?.structured?.reply;
    if (existing && !/which book, topic, or passage/i.test(existing)) {
      orchestratorResult.dispatch = 'companion';
      orchestratorResult.ctx = { ...orchestratorResult.ctx, humanNeed };
      return orchestratorResult;
    }
  }

  if (!reply) {
    orchestratorResult.dispatch = 'companion';
    return orchestratorResult;
  }

  orchestratorResult.dispatch = 'companion';
  orchestratorResult.ctx = {
    ...orchestratorResult.ctx,
    humanNeed,
    route: masterRoute,
    structured: {
      reply,
      scripture,
      mode: 'companion',
      confidence: 'high',
      memory_used: true,
      safety_level: safety?.level || 'standard',
      admin_flags: ['phase5m4_protected_reroute', `protected_${humanNeed}`],
      runtime: {
        masterRoute,
        openAiCalled: false,
        orchestratorLane: humanNeed,
        phase5M4ProtectedReroute: true,
        doctrineTopic: null,
      },
    },
  };
  return orchestratorResult;
}

function buildDoctrineStrictRegenHint(validation = {}) {
  const parts = (validation.violations || []).map((v) => v.detail || v.code);
  return `DOCTRINE STRICT VALIDATION FAILED. Fix: ${parts.join('; ')}. Use only approved witnesses for doctrine. Do not use caution passages as proof. No forbidden balancing phrases. Yes/no first when required.`;
}

function mergeDoctrineStrictSafeStructured(structured, safe, evidencePack) {
  return {
    ...structured,
    ...safe,
    reply: polishFinalReply(safe.reply || safe.finalAnswer || structured.reply),
    scripture: safe.scriptureWitnesses || structured.scripture || [],
    admin_flags: [
      ...new Set([...(structured.admin_flags || []), 'doctrine_strict_safe_corpus', 'safe_corpus_fallback']),
    ],
    runtime: {
      ...(structured.runtime || {}),
      doctrineStrictSafeAnswer: true,
      doctrineStrictTopic: evidencePack.doctrineStrict?.strictTopic,
    },
  };
}

function polishFinalReply(reply = '', polishCtx = {}) {
  let text = stripInternalRuntimeLabels(String(reply || ''));
  const prefs = polishCtx.userPreferences || getUserAnswerPreferences(polishCtx.userId);
  text = formatDirectDoctrineReply(text, polishCtx.message || '', {
    topic: polishCtx.topic,
    scripture: polishCtx.scripture || [],
    userId: polishCtx.userId,
    userPreferences: prefs,
    polarity: polishCtx.polarity,
  });
  return polishCompanionReply(sanitizeDoctrineResponse(text));
}

/**
 * BIE Phase 1C — deterministic routes may consume already-attached packet/history
 * without changing doctrine conclusions (labeled historical appendix only).
 */
function appendGovernedHistoricalAppendix(reply, evidencePack) {
  const records = evidencePack?.history?.governedRecords || [];
  if (!evidencePack?.history?.included || !records.length) return String(reply || '');
  const text = String(reply || '');
  if (/Historical context \(governed/i.test(text)) return text;
  const lines = records.slice(0, 3).map(
    (r) =>
      `- ${r.title} (Source: ${r.sourceName}): ${r.summary} [${r.label || 'HISTORICAL_CONTEXT_NOT_SCRIPTURE'} — does not establish doctrine]`,
  );
  return `${text}\n\nHistorical context (governed, secondary to Scripture):\n${lines.join('\n')}`;
}

function attachPacketLineageToRuntime(out, evidencePack) {
  const packet = evidencePack?.verifiedLessonPacket || null;
  out.runtime = {
    ...(out.runtime || {}),
    verifiedLessonPacketAttached: !!packet,
    verifiedLessonPacketLessonId: packet?.lesson?.lessonId || null,
    verifiedLessonPacketPassageRoles: Array.isArray(packet?.passageRoles)
      ? packet.passageRoles.length
      : 0,
    governedHistoryCount: (evidencePack?.history?.governedRecords || []).length,
    languageEvidenceAttached: !!(
      packet?.languageEvidence?.length || evidencePack?.languageEvidence?.length
    ),
    approvedBookRelationshipCount: evidencePack?.approvedBookRelationships?.count || 0,
    iogIcojApprovedCrossRefCount: evidencePack?.approvedCrossReferences?.count || 0,
  };
  return out;
}

function returnBibleWideStructured(H, ctx) {
  const {
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    route,
    concept,
    evidencePack,
  } = ctx;

  recordUserTurn(userId, message, 'bible_wide');

  let out = structured;
  out.reply = appendGovernedHistoricalAppendix(out.reply, evidencePack);
  out.reply = polishFinalReply(out.reply, {
    message,
    topic: concept,
    scripture: out.scripture,
    userId,
    userPreferences: getUserAnswerPreferences(userId),
  });
  out.quality = scoreCompanionQuality({ message, reply: out.reply, runtimeContext });
  out.runtime = {
    ...(out.runtime || {}),
    masterRoute: route || out.runtime?.masterRoute || 'bible_wide_reasoning',
    openAiCalled: false,
    buddyRuntime: 'core_openai_first',
    bibleWideReasoning: true,
    bibleConcept: concept,
  };
  out = attachPacketLineageToRuntime(out, evidencePack);

  attachDebug(out, {
    runtimeUsed: 'core_openai_first',
    openaiCalled: false,
    finalAnswerAuthor: 'bible_wide_reasoning',
    fallbackUsed: false,
    templateUsed: false,
    responderUsed: false,
    routeUsed: route || 'bible_wide_reasoning',
    doctrineValidatorUsed: false,
    scriptureEvidenceUsed: !!(out.scripture?.length),
    activeTopicUsedAsContextOnly: false,
    currentIntent: runtimeContext?.intent || 'study',
    historyAllowed: true,
  });

  annotateLiveTruthReturn(out, ctx.liveTruthTrace, 'bible_wide', message);

  return H.finalizeBuddyResponse({
    structured: out,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
  });
}

function returnCompanionLaneStructured(H, ctx) {
  const {
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    route,
    routePlan,
  } = ctx;

  recordUserTurn(userId, message, 'companion');

  let out = structured;
  out.reply = polishFinalReply(out.reply, {
    message,
    scripture: out.scripture,
    userId,
    userPreferences: getUserAnswerPreferences(userId),
  });
  out.quality = scoreCompanionQuality({ message, reply: out.reply, runtimeContext });
  out.runtime = {
    ...(out.runtime || {}),
    masterRoute: route || 'companion_lane',
    openAiCalled: !!out.runtime?.openAiCalled,
    buddyRuntime: 'core_openai_first',
    companionLane: true,
    companionIntent: routePlan?.intent || 'companion_general',
    doctrineTopic: null,
  };

  attachDebug(out, {
    runtimeUsed: 'core_openai_first',
    openaiCalled: !!out.runtime?.openAiCalled,
    finalAnswerAuthor: out.runtime?.openAiCalled ? 'openai' : 'companion_release',
    fallbackUsed: false,
    templateUsed: false,
    responderUsed: !!out.runtime?.openAiCalled,
    routeUsed: route || 'companion_lane',
    doctrineValidatorUsed: false,
    scriptureEvidenceUsed: !!(out.scripture?.length),
    activeTopicUsedAsContextOnly: false,
    currentIntent: routePlan?.intent || runtimeContext?.intent || 'companion',
    historyAllowed: true,
  });

  annotateLiveTruthReturn(out, ctx.liveTruthTrace, 'companion', message);

  return H.finalizeBuddyResponse({
    structured: out,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
  });
}

function returnStrictDoctrineStructured(H, ctx) {
  const {
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    evidencePack,
    topic,
    route,
  } = ctx;

  recordUserTurn(userId, message, 'strict_doctrine');

  let out = structured;
  out.reply = appendGovernedHistoricalAppendix(out.reply, evidencePack);
  out.reply = polishFinalReply(out.reply, {
    message,
    topic,
    scripture: out.scripture,
    userId,
    userPreferences: getUserAnswerPreferences(userId),
  });
  out = applyDoctrineFinalityPipeline({
    structured: out,
    topic,
    userId,
    message,
    evidencePack,
  });
  out.quality = scoreCompanionQuality({ message, reply: out.reply, runtimeContext });
  out = attachPacketLineageToRuntime(out, evidencePack);

  attachDebug(out, {
    runtimeUsed: 'core_openai_first',
    openaiCalled: false,
    finalAnswerAuthor: route || out.runtime?.masterRoute || 'strict_doctrine_gate',
    fallbackUsed: false,
    templateUsed: false,
    responderUsed: false,
    routeUsed: route || out.runtime?.masterRoute || 'strict_doctrine_gate',
    doctrineValidatorUsed: true,
    scriptureEvidenceUsed: !!(out.scripture?.length),
    activeTopicUsedAsContextOnly: true,
    currentIntent: evidencePack.currentIntent || 'study',
    historyAllowed: !!evidencePack.historyAllowed,
  });

  annotateLiveTruthReturn(out, ctx.liveTruthTrace, 'strict', message);

  return H.finalizeBuddyResponse({
    structured: out,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
  });
}

function attachDebug(structured, meta) {
  const coreDebug = buildCoreRestorationDebug(meta);
  structured.runtime = { ...(structured.runtime || {}), coreDebug };
  if (isCoreRestorationDebugEnabled()) {
    structured.coreDebug = coreDebug;
  }
  return structured;
}

async function runOpenAiFirstCompanionRuntime(H, inputOrUserId, modeArg, personaKeyArg, messageArg) {
  const { userId, testerId, sessionId, cohort, mode, personaKey, message } = H.normalizeInput(
    inputOrUserId,
    modeArg,
    personaKeyArg,
    messageArg
  );

  const safety = H.classifySafety(message);
  const profile = H.getUserCompanionProfile(userId);
  // CERTIFICATION_V6 Gate 2 — align fetch window with session retention (default 30).
  const recentSessions = H.getRecentSessions(userId, 30);

  // Persist explicit "Remember this marker: …" pins outside the short composer window.
  try {
    const { maybeCapturePin } = require('./explicitRememberPin');
    maybeCapturePin(userId, message);
  } catch (_) {
    /* non-fatal */
  }

  let runtimeContext = buildRuntimeContext({ message, mode, profile, recentSessions, safety });
  runtimeContext = H.enrichRuntimeContextWithMemory({ runtimeContext, userId, profile });
  runtimeContext.userId = userId;
  runtimeContext.profile = profile;
  runtimeContext.safety = safety;

  if (safety.level === 'crisis') {
    const crisisReply = H.fallbackReply({ message, safety });
    crisisReply.quality = scoreCompanionQuality({ message, reply: crisisReply.reply, runtimeContext });
    crisisReply.reply = polishFinalReply(crisisReply.reply);
    crisisReply.runtime = {
      emotion: runtimeContext.emotion,
      intent: 'crisis',
      masterRoute: 'crisis',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
    };
    attachDebug(crisisReply, {
      runtimeUsed: 'core_openai_first',
      openaiCalled: false,
      finalAnswerAuthor: 'crisis_protocol',
      fallbackUsed: true,
      templateUsed: false,
      responderUsed: false,
      routeUsed: 'crisis',
      doctrineValidatorUsed: false,
      scriptureEvidenceUsed: false,
      activeTopicUsedAsContextOnly: true,
      currentIntent: 'crisis',
      historyAllowed: false,
    });
    annotateLiveTruthReturn(crisisReply, null, 'fallback', message);
    return H.finalizeBuddyResponse({
      structured: crisisReply,
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
      testerId,
      sessionId,
      cohort,
    });
  }

  const evidencePack = buildRetrievalEvidencePack({
    userId,
    message,
    mode,
    recentSessions,
    runtimeContext,
    profile,
    safety,
    routingHintsOnly: true,
  });
  evidencePack.userMessage = message;
  evidencePack.userId = userId;
  // BIE Phase 1A/1C — attach Verified Lesson Packet (+ bounded OL when relevant)
  await attachVerifiedLessonPacketToEvidencePack(evidencePack, message);
  // Phase 6X Obj2 — surface pack intelligence on runtime for thread persistence
  runtimeContext.semanticUnderstanding = evidencePack.semanticUnderstanding || null;
  runtimeContext.correctionLedger = evidencePack.correctionLedger || null;

  // CERTIFICATION_V6 Gate 2 — answer marker recall from durable pins (no confabulation).
  {
    const { tryAnswerPinRecall } = require('./explicitRememberPin');
    const pinReply = tryAnswerPinRecall(userId, message);
    if (pinReply?.reply) {
      pinReply.quality = scoreCompanionQuality({ message, reply: pinReply.reply, runtimeContext });
      pinReply.reply = polishFinalReply(pinReply.reply);
      attachDebug(pinReply, {
        runtimeUsed: 'core_openai_first',
        openaiCalled: false,
        finalAnswerAuthor: pinReply.runtime?.masterRoute || 'explicit_remember_pin',
        fallbackUsed: false,
        templateUsed: false,
        responderUsed: false,
        routeUsed: pinReply.runtime?.masterRoute || 'explicit_remember_pin',
        doctrineValidatorUsed: false,
        scriptureEvidenceUsed: false,
        activeTopicUsedAsContextOnly: true,
        currentIntent: 'memory_recall',
        historyAllowed: true,
      });
      annotateLiveTruthReturn(pinReply, null, 'memory', message);
      return H.finalizeBuddyResponse({
        structured: pinReply,
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        testerId,
        sessionId,
        cohort,
      });
    }
  }

  // CERTIFICATION_V5 — resurrection timing must not fall through to
  // doctrine_final_authority (resurrection hope / death-sleep) or OpenAI
  // tradition answers that confuse discovery with rising time.
  {
    const { detectSourceTopic, buildSourceGroundedReply } = require('./sourceGroundedResponder');
    if (detectSourceTopic(message) === 'resurrection_timeline') {
      const grounded = buildSourceGroundedReply({ message });
      if (grounded?.reply) {
        const structured = {
          ...grounded,
          runtime: {
            ...(grounded.runtime || {}),
            masterRoute: grounded.runtime?.masterRoute || 'resurrection_timing_source_grounded',
            openAiCalled: false,
            buddyRuntime: 'core_openai_first',
            resurrectionTiming: true,
          },
        };
        structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
        annotateLiveTruthReturn(structured, null, 'resurrection_timing', message);
        return H.finalizeBuddyResponse({
          structured,
          userId,
          mode,
          personaKey,
          message,
          safety,
          runtimeContext,
          profile,
          testerId,
          sessionId,
          cohort,
        });
      }
    }
  }

  // Product Sprint D — explicit study intent → structured Scripture study (VLP-backed).
  // Protected pastoral/medical/prayer/historical-causation paths remain higher priority
  // (checked inside tryBuildStructuredStudyReply / left to orchestrator).
  {
    const studyAttempt = await tryBuildStructuredStudyReply(evidencePack, message, userId);
    if (studyAttempt && studyAttempt.ok) {
      const structured = {
        reply: studyAttempt.reply,
        scripture: studyAttempt.scripture || [],
        mode: 'study',
        confidence: studyAttempt.confidence || 'high',
        memory_used: false,
        orb_state: 'speaking',
        safety_level: 'standard',
        runtime: studyAttempt.runtime,
      };
      structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
      structured.reply = polishFinalReply(structured.reply);
      attachDebug(structured, {
        runtimeUsed: 'core_openai_first',
        openaiCalled: false,
        finalAnswerAuthor: 'structured_scripture_study',
        fallbackUsed: false,
        templateUsed: false,
        responderUsed: false,
        routeUsed: 'structured_scripture_study',
        doctrineValidatorUsed: false,
        scriptureEvidenceUsed: true,
        activeTopicUsedAsContextOnly: true,
        currentIntent: 'structured_study',
        historyAllowed: false,
        verifiedLessonPacketActivated: true,
      });
      annotateLiveTruthReturn(structured, null, 'structured_study', message);
      return H.finalizeBuddyResponse({
        structured,
        userId,
        mode: 'study',
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        doctrineTopic: evidencePack.topic,
        testerId,
        sessionId,
        cohort,
      });
    }
    // If explicit study was requested but packet unusable, fall through to
    // normal conversational path (honest fallback — do not invent a lesson).
  }

  const orchestratorResult = await runBibleCompanionOrchestrator({
    H,
    userId,
    message,
    mode,
    personaKey,
    safety,
    runtimeContext,
    profile,
    testerId,
    sessionId,
    cohort,
    evidencePack,
    recentSessions,
  });

  const liveTruthTrace = {
    at: new Date().toISOString(),
    message,
    userId,
    runtimeContextIntent: runtimeContext?.intent || null,
    orchestratorHandled: !!orchestratorResult?.handled,
    orchestratorDispatch: orchestratorResult?.dispatch || null,
    orchestratorMasterRoute:
      orchestratorResult?.ctx?.route ||
      orchestratorResult?.ctx?.structured?.runtime?.masterRoute ||
      null,
    orchestratorHumanNeed:
      orchestratorResult?.ctx?.humanNeed ||
      orchestratorResult?.ctx?.reasoningPlan?.humanNeed ||
      orchestratorResult?.reasoningPlan?.humanNeed ||
      null,
    orchestratorReplyPreview: String(
      orchestratorResult?.ctx?.structured?.reply || orchestratorResult?.ctx?.reply || '',
    ).slice(0, 180),
  };

  console.log('[LIVE_TRUTH_ORCHESTRATOR]', JSON.stringify(liveTruthTrace));

  let resolvedOrchestratorResult = orchestratorResult;
  const detectedHumanNeed =
    orchestratorResult?.ctx?.humanNeed ||
    orchestratorResult?.ctx?.reasoningPlan?.humanNeed ||
    orchestratorResult?.reasoningPlan?.humanNeed ||
    null;

  if (
    resolvedOrchestratorResult.handled &&
    PROTECTED_COMPANION_NEEDS.has(detectedHumanNeed) &&
    resolvedOrchestratorResult.dispatch !== 'companion'
  ) {
    console.warn(
      '[LIVE_TRUTH_PROTECTED_INTENT_REROUTE]',
      JSON.stringify({
        message,
        detectedHumanNeed,
        originalDispatch: resolvedOrchestratorResult.dispatch,
        forcedDispatch: 'companion',
      }),
    );
    resolvedOrchestratorResult = applyProtectedCompanionReroute(
      resolvedOrchestratorResult,
      detectedHumanNeed,
      { userId, message, safety },
    );
    liveTruthTrace.orchestratorDispatch = 'companion';
    liveTruthTrace.orchestratorProtectedReroute = true;
    liveTruthTrace.orchestratorHumanNeed = detectedHumanNeed;
    liveTruthTrace.orchestratorReplyPreview = String(
      resolvedOrchestratorResult?.ctx?.structured?.reply || '',
    ).slice(0, 180);
  }

  const routePlanForTrace =
    resolvedOrchestratorResult.routePlan ||
    planCompanionDoctrineRouting({
      userId,
      message,
      recentSessions,
      runtimeContext,
    });
  liveTruthTrace.routePlanHumanNeed =
    routePlanForTrace?.humanNeed || liveTruthTrace.orchestratorHumanNeed || null;
  liveTruthTrace.protectedHumanNeed = !!routePlanForTrace?.protectedHumanNeed;

  if (resolvedOrchestratorResult.handled) {
    const ctx = {
      ...resolvedOrchestratorResult.ctx,
      liveTruthTrace,
      evidencePack: resolvedOrchestratorResult.ctx?.evidencePack || evidencePack,
    };
    if (resolvedOrchestratorResult.dispatch === 'strict') {
      logPhase4d1CircuitBreaker({
        userId,
        message,
        topic: ctx.topic,
        route: ctx.route,
      });
      return returnStrictDoctrineStructured(H, ctx);
    }
    if (resolvedOrchestratorResult.dispatch === 'bible_wide') {
      return returnBibleWideStructured(H, ctx);
    }
    if (resolvedOrchestratorResult.dispatch === 'companion') {
      return returnCompanionLaneStructured(H, ctx);
    }
  }

  const routePlan = resolvedOrchestratorResult.routePlan || routePlanForTrace;

  liveTruthTrace.routePlanHumanNeed = routePlan?.humanNeed || liveTruthTrace.orchestratorHumanNeed || null;
  liveTruthTrace.protectedHumanNeed = !!routePlan?.protectedHumanNeed;

  const shouldTryStrictOpenAiBlock = () =>
    !routePlan?.protectedHumanNeed && mustBlockOpenAi(evidencePack, userId, message, routePlan);

  if (shouldTryStrictOpenAiBlock()) {
    logPhase4eLivePathError({
      userId,
      message,
      reason: 'strict_gate_miss_forced_retry',
      topic: routePlan.strictTopic || evidencePack.doctrineStrict?.strictTopic,
    });
    const retryGate = runStrictDoctrineGate({
      userId,
      message,
      evidencePack,
      recentSessions,
      safety,
      runtimeContext,
      routePlan,
    });
    if (retryGate.handled) {
      return returnStrictDoctrineStructured(H, {
        structured: retryGate.structured,
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        testerId,
        sessionId,
        cohort,
        evidencePack,
        topic: retryGate.topic,
        liveTruthTrace,
      });
    }
  }

  const turnStarted = Date.now();
  let openaiAttempts = 0;
  let doctrineStrictRegenerated = false;
  let doctrineStrictValidation = null;
  let doctrineStrictSafeUsed = false;

  if (shouldTryStrictOpenAiBlock()) {
    logPhase4eLivePathError({ userId, message, reason: 'openai_blocked_strict_doctrine' });
    const { buildFinalAuthorityAnswer, buildFinalAuthorityStructured } = require('./doctrineFinalAuthorityEngine');
    const topic = routePlan.strictTopic || evidencePack.doctrineStrict?.strictTopic;
    if (!topic) {
      /* companion lane — do not resurrect stale active topic */
    } else {
    const authority = buildFinalAuthorityAnswer({
      topic,
      contract: evidencePack.doctrineStrict?.contract || require('./doctrineAuthorityContract').BASE_CONTRACTS[topic],
      userId,
      message,
    });
    if (authority) {
      return returnStrictDoctrineStructured(H, {
        structured: buildFinalAuthorityStructured(authority, runtimeContext, safety, {
          evidencePack,
          message,
          userId,
        }),
        userId,
        mode,
        personaKey,
        message,
        safety,
        runtimeContext,
        profile,
        testerId,
        sessionId,
        cohort,
        evidencePack,
        topic,
        route: 'doctrine_final_authority_openai_block',
        liveTruthTrace,
      });
    }
    const safe = buildDoctrineStrictSafeAnswer({
      message,
      evidencePack,
      contract: evidencePack.doctrineStrict?.contract,
      violations: [{ code: 'openai_blocked', detail: 'strict_doctrine_local_only' }],
    });
    return returnStrictDoctrineStructured(H, {
      structured: mergeDoctrineStrictSafeStructured(
        { reply: '', runtime: { openAiCalled: false } },
        safe,
        evidencePack,
      ),
      userId,
      mode,
      personaKey,
      message,
      safety,
      runtimeContext,
      profile,
      testerId,
      sessionId,
      cohort,
      evidencePack,
      topic,
      route: 'doctrine_strict_safe_openai_block',
      liveTruthTrace,
    });
    }
  }

  let composed = await composeReasonFirstReply({
    userId,
    mode,
    personaKey,
    message,
    safety,
    profile,
    runtimeContext,
    evidencePack,
    coreRestoration: true,
    maxAttempts: 1,
  });
  openaiAttempts += composed.attempts || (composed.openaiCalled ? 1 : 0);

  let structured = composed.structured;
  let openaiCalled = !!composed.openaiCalled;
  let finalAnswerAuthor = 'openai';
  let fallbackUsed = false;
  let errorMessage = composed.apiError || null;
  let regenerated = false;
  let claimDegraded = false;
  let guards = null;
  let claimValidation = null;
  const currentIntent = evidencePack.currentIntent || 'unclear';
  const historyAllowed = !!evidencePack.historyAllowed;

  if (!openaiCalled) {
    if (errorMessage === 'openai_timeout' || String(errorMessage || '').includes('timeout')) {
      logPhase4d1OpenAiTimeout({ userId, message, topic: evidencePack.doctrineStrict?.strictTopic, error: errorMessage });
    }
    if (evidencePack.doctrineStrict?.enabled) {
      const safe = buildDoctrineStrictSafeAnswer({
        message,
        evidencePack,
        contract: evidencePack.doctrineStrict.contract,
        violations: [{ code: 'openai_failure', detail: errorMessage || 'openai_unavailable' }],
      });
      structured = mergeDoctrineStrictSafeStructured(structured, safe, evidencePack);
      fallbackUsed = true;
      doctrineStrictSafeUsed = true;
      finalAnswerAuthor = 'doctrine_strict_safe_corpus';
      setActiveDoctrineConversation({
        userId,
        topic: evidencePack.doctrineStrict.strictTopic,
        contract: evidencePack.doctrineStrict.contract,
        userMessage: message,
        answerSummary: structured.reply,
      });
      syncUsedWitnessesFromReply(userId, evidencePack.doctrineStrict.strictTopic, structured.reply);
      logDoctrineStrictFailure({
        event: 'openai_failure_safe_fallback',
        message,
        topic: evidencePack.doctrineStrict.strictTopic,
        error: errorMessage,
      });
    } else {
      fallbackUsed = true;
      const companionFallback =
        routePlan.lane === 'companion'
          ? await buildCompanionLaneFallbackReply(message, buildRoutingContext(userId, { runtimeContext, recentSessions }))
          : null;
      if (companionFallback?.reply) {
        finalAnswerAuthor = 'companion_lane_fallback';
        structured = {
          reply: companionFallback.reply,
          scripture: companionFallback.scripture || [],
          mode: 'companion',
          confidence: 'medium',
          memory_used: false,
          safety_level: safety?.level || 'standard',
          admin_flags: ['companion_lane_fallback', `companion_intent_${routePlan.intent || 'companion'}`],
          runtime: {
            masterRoute: 'companion_lane_fallback',
            openAiCalled: false,
            buddyRuntime: 'core_openai_first',
            companionLane: true,
            companionIntent: routePlan.intent || 'companion_general',
          },
        };
        recordUserTurn(userId, message, 'companion');
      } else {
        finalAnswerAuthor = 'connection_error';
        structured = buildConnectionErrorReply({
          error: errorMessage || composed.validation?.issues?.[0] || 'openai_unavailable',
          safety,
        });
        structured.reply = mapInternalErrorToUserMessage(errorMessage, { strictDoctrine: false });
        structured.runtime = {
          ...(structured.runtime || {}),
          buddyRuntime: 'core_openai_first',
          companionPresentation: {
            skipRelationshipEnrichment: true,
            skipStudyPrompts: true,
          },
        };
      }
      structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });
    }
  } else {
    structured.reply = polishFinalReply(structured.reply);

    if (evidencePack.doctrineStrict?.enabled) {
      const finalityCheck = validateFinalityReply(structured.reply);
      if (!finalityCheck.passed) {
        structured.reply = polishFinalReply(stripFinalityViolations(structured.reply));
        structured.admin_flags = [
          ...new Set([...(structured.admin_flags || []), 'finality_violation_stripped']),
        ];
      }
      doctrineStrictValidation = validateDoctrineStrictReply({
        reply: structured.reply,
        message,
        evidencePack,
        structured,
      });

      if (!doctrineStrictValidation.passed && !doctrineStrictRegenerated) {
        if (shouldTryStrictOpenAiBlock()) {
          const { buildFinalAuthorityAnswer, buildFinalAuthorityStructured } = require('./doctrineFinalAuthorityEngine');
          const blockTopic = routePlan.strictTopic || evidencePack.doctrineStrict.strictTopic;
          const blockAuthority = buildFinalAuthorityAnswer({
            topic: blockTopic,
            contract: evidencePack.doctrineStrict.contract,
            userId,
            message,
          });
          if (blockAuthority) {
            structured = buildFinalAuthorityStructured(blockAuthority, runtimeContext, safety, {
              evidencePack,
              message,
              userId,
            });
            structured.reply = polishFinalReply(structured.reply);
            doctrineStrictRegenerated = true;
            doctrineStrictValidation = validateDoctrineStrictReply({
              reply: structured.reply,
              message,
              evidencePack,
              structured,
            });
          }
        } else {
        const regenInstruction = buildDoctrineStrictRegenHint(doctrineStrictValidation);
        composed = await composeReasonFirstReply({
          userId,
          mode,
          personaKey,
          message,
          safety,
          profile,
          runtimeContext,
          evidencePack: {
            ...evidencePack,
            answerGuidance: {
              ...evidencePack.answerGuidance,
              directAnswerFirst: true,
              forbidStudyContinuation: true,
            },
          },
          coreRestoration: true,
          maxAttempts: 1,
          regenInstruction,
        });
        openaiAttempts += composed.attempts || (composed.openaiCalled ? 1 : 0);
        doctrineStrictRegenerated = true;

        if (composed.openaiCalled) {
          structured = composed.structured;
          structured.reply = polishFinalReply(structured.reply);
          doctrineStrictValidation = validateDoctrineStrictReply({
            reply: structured.reply,
            message,
            evidencePack,
            structured,
          });
        }
        }
      }

      if (!doctrineStrictValidation.passed) {
        logDoctrineStrictFailure({
          event: 'doctrine_strict_validation_failed',
          message,
          topic: evidencePack.doctrineStrict.strictTopic,
          violations: doctrineStrictValidation.violations,
          regenerated: doctrineStrictRegenerated,
        });
        const safe = buildDoctrineStrictSafeAnswer({
          message,
          evidencePack,
          contract: evidencePack.doctrineStrict.contract,
          violations: doctrineStrictValidation.violations,
        });
        structured = mergeDoctrineStrictSafeStructured(structured, safe, evidencePack);
        fallbackUsed = true;
        doctrineStrictSafeUsed = true;
        finalAnswerAuthor = 'doctrine_strict_safe_corpus';
      }

      setActiveDoctrineConversation({
        userId,
        topic: evidencePack.doctrineStrict.strictTopic,
        contract: evidencePack.doctrineStrict.contract,
        userMessage: message,
        answerSummary: structured.reply,
      });
      syncUsedWitnessesFromReply(userId, evidencePack.doctrineStrict.strictTopic, structured.reply);
    }

    const runGuards = () => {
      const claims = structured.claims?.length
        ? structured.claims
        : normalizeClaims([], {
            reply: structured.reply,
            scripture: structured.scripture || [],
            evidencePack,
          });
      const claimCheck = validateClaimToScripture({
        reply: structured.reply,
        claims,
        evidencePack,
        message,
      });
      structured.claims = claims;
      structured.claimValidation = claimCheck;
      claimValidation = claimCheck;

      const ownership = validateOwnershipReply({
        message,
        reply: structured.reply,
        evidencePack,
        openaiCalled: true,
        fallbackUsed: false,
      });
      const directness = evaluateDirectness({
        message,
        reply: structured.reply,
        currentIntent,
        evidencePack,
        openaiCalled: true,
        historyAllowed,
      });
      const forbidden = detectForbiddenProse(structured.reply);
      const bibleOnlyAuthority = validateBibleOnlyAuthority({
        reply: structured.reply,
        evidencePack,
        historyAllowed,
        message,
      });
      return { ownership, directness, forbidden, bibleOnlyAuthority, claimValidation: claimCheck };
    };

    if (containsMemoryDenial(structured.reply)) {
      const recall = buildDoctrineMemoryRecallReply(userId);
      if (recall.topic) structured.reply = polishFinalReply(recall.reply);
    }

    guards = runGuards();
    const needsRegen =
      !evidencePack.doctrineStrict?.enabled &&
      !regenerated &&
      (!guards.ownership.passed ||
        !guards.directness.passed ||
        guards.forbidden.detected ||
        !guards.bibleOnlyAuthority.passed ||
        !guards.claimValidation.passed);

    if (needsRegen) {
      const regenInstruction =
        guards.claimValidation.regenHint ||
        guards.bibleOnlyAuthority.regenHint ||
        guards.directness.regenInstruction ||
        guards.ownership.regenInstruction ||
        'Answer the latest user question directly. Use evidence silently. Do not use template language, study continuation, prior-topic continuation, or history unless asked.';

      composed = await composeReasonFirstReply({
        userId,
        mode,
        personaKey,
        message,
        safety,
        profile,
        runtimeContext,
        evidencePack: {
          ...evidencePack,
          answerGuidance: {
            ...evidencePack.answerGuidance,
            directAnswerFirst: true,
            forbidStudyContinuation: true,
            suppressPriorStudyTopic: true,
          },
        },
        coreRestoration: true,
        maxAttempts: 1,
        regenInstruction,
      });
      openaiAttempts += composed.attempts || (composed.openaiCalled ? 1 : 0);

      if (composed.openaiCalled) {
        structured = composed.structured;
        structured.reply = polishFinalReply(structured.reply);
        regenerated = true;
        guards = runGuards();
      }
    }

    if (guards && !guards.claimValidation.passed) {
      structured.reply = polishFinalReply(
        applyClaimDegradation(structured.reply, guards.claimValidation)
      );
      claimDegraded = true;
      structured.admin_flags = [
        ...new Set([...(structured.admin_flags || []), 'claim_validation_degraded']),
      ];
      guards = runGuards();
      claimValidation = guards.claimValidation;
    }

    const danger = detectDangerousFallbackSpeaker(structured.reply);
    const forbiddenFinal = detectForbiddenProse(structured.reply);
    if (danger.detected || forbiddenFinal.detected) {
      structured.reply = polishFinalReply(
        stripForbiddenProse(stripDangerousFallbackSpeaker(structured.reply))
      );
      structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'dangerous_fallback_stripped'])];
    }
  }

  const validation =
    composed.validation || validateReasonFirstReply({ reply: structured.reply, evidencePack });
  const dangerCheck = detectDangerousFallbackSpeaker(structured.reply);
  const forbiddenCheck = detectForbiddenProse(structured.reply);
  const ownershipFinal = validateOwnershipReply({
    message,
    reply: structured.reply,
    evidencePack,
    openaiCalled,
    fallbackUsed,
  });
  const directnessFinal = evaluateDirectness({
    message,
    reply: structured.reply,
    currentIntent,
    evidencePack,
    openaiCalled,
    historyAllowed,
  });
  const scriptureEvidenceUsed = !!(evidencePack.scripture?.references?.length);
  const evidenceCardsUsed = !!(evidencePack.evidenceCards?.cards?.length);
  const discoveryReinforcementCount = (evidencePack.discoveryReinforcement || []).length;

  if (openaiCalled && evidenceCardsUsed && process.env.BUDDY_LEARNING_LOG === '1') {
    try {
      const { logEvidencePackUsage } = require('./bibleLearningLog');
      logEvidencePackUsage({
        userId,
        message,
        topic: evidencePack.topic,
        evidenceCardsUsed: evidencePack.evidenceCards?.cards || [],
        reinforcement: evidencePack.discoveryReinforcement || [],
        answerQuality: {
          directAnswerFirst: true,
          validatorPassed: validation?.passed ?? null,
          witnessCount: (structured.scripture || []).length,
        },
      });
    } catch (_) {
      /* non-fatal */
    }
  }

  const doctrineTrace = openaiCalled
    ? buildDoctrineAnswerTrace({
        userMessage: message,
        evidencePack,
        claims: structured.claims || [],
        claimValidation: claimValidation || structured.claimValidation || {},
        reply: structured.reply,
        approval: {
          status: claimDegraded ? 'degraded' : claimValidation?.passed === false ? 'rejected' : 'approved',
          degraded: claimDegraded,
          regenerated,
        },
        composeMeta: {
          doctrineConclusion: structured.doctrineConclusion || '',
          openaiAttempts,
        },
      })
    : null;
  if (doctrineTrace) writeDoctrineAnswerTrace(doctrineTrace);

  structured.runtime = {
    ...(structured.runtime || {}),
    buddyRuntime: 'core_openai_first',
    masterRoute: structured.runtime?.masterRoute || (openaiCalled ? 'core_openai_compose' : 'companion_lane_fallback'),
    openAiCalled: openaiCalled,
    evidenceTopic: evidencePack.topic,
    effectiveTopic: evidencePack.effectiveTopic,
    routingHintsOnly: true,
    currentIntent,
    historyAllowed,
    validation: validation ? { passed: validation.passed } : null,
    claimValidation: claimValidation ? { passed: claimValidation.passed } : structured.claimValidation ? { passed: structured.claimValidation.passed } : null,
    claimDegraded,
    doctrineTraceId: doctrineTrace?.traceId || null,
    regenerated,
    doctrineStrict: evidencePack.doctrineStrict?.enabled
      ? {
          enabled: true,
          strictTopic: evidencePack.doctrineStrict.strictTopic,
          validationPassed: doctrineStrictValidation?.passed ?? null,
          violationCodes: (doctrineStrictValidation?.violations || []).map((v) => v.code),
          regenerated: doctrineStrictRegenerated,
          safeCorpusUsed: doctrineStrictSafeUsed,
        }
      : { enabled: false },
    ownershipGuard: { passed: ownershipFinal.passed },
    directnessGuard: {
      passed: directnessFinal.passed,
      answerMatchesLatestQuestion: directnessFinal.answerMatchesLatestQuestion,
    },
    companionPresentation: {
      skipRelationshipEnrichment: true,
      skipStudyPrompts: true,
    },
  };

  structured = attachPacketLineageToRuntime(structured, evidencePack);

  attachDebug(structured, {
    runtimeUsed: 'core_openai_first',
    currentIntent,
    historyAllowed,
    openaiCalled,
    openaiResponseReceived: openaiCalled && String(structured.reply || '').length > 10,
    finalAnswerAuthor,
    fallbackUsed,
    templateUsed: dangerCheck.detected || ownershipFinal.templateUsed || forbiddenCheck.detected,
    responderUsed: openaiCalled,
    routeUsed: structured.runtime.masterRoute,
    studyLoopUsed: dangerCheck.studyLoopUsed || ownershipFinal.studyLoopUsed,
    prayerTemplateUsed: dangerCheck.prayerTemplateUsed,
    scriptureWitnessTemplateUsed: dangerCheck.scriptureWitnessTemplateUsed,
    doctrineValidatorUsed: true,
    scriptureEvidenceUsed,
    activeTopicUsedAsContextOnly: true,
    evidenceTopic: evidencePack.topic,
    validation,
    errorMessage,
    currentQuestionMatch: ownershipFinal.currentQuestionMatch,
    evidenceCardsUsed,
    approvedDoctrineFrozen: true,
    discoveryReinforcementCount,
    buildConnectionErrorReplyUsed: !openaiCalled,
    sourceGroundedResponderUsed: false,
    sabbathHistoryDeepResponderUsed: false,
    studyFallbackUsed: dangerCheck.studyLoopUsed || ownershipFinal.studyLoopUsed,
    relationshipEnrichmentUsed: false,
    forbiddenPhraseDetected: forbiddenCheck.detected,
    answerMatchesLatestQuestion: directnessFinal.answerMatchesLatestQuestion,
    correctionRepair: directnessFinal.correctionRepair,
    regenerated,
    openaiAttempts,
    evidenceUsed: validation?.evidenceUsed ?? guards?.bibleOnlyAuthority?.evidenceUsed,
    bibleOnlyAuthorityPassed: validation?.bibleOnlyAuthority?.passed,
    claimValidationPassed: claimValidation?.passed,
    claimDegraded,
    doctrineTraceId: doctrineTrace?.traceId || null,
    doctrineStrictEnabled: evidencePack.doctrineStrict?.enabled || false,
    doctrineStrictSafeUsed,
    doctrineStrictRegenerated,
  });

  structured.quality = scoreCompanionQuality({ message, reply: structured.reply, runtimeContext });

  let evidencePackApproxBytes = 0;
  try {
    evidencePackApproxBytes = Buffer.byteLength(JSON.stringify(evidencePack), 'utf8');
  } catch (_) {
    evidencePackApproxBytes = 0;
  }

  if (openaiAttempts > 2) {
    structured.admin_flags = [...new Set([...(structured.admin_flags || []), 'openai_attempt_cap_exceeded'])];
  }

  logRequestMemory({
    userId,
    message,
    openaiCalled,
    regenerated,
    openaiAttempts: Math.min(openaiAttempts, 2),
    evidencePackApproxBytes,
    latencyMs: Date.now() - turnStarted,
  });

  structured = applyDoctrineErrorFirewall(structured, {
    userId,
    topic: evidencePack.doctrineStrict?.strictTopic || evidencePack.topic,
    strictDoctrine: evidencePack.doctrineStrict?.enabled || false,
  });

  const openAiReturnKind = fallbackUsed && !openaiCalled ? 'fallback' : 'openai';
  annotateLiveTruthReturn(structured, liveTruthTrace, openAiReturnKind, message);

  return H.finalizeBuddyResponse({
    structured,
    userId,
    mode,
    personaKey,
    message,
    safety,
    runtimeContext,
    profile,
    doctrineTopic: evidencePack.topic,
    testerId,
    sessionId,
    cohort,
  });
}

module.exports = {
  runOpenAiFirstCompanionRuntime,
  attachVerifiedLessonPacketToEvidencePack,
  tryBuildStructuredStudyReply,
};
