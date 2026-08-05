/**
 * Phase 4O / 5E — Bible-wide line-upon-line answer builder.
 */

const {
  detectConceptFromContinuation,
  CONTINUATION_PHRASE_RE,
} = require('./bibleConceptConcordance');
const {
  getGraphNode,
  getGraphWitnesses,
  detectConceptFromGraph,
} = require('./bibleConceptGraph');
const { detectSemanticConcept } = require('./bibleSemanticConceptNormalizer');
const {
  parseScriptureRef,
  normalizeBook,
} = require('./scriptureReferenceNormalizer');
const { resolveFollowUpContext } = require('./followUpContextResolver');
const {
  getDoctrineConversationState,
  updateDoctrineConversationState,
} = require('./doctrineConversationState');
const { formatDirectDoctrineReply } = require('./directAnswerFormatter');
const { applyUserAnswerPreferences, getUserAnswerPreferences } = require('./userCorrectionMemory');
const { validateBncAnswer } = require('./bncSafetyValidator');
const {
  findHintedReference,
  buildExplicitReferenceConceptShape,
  buildGroundedScriptureAnswer,
  detectSatanReleaseQuestion,
} = require('./groundedScriptureEngine');
const { buildAuthorityAnswer } = require('./scriptureAuthorityEngine');

function getConceptById(id) {
  return getGraphNode(id);
}

function buildDirectAnswerPolarity(message = '', concept = null) {
  if (!concept) return null;
  return concept.polarity || null;
}


// SPRINT_2C_C3_EXPLICIT_SCRIPTURE_HANDOFF
//
// Converts a valid explicit canonical Scripture reference into a concept-shaped
// handoff for the existing Bible-wide reasoning path.
//
// This does not provide verse text or interpretation. Canonical text retrieval,
// claim evaluation, Scripture-silence handling, and truth validation remain
// downstream responsibilities.
const CANONICAL_SCRIPTURE_BOOKS = new Map([
  ['genesis', 'Genesis'],
  ['exodus', 'Exodus'],
  ['leviticus', 'Leviticus'],
  ['numbers', 'Numbers'],
  ['deuteronomy', 'Deuteronomy'],
  ['joshua', 'Joshua'],
  ['judges', 'Judges'],
  ['ruth', 'Ruth'],
  ['1 samuel', '1 Samuel'],
  ['2 samuel', '2 Samuel'],
  ['1 kings', '1 Kings'],
  ['2 kings', '2 Kings'],
  ['1 chronicles', '1 Chronicles'],
  ['2 chronicles', '2 Chronicles'],
  ['ezra', 'Ezra'],
  ['nehemiah', 'Nehemiah'],
  ['esther', 'Esther'],
  ['job', 'Job'],
  ['psalm', 'Psalms'],
  ['psalms', 'Psalms'],
  ['proverbs', 'Proverbs'],
  ['ecclesiastes', 'Ecclesiastes'],
  ['song of solomon', 'Song of Solomon'],
  ['song of songs', 'Song of Solomon'],
  ['isaiah', 'Isaiah'],
  ['jeremiah', 'Jeremiah'],
  ['lamentations', 'Lamentations'],
  ['ezekiel', 'Ezekiel'],
  ['daniel', 'Daniel'],
  ['hosea', 'Hosea'],
  ['joel', 'Joel'],
  ['amos', 'Amos'],
  ['obadiah', 'Obadiah'],
  ['jonah', 'Jonah'],
  ['micah', 'Micah'],
  ['nahum', 'Nahum'],
  ['habakkuk', 'Habakkuk'],
  ['zephaniah', 'Zephaniah'],
  ['haggai', 'Haggai'],
  ['zechariah', 'Zechariah'],
  ['malachi', 'Malachi'],
  ['matthew', 'Matthew'],
  ['mark', 'Mark'],
  ['luke', 'Luke'],
  ['john', 'John'],
  ['acts', 'Acts'],
  ['romans', 'Romans'],
  ['1 corinthians', '1 Corinthians'],
  ['2 corinthians', '2 Corinthians'],
  ['galatians', 'Galatians'],
  ['ephesians', 'Ephesians'],
  ['philippians', 'Philippians'],
  ['colossians', 'Colossians'],
  ['1 thessalonians', '1 Thessalonians'],
  ['2 thessalonians', '2 Thessalonians'],
  ['1 timothy', '1 Timothy'],
  ['2 timothy', '2 Timothy'],
  ['titus', 'Titus'],
  ['philemon', 'Philemon'],
  ['hebrews', 'Hebrews'],
  ['james', 'James'],
  ['1 peter', '1 Peter'],
  ['2 peter', '2 Peter'],
  ['1 john', '1 John'],
  ['2 john', '2 John'],
  ['3 john', '3 John'],
  ['jude', 'Jude'],
  ['revelation', 'Revelation'],
]);

