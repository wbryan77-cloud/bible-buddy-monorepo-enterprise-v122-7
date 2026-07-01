/**
 * Phase 2J-Q — Scripture Strength Review System.
 * Bible-first admin review. No Green/Yellow/Red. No auto-approval or promotion.
 */

const STRENGTH_TIERS = [
  { min: 95, max: 100, label: 'Very Strong' },
  { min: 90, max: 94, label: 'Strong' },
  { min: 80, max: 89, label: 'Good Support' },
  { min: 70, max: 79, label: 'Review Needed' },
  { min: 0, max: 69, label: 'Research Needed' },
];

const TOPIC_LESSON_LABELS = {
  sabbath: 'Sabbath',
  death_state: 'Death State & Resurrection',
  messiah_logos: 'Messiah & Logos',
  dietary_law: 'Dietary Law',
  holiness: 'Holiness',
  kingdom: 'Kingdom of God',
  heavens: 'Heavens',
  feasts: 'Feast Days',
  faith_works: 'Faith & Works',
};

/** Retired from admin decision flow — informational witness notes only */
const CLASSIFICATION_LABELS = {
  CAUTION: 'Caution Witness (informational)',
  CHAIN_CONFLICT: 'Chain Conflict',
  RETRIEVAL_GAP: 'Retrieval Gap',
  INSUFFICIENT_CONTEXT: 'Insufficient Context',
};

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = String(r || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function refInChain(ref, chain = []) {
  const r = String(ref).toLowerCase();
  return chain.some((c) => String(c).toLowerCase() === r || String(c).toLowerCase().includes(r.split(':')[0]));
}

function strengthTierForScore(score) {
  const tier = STRENGTH_TIERS.find((t) => score >= t.min && score <= t.max);
  return tier?.label || 'Research Needed';
}

function deriveLessonTitle(candidate) {
  const topic = candidate.topic || 'open_topic';
  const topicLabel = TOPIC_LESSON_LABELS[topic] || topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const q = String(candidate.question || '').trim();
  if (!q) return topicLabel;
  const short = q.length > 72 ? `${q.slice(0, 69)}…` : q;
  return `${topicLabel}: ${short}`;
}

function classifyScriptureBuckets(chain, expansion) {
  const original = uniqueRefs(chain);

  const supportingScriptures = uniqueRefs([
    ...(expansion.supportingWitnesses || []),
    ...(expansion.confirmingWitnesses || []),
  ]).filter((r) => !refInChain(r, original));

  const parallelScriptures = uniqueRefs([
    ...(expansion.concordanceWitnesses || []),
    ...(expansion.parallelRefs || []),
  ]).filter((r) =>
    !refInChain(r, original)
    && !supportingScriptures.some((s) => refInChain(s, [r])),
  );

  const continuityScriptures = uniqueRefs(expansion.continuityWitnesses || [])
    .filter((r) =>
      !refInChain(r, original)
      && !supportingScriptures.some((s) => refInChain(s, [r]))
      && !parallelScriptures.some((p) => refInChain(p, [r])),
    );

  const cautionScriptures = uniqueRefs(expansion.cautionWitnesses || []);

  return {
    originalScriptureChain: original,
    parallelScriptures,
    supportingScriptures,
    continuityScriptures,
    cautionScriptures,
    /** Graph-edge witness refs — informational only, not used for scoring or auto-hold */
    informationalWitnessScriptures: uniqueRefs(expansion.contradictionWitnesses || []),
  };
}

function buildScriptureConcerns(issues) {
  const concerns = [];
  for (const issue of issues) {
    if (issue.issueType === 'NONE') continue;
    for (const scripture of issue.scriptures || []) {
      concerns.push({
        scripture,
        classification: CLASSIFICATION_LABELS[issue.issueType] || issue.issueType.replace(/_/g, ' '),
        confidence: issue.confidence,
        reason: issue.reason,
      });
    }
    if (!(issue.scriptures || []).length && issue.issueType !== 'NONE') {
      concerns.push({
        scripture: null,
        classification: CLASSIFICATION_LABELS[issue.issueType] || issue.issueType,
        confidence: issue.confidence,
        reason: issue.reason,
      });
    }
  }
  return concerns;
}

function buildScoreExplanation({
  supportScore,
  expansion,
  issues,
  g2r,
  crossRef,
  buckets,
  chainAnalysis,
}) {
  const increases = [];
  const decreases = [];

  if (g2r.genesisToRevelationSpan || expansion.genesisToRevelationSpan) {
    increases.push({
      factor: 'Genesis→Revelation continuity',
      detail: 'Chain spans Old and New Testament witness.',
      impact: '+10 to +20',
    });
  }

  if (buckets.parallelScriptures.length) {
    increases.push({
      factor: 'Parallel scriptures',
      detail: `${buckets.parallelScriptures.length} scripture(s) teach the same concept or pattern.`,
      impact: `+${Math.min(8, buckets.parallelScriptures.length * 2)}`,
    });
  }

  if (buckets.supportingScriptures.length) {
    increases.push({
      factor: 'Supporting scriptures',
      detail: `${buckets.supportingScriptures.length} scripture(s) strengthen or confirm the chain.`,
      impact: `+${Math.min(10, buckets.supportingScriptures.length * 2)}`,
    });
  }

  if (buckets.continuityScriptures.length) {
    increases.push({
      factor: 'Continuity scriptures',
      detail: `${buckets.continuityScriptures.length} scripture(s) connect teaching across biblical eras.`,
      impact: `+${Math.min(12, buckets.continuityScriptures.length * 3)}`,
    });
  }

  const evidenceScore = crossRef?.supportScore ?? 0;
  if (evidenceScore >= 70) {
    increases.push({
      factor: 'Approved support alignment',
      detail: `Cross-reference alignment score ${evidenceScore}.`,
      impact: '+5 to +15',
    });
  }

  if (buckets.cautionScriptures.length) {
    increases.push({
      factor: 'Caution scriptures (informational)',
      detail: `${buckets.cautionScriptures.length} caution passage(s) listed for admin awareness — no automatic score penalty.`,
      impact: 'informational',
    });
  }

  if (buckets.informationalWitnessScriptures?.length) {
    increases.push({
      factor: 'Graph witness scriptures (informational)',
      detail: `${buckets.informationalWitnessScriptures.length} graph-edge witness ref(s) listed — admin review only, no auto-block.`,
      impact: 'informational',
    });
  }

  const weakContinuity = !g2r.genesisToRevelationSpan
    && buckets.continuityScriptures.length < 2
    && (buckets.originalScriptureChain?.length || 0) >= 3;
  if (weakContinuity) {
    decreases.push({
      factor: 'Weak continuity',
      detail: 'Limited cross-era continuity witnesses for chain depth.',
      impact: '-5 to -10',
    });
  }

  const retrievalGaps = issues.filter((i) => i.issueType === 'RETRIEVAL_GAP');
  if (retrievalGaps.length) {
    decreases.push({
      factor: 'Retrieval gaps',
      detail: 'Approved continuity chain scriptures missing from candidate chain.',
      impact: '-5 to -8',
    });
  }

  if ((chainAnalysis?.chainStrength || 0) < 50 && supportScore < 80) {
    decreases.push({
      factor: 'Limited chain support',
      detail: `Chain strength ${chainAnalysis?.chainStrength || 0} — thin original chain.`,
      impact: '-5 to -15',
    });
  }

  const scriptureConcerns = buildScriptureConcerns(issues);

  return {
    supportScore,
    strengthTier: strengthTierForScore(supportScore),
    increases,
    decreases,
    scriptureConcerns,
    netAssessment: decreases.length
      ? 'Score reflects chain breadth, continuity, and approved alignment.'
      : 'Score supported by scripture breadth and Genesis→Revelation continuity.',
  };
}

function buildReviewNotes(review) {
  const parts = [];
  parts.push(`${review.strengthTier} (${review.supportScore}).`);

  if (review.genesisToRevelationChain?.length) {
    parts.push(`G2R chain: ${review.genesisToRevelationChain.length} scripture(s).`);
  }

  if (review.cautionScriptures?.length) {
    parts.push(`${review.cautionScriptures.length} caution scripture(s) listed (informational).`);
  }

  return parts.join(' ');
}

function mapRecommendedAction(supportScore, issues = []) {
  const hasInvalidChain = issues.some((i) => i.issueType === 'CHAIN_CONFLICT' && i.severity === 'high');
  if (hasInvalidChain && supportScore < 60) return 'reject';
  if (supportScore >= 90) return 'approve';
  if (supportScore < 70) return 'hold';
  return 'hold';
}

function buildStrengthReviewObject(candidate, context) {
  const {
    supportScore,
    expansion,
    g2r,
    crossRef,
    chainAnalysis,
    issues,
    genesisToRevelationChain,
  } = context;

  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  const topic = candidate.topic;
  const buckets = classifyScriptureBuckets(chain, expansion);
  const scoreExplanation = buildScoreExplanation({
    supportScore,
    expansion,
    issues,
    g2r,
    crossRef,
    buckets,
    chainAnalysis,
  });

  const review = {
    candidateId: candidate.candidateId,
    topic,
    lessonTitle: deriveLessonTitle(candidate),
    question: candidate.question,
    supportScore,
    strengthTier: strengthTierForScore(supportScore),
    originalScriptureChain: buckets.originalScriptureChain,
    genesisToRevelationChain: genesisToRevelationChain || expansion.genesisToRevelationChain || chain,
    parallelScriptures: buckets.parallelScriptures,
    supportingScriptures: buckets.supportingScriptures,
    continuityScriptures: buckets.continuityScriptures,
    cautionScriptures: buckets.cautionScriptures,
    informationalWitnessScriptures: buckets.informationalWitnessScriptures || [],
    /** Legacy field — informational only, does not block approval */
    contradictionScriptures: buckets.informationalWitnessScriptures || [],
    scoreExplanation,
    reviewNotes: '',
    recommendedAction: mapRecommendedAction(supportScore, issues),
    allowedActions: ['approve', 'hold', 'reject'],
    reviewRequired: true,
    autoApplied: false,
    autoApproved: false,
    autoPromoted: false,
    humanDecisionRequired: true,
    productionApplied: false,
    discoveryPhase: candidate.discoveryPhase,
  };

  review.reviewNotes = buildReviewNotes(review);
  return review;
}

function filterReviews(reviews, filter = {}) {
  let pool = [...reviews];

  if (filter.minScore) pool = pool.filter((r) => r.supportScore >= filter.minScore);
  if (filter.topic) pool = pool.filter((r) => r.topic === filter.topic);
  if (filter.lessonTitle) {
    const q = String(filter.lessonTitle).toLowerCase();
    pool = pool.filter((r) => r.lessonTitle.toLowerCase().includes(q));
  }
  if (filter.minParallel != null) {
    pool = pool.filter((r) => r.parallelScriptures.length >= filter.minParallel);
  }
  if (filter.minSupporting != null) {
    pool = pool.filter((r) => r.supportingScriptures.length >= filter.minSupporting);
  }
  if (filter.minContinuity != null) {
    pool = pool.filter((r) => r.continuityScriptures.length >= filter.minContinuity);
  }
  if (filter.minG2RSize != null) {
    pool = pool.filter((r) => r.genesisToRevelationChain.length >= filter.minG2RSize);
  }
  if (filter.minCaution != null) {
    pool = pool.filter((r) => r.cautionScriptures.length >= filter.minCaution);
  }
  if (filter.strengthTier) {
    pool = pool.filter((r) => r.strengthTier === filter.strengthTier);
  }

  return pool;
}

function sortReviews(reviews, sortBy = 'supportScore') {
  const sorted = [...reviews];
  const sorters = {
    supportScore: (a, b) => b.supportScore - a.supportScore,
    parallelCount: (a, b) => b.parallelScriptures.length - a.parallelScriptures.length,
    supportingCount: (a, b) => b.supportingScriptures.length - a.supportingScriptures.length,
    continuityCount: (a, b) => b.continuityScriptures.length - a.continuityScriptures.length,
    g2rSize: (a, b) => b.genesisToRevelationChain.length - a.genesisToRevelationChain.length,
    cautionCount: (a, b) => b.cautionScriptures.length - a.cautionScriptures.length,
    lessonTitle: (a, b) => a.lessonTitle.localeCompare(b.lessonTitle),
    topic: (a, b) => a.topic.localeCompare(b.topic),
  };
  sorted.sort(sorters[sortBy] || sorters.supportScore);
  return sorted;
}

function tierCounts(reviews) {
  const counts = {};
  for (const t of STRENGTH_TIERS) counts[t.label] = 0;
  for (const r of reviews) {
    counts[r.strengthTier] = (counts[r.strengthTier] || 0) + 1;
  }
  return counts;
}

function topicG2RStrength(reviews) {
  const byTopic = {};
  for (const r of reviews) {
    if (!byTopic[r.topic]) {
      byTopic[r.topic] = { topic: r.topic, totalG2R: 0, count: 0, avgScore: 0, scores: [] };
    }
    byTopic[r.topic].totalG2R += r.genesisToRevelationChain.length;
    byTopic[r.topic].scores.push(r.supportScore);
    byTopic[r.topic].count += 1;
  }
  return Object.values(byTopic)
    .map((t) => ({
      topic: t.topic,
      avgG2RSize: Math.round((t.totalG2R / t.count) * 10) / 10,
      avgSupportScore: Math.round(t.scores.reduce((s, v) => s + v, 0) / t.count),
      candidateCount: t.count,
    }))
    .sort((a, b) => b.avgG2RSize - a.avgG2RSize || b.avgSupportScore - a.avgSupportScore);
}

function reviewPriorityList(reviews) {
  return sortReviews(reviews, 'supportScore')
    .filter((r) => r.recommendedAction !== 'reject')
    .sort((a, b) => {
      const tierOrder = { 'Very Strong': 0, Strong: 1, 'Good Support': 2, 'Review Needed': 3, 'Research Needed': 4 };
      const ta = tierOrder[a.strengthTier] ?? 5;
      const tb = tierOrder[b.strengthTier] ?? 5;
      if (ta !== tb) return ta - tb;
      return b.supportScore - a.supportScore;
    });
}

function estimateTimeSavingsVs2JO(candidateCount) {
  const joMinutes = 7;
  const jqMinutes = 4;
  const totalJo = candidateCount * joMinutes;
  const totalJq = candidateCount * jqMinutes;
  const saved = totalJo - totalJq;
  return {
    phase2JOMinutesPerCandidate: joMinutes,
    phase2JQMinutesPerCandidate: jqMinutes,
    percentSavedVs2JO: Math.round((saved / totalJo) * 100),
    hoursSavedVs2JO: Math.round((saved / 60) * 10) / 10,
    note: 'Bible-first strength review eliminates color-tier triage from 2J-O',
  };
}

function toSimplifiedAdminReview(review, adminDecision = null) {
  const explanation = typeof review.scoreExplanation === 'string'
    ? review.scoreExplanation
    : review.scoreExplanation?.netAssessment
      || buildReviewNotes(review);
  return {
    topic: review.topic,
    lessonTitle: review.lessonTitle,
    question: review.question,
    supportScore: review.supportScore,
    strengthTier: review.strengthTier,
    originalScriptureChain: review.originalScriptureChain || [],
    genesisToRevelationChain: review.genesisToRevelationChain || [],
    parallelScriptures: review.parallelScriptures || [],
    supportingScriptures: review.supportingScriptures || [],
    continuityScriptures: review.continuityScriptures || [],
    cautionScriptures: review.cautionScriptures || [],
    scoreExplanation: explanation,
    adminDecision: adminDecision?.decision || review.humanDecision || null,
  };
}

function toSimplifiedTopicPack(pack, adminDecision = null) {
  return {
    topic: pack.topic,
    lessonTitle: pack.lessonTitle || pack.displayName,
    displayName: pack.displayName,
    questionsIncluded: pack.candidateCount,
    candidateIds: pack.candidateIds || [],
    approvedScriptures: pack.approvedScriptures || [],
    pendingScriptures: pack.pendingScriptures || [],
    originalScriptureChain: pack.originalScriptureChain || [],
    genesisToRevelationChain: pack.genesisToRevelationChain || [],
    parallelScriptures: pack.parallelScriptures || [],
    supportingScriptures: pack.supportingScriptures || [],
    continuityScriptures: pack.continuityScriptures || [],
    cautionScriptures: pack.cautionScriptures || [],
    supportScore: pack.supportScoreAverage,
    strengthTier: pack.strengthTier,
    scoreExplanation: pack.scoreExplanation || '',
    packDecision: adminDecision?.decision || pack.decision || null,
    decisionOptions: ['approve_pack', 'hold_pack', 'reject_pack'],
    humanReviewRequired: true,
  };
}

module.exports = {
  STRENGTH_TIERS,
  strengthTierForScore,
  deriveLessonTitle,
  classifyScriptureBuckets,
  buildScoreExplanation,
  buildStrengthReviewObject,
  buildReviewNotes,
  filterReviews,
  sortReviews,
  tierCounts,
  topicG2RStrength,
  reviewPriorityList,
  estimateTimeSavingsVs2JO,
  toSimplifiedAdminReview,
  toSimplifiedTopicPack,
  CLASSIFICATION_LABELS,
};
