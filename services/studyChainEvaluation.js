/**
 * HT-4 — Study-Chain Evaluation Lane (candidate / dry-run safe)
 *
 * Separates STUDY assistance from DOCTRINE promotion.
 * Does NOT modify processExtractedReference AUTO_APPROVE rules.
 * Does NOT promote PRIMARY/SUPPORTING witnesses.
 * Does NOT write production stores.
 *
 * Reuses: parseScriptureRef, getLocalPassage, topicWitnessRegistry,
 * evidenceCards, scriptureParallelExpansion, discoverTopicFromText.
 */

const crypto = require('crypto');
const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { getLocalPassage } = require('./localKjvCorpusProvider');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const {
  buildTopicWitnessRegistry,
  findTopicMatchesForReference,
} = require('./topicWitnessRegistry');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');
const { getAllApprovedCards, retrieveEvidenceCards } = require('./evidenceCards');
const { discoverTopicFromText } = require('./bibleWideTopicDiscovery');

const STUDY_CHAIN_CLASSIFICATION = {
  VERIFIED_STUDY_CHAIN: 'VERIFIED_STUDY_CHAIN',
  STUDY_CHAIN_CANDIDATE: 'STUDY_CHAIN_CANDIDATE',
  THEMATIC_STUDY_LINK: 'THEMATIC_STUDY_LINK',
  STUDY_CHAIN_REJECTED: 'STUDY_CHAIN_REJECTED',
  DOCTRINE_REVIEW_REQUIRED: 'DOCTRINE_REVIEW_REQUIRED', // lane flag companion; classification uses others
};

const PASSAGE_ROLES = [
  'definition',
  'command',
  'explanation',
  'example',
  'historical_event',
  'prophecy',
  'fulfillment',
  'warning',
  'consequence',
  'contrast',
  'limitation',
  'exception',
  'application',
  'thematic_background',
];

const MATCH_KIND_PRIORITY = {
  EXACT_DUPLICATE: 0,
  SAME_CHAPTER_AS_PRIMARY: 1,
  SAME_CHAPTER_AS_SUPPORTING: 2,
  SAME_BOOK_ONLY: 3,
};

/**
 * Pick the strongest structural match deterministically.
 * Tie-break: lower priority rank, then topicId localeCompare.
 */
function selectBestMatch(matches = []) {
  if (!matches.length) return null;
  return [...matches].sort((a, b) => {
    const pa = MATCH_KIND_PRIORITY[a.matchKind] ?? 99;
    const pb = MATCH_KIND_PRIORITY[b.matchKind] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(a.topicId || '').localeCompare(String(b.topicId || ''));
  })[0];
}

function sortMatchesStable(matches = []) {
  return [...matches].sort((a, b) => {
    const pa = MATCH_KIND_PRIORITY[a.matchKind] ?? 99;
    const pb = MATCH_KIND_PRIORITY[b.matchKind] ?? 99;
    if (pa !== pb) return pa - pb;
    return String(a.topicId || '').localeCompare(String(b.topicId || ''));
  });
}

function sha16(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
}

function normalizeRef(raw) {
  const parsed = parseScriptureRef(raw);
  if (!parsed) return { raw, normalized: null, parsed: null, valid: false };
  const normalized = `${parsed.book} ${parsed.chapter}${
    parsed.verseStart
      ? `:${parsed.verseStart}${
          parsed.verseEnd && parsed.verseEnd !== parsed.verseStart ? `-${parsed.verseEnd}` : ''
        }`
      : ''
  }`;
  const kjv = verifyKjvReference(normalized);
  const local = getLocalPassage(normalized);
  return {
    raw,
    normalized,
    parsed,
    valid: !!(kjv.valid && local.ok),
    kjvText: local.ok ? local.text : null,
    kjvError: local.ok ? null : local.error || 'invalid',
  };
}

