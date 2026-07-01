/**
 * Phase 2J-O — Admin Review Acceleration Layer.
 * AI-assisted review recommendations only. Never approves or promotes.
 */

const fs = require('fs');
const path = require('path');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const {
  runWitnessQualityAudit,
  classifyWitnessesFromExpansion,
  buildTopicReviewBundles,
} = require('./witnessQualityAudit');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const PHASE2I_CLASS_C_MAP = {
  g2r_0010: 1, g2r_0036: 1, g2r_0001: 0.5, g2r_0037: 1, g2r_0008: 1,
  g2r_0023: 1, g2r_0024: 1, g2r_0022: 0.5, g2r_0011: 0.5, g2r_0030: 0.5,
  g2r_0031: 0.5, g2r_0033: 0.3, g2r_0034: 0.3, g2r_0035: 0.3, g2r_0038: 0.3,
  g2r_0039: 0.3, g2r_0040: 0.3, g2r_0041: 0.3, g2r_0043: 1,
  exp_0001: 1, exp_0007: 1, exp_0005: 0.5, rec_0017: 0.8, rec_0006: 0.8,
};

const OUTPUT_PATHS = {
  recommendations: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'review-recommendations.json'),
};

const TOPIC_TO_CARD = {
  sabbath: 'sabbath',
  death_state: 'deathState',
  messiah_logos: 'messiahLogos',
  dietary_law: 'dietaryLaw',
  holiness: 'holiness',
  kingdom: 'kingdom',
  heavens: 'heavens',
};

const REVIEW_STATUS = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
};

function witnessCountsForCandidate(candidateId, witnessClassifications) {
  const rows = witnessClassifications.filter((w) => w.candidateId === candidateId);
  const count = (type) => rows.filter((w) => w.relationshipType === type).length;
  return {
    directWitnessCount: count('direct_support'),
    supportingWitnessCount: count('supporting_witness') + count('confirming_witness'),
    continuityWitnessCount: count('continuity_witness'),
    cautionWitnessCount: count('caution_witness') + count('limiting_witness'),
    contradictionWitnessCount: count('contradiction_witness'),
    totalWitnessCount: rows.length,
  };
}

function testamentFromRef(ref = '') {
  const book = String(ref).split(/\s+/)[0]?.toLowerCase() || '';
  const nt = ['matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'corinthians', 'galatians',
    'ephesians', 'philippians', 'colossians', 'thessalonians', 'timothy', 'titus', 'philemon',
    'hebrews', 'james', 'peter', 'jude', 'revelation'];
  if (nt.some((b) => book.startsWith(b.slice(0, 3)))) return 'NT';
  return 'OT';
}

function computeGenesisRevelationCoverage(candidate) {
  const chain = candidate.genesisToRevelationChain || candidate.scriptureOrder || candidate.originalScriptures || [];
  const ot = chain.filter((r) => testamentFromRef(r) === 'OT').length;
  const nt = chain.filter((r) => testamentFromRef(r) === 'NT').length;
  const span = candidate.genesisToRevelationSpan || (ot > 0 && nt > 0);
  let score = Math.min(100, chain.length * 8);
  if (span) score = Math.min(100, score + 20);
  if (ot >= 2 && nt >= 2) score = Math.min(100, score + 15);
  return {
    score,
    span,
    chainLength: chain.length,
    oldTestamentRefs: ot,
    newTestamentRefs: nt,
  };
}

function computeTopicCoverage(candidate, topicBundles) {
  const topic = normalizeTopic(candidate.topic) || candidate.topic;
  const bundle = topicBundles.find((b) => b.topic === topic);
  const approvedCards = getAllApprovedCards();
  const hasCard = approvedCards.some((c) => c.topic === topic);
  const topicCandidateCount = bundle?.candidateIds?.length || 1;
  const registryQuestions = bundle?.registryQuestionCount || topicCandidateCount;
  return {
    topic,
    hasApprovedCard: hasCard,
    topicCandidateCount,
    registryQuestionCount: registryQuestions,
    coveragePct: Math.min(100, Math.round((topicCandidateCount / Math.max(registryQuestions, 1)) * 100)),
  };
}