const SCRIPTURE_BOOK_ALIASES = new Map([
  ['gen', 'Genesis'],
  ['ex', 'Exodus'],
  ['exod', 'Exodus'],
  ['lev', 'Leviticus'],
  ['num', 'Numbers'],
  ['deut', 'Deuteronomy'],
  ['dt', 'Deuteronomy'],
  ['ps', 'Psalms'],
  ['prov', 'Proverbs'],
  ['eccl', 'Ecclesiastes'],
  ['isa', 'Isaiah'],
  ['jer', 'Jeremiah'],
  ['ezek', 'Ezekiel'],
  ['dan', 'Daniel'],
  ['matt', 'Matthew'],
  ['mt', 'Matthew'],
  ['mk', 'Mark'],
  ['lk', 'Luke'],
  ['jn', 'John'],
  ['rom', 'Romans'],
  ['rev', 'Revelation'],
]);

function canonicalScriptureBook(book = '') {
  const normalized = normalizeBook(book);

  return (
    CANONICAL_SCRIPTURE_BOOKS.get(normalized) ||
    SCRIPTURE_BOOK_ALIASES.get(normalized) ||
    null
  );
}

function buildCanonicalReference(parsed = null, canonicalBook = '') {
  if (!parsed || !canonicalBook) return null;

  let reference = `${canonicalBook} ${parsed.chapter}`;

  if (parsed.verseStart != null) {
    reference += `:${parsed.verseStart}`;

    if (
      parsed.verseEnd != null &&
      parsed.verseEnd !== parsed.verseStart
    ) {
      reference += `-${parsed.verseEnd}`;
    }
  }

  return reference;
}

function extractExplicitScriptureReferences(message = '') {
  const text = String(message || '').replace(/–/g, '-');

  // Capture a possible reference with up to four preceding book-name words.
  // We then progressively trim leading words and accept only a recognized
  // canonical Bible book.
  const candidateRe =
    /(?:^|[^A-Za-z0-9])((?:(?:[1-3]\s+)?[A-Za-z]+(?:\s+[A-Za-z]+){0,3})\s+\d{1,3}(?::\d{1,3}(?:\s*-\s*\d{1,3})?)?)/g;

  const results = [];
  const seen = new Set();

  let match;

  while ((match = candidateRe.exec(text)) !== null) {
    const candidate = String(match[1] || '')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    const numberMatch = candidate.match(
      /(\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?)$/
    );

    if (!numberMatch) continue;

    const numericPart = numberMatch[1];
    const rawBookPart = candidate
      .slice(0, candidate.length - numericPart.length)
      .trim();

    const bookTokens = rawBookPart.split(/\s+/);
    let foundValidBook = false;

    for (let start = 0; start < bookTokens.length; start += 1) {
      const possibleBook = bookTokens.slice(start).join(' ');
      const canonicalBook = canonicalScriptureBook(possibleBook);

      if (!canonicalBook) continue;

      const possibleReference = `${canonicalBook} ${numericPart}`;
      const parsed = parseScriptureRef(possibleReference);

      if (!parsed) continue;

      const canonicalReference = buildCanonicalReference(
        parsed,
        canonicalBook
      );

      if (!canonicalReference) continue;

      foundValidBook = true;

      const key = canonicalReference.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          reference: canonicalReference,
          index: match.index + candidate.indexOf(possibleBook),
        });
      }

      break;
    }

    // PHASE_6F — a candidate ending in a bare, unqualified number (e.g. "...
    // Hebrew in 2") can consume a leading book-number digit that actually
    // belongs to the *next* reference (e.g. "Hebrew in 2 Samuel 7:12"),
    // starving it of its "2" and leaving an unrecognized "Samuel 7:12". When
    // a candidate fails to resolve to any canonical book, retry one
    // character later instead of skipping past the whole failed span so the
    // digit remains available to a following, more specific match.
    if (!foundValidBook && candidateRe.lastIndex > match.index + 1) {
      candidateRe.lastIndex = match.index + 1;
    }
  }

  return results
    .sort((a, b) => a.index - b.index)
    .map((item) => item.reference);
}