function inferPassageRole(normalizedRef, kjvText = '') {
  const t = String(kjvText || '').toLowerCase();
  const ref = String(normalizedRef || '');
  if (/\b(thou shalt|ye shall|shall not|command|keep the|remember the)\b/i.test(t)) return 'command';
  if (/\b(woe|cursed|beware|if ye will not)\b/i.test(t)) return 'warning';
  if (/\b(therefore|wherefore|because)\b/i.test(t) && /\b(shall|will)\b/i.test(t)) return 'consequence';
  if (/\b(shall come|in that day|prophesy|behold)\b/i.test(t) && /Isaiah|Jeremiah|Ezekiel|Daniel|Revelation|Zechariah/i.test(ref)) {
    return 'prophecy';
  }
  if (/Matthew|Mark|Luke|John|Acts|Romans|Hebrews|Revelation/i.test(ref) && /\b(fulfilled|as it is written|this is that)\b/i.test(t)) {
    return 'fulfillment';
  }
  if (/\b(means|called|is|are)\b/i.test(t) && t.length < 220) return 'definition';
  if (/\b(example|for instance|as)\b/i.test(t) || /Genesis|Exodus|Judges|Samuel|Kings|Chronicles|Acts/i.test(ref)) {
    if (/\b(and .* went|and .* said|it came to pass)\b/i.test(t)) return 'historical_event';
    return 'example';
  }
  if (/\b(but|nevertheless|howbeit)\b/i.test(t)) return 'contrast';
  if (/\b(except|unless|if)\b/i.test(t)) return 'limitation';
  return 'explanation';
}

function structuralStats(normalizedRefs) {
  const parsed = normalizedRefs.map((r) => parseScriptureRef(r)).filter(Boolean);
  const books = new Set(parsed.map((p) => p.book));
  const chapters = new Set(parsed.map((p) => `${p.book}|${p.chapter}`));
  let sameChapterPairs = 0;
  let sameBookPairs = 0;
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      if (parsed[i].book === parsed[j].book) {
        sameBookPairs += 1;
        if (parsed[i].chapter === parsed[j].chapter) sameChapterPairs += 1;
      }
    }
  }
  return {
    uniqueBooks: books.size,
    uniqueChapters: chapters.size,
    sameChapterCount: sameChapterPairs,
    sameBookCount: sameBookPairs,
    crossBookCount: books.size > 1 ? books.size : 0,
    nonconsecutiveSameChapter: (() => {
      const byChapter = new Map();
      for (const p of parsed) {
        if (p.verseStart == null) continue;
        const k = `${p.book}|${p.chapter}`;
        if (!byChapter.has(k)) byChapter.set(k, []);
        byChapter.get(k).push(p.verseStart);
      }
      for (const verses of byChapter.values()) {
        const sorted = [...new Set(verses)].sort((a, b) => a - b);
        if (sorted.length >= 2) {
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] !== sorted[i - 1] + 1) return true;
          }
        }
      }
      return false;
    })(),
  };
}

function cardMembership(topic, normalizedRefs) {
  const cards = getAllApprovedCards();
  const topicNorm = String(topic || '').toLowerCase().replace(/\s+/g, '_');
  let card = cards.find((c) => {
    const t = String(c.topic || c.cardId || '').toLowerCase().replace(/\s+/g, '_');
    return t === topicNorm || t.includes(topicNorm) || topicNorm.includes(t);
  });
  if (!card) {
    try {
      const retrieved = retrieveEvidenceCards({ topic: topicNorm, message: String(topic || '') });
      card = retrieved && retrieved[0];
    } catch (_) {
      card = null;
    }
  }
  if (!card) return { onCard: [], caution: [], cardTopic: null };
  const pool = [
    ...(card.primaryScriptures || []),
    ...(card.supportingScriptures || []),
  ]
    .map((r) => normalizeRef(r).normalized)
    .filter(Boolean)
    .map((r) => String(r).toLowerCase());
  const caution = (card.cautionPassages || []).map(String);
  const onCard = normalizedRefs.filter((r) => {
    const rl = String(r).toLowerCase();
    return pool.some(
      (p) =>
        p === rl ||
        rl.startsWith(p) ||
        p.startsWith(rl.split(':')[0]) ||
        // chapter-level membership (Genesis 2 vs Genesis 2:2-3)
        rl.split(':')[0] === p.split(':')[0],
    );
  });
  return { onCard: onCard.slice().sort((a, b) => String(a).localeCompare(String(b))), caution, cardTopic: card.topic || null };
}