function computeDoctrineAlignment(candidate) {
  const topic = normalizeTopic(candidate.topic) || candidate.topic;
  const cardId = TOPIC_TO_CARD[topic];
  const cards = getAllApprovedCards();
  const card = cardId ? cards.find((c) => c.id === cardId || c.topic === topic) : null;

  if (!card) {
    return {
      aligned: false,
      score: candidate.supportScore >= 80 ? 55 : 35,
      label: 'novel_topic',
      note: 'No frozen evidence card for this topic — alignment cannot be fully verified.',
    };
  }

  const candidateRefs = new Set(
    (candidate.originalScriptures || []).map((r) => String(r).toLowerCase()),
  );
  const cardRefs = [...(card.primaryScriptures || []), ...(card.supportingScriptures || [])];
  const overlap = cardRefs.filter((r) =>
    candidateRefs.has(String(r).toLowerCase())
    || [...candidateRefs].some((cr) => cr.includes(String(r).split(':')[0]?.toLowerCase())),
  ).length;

  const overlapPct = cardRefs.length ? Math.round((overlap / cardRefs.length) * 100) : 0;
  const score = Math.min(100, 50 + overlapPct * 0.5 + (candidate.supportScore >= 85 ? 15 : 0));

  return {
    aligned: score >= 70,
    score,
    label: score >= 80 ? 'strong_alignment' : score >= 60 ? 'moderate_alignment' : 'weak_alignment',
    note: `Overlaps ${overlap} of ${cardRefs.length} approved card scriptures.`,
    cardId: card.id,
  };
}

function hasUnresolvedChainConflict(candidate, witnessCounts, witnessExpansion) {
  const refs = candidate.originalScriptures || candidate.scripturesCited || [];
  const kjvInvalid = refs.some((r) => !verifyKjvReference(r).valid);
  const claimsG2R = (candidate.genesisToRevelationChain || []).length >= 4;
  const spanMissing = claimsG2R && !candidate.genesisToRevelationSpan
    && computeGenesisRevelationCoverage(candidate).newTestamentRefs === 0;

  const expansionContradictions = (witnessExpansion?.contradictionWitnesses || []).length > 0
    || (witnessExpansion?.contradictions || []).length > 0;

  return {
    unresolved: witnessCounts.contradictionWitnessCount > 0
      || expansionContradictions
      || kjvInvalid
      || spanMissing,
    reasons: [
      witnessCounts.contradictionWitnessCount > 0 ? 'contradiction_witnesses' : null,
      expansionContradictions ? 'expansion_contradictions' : null,
      kjvInvalid ? 'kjv_validation_failure' : null,
      spanMissing ? 'incomplete_genesis_revelation_span' : null,
    ].filter(Boolean),
  };
}

function continuityStrong(signals, g2r) {
  if (g2r.span && g2r.chainLength >= 5) return true;
  if (signals.continuityWitnessCount >= 2 && g2r.oldTestamentRefs >= 1 && g2r.newTestamentRefs >= 1) return true;
  if (signals.directWitnessCount >= 3 && signals.continuityWitnessCount >= 1) return true;
  return false;
}

function computeDegradationReductionPotential(candidate) {
  const mapped = PHASE2I_CLASS_C_MAP[candidate.candidateId];
  if (mapped) return Math.round(mapped * 0.55 * 10) / 10;
  const base = candidate.supportScore >= 90 ? 1.2 : candidate.supportScore >= 80 ? 0.8 : 0.3;
  const delta = (candidate.supportDelta || 0) * 0.05;
  return Math.round(Math.min(2.5, base + delta) * 10) / 10;
}

function determineReviewStatus(signals, chainConflict) {
  if (signals.contradictionWitnessCount > 0
    || chainConflict.unresolved
    || signals.supportScore < 80) {
    return REVIEW_STATUS.RED;
  }

  if (signals.supportScore >= 90
    && signals.contradictionWitnessCount === 0
    && signals.cautionWitnessCount <= 1
    && signals.continuityStrong) {
    return REVIEW_STATUS.GREEN;
  }

  if (signals.supportScore >= 80 && signals.supportScore <= 89) {
    return REVIEW_STATUS.YELLOW;
  }

  if (signals.cautionWitnessCount > 0) {
    return REVIEW_STATUS.YELLOW;
  }

  if (signals.supportScore >= 90 && !signals.continuityStrong) {
    return REVIEW_STATUS.YELLOW;
  }

  return REVIEW_STATUS.YELLOW;
}

