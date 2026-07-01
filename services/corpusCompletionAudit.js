/**
 * Phase 2J-I — Corpus Completion Audit.
 * Classifies confidence-0 recovery blind spots. Discovery only.
 */

const fs = require('fs');
const path = require('path');
const { resolveCardIds, getAllApprovedCards, TOPIC_TO_CARD } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { inferTopic } = require('./questionScriptureRecovery');

const RECOVERY_PACKAGE_PATH = path.join(
  __dirname,
  '..',
  'docs',
  'evidence-candidates',
  'QuestionRecoveryAdminPackage.json',
);

const SCRIPTURE_REF_RE = /\b([1-3]?\s?[A-Za-z]+)\s+(\d+):(\d+(?:-\d+)?)\b/g;

const NEW_TOPIC_PATTERNS = [
  { topic: 'pastoral_care', re: /\b(grieve|grief|lonely|depression|anxious|overwhelmed|hurting|abandoned|pray for|marriage|betrayed|hopeless|comfort|spiritually dry|silent|scared|alone in my faith)\b/i },
  { topic: 'unpardonable_sin', re: /\bunpardonable sin\b/i },
  { topic: 'seal_of_god', re: /\bseal of god\b/i },
  { topic: 'michael_archangel', re: /\bmichael\b.*\barchangel\b/i },
  { topic: 'faith_works', re: /\bfaith\b.*\bworks\b|\bworks\b.*\bfaith\b/i },
  { topic: 'fear_of_god', re: /\bfear god\b/i },
  { topic: 'great_tribulation', re: /\bgreat tribulation\b/i },
  { topic: 'law_commandments', re: /\bten commandments\b|\bcommandments still\b/i },
  { topic: 'death_state', re: /\b(die|died|dies|dead|death|grave|resurrection|passed away|grieve with hope)\b/i },
  { topic: 'dietary_law', re: /\b(diet|leviticus|unclean|clean meat|honor god with)\b/i },
  { topic: 'sabbath', re: /\b(sabbath|sunday worship|isaiah 58|monday.*friday|seventh day)\b/i },
  { topic: 'kingdom', re: /\b(kingdom|matthew 6:10|thy kingdom)\b/i },
  { topic: 'heavens', re: /\b(john 3:13|heaven|ascended)\b/i },
  { topic: 'traditions', re: /\b(bible only|no tradition|tradition)\b/i },
  { topic: 'emotional_pastoral', re: /\b(angry with god|angry i can't|worried about money|still angry)\b/i },
];

const META_PROMPT_RE = /\b(give me a clear yes or no|thank you|that helps)\b/i;

function normalizeKey(q = '') {
  return String(q).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function extractRefsFromText(text = '') {
  const refs = [];
  const re = new RegExp(SCRIPTURE_REF_RE.source, 'gi');
  let m;
  while ((m = re.exec(text)) !== null) {
    refs.push(`${m[1]} ${m[2]}:${m[3]}`.replace(/\s+/g, ' '));
  }
  return refs;
}

function inferTopicCandidate(question = '') {
  for (const { topic, re } of NEW_TOPIC_PATTERNS) {
    if (re.test(question)) return topic;
  }
  return inferTopic(question);
}

function cardTopicFromIds(cardIds = []) {
  const cards = getAllApprovedCards();
  const topics = cardIds
    .map((id) => cards.find((c) => c.cardId === id)?.topic)
    .filter(Boolean);
  return topics[0] || null;
}

function hasContinuityChain(topic) {
  const chains = loadContinuityChains().chains || [];
  return chains.some((c) => c.topic === topic && c.approved);
}

function hasSupportEdges(topic) {
  return getAllApprovedSupportEdges().some((e) => e.topic === topic);
}

function isApprovedTopic(topic) {
  return Boolean(topic && TOPIC_TO_CARD[topic]);
}

function findDuplicateOf(question, recovered) {
  const key = normalizeKey(question);
  const words = new Set(key.split(' ').filter((w) => w.length > 3));

  for (const r of recovered) {
    const rKey = normalizeKey(r.question);
    if (rKey === key) return r;
    const rWords = new Set(rKey.split(' ').filter((w) => w.length > 3));
    let overlap = 0;
    for (const w of words) {
      if (rWords.has(w)) overlap += 1;
    }
    const ratio = overlap / Math.max(words.size, rWords.size, 1);
    if (ratio >= 0.55) return r;
  }
  return null;
}

function isPastoralTurn(question, topicCandidate, hasApprovedCard) {
  if (hasApprovedCard) return false;
  const pastoralRe = /\b(i feel|i am|i'm|i lost|i miss|i cannot|please pray|my mother|my marriage|my child|my friend|lonely|depression|overwhelmed|hopeless|spiritually dry|comfort from scripture|trust god when life hurts)\b/i;
  return pastoralRe.test(question)
    || topicCandidate === 'pastoral_care'
    || topicCandidate === 'emotional_pastoral'
    || topicCandidate === 'emotional';
}

function classifyZeroConfidenceQuestion(item, recovered, expandedContext = {}) {
  const question = item.question;
  const cardIds = resolveCardIds(item.topic, question);
  const mappedCardTopic = cardTopicFromIds(cardIds);
  const topicCandidate = inferTopicCandidate(question);
  const duplicate = findDuplicateOf(question, recovered);
  const refsInQuestion = extractRefsFromText(question);
  const source = item.source || '';
  const isFollowUp = META_PROMPT_RE.test(question);
  const effectiveCardTopic = mappedCardTopic || (isApprovedTopic(topicCandidate) ? topicCandidate : null);
  const hasApprovedCard = Boolean(effectiveCardTopic);
  const recoveryTopicMismatch = item.topic === 'open_topic' && hasApprovedCard;
  const isContextualFollowUp = /\b(you did not mention|apply this while|so leviticus)\b/i.test(question);

  let classification = 'future_research';
  let reason = 'No approved scripture witnesses; pastoral or out-of-scope for current doctrine cards.';

  if (isFollowUp) {
    classification = 'future_research';
    reason = 'Conversational follow-up or meta prompt — not a standalone doctrine discovery target.';
  } else if (duplicate && hasApprovedCard) {
    classification = 'duplicate_topic';
    reason = `Rephrasing of recovered question (${duplicate.recoveryId}) on approved topic ${effectiveCardTopic}.`;
  } else if (duplicate) {
    classification = 'duplicate_topic';
    reason = `Semantic duplicate of recovered question (${duplicate.recoveryId}).`;
  } else if (refsInQuestion.length > 0 && hasApprovedCard) {
    classification = 'missing_scripture_chain';
    reason = `Question cites ${refsInQuestion.join(', ')} and maps to ${effectiveCardTopic}, but recovery attached no chain.`;
  } else if (refsInQuestion.length > 0) {
    classification = 'bad_extraction';
    reason = `Question cites ${refsInQuestion.join(', ')} but recovery found no chain — inference gap.`;
  } else if (recoveryTopicMismatch && hasApprovedCard) {
    classification = 'bad_extraction';
    reason = `Approved card exists (${effectiveCardTopic}) but recovery inferred open_topic — keyword/pattern gap.`;
  } else if (hasApprovedCard && isContextualFollowUp) {
    classification = 'duplicate_topic';
    reason = `Contextual follow-up on approved topic ${effectiveCardTopic} — routes to existing doctrine chain.`;
  } else if (hasApprovedCard && (!hasContinuityChain(effectiveCardTopic) || !hasSupportEdges(effectiveCardTopic))) {
    classification = 'missing_scripture_chain';
    reason = `Approved card for ${effectiveCardTopic} exists but continuity chain or support graph coverage is incomplete.`;
  } else if (hasApprovedCard) {
    classification = 'missing_scripture_chain';
    reason = `Approved evidence exists for ${effectiveCardTopic} but discovery recovery path did not attach scriptures.`;
  } else if (isPastoralTurn(question, topicCandidate, hasApprovedCard)) {
    classification = 'future_research';
    reason = 'Pastoral/emotional support turn — outside frozen doctrine card scope; companion layer not authority discovery.';
  } else if (!isApprovedTopic(topicCandidate) && topicCandidate !== 'open_topic') {
    classification = 'new_topic';
    reason = `Novel doctrinal topic "${topicCandidate}" with no approved evidence card.`;
    if (/iog_qa|public_qa/.test(source)) {
      reason += ' Licensed transcript or Q&A extraction may accelerate scripture chain discovery.';
    }
  } else if (/iog_qa/.test(source) && !item.candidateScriptures?.length) {
    classification = 'needs_transcript';
    reason = 'IOG/archive source may need licensed transcript extraction for scripture-bearing answers.';
  } else if (topicCandidate === 'open_topic') {
    classification = 'future_research';
    reason = 'Open-topic question without clear doctrine mapping — requires human research scoping.';
  }

  return {
    recoveryId: item.recoveryId,
    question,
    classification,
    topicCandidate: topicCandidate || item.discoveredTopic,
    mappedCardTopic: effectiveCardTopic,
    cardIds,
    source,
    discoveredTopic: item.discoveredTopic,
    reason,
  };
}

function buildFutureTopicCandidates(inventory, totalQuestions = 159) {
  const topicMap = new Map();

  for (const item of inventory) {
    const topic = item.topicCandidate;
    if (!topic || topic === 'open_topic' || topic === 'emotional') continue;
    if (item.classification === 'duplicate_topic' || item.classification === 'bad_extraction') continue;

    if (!topicMap.has(topic)) {
      topicMap.set(topic, {
        topic,
        frequency: 0,
        questions: [],
        classifications: new Set(),
      });
    }
    const entry = topicMap.get(topic);
    entry.frequency += 1;
    entry.questions.push(item.question);
    entry.classifications.add(item.classification);
  }

  const candidates = [];
  for (const entry of topicMap.values()) {
    const recoverableIfAdded = entry.frequency;
    const estimatedCoverageImpact = Math.round((recoverableIfAdded / totalQuestions) * 1000) / 10;
    const hasCard = isApprovedTopic(entry.topic);
    const supportGraphGain = hasCard ? 0 : Math.min(4, Math.ceil(entry.frequency / 2));
    const authorityGain = hasCard ? 2 : Math.min(8, entry.frequency + 2);

    candidates.push({
      topic: entry.topic,
      frequency: entry.frequency,
      questions: entry.questions,
      classifications: [...entry.classifications],
      hasApprovedCard: hasCard,
      estimatedCoverageImpact,
      estimatedDiscoveryGain: recoverableIfAdded,
      estimatedSupportGraphGain: supportGraphGain,
      estimatedAuthorityGain: authorityGain,
      reviewRequired: true,
      autoApplied: false,
    });
  }

  return candidates.sort((a, b) => b.frequency - a.frequency);
}

function estimateDiscoveryCeiling(metrics) {
  const {
    totalQuestions,
    currentWithScripture,
    zeroCount,
    byClassification,
    fixableViaExtraction,
    fixableViaNewTopics,
    futureResearchOnly,
  } = metrics;

  const recoverable = fixableViaExtraction;
  const ceilingWithFixes = currentWithScripture + recoverable;
  const ceilingPct = Math.round((ceilingWithFixes / totalQuestions) * 1000) / 10;
  const absoluteCeiling = Math.round(((totalQuestions - futureResearchOnly) / totalQuestions) * 1000) / 10;

  return {
    currentCoveragePct: Math.round((currentWithScripture / totalQuestions) * 1000) / 10,
    ceilingAfterFixesPct: ceilingPct,
    absoluteCeilingExcludingFutureResearchPct: absoluteCeiling,
    recoverableQuestions: recoverable,
    futureResearchExcluded: futureResearchOnly,
    remainingBlindSpots: zeroCount - recoverable,
    byClassification,
  };
}

function runCorpusCompletionAudit(options = {}) {
  const packagePath = options.packagePath || RECOVERY_PACKAGE_PATH;
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const allCandidates = pkg.candidates || [];
  const zeroConfidence = allCandidates.filter((c) => c.confidence === 0);
  const recovered = allCandidates.filter((c) => c.confidence > 0);

  const totalQuestions = options.totalQuestions || 159;
  const currentWithScripture = pkg.recoveredCount + (totalQuestions - allCandidates.length) +
    allCandidates.filter((c) => c.confidence > 0).length -
    zeroConfidence.length +
    zeroConfidence.length;
  // Simpler: baseline from 2J-H = 114 of 159
  const baselineWithScripture = options.baselineWithScripture || 114;

  const inventory = zeroConfidence.map((item) =>
    classifyZeroConfidenceQuestion(item, recovered, options),
  );

  const byClassification = {};
  for (const item of inventory) {
    byClassification[item.classification] = (byClassification[item.classification] || 0) + 1;
  }

  const futureTopicCandidates = buildFutureTopicCandidates(inventory, totalQuestions);

  const fixableViaExtraction = inventory.filter((i) => i.classification === 'bad_extraction').length;
  const fixableViaDedup = inventory.filter((i) => i.classification === 'duplicate_topic').length;
  const fixableViaNewTopics = inventory.filter((i) => i.classification === 'new_topic').length;
  const fixableViaChains = inventory.filter((i) => i.classification === 'missing_scripture_chain').length;
  const futureResearchOnly = inventory.filter((i) => i.classification === 'future_research').length;
  const needsTranscript = inventory.filter((i) => i.classification === 'needs_transcript').length;
  const fixableTotal = fixableViaExtraction + fixableViaDedup + fixableViaChains + fixableViaNewTopics + needsTranscript;

  const missingFromCards = inventory.filter(
    (i) => i.classification === 'new_topic' || i.classification === 'missing_scripture_chain',
  );

  const ceiling = estimateDiscoveryCeiling({
    totalQuestions,
    currentWithScripture: baselineWithScripture,
    zeroCount: zeroConfidence.length,
    byClassification,
    fixableViaExtraction: fixableTotal,
    fixableViaNewTopics,
    futureResearchOnly,
  });

  const uniqueTopics = new Set(inventory.map((i) => i.topicCandidate).filter(Boolean));

  return {
    ranAt: new Date().toISOString(),
    phase: '2J-I',
    zeroConfidenceCount: zeroConfidence.length,
    inventory,
    byClassification,
    futureTopicCandidates,
    missingFromCards,
    ceiling,
    metrics: {
      totalQuestions,
      baselineWithScripture,
      zeroConfidenceCount: zeroConfidence.length,
      uniqueTopicCount: uniqueTopics.size,
      futureTopicCandidateCount: futureTopicCandidates.length,
      fixableViaExtraction,
      fixableViaDedup,
      fixableViaChains,
      fixableViaNewTopics,
      fixableTotal,
      futureResearchOnly,
      needsTranscript,
      topNewTopics: futureTopicCandidates.slice(0, 10),
    },
  };
}

module.exports = {
  runCorpusCompletionAudit,
  classifyZeroConfidenceQuestion,
  buildFutureTopicCandidates,
  inferTopicCandidate,
};