function parallelSeedHits(normalizedRefs) {
  const expanded = expandScriptureParallels({ scriptureChain: normalizedRefs });
  const set = new Set(normalizedRefs);
  return expanded.filter((r) => !set.has(r));
}

/**
 * Deterministic study-chain evaluation for one source group.
 * @param {object} input
 */
function evaluateStudyChain(input = {}, opts = {}) {
  const registry = opts.registry || buildTopicWitnessRegistry();
  const sourceOrder = [...(input.scriptureReferencesSourceOrder || [])];
  const topicHint = input.sourceTopic || input.normalizedTopic || '';
  const discovered = discoverTopicFromText(
    `${input.sourceTopic || ''} ${input.sourceDocument || ''} ${(input.excerpt || '').slice(0, 400)}`,
    { lessonTitle: input.sourceDocument || input.sourceTopic },
  );
  const normalizedTopic = input.normalizedTopic || discovered.topic || topicHint || 'unspecified';

  const passageRows = sourceOrder.map((raw) => {
    const n = normalizeRef(raw);
    const matchesRaw = n.valid ? findTopicMatchesForReference(n.normalized, registry) : [];
    const matches = sortMatchesStable(matchesRaw.map((m) => ({ topicId: m.topicId, matchKind: m.matchKind })));
    const best = selectBestMatch(matches);
    const role = n.valid ? inferPassageRole(n.normalized, n.kjvText) : 'thematic_background';
    return {
      raw,
      normalized: n.normalized,
      valid: n.valid,
      kjvText: n.kjvText,
      kjvError: n.kjvError,
      role,
      matches,
      bestMatchKind: best?.matchKind || null,
      bestTopicId: best?.topicId || null,
    };
  });

  const validPassages = passageRows.filter((p) => p.valid);
  const invalidPassages = passageRows.filter((p) => !p.valid);
  const normalizedValid = validPassages.map((p) => p.normalized);
  const stats = structuralStats(normalizedValid);
  const card = cardMembership(normalizedTopic, normalizedValid);
  const parallelExtras = parallelSeedHits(normalizedValid);

  // --- Scoring dimensions (0–100) ---
  const topicIds = validPassages.map((p) => p.bestTopicId).filter(Boolean);
  const dominantTopic = mode(topicIds) || normalizedTopic;
  const topicCoherenceScore = !validPassages.length
    ? 0
    : Math.round(
        (validPassages.filter(
          (p) =>
            p.bestTopicId === dominantTopic ||
            (p.matches || []).some((m) => m.topicId === dominantTopic) ||
            card.onCard.map((x) => String(x).toLowerCase()).includes(String(p.normalized).toLowerCase()),
        ).length /
          validPassages.length) *
          100,
      );

  const sameChapterShare = stats.uniqueChapters === 1 && validPassages.length >= 2;
  const sameBookShare = stats.uniqueBooks === 1 && validPassages.length >= 2;
  const cardShare = card.onCard.length / Math.max(1, validPassages.length);
  const dominantShare =
    validPassages.filter((p) => p.bestTopicId === dominantTopic).length / Math.max(1, validPassages.length);
  const propositionCoherenceScore = Math.round(
    Math.min(
      100,
      (sameChapterShare ? 45 : 0) +
        (sameBookShare ? 25 : 0) +
        dominantShare * 40 +
        cardShare * 35 +
        (parallelExtras.length ? 10 : 0) +
        (stats.crossBookCount >= 2 && (cardShare >= 0.15 || dominantShare >= 0.4) ? 25 : 0) +
        (stats.nonconsecutiveSameChapter ? 10 : 0),
    ),
  );

  const contextIntegrityScore = !passageRows.length
    ? 0
    : Math.round((validPassages.length / passageRows.length) * 100) -
      (card.caution.length ? 10 : 0);

  const roles = new Set(validPassages.map((p) => p.role));
  const roleComplementarityScore = Math.min(
    100,
    roles.size >= 2 ? 55 + Math.min(35, (roles.size - 2) * 10) : validPassages.length >= 2 ? 40 : 15,
  );

  const readingValueScore = Math.min(
    100,
    (validPassages.length >= 2 ? 50 : 10) +
      (stats.nonconsecutiveSameChapter ? 15 : 0) +
      (sourceOrder.length === validPassages.length ? 20 : 5) +
      (stats.crossBookCount >= 2 ? 15 : 0),
  );

  const canonicalConsistencyScore = Math.max(
    0,
    80 - (card.caution.length ? 25 : 0) + (card.onCard.length ? 15 : 0),
  );

  const overallStudyChainScore = Math.round(
    (topicCoherenceScore +
      propositionCoherenceScore +
      Math.max(0, contextIntegrityScore) +
      roleComplementarityScore +
      canonicalConsistencyScore +
      readingValueScore) /
      6,
  );

  // Keyword-only detection: no structural topic match and no card membership
  const keywordOnly =
    validPassages.length >= 2 &&
    topicCoherenceScore < 40 &&
    card.onCard.length === 0 &&
    !sameChapterShare &&
    propositionCoherenceScore < 35;

  const unrelatedPassages = validPassages
    .filter((p) => {
      if (!dominantTopic) return false;
      if (card.onCard.map((x) => x.toLowerCase()).includes(String(p.normalized).toLowerCase())) return false;
      if (p.bestTopicId === dominantTopic) return false;
      // Keep if any match shares dominant topic
      if ((p.matches || []).some((m) => m.topicId === dominantTopic)) return false;
      // Only exclude when a clear majority topic exists and this passage has a different topic match
      if (dominantShare >= 0.4 && p.bestTopicId && p.bestTopicId !== dominantTopic) return true;
      return false;
    })
    .map((p) => p.normalized);

  const chainMembers = validPassages.filter((p) => !unrelatedPassages.includes(p.normalized));

  // Original doctrine decisions (preserved; never overridden)
  const originalDecisions = input.originalEvaluatorDecisions || [];
  const doctrineReviewRequired = originalDecisions.some((d) =>
    ['NEEDS_ADMIN_REVIEW', 'needs_admin_review', 'SAME_BOOK_ONLY', 'SAME_CHAPTER_AS_SUPPORTING'].includes(
      d.rulesDecision || d.matchKind || d.classification,
    ),
  ) || chainMembers.some((p) =>
    ['SAME_BOOK_ONLY', 'SAME_CHAPTER_AS_SUPPORTING'].includes(p.bestMatchKind),
  );

  const blockingFactors = [];
  if (validPassages.length < 2) {
    blockingFactors.push({ factor: 'fewer_than_two_valid_kjv_references', repairable: false });
  }
  if (invalidPassages.length) {
    blockingFactors.push({
      factor: 'invalid_references_excluded',
      repairable: true,
      refs: invalidPassages.map((p) => p.raw),
    });
  }
  if (keywordOnly) {
    blockingFactors.push({ factor: 'keyword_only_similarity', repairable: false });
  }
  if (card.caution.length) {
    blockingFactors.push({ factor: 'card_caution_passages_present', repairable: true, note: 'balancing may be required' });
  }
  if (unrelatedPassages.length) {
    unrelatedPassages.sort((a, b) => String(a).localeCompare(String(b)));
    blockingFactors.push({ factor: 'unrelated_passages_excluded', repairable: true, refs: unrelatedPassages });
  }

  let classification;
  let confidence;
  if (validPassages.length < 2) {
    classification = STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_REJECTED;
    confidence = 'high';
  } else if (keywordOnly) {
    classification = STUDY_CHAIN_CLASSIFICATION.THEMATIC_STUDY_LINK;
    confidence = 'medium';
  } else if (
    overallStudyChainScore >= 70 &&
    topicCoherenceScore >= 50 &&
    propositionCoherenceScore >= 45 &&
    contextIntegrityScore >= 70 &&
    chainMembers.length >= 2
  ) {
    classification = STUDY_CHAIN_CLASSIFICATION.VERIFIED_STUDY_CHAIN;
    confidence = overallStudyChainScore >= 80 ? 'high' : 'medium';
  } else if (overallStudyChainScore >= 45 && chainMembers.length >= 2) {
    classification = STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_CANDIDATE;
    confidence = 'medium';
  } else {
    classification = STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_REJECTED;
    confidence = 'medium';
  }

  // Study-coherence admin vs doctrine admin
  const studyAdminRequired =
    classification === STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_CANDIDATE ||
    (classification === STUDY_CHAIN_CLASSIFICATION.THEMATIC_STUDY_LINK && overallStudyChainScore >= 40);
  const adminReviewRequired = studyAdminRequired; // study lane only — doctrine is separate flag

  const proposedProposition = buildProposition(normalizedTopic, chainMembers, stats);

  const recommendedReadingOrder = recommendOrder(chainMembers.map((p) => p.normalized));

  const studyChainId = `sc_${sha16(
    [
      input.corpus,
      input.sourceDocument,
      input.sourceLocation,
      sourceOrder.join('|'),
      normalizedTopic,
    ].join('::'),
  )}`;

  return {
    studyChainId,
    corpus: input.corpus || null,
    sourceDocument: input.sourceDocument || null,
    sourceAuthorOrOrganization: input.sourceAuthorOrOrganization || null,
    sourceLocation: input.sourceLocation || null,
    sourceTopic: input.sourceTopic || null,
    normalizedTopic,
    proposedProposition,
    scriptureReferencesSourceOrder: sourceOrder,
    normalizedReferences: normalizedValid,
    recommendedReadingOrder,
    passages: passageRows,
    chainMemberReferences: chainMembers.map((p) => p.normalized),
    passageRoles: Object.fromEntries(chainMembers.map((p) => [p.normalized, p.role])),
    relationshipTypes: deriveRelationshipTypes(stats, card, parallelExtras),
    sameChapterCount: stats.sameChapterCount,
    sameBookCount: stats.sameBookCount,
    crossBookCount: stats.crossBookCount,
    structural: stats,
    topicCoherenceScore,
    propositionCoherenceScore,
    contextIntegrityScore: Math.max(0, contextIntegrityScore),
    roleComplementarityScore,
    canonicalConsistencyScore,
    readingValueScore,
    overallStudyChainScore,
    classification,
    confidence,
    blockingFactors,
    balancingPassages: card.caution,
    missingPassages: [],
    unrelatedPassages,
    invalidPassages: invalidPassages.map((p) => p.raw),
    doctrineReviewRequired: !!doctrineReviewRequired,
    historyReviewRequired: !!(input.historicalAssertions && input.historicalAssertions.length),
    languageReviewRequired: !!(input.languageAssertions && input.languageAssertions.length),
    technicalReviewRequired: invalidPassages.length > 0,
    provenance: {
      discoverySource: input.corpus,
      sourceDocument: input.sourceDocument,
      sourceLocation: input.sourceLocation,
      sourceOrderPreserved: true,
      processingVersion: 'ht4-study-chain-v1',
    },
    originalEvaluatorDecisions: originalDecisions,
    updatedEvaluatorDecisions: {
      scriptureDecision: invalidPassages.length === passageRows.length ? 'INVALID' : 'VALID',
      studyChainDecision: classification,
      doctrineDecision: doctrineReviewRequired ? 'NEEDS_ADMIN_REVIEW' : 'NOT_REQUIRED_FOR_STUDY_LANE',
      governanceDecision: 'CANDIDATE_ONLY',
      productionActivation: false,
    },
    adminReviewRequired,
    adminReason: studyAdminRequired
      ? `Study-chain ${classification} requires focused coherence confirmation`
      : classification === STUDY_CHAIN_CLASSIFICATION.VERIFIED_STUDY_CHAIN
        ? 'Study chain verified for study assistance only — doctrine promotion unchanged'
        : `Study chain ${classification}`,
    lanes: {
      scriptureValidity: invalidPassages.length === 0 ? 'PASS' : 'PARTIAL',
      studyChain: classification,
      doctrineEvidence: doctrineReviewRequired ? 'NEEDS_ADMIN_REVIEW' : 'SEPARATE',
      historicalLanguage: 'UNVERIFIED_OR_NOT_APPLICABLE',
      governance: 'CANDIDATE_ONLY',
    },
    productionActivation: false,
    persist: false,
  };
}