function buildExplicitScriptureReferenceConcept(message = '') {
  let references = extractExplicitScriptureReferences(message);

  // No explicit chapter:verse in the message — check the narrow claim-
  // reference hint list (identification only, never an answer source) so a
  // claim like "verses that say Jesus had white skin" can still be checked
  // against real retrieved text instead of going unanswered.
  if (!references.length) {
    const hinted = findHintedReference(message);
    if (hinted) references = [hinted];
  }

  if (!references.length) return null;

  // PHASE_5S_SCRIPTURE_AUTHORITY — Explicit Scripture outranks Supporting
  // Scripture, but a bare chapter reference (no verse) that matches a
  // curated doctrine concept's own synonym (e.g. "Acts 10") should gather
  // that concept's specific witnesses instead of the entire raw chapter, so
  // the Authority Engine can synthesize the actual teaching from the
  // relevant verses rather than dumping unfocused chapter text. Only
  // applies when the concept genuinely offers 2+ curated witnesses — this
  // never invents supporting passages, it only reuses what a concept
  // author already curated.
  if (references.length === 1 && !references[0].includes(':')) {
    const conceptMatch = detectConceptFromGraph(message);
    const curatedWitnesses = [
      ...(conceptMatch?.directWitnesses || []),
      ...(conceptMatch?.supportingWitnesses || []),
    ];
    if (conceptMatch && curatedWitnesses.length >= 2) {
      return {
        ...buildExplicitReferenceConceptShape(curatedWitnesses),
        authorityConceptId: conceptMatch.id,
      };
    }
  }

  return buildExplicitReferenceConceptShape(references);
}

function selectDirectWitnesses(concept, limit = 3, exclude = []) {
  const c = typeof concept === 'string' ? getGraphNode(concept) : concept;
  if (!c) return [];
  const excludeSet = new Set(exclude.map((r) => String(r).toLowerCase()));
  const pool = [...(c.directWitnesses || []), ...(c.supportingWitnesses || [])];
  const selected = [];
  for (const ref of pool) {
    if (excludeSet.has(ref.toLowerCase())) continue;
    selected.push(ref);
    if (selected.length >= limit) break;
  }
  return selected;
}

function buildLineUponLineExplanation(concept, witnesses = []) {
  const c = typeof concept === 'string' ? getGraphNode(concept) : concept;
  if (!c) return '';
  if (c.helperOnly && !c.directAnswer) return '';
  const refs = witnesses.length ? witnesses : selectDirectWitnesses(c, 3);
  if (!refs.length) return c.directAnswer || '';
  const witnessText = refs.slice(0, 3).join(', ');
  if (!c.directAnswer) return '';
  return `${c.directAnswer} Scripture witnesses: ${witnessText}.`;
}