function buildSummary(status, signals, g2r, chainConflict) {
  if (status === REVIEW_STATUS.GREEN) {
    return 'Strong Genesis→Revelation continuity with no contradiction witnesses.';
  }
  if (status === REVIEW_STATUS.RED) {
    if (signals.contradictionWitnessCount > 0) {
      return 'Contradiction witnesses exist and require review.';
    }
    if (chainConflict.reasons.includes('kjv_validation_failure')) {
      return 'Scripture reference validation issues block promotion readiness.';
    }
    if (signals.supportScore < 80) {
      return `Support score ${signals.supportScore} is below the admin review threshold.`;
    }
    return 'Unresolved chain conflicts require admin resolution.';
  }
  if (!signals.continuityStrong) {
    return 'Strong support but limited continuity witnesses.';
  }
  if (signals.cautionWitnessCount > 0) {
    return `Strong support score with ${signals.cautionWitnessCount} caution witness(es) to review.`;
  }
  return `Moderate support score (${signals.supportScore}) — standard admin review recommended.`;
}

function buildApprovalRationale(status, signals, doctrine) {
  if (status === REVIEW_STATUS.RED) return null;
  const parts = [];
  if (signals.supportScore >= 90) parts.push(`High support score (${signals.supportScore})`);
  if (signals.contradictionWitnessCount === 0) parts.push('no contradiction witnesses');
  if (doctrine.aligned) parts.push(`aligns with approved ${doctrine.cardId || doctrine.label}`);
  if (signals.degradationReductionPotential >= 1) {
    parts.push(`~${signals.degradationReductionPotential}% degradation reduction potential`);
  }
  return parts.length ? `Candidate shows ${parts.join(', ')}.` : null;
}

function buildHoldRationale(status, signals, chainConflict) {
  if (status !== REVIEW_STATUS.RED && status !== REVIEW_STATUS.YELLOW) return null;
  const parts = [];
  if (signals.contradictionWitnessCount > 0) {
    parts.push(`${signals.contradictionWitnessCount} contradiction witness(es)`);
  }
  if (signals.cautionWitnessCount > 0) {
    parts.push(`${signals.cautionWitnessCount} caution witness(es)`);
  }
  if (chainConflict.unresolved) parts.push(...chainConflict.reasons);
  if (signals.supportScore < 80) parts.push('support below 80');
  if (!signals.continuityStrong) parts.push('weak G2R continuity');
  return parts.length ? `Hold recommended: ${parts.join('; ')}.` : null;
}

function buildRiskFactors(signals, chainConflict, doctrine) {
  const risks = [];
  if (signals.contradictionWitnessCount > 0) {
    risks.push(`${signals.contradictionWitnessCount} contradiction witness(es)`);
  }
  if (signals.cautionWitnessCount > 0) {
    risks.push(`${signals.cautionWitnessCount} caution/limiting witness(es)`);
  }
  if (!doctrine.aligned) risks.push(doctrine.note);
  if (chainConflict.unresolved) risks.push(...chainConflict.reasons);
  if (!signals.continuityStrong) risks.push('limited Genesis→Revelation continuity');
  return risks;
}

function recommendedNextStep(status, signals) {
  if (status === REVIEW_STATUS.GREEN) {
    return signals.supportScore >= 95
      ? 'Priority admin review — strong candidate for approval batch.'
      : 'Schedule for next approval batch after brief witness scan.';
  }
  if (status === REVIEW_STATUS.YELLOW) {
    return 'Review witness bundle and continuity chain before approval decision.';
  }
  return 'Resolve contradiction or chain conflicts before any approval consideration.';
}

function computeDecisionAssist(status, signals) {
  let approve = 15;
  let hold = 25;
  let review = 60;

  if (status === REVIEW_STATUS.GREEN) {
    approve = signals.supportScore >= 95 ? 72 : signals.supportScore >= 90 ? 62 : 52;
    hold = signals.cautionWitnessCount > 0 ? 18 : 12;
    review = 100 - approve - hold;
  } else if (status === REVIEW_STATUS.YELLOW) {
    approve = signals.supportScore >= 85 ? 28 : 18;
    hold = signals.cautionWitnessCount > 0 ? 42 : 32;
    review = 100 - approve - hold;
  } else {
    approve = 5;
    hold = signals.contradictionWitnessCount > 0 ? 55 : 45;
    review = 100 - approve - hold;
  }

  return {
    approveLikelihood: approve,
    holdLikelihood: hold,
    reviewLikelihood: review,
    advisoryOnly: true,
    autoDecide: false,
    note: 'Advisory probabilities only — human decision required.',
  };
}