function mode(arr) {
  if (!arr.length) return null;
  const counts = new Map();
  for (const x of arr) counts.set(x, (counts.get(x) || 0) + 1);
  // Deterministic tie-break: higher count first, then localeCompare topic id
  return [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return String(a[0]).localeCompare(String(b[0]));
  })[0][0];
}

function buildProposition(topic, members, stats) {
  const roles = [...new Set(members.map((m) => m.role))];
  const scope = stats.uniqueChapters === 1
    ? 'same-chapter passages'
    : stats.uniqueBooks === 1
      ? 'same-book passages'
      : 'cross-book passages';
  return `Selected ${scope} contribute to studying "${topic}" via roles: ${roles.join(', ') || 'explanation'}.`;
}

function recommendOrder(refs) {
  const otBooks = new Set([
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
    '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  ]);
  return [...refs].sort((a, b) => {
    const pa = parseScriptureRef(a);
    const pb = parseScriptureRef(b);
    if (!pa || !pb) return 0;
    const aOt = otBooks.has(pa.book) ? 0 : 1;
    const bOt = otBooks.has(pb.book) ? 0 : 1;
    if (aOt !== bOt) return aOt - bOt;
    if (pa.book !== pb.book) return String(pa.book).localeCompare(String(pb.book));
    if (pa.chapter !== pb.chapter) return pa.chapter - pb.chapter;
    return (pa.verseStart || 0) - (pb.verseStart || 0);
  });
}

function deriveRelationshipTypes(stats, card, parallelExtras) {
  const types = [];
  if (stats.uniqueChapters === 1) types.push('same_chapter_study');
  if (stats.uniqueBooks === 1 && stats.uniqueChapters > 1) types.push('same_book_study');
  if (stats.crossBookCount >= 2) types.push('cross_book_study');
  if (stats.nonconsecutiveSameChapter) types.push('nonconsecutive_verses');
  if (card.onCard.length) types.push('evidence_card_overlap');
  if (parallelExtras.length) types.push('parallel_seed_expansion');
  return types.length ? types : ['source_grouped'];
}

/**
 * Group atomic claims into study-chain source groups.
 */
function groupClaimsIntoStudyChains(claims = []) {
  const groups = new Map();
  for (const c of claims) {
    const refs = c.scripturesExplicit || [];
    if (!refs.length) continue;
    let key;
    if (c.corpus === 'Holy Testaments') {
      const m = String(c.sourceLocation || '').match(/section=(\d+)/);
      key = `HT|${c.sourceTitle}|sec=${m ? m[1] : 'x'}`;
    } else if (c.corpus === 'ICOJ') {
      key = `ICOJ|${c.sourceTitle}`;
    } else {
      key = `IOG|${c.sourceTitle}|topic=${c.proposedTopic || 'none'}`;
    }
    if (!groups.has(key)) {
      groups.set(key, {
        groupKey: key,
        corpus: c.corpus,
        sourceDocument: c.sourceTitle,
        sourceAuthorOrOrganization: c.sourceAuthorOrOrganization,
        sourceLocation: c.sourceLocation,
        sourceTopic: c.proposedTopic,
        scriptureReferencesSourceOrder: [],
        claimIds: [],
        historicalAssertions: [],
        languageAssertions: [],
        excerpts: [],
      });
    }
    const g = groups.get(key);
    for (const r of refs) {
      if (!g.scriptureReferencesSourceOrder.includes(r)) g.scriptureReferencesSourceOrder.push(r);
    }
    g.claimIds.push(c.claimId);
    if (c.historicalAssertions?.length) g.historicalAssertions.push(...c.historicalAssertions);
    if (c.languageAssertions?.length) g.languageAssertions.push(...c.languageAssertions);
    if (c.exactQuotedText) g.excerpts.push(c.exactQuotedText.slice(0, 200));
  }
  return [...groups.values()].filter((g) => g.scriptureReferencesSourceOrder.length >= 2);
}

module.exports = {
  STUDY_CHAIN_CLASSIFICATION,
  PASSAGE_ROLES,
  MATCH_KIND_PRIORITY,
  evaluateStudyChain,
  groupClaimsIntoStudyChains,
  normalizeRef,
  inferPassageRole,
  structuralStats,
  recommendOrder,
  selectBestMatch,
  sortMatchesStable,
};