// PHASE_5Q_GROUNDED_SCRIPTURE_ENGINE
//
// Completes the explicit-Scripture path with READ / QUOTE / COMPARE /
// YES_NO handling, using ONLY live retrieved canonical text. Delegates to
// groundedScriptureEngine so this engine never answers from the doctrine
// concept graph, a hand-authored witness list, or generated Scripture.
async function retrieveGroundedScriptureForConcept(message, concept) {
  const references =
    concept?.canonicalReferences?.length
      ? concept.canonicalReferences
      : selectDirectWitnesses(concept, 3);
  return buildGroundedScriptureAnswer({ message, references });
}

function getConceptState(userId) {
  const state = getDoctrineConversationState(userId);
  return {
    activeBibleConcept: state.activeBibleConcept || null,
    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept || null,
    usedConceptWitnesses: state.usedConceptWitnesses || [],
    lastPendingQuestion: state.lastPendingQuestion || null,
  };
}

function setActiveBibleConcept(userId, conceptId, userMessage = '', witnesses = []) {
  return updateDoctrineConversationState(userId, {
    activeBibleConcept: conceptId,
    lastBibleConcept: conceptId,
    lastAnsweredConcept: conceptId,
    activeDoctrineTopic: null,
    activeStrictContract: null,
    activeContract: null,
    usedConceptWitnesses: witnesses || [],
    lastPendingQuestion: userMessage || null,
    lastLane: 'bible_wide',
    doctrineSuspended: false,
    releaseRequested: false,
  });
}

function resolveConceptForMessage(message = '', userId = '') {
  const state = getDoctrineConversationState(userId);
  const context = {
    activeBibleConcept: state.activeBibleConcept,
    lastAnsweredConcept: state.lastAnsweredConcept || state.activeBibleConcept,
    lastBibleConcept: state.lastBibleConcept,
  };

  const followUp = resolveFollowUpContext(message, context);
  if (followUp?.isActorQuestion) {
    return { actorFollowUp: followUp };
  }
  if (followUp?.conceptId) {
    const node = getGraphNode(followUp.conceptId);
    if (node) return node;
  }

  const fromContinuation = detectConceptFromContinuation(message);
  if (fromContinuation) return fromContinuation;

  const semantic = detectSemanticConcept(message, context);
  if (semantic) return semantic;

  if (CONTINUATION_PHRASE_RE.test(message) && state.activeBibleConcept) {
    return getGraphNode(state.activeBibleConcept);
  }

  const explicitReferenceConcept =
    buildExplicitScriptureReferenceConcept(message);

  if (explicitReferenceConcept) {
    return explicitReferenceConcept;
  }

  return null;
}