function sortCandidates(list) {
  return [...list].sort((a, b) => {
    if (b.signals.supportScore !== a.signals.supportScore) {
      return b.signals.supportScore - a.signals.supportScore;
    }
    if (b.signals.degradationReductionPotential !== a.signals.degradationReductionPotential) {
      return b.signals.degradationReductionPotential - a.signals.degradationReductionPotential;
    }
    return String(a.topic).localeCompare(String(b.topic));
  });
}

function buildWitnessIndex(audit) {
  const byCandidate = new Map();
  for (const w of audit.witnessClassifications) {
    if (!byCandidate.has(w.candidateId)) byCandidate.set(w.candidateId, []);
    byCandidate.get(w.candidateId).push(w);
  }
  return byCandidate;
}

function witnessExpansionForCandidate(candidate) {
  return expandFullScriptureWitnesses({
    question: candidate.question,
    scripturesCited: candidate.originalScriptures || [],
    scriptureOrder: candidate.scriptureOrder || candidate.originalScriptures || [],
    topic: candidate.topic,
    conclusion: candidate.candidateConclusion || '',
  });
}

function enrichCandidate(candidate, audit, topicBundles, witnessByCandidate) {
  let witnessExpansion = null;
  let classifications = witnessByCandidate.get(candidate.candidateId) || [];

  if (!classifications.length) {
    witnessExpansion = witnessExpansionForCandidate(candidate);
    classifications = classifyWitnessesFromExpansion(witnessExpansion, {
      candidateId: candidate.candidateId,
      topic: candidate.topic,
      scriptures: candidate.originalScriptures,
      parallelRefs: candidate.discoveredWitnesses,
    });
  }

  const counts = witnessCountsForCandidate(candidate.candidateId, classifications.length
    ? classifications
    : audit.witnessClassifications.filter((w) => w.candidateId === candidate.candidateId));

  if (!witnessExpansion && classifications.length) {
    witnessExpansion = {
      contradictionWitnesses: classifications.filter((w) => w.relationshipType === 'contradiction_witness').map((w) => w.witnessRef),
      cautionWitnesses: classifications.filter((w) => w.relationshipType === 'caution_witness').map((w) => w.witnessRef),
      contradictions: [],
    };
  } else if (!witnessExpansion) {
    witnessExpansion = witnessExpansionForCandidate(candidate);
  }

  const g2r = computeGenesisRevelationCoverage(candidate);
  const topicCov = computeTopicCoverage(candidate, topicBundles);
  const doctrine = computeDoctrineAlignment(candidate);
  const chainConflict = hasUnresolvedChainConflict(candidate, counts, witnessExpansion);
  const degradationReductionPotential = computeDegradationReductionPotential(candidate);

  const signals = {
    supportScore: candidate.supportScore,
    ...counts,
    genesisRevelationCoverage: g2r.score,
    genesisRevelationSpan: g2r.span,
    topicCoverage: topicCov.coveragePct,
    topicHasApprovedCard: topicCov.hasApprovedCard,
    existingDoctrineAlignment: doctrine.score,
    degradationReductionPotential,
    continuityStrong: false,
  };
  signals.continuityStrong = continuityStrong(signals, g2r);

  const reviewStatus = determineReviewStatus(signals, chainConflict);

  const explanation = {
    candidateId: candidate.candidateId,
    question: candidate.question,
    topic: candidate.topic,
    discoveryPhase: candidate.discoveryPhase,
    reviewStatus,
    summary: buildSummary(reviewStatus, signals, g2r, chainConflict),
    approvalRationale: buildApprovalRationale(reviewStatus, signals, doctrine),
    holdRationale: buildHoldRationale(reviewStatus, signals, chainConflict),
    riskFactors: buildRiskFactors(signals, chainConflict, doctrine),
    recommendedNextStep: recommendedNextStep(reviewStatus, signals),
    riskSummary: buildRiskFactors(signals, chainConflict, doctrine).join('; ') || 'No elevated risks identified.',
    reviewExplanation: buildSummary(reviewStatus, signals, g2r, chainConflict),
    signals,
    genesisRevelationDetail: g2r,
    topicCoverageDetail: topicCov,
    doctrineAlignmentDetail: doctrine,
    chainConflict,
    decisionAssist: computeDecisionAssist(reviewStatus, signals),
    reviewRequired: true,
    autoApplied: false,
    autoApproved: false,
    autoPromoted: false,
    humanDecisionRequired: true,
  };

  return { explanation, signals, reviewStatus };
}

function estimateTimeSavings(enriched) {
  const MINUTES_WITHOUT = 15;
  const minutesWith = {
    GREEN: 4,
    YELLOW: 9,
    RED: 11,
  };
  let saved = 0;
  for (const e of enriched) {
    const withLayer = minutesWith[e.reviewStatus] || 10;
    saved += MINUTES_WITHOUT - withLayer;
  }
  const totalWithout = enriched.length * MINUTES_WITHOUT;
  const pct = Math.round((saved / totalWithout) * 100);
  return {
    candidates: enriched.length,
    minutesSaved: saved,
    hoursSaved: Math.round((saved / 60) * 10) / 10,
    percentReduction: pct,
    assumption: `${MINUTES_WITHOUT} min/candidate manual review vs accelerated triage`,
  };
}

function runReviewAccelerationLayer() {
  const candidates = loadUnifiedCandidates();
  const audit = runWitnessQualityAudit();
  const topicBundles = buildTopicReviewBundles(candidates, audit.witnessClassifications, []);
  const witnessByCandidate = buildWitnessIndex(audit);

  const enriched = [];
  for (const c of candidates) {
    enriched.push(enrichCandidate(c, audit, topicBundles, witnessByCandidate));
  }

  const explanations = enriched.map((e) => e.explanation);
  const green = sortCandidates(enriched.filter((e) => e.reviewStatus === REVIEW_STATUS.GREEN));
  const yellow = sortCandidates(enriched.filter((e) => e.reviewStatus === REVIEW_STATUS.YELLOW));
  const red = sortCandidates(enriched.filter((e) => e.reviewStatus === REVIEW_STATUS.RED));

  const reviewFirst = sortCandidates(enriched)
    .filter((e) => e.reviewStatus !== REVIEW_STATUS.RED)
    .slice(0, 15);

  const contradictionBlocked = red
    .filter((e) => e.signals.contradictionWitnessCount > 0)
    .map((e) => e.explanation.candidateId);

  const strongestG2R = sortCandidates(enriched)
    .filter((e) => e.explanation.genesisRevelationDetail.span)
    .sort((a, b) => b.explanation.genesisRevelationDetail.score - a.explanation.genesisRevelationDetail.score)
    .slice(0, 10);

  const timeSavings = estimateTimeSavings(enriched);

  const topicIndex = {};
  for (const e of enriched) {
    const t = e.explanation.topic;
    if (!topicIndex[t]) topicIndex[t] = { green: 0, yellow: 0, red: 0, candidateIds: [] };
    topicIndex[t][e.reviewStatus.toLowerCase()] += 1;
    topicIndex[t].candidateIds.push(e.explanation.candidateId);
  }

  const payload = {
    phase: '2J-O',
    generatedAt: new Date().toISOString(),
    description: 'Review acceleration recommendations — advisory only, no auto-approval.',
    humanDecisionRequired: true,
    autoApproved: false,
    autoPromoted: false,
    productionApplied: false,
    counts: {
      green: green.length,
      yellow: yellow.length,
      red: red.length,
      total: enriched.length,
    },
    candidates: explanations,
    topicIndex,
    reviewFirstIds: reviewFirst.map((e) => e.explanation.candidateId),
    contradictionBlockedIds: contradictionBlocked,
    strongestG2RIds: strongestG2R.map((e) => e.explanation.candidateId),
    timeSavings,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATHS.recommendations), { recursive: true });
  fs.writeFileSync(OUTPUT_PATHS.recommendations, `${JSON.stringify(payload, null, 2)}\n`);

  return {
    ranAt: payload.generatedAt,
    candidates,
    enriched,
    green,
    yellow,
    red,
    reviewFirst,
    contradictionBlocked,
    strongestG2R,
    timeSavings,
    payload,
    safety: {
      graphEdgeCount: getAllApprovedSupportEdges().length,
      cardCount: getAllApprovedCards().length,
      productionApplied: false,
      autoApproved: false,
      autoPromoted: false,
    },
  };
}

module.exports = {
  runReviewAccelerationLayer,
  enrichCandidate,
  determineReviewStatus,
  computeDecisionAssist,
  REVIEW_STATUS,
  OUTPUT_PATHS,
};