async function buildBibleWideAnswer({
  message,
  concept: conceptInput = null,
  userId = '',
  userPreferences = null,
  conversationState = null,
  isContinuation = false,
} = {}) {
  let concept = conceptInput || resolveConceptForMessage(message, userId);
  if (concept?.actorFollowUp) {
    const af = concept.actorFollowUp;
    return {
      reply: af.reply,
      scripture: af.scripture || [],
      concept: af.conceptId,
      strictTopic: null,
      polarity: null,
      witnesses: (af.scripture || []).map((s) => s.reference),
      masterRoute: af.masterRoute || 'bnc_followup_actor',
    };
  }
  if (!concept) return null;

  if (
    (concept.id === 'prayer_comfort' || concept.helperOnly) &&
    /\b(pray with me|can you pray|please pray|will you pray)\b/i.test(message)
  ) {
    return null;
  }

  const prefs = userPreferences || getUserAnswerPreferences(userId);
  const state = conversationState || getConceptState(userId);
  const used = state.usedConceptWitnesses || [];

  let witnesses;
  if (isContinuation || CONTINUATION_PHRASE_RE.test(message)) {
    witnesses = selectDirectWitnesses(concept, 3, used);
    if (!witnesses.length) witnesses = selectDirectWitnesses(concept, 3, []);
  } else {
    witnesses = selectDirectWitnesses(concept, 3);
  }

  let reply;
  let canonicalRetrieval = null;
  let authorityResult = null;
  const satanReleaseFamily =
    concept.id === 'satan_released_after_millennium' ||
    Boolean(detectSatanReleaseQuestion(message)) ||
    Boolean(findHintedReference(message) === 'Revelation 20:7-10' && detectSatanReleaseQuestion(message + ' satan released'));
  // If hint matched Rev 20:7-10 for satan-family wording, force family even when
  // subtype detector needs a slight boost (Pass B alternate phrasing).
  const hintedSatan =
    findHintedReference(message) === 'Revelation 20:7-10' &&
    /\b(satan|devil|releas\w*|loos\w*|releaser|millennium|thousand years|lets satan|set free)\b/i.test(
      message,
    );
  const useSatanGrounded = satanReleaseFamily || hintedSatan;
  if (concept.explicitScriptureReference || useSatanGrounded) {
    // Grounded Scripture engine (Phase 5Q) retrieves live canonical text and
    // classifies READ / QUOTE / COMPARE / YES_NO intent. The Scripture
    // Authority Engine (Phase 5S) then classifies and orders the final
    // answer (classification -> direct answer -> primary Scripture ->
    // supporting Scripture -> brief explanation -> conclusion) from that
    // same retrieved text only — never from the doctrine graph, never
    // invented.
    // v1.3C: Satan-release explicitness stays on the grounded reply so the
    // authority layer cannot rephrase an inferred agent as explicit Scripture.
    const groundedMessage =
      useSatanGrounded &&
      /^\s*(answer\s+)?yes or no\.?\s*$/i.test(String(message || ''))
        ? 'After the thousand years, is Satan released? Answer yes or no.'
        : message;
    const groundedConcept = useSatanGrounded && !concept.explicitScriptureReference
      ? {
          ...concept,
          explicitScriptureReference: true,
          canonicalReferences: ['Revelation 20:7-10'],
          retrievalMode: 'canonical_reference',
        }
      : concept;
    canonicalRetrieval = await retrieveGroundedScriptureForConcept(groundedMessage, groundedConcept);
    if (canonicalRetrieval.satanReleaseSubtype) {
      reply = canonicalRetrieval.reply;
      authorityResult = {
        reply,
        classification: 'SATAN_RELEASE_EXPLICITNESS',
        intent: canonicalRetrieval.intent,
      };
    } else if (useSatanGrounded && !canonicalRetrieval.satanReleaseSubtype) {
      // Hint matched but subtype missed — force explicit-agent safety reply.
      const forced = await buildGroundedScriptureAnswer({
        message: /\b(god|lets satan|explicit that god)\b/i.test(message)
          ? 'Does God release Satan?'
          : /\b(name|releaser)\b/i.test(message)
            ? 'Does Revelation explicitly name the person or agent who releases him?'
            : 'After the thousand years, is Satan released?',
        references: ['Revelation 20:7-10'],
      });
      reply = forced.reply;
      authorityResult = {
        reply,
        classification: 'SATAN_RELEASE_EXPLICITNESS',
        intent: forced.intent,
      };
      canonicalRetrieval = forced;
    } else {
      authorityResult = await buildAuthorityAnswer({
        intent: canonicalRetrieval.intent,
        claimText: canonicalRetrieval.claimText,
        successes: canonicalRetrieval.successes,
        failures: canonicalRetrieval.failures,
        concept: groundedConcept,
        requestedMinimum: 2,
        retrievalMode: groundedConcept.retrievalMode || 'canonical_reference',
        masterRoute: isContinuation ? 'bible_wide_continuation' : 'bible_wide_reasoning',
      });
      reply = authorityResult.reply;
    }
  } else if (isContinuation || CONTINUATION_PHRASE_RE.test(message)) {
    if (witnesses.length) {
      reply = `Here is another Scripture witness on this topic: ${witnesses.join('; ')}.`;
      if (concept.directAnswer) {
        reply = `${reply} ${concept.directAnswer.split('.').slice(0, 2).join('.')}.`;
      }
    } else {
      reply = buildLineUponLineExplanation(concept, selectDirectWitnesses(concept, 3));
    }
  } else {
    reply = buildLineUponLineExplanation(concept, witnesses);
  }

  const polarity = buildDirectAnswerPolarity(message, concept);
  reply = applyUserAnswerPreferences(reply, {
    userId,
    message,
    polarity,
    userPreferences: prefs,
  });
  reply = formatDirectDoctrineReply(reply, message, {
    topic: concept.strictTopic || concept.id,
    scripture: witnesses.map((r) => ({ reference: r, theme: concept.id })),
    userPreferences: prefs,
    polarity,
  });

  const validated = validateBncAnswer({
    reply,
    concept,
    witnesses,
    source: 'bible_wide',
  });
  reply = validated.reply;

  const scripture = canonicalRetrieval
    ? canonicalRetrieval.successes.map((r) => ({
        reference: r.reference,
        text: r.text,
        translation: r.translation,
        source: r.source,
        theme: concept.id,
      }))
    : witnesses.map((r) => ({ reference: r, theme: concept.id }));

  const effectiveWitnesses = canonicalRetrieval
    ? canonicalRetrieval.successes.map((r) => r.reference)
    : witnesses;

  const retrievalMode = canonicalRetrieval
    ? canonicalRetrieval.failures.length
      ? canonicalRetrieval.successes.length
        ? 'canonical_text_partial'
        : 'canonical_text_unavailable'
      : 'canonical_text'
    : concept.retrievalMode || null;

  const allUsed = [...used, ...effectiveWitnesses];

  if (userId) {
    setActiveBibleConcept(userId, concept.id, message, allUsed);
  }

  return {
    reply,
    scripture,
    concept: concept.id,
    strictTopic: concept.strictTopic,
    polarity,
    witnesses: effectiveWitnesses,
    retrievalMode,
    scriptureMode: canonicalRetrieval?.intent || null,
    authorityClassification: authorityResult?.classification || null,
    primaryScripture: authorityResult?.primaryScripture || null,
    supportingScripture: authorityResult?.supportingScripture || [],
    primaryWitness: authorityResult?.primaryWitness || null,
    supportingWitnesses: authorityResult?.supportingWitnesses || [],
    crossReferences: authorityResult?.crossReferences || [],
    witnessStatus: authorityResult?.witnessStatus || null,
    requestedMinimum: authorityResult?.requestedMinimum ?? null,
    availableWitnessCount: authorityResult?.availableWitnessCount ?? null,
    selectionReason: authorityResult?.selectionReason || null,
    masterRoute: isContinuation ? 'bible_wide_continuation' : 'bible_wide_reasoning',
    lineage: authorityResult?.lineage || null,
  };
}

function buildBibleWideStructured(answer, runtimeContext = {}, safety = {}) {
  if (!answer) return null;
  return {
    reply: answer.reply,
    scripture: answer.scripture || [],
    primaryWitness: answer.primaryWitness || null,
    supportingWitnesses: answer.supportingWitnesses || [],
    crossReferences: answer.crossReferences || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: false,
    safety_level: safety?.level || 'standard',
    admin_flags: ['bible_wide_reasoning', `concept_${answer.concept}`, 'bnc_phase5e'],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent || 'study',
      masterRoute: answer.masterRoute,
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      bibleConcept: answer.concept,
      doctrineTopic: answer.strictTopic || null,
      phase5A: true,
      bncConcept: answer.concept,
      retrievalMode: answer.retrievalMode || null,
      scriptureMode: answer.scriptureMode || null,
      authorityClassification: answer.authorityClassification || null,
      witnessStatus: answer.witnessStatus || null,
      availableWitnessCount: answer.availableWitnessCount ?? null,
      crossReferenceCount: (answer.crossReferences || []).length,
      lineage: answer.lineage || null,
    },
  };
}

module.exports = {
  buildBibleWideAnswer,
  selectDirectWitnesses,
  buildDirectAnswerPolarity,
  buildLineUponLineExplanation,
  resolveConceptForMessage,
  setActiveBibleConcept,
  getConceptState,
  buildBibleWideStructured,
  getConceptById,
  extractExplicitScriptureReferences,
};
