/**
 * Phase 2J-P / 2J-Q — Scripture Research & Review Console.
 * Single admin surface with Scripture Strength Review (no Green/Yellow/Red).
 * Never approves, promotes, or mutates production.
 */

const fs = require('fs');
const path = require('path');
const { loadUnifiedCandidates } = require('./scriptureApprovalWorkflow');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const {
  discoverGenesisToRevelation,
  analyzeScriptureChain,
  detectContradictions,
  computeBibleSupportScore,
  computeCoverageScore,
} = require('./scriptureDiscoveryGenesisRevelation');
const { crossReferenceCandidate, normalizeTopic } = require('./scriptureDiscoveryCrossReference');
const {
  exploreParallelScriptures,
  mergeTopics,
  expandGenesisToRevelationWorkspace,
  buildScriptureChain,
} = require('./scriptureResearchWorkspace');
const { getAllApprovedCards } = require('./evidenceCards');
const { getAllApprovedSupportEdges } = require('./approvedSupportGraph');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refMatchesApproved } = require('./scriptureReferenceNormalizer');
const {
  buildStrengthReviewObject,
  filterReviews,
  sortReviews,
  tierCounts,
  topicG2RStrength,
  reviewPriorityList,
  estimateTimeSavingsVs2JO,
  STRENGTH_TIERS,
} = require('./scriptureStrengthReview');

const CONSOLE_PIPELINE = [
  'Question',
  'Discovery',
  'Scripture Chain',
  'Genesis→Revelation Expansion',
  'Witness Analysis',
  'Support Score',
  'Issue Detection',
  'AI Explanation',
  'Human Decision',
];

const FUTURE_PIPELINE = [
  'Discovery',
  'Research Console',
  'Human Review',
  'Approval Workflow',
  'Regression',
  'Staging',
  'Promotion',
];

const CONSOLIDATED_SYSTEMS = [
  { id: 'bulk_discovery', phase: '2J-E', label: 'Bulk Scripture Discovery' },
  { id: 'question_recovery', phase: '2J-H', label: 'Question Scripture Recovery' },
  { id: 'genesis_revelation', phase: '2J-C', label: 'Genesis→Revelation Expansion' },
  { id: 'corpus_expansion', phase: '2J-J', label: 'Corpus Expansion Discovery' },
  { id: 'witness_audit', phase: '2J-K', label: 'Witness Quality Audit' },
  { id: 'approval_workflow', phase: '2J-L', label: 'Admin Approval Workflow' },
  { id: 'research_workspace', phase: '2J-M+', label: 'Scripture Research Workspace' },
  { id: 'review_acceleration', phase: '2J-O', label: 'Green/Yellow/Red (retired in 2J-Q)' },
  { id: 'strength_review', phase: '2J-Q', label: 'Scripture Strength Review' },
  { id: 'contradiction_reports', phase: 'various', label: 'Standalone Contradiction Reports' },
  { id: 'review_packages', phase: '2J-L', label: 'Review Packages' },
  { id: 'promotion_packages', phase: '2J-L', label: 'Promotion Packages' },
  { id: 'admin_dashboards', phase: '2J-L/O', label: 'Admin Dashboards' },
];

const ISSUE_TYPES = {
  NONE: 'NONE',
  CAUTION: 'CAUTION',
  INTERPRETATION_CONFLICT: 'INTERPRETATION_CONFLICT',
  CHAIN_CONFLICT: 'CHAIN_CONFLICT',
  RETRIEVAL_GAP: 'RETRIEVAL_GAP',
  INSUFFICIENT_CONTEXT: 'INSUFFICIENT_CONTEXT',
  POTENTIAL_CONTRADICTION: 'POTENTIAL_CONTRADICTION',
};

const REVIEW_ACTIONS = ['approve', 'hold', 'reject'];

const RESEARCH_COMMAND_PATTERNS = [
  { re: /find more witnesses? for (.+)/i, command: 'find_witnesses', extract: (m) => ({ topic: m[1] }) },
  { re: /expand (?:this )?genesis.?to.?revelation chain(?: for (.+))?/i, command: 'expand_g2r', extract: (m) => ({ topic: m[1] || '' }) },
  { re: /show (?:me )?all supporting scriptures(?: for (.+))?/i, command: 'show_supporting', extract: (m) => ({ topic: m[1] || '' }) },
  { re: /merge (.+) and (.+)/i, command: 'merge_topics', extract: (m) => ({ topicA: m[1], topicB: m[2] }) },
  { re: /find contradictions?(?: for| to)? (.+)?/i, command: 'find_contradictions', extract: (m) => ({ topic: m[1] || '' }) },
  { re: /find caution passages?(?: for (.+))?/i, command: 'find_caution', extract: (m) => ({ topic: m[1] || '' }) },
  { re: /build strongest chain(?: for (.+))?/i, command: 'build_strongest_chain', extract: (m) => ({ topic: m[1] || '' }) },
  { re: /show candidates above (\d+)/i, command: 'filter_by_score', extract: (m) => ({ minScore: Number(m[1]) }) },
  { re: /show (?:me )?every (.+) chain/i, command: 'topic_chains', extract: (m) => ({ topic: m[1] }) },
  { re: /find more scriptures? for (.+)/i, command: 'find_witnesses', extract: (m) => ({ topic: m[1] }) },
  { re: /show (?:me )?all (.+) lessons? above (\d+)/i, command: 'lessons_above_score', extract: (m) => ({ topic: m[1], minScore: Number(m[2]) }) },
  { re: /find more parallel scriptures? for (.+)/i, command: 'find_parallel', extract: (m) => ({ topic: m[1] }) },
  { re: /show contradiction scriptures? for (?:this )?lesson/i, command: 'lesson_contradictions', extract: () => ({}) },
  { re: /show contradiction scriptures? for (.+)/i, command: 'find_contradictions', extract: (m) => ({ topic: m[1] }) },
  { re: /show caution scriptures? for (?:this )?topic/i, command: 'find_caution', extract: () => ({}) },
];

const OUTPUT_PATHS = {
  consoleQueue: path.join(__dirname, '..', 'docs', 'evidence-candidates', 'console-queue.json'),
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

function resolveTopic(text = '') {
  const t = String(text).toLowerCase().replace(/[^\w\s]/g, '').trim();
  const aliases = {
    sabbath: 'sabbath', kingdom: 'kingdom', death: 'death_state', resurrection: 'death_state',
    death_state: 'death_state', logos: 'messiah_logos', messiah: 'messiah_logos',
    dietary: 'dietary_law', holiness: 'holiness', heavens: 'heavens',
  };
  for (const [alias, topic] of Object.entries(aliases)) {
    if (t.includes(alias.replace(/_/g, ' ')) || t.includes(alias)) return topic;
  }
  return t.replace(/\s+/g, '_') || 'open_topic';
}

function getCandidateById(candidates, candidateId) {
  return candidates.find((c) => c.candidateId === candidateId) || null;
}

function buildWitnessExpansion(candidate) {
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  return expandFullScriptureWitnesses({
    question: candidate.question,
    topic: candidate.topic,
    scripturesCited: chain,
    scriptureOrder: chain,
    conclusion: candidate.candidateConclusion || '',
    source: candidate.discoveryPhase || candidate.source,
  });
}

function computeSupportScore(candidate, expansion, chainAnalysis, g2r, crossRef) {
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  const coverage = computeCoverageScore({
    scripturesCited: chain,
    scriptureOrder: chain,
    chainAnalysis,
    g2r,
    crossRef,
  });
  const bible = computeBibleSupportScore({
    coverageScore: coverage,
    chainStrength: chainAnalysis.chainStrength,
    crossRef,
    kjvValid: (candidate.originalScriptures || []).every((r) => verifyKjvReference(r).valid),
  });
  return candidate.supportScore || expansion.confidenceAfter || bible.score;
}

function issueRecord(issueType, scriptures, confidence, reason, severity) {
  return { issueType, scriptures: uniqueRefs(scriptures), confidence, reason, severity };
}

function detectIssues(candidate, expansion, chainAnalysis, g2r) {
  const issues = [];
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  const topic = normalizeTopic(candidate.topic) || candidate.topic;
  const conclusion = candidate.candidateConclusion || '';

  for (const ref of expansion.cautionWitnesses || []) {
    issues.push(issueRecord(
      ISSUE_TYPES.CAUTION,
      [ref],
      68,
      'Caution passage flagged on approved evidence — review scope before approval.',
      'medium',
    ));
  }

  // Contradiction / interpretation issues retired from auto-decision flow (Reset Phase).
  // Graph-edge witnesses remain on expansion buckets for informational admin display only.

  const invalidRefs = chain.filter((r) => !verifyKjvReference(r).valid);
  if (invalidRefs.length) {
    issues.push(issueRecord(
      ISSUE_TYPES.CHAIN_CONFLICT,
      invalidRefs,
      80,
      'One or more scripture references failed KJV validation.',
      'high',
    ));
  }

  if (chain.length >= 3 && !g2r.genesisToRevelationSpan && !candidate.genesisToRevelationSpan) {
    issues.push(issueRecord(
      ISSUE_TYPES.CHAIN_CONFLICT,
      chain.slice(0, 3),
      58,
      'Chain lacks Genesis→Revelation span despite multi-scripture coverage.',
      'medium',
    ));
  }

  const continuity = (loadContinuityChains().chains || []).find((c) => c.topic === topic && c.approved);
  if (continuity) {
    const gaps = (continuity.nodes || [])
      .map((n) => n.reference)
      .filter((r) => !chain.some((s) => refMatchesApproved(s, r)));
    if (gaps.length >= 2) {
      issues.push(issueRecord(
        ISSUE_TYPES.RETRIEVAL_GAP,
        gaps.slice(0, 4),
        72,
        'Approved continuity chain has scriptures not present in candidate chain.',
        'medium',
      ));
    }
  }

  const card = getAllApprovedCards().find((c) => c.topic === topic);
  if (!card && chain.length < 2) {
    issues.push(issueRecord(
      ISSUE_TYPES.INSUFFICIENT_CONTEXT,
      chain,
      75,
      'Novel topic with thin scripture chain — more discovery recommended.',
      'medium',
    ));
  }

  if (candidate.supportScore < 70 && chain.length < 3) {
    issues.push(issueRecord(
      ISSUE_TYPES.INSUFFICIENT_CONTEXT,
      chain,
      70,
      `Support score ${candidate.supportScore} with limited chain depth.`,
      'low',
    ));
  }

  if (!issues.length) {
    issues.push(issueRecord(ISSUE_TYPES.NONE, [], 95, 'No elevated issues detected.', 'none'));
  }

  return issues;
}

function buildAiSummary(review) {
  const lines = [];
  lines.push(`Support Score: ${review.supportScore}`);
  lines.push('');

  const strengths = [];
  if (review.genesisToRevelationChain?.length >= 5) {
    strengths.push('Strong Genesis→Revelation continuity.');
  } else if (review.genesisToRevelationSpan) {
    strengths.push('Genesis→Revelation span present.');
  }
  if (review.continuityWitnesses?.length >= 2) {
    strengths.push(`${review.continuityWitnesses.length} continuity witnesses identified.`);
  }
  if (review.supportScore >= 90) strengths.push('High support score.');

  if (strengths.length) {
    lines.push('Strength:');
    lines.push(strengths.join(' '));
    lines.push('');
  }

  const primaryIssue = review.issues.find((i) => i.issueType !== ISSUE_TYPES.NONE) || review.issues[0];
  if (primaryIssue && primaryIssue.issueType !== ISSUE_TYPES.NONE) {
    const refs = primaryIssue.scriptures?.length ? primaryIssue.scriptures.join(', ') : 'see chain';
    lines.push('Issue:');
    lines.push(`${refs} — ${primaryIssue.reason}`);
    lines.push('');
    lines.push('Classification:');
    lines.push(primaryIssue.issueType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    lines.push('');
    lines.push('Confidence:');
    lines.push(`${primaryIssue.confidence}%`);
    lines.push('');
  }

  lines.push('Recommendation:');
  const actionText = {
    approve: 'Candidate is strong — review for approval.',
    hold: 'Review before approval.',
    reject: 'Resolve issues before reconsidering.',
  };
  lines.push(actionText[review.recommendedReviewAction] || 'Review before approval.');

  return lines.join('\n');
}

function mapRecommendedReviewAction(supportScore, issues) {
  const active = issues.filter((i) => i.issueType !== ISSUE_TYPES.NONE);
  const hasHigh = active.some((i) => i.severity === 'high');
  const hasContradiction = active.some((i) =>
    [ISSUE_TYPES.POTENTIAL_CONTRADICTION, ISSUE_TYPES.INTERPRETATION_CONFLICT].includes(i.issueType),
  );

  if (hasHigh && hasContradiction && supportScore < 75) return 'reject';
  if (hasHigh || hasContradiction || supportScore < 80) return 'hold';
  if (supportScore >= 90 && active.length <= 1) return 'approve';
  if (supportScore >= 80) return 'hold';
  return 'hold';
}

function buildUnifiedReviewObject(candidate) {
  const chain = candidate.scriptureOrder || candidate.originalScriptures || [];
  const topic = normalizeTopic(candidate.topic) || candidate.topic;
  const expansion = buildWitnessExpansion(candidate);

  const g2r = discoverGenesisToRevelation({
    scripturesCited: chain,
    scriptureOrder: chain,
    topic,
  });

  const crossRef = crossReferenceCandidate({
    question: candidate.question,
    scriptures: chain,
    scriptureOrder: chain,
    topic,
    candidateConclusion: candidate.candidateConclusion || '',
  });

  const chainAnalysis = analyzeScriptureChain({
    scripturesCited: chain,
    scriptureOrder: chain,
    topic,
    candidateConclusion: candidate.candidateConclusion || '',
  });

  const supportScore = computeSupportScore(candidate, expansion, chainAnalysis, g2r, crossRef);
  const issues = detectIssues(candidate, expansion, chainAnalysis, g2r);

  return buildStrengthReviewObject(candidate, {
    supportScore,
    expansion,
    g2r,
    crossRef,
    chainAnalysis,
    issues,
    genesisToRevelationChain: expansion.genesisToRevelationChain || g2r.orderedScriptures || chain,
  });
}

function parseResearchCommand(request = '') {
  const text = String(request).trim();
  for (const pattern of RESEARCH_COMMAND_PATTERNS) {
    const m = text.match(pattern.re);
    if (!m) continue;
    return {
      request: text,
      command: pattern.command,
      params: pattern.extract(m),
      status: 'structured',
      reviewRequired: true,
      autoApplied: false,
      productionApplied: false,
    };
  }
  return {
    request: text,
    command: 'unparsed',
    params: {},
    status: 'needs_manual_mapping',
    reviewRequired: true,
    autoApplied: false,
  };
}

function parseVoiceToResearchCommand(transcript = '') {
  const normalized = String(transcript).trim();
  const parsed = parseResearchCommand(normalized);
  return {
    layer: 'voice_to_research',
    voiceInput: normalized,
    textCommand: normalized,
    researchCommand: parsed,
    consoleRoute: 'Scripture Research & Review Console',
    voiceSupportOptional: true,
    productionImpact: false,
    reviewRequired: true,
    autoApplied: false,
  };
}

function executeResearchCommand(commandSpec, candidates) {
  const { command, params } = commandSpec;
  const topic = resolveTopic(params.topic || params.topicA || '');

  switch (command) {
    case 'find_witnesses':
    case 'show_supporting':
      return exploreParallelScriptures({ topic }, candidates);

    case 'expand_g2r':
      return expandGenesisToRevelationWorkspace({ topic }, candidates);

    case 'merge_topics':
      return mergeTopics(params.topicA, params.topicB);

    case 'find_contradictions':
    case 'lesson_contradictions': {
      const pool = candidates.filter((c) => !topic || c.topic === topic);
      const hits = pool
        .map((c) => buildUnifiedReviewObject(c))
        .filter((r) => r.contradictionScriptures.length
          || (r.scoreExplanation?.scriptureConcerns || []).some((c) =>
            c.classification?.includes('Contradiction') || c.classification?.includes('Conflict'),
          ));
      return { command, topic, matches: hits.slice(0, 20), reviewRequired: true, autoApplied: false };
    }

    case 'find_caution': {
      const pool = candidates.filter((c) => !topic || c.topic === topic);
      const hits = pool
        .map((c) => buildUnifiedReviewObject(c))
        .filter((r) => r.cautionScriptures.length);
      return { command, topic, matches: hits.slice(0, 20), reviewRequired: true, autoApplied: false };
    }

    case 'find_parallel':
      return exploreParallelScriptures({ topic }, candidates);

    case 'lessons_above_score': {
      const min = params.minScore || 90;
      const resolvedTopic = resolveTopic(params.topic || '');
      const reviews = candidates
        .filter((c) => c.topic === resolvedTopic)
        .map((c) => buildUnifiedReviewObject(c))
        .filter((r) => r.supportScore >= min);
      return { command, topic: resolvedTopic, minScore: min, matches: reviews, reviewRequired: true, autoApplied: false };
    }

    case 'build_strongest_chain': {
      const pool = candidates
        .filter((c) => !topic || c.topic === topic)
        .sort((a, b) => b.supportScore - a.supportScore);
      const best = pool[0];
      if (!best) return { command, topic, result: null };
      return buildScriptureChain({
        scriptures: best.scriptureOrder || best.originalScriptures,
        topic: best.topic,
        question: best.question,
      });
    }

    case 'filter_by_score': {
      const min = params.minScore || 90;
      const matches = candidates
        .filter((c) => c.supportScore >= min)
        .map((c) => ({
          candidateId: c.candidateId,
          question: c.question,
          topic: c.topic,
          supportScore: c.supportScore,
        }));
      return { command, minScore: min, matches, reviewRequired: true, autoApplied: false };
    }

    case 'topic_chains': {
      const matches = candidates
        .filter((c) => c.topic === topic)
        .map((c) => ({
          candidateId: c.candidateId,
          question: c.question,
          supportScore: c.supportScore,
          chain: c.scriptureOrder || c.originalScriptures,
        }));
      return { command, topic, matches, reviewRequired: true, autoApplied: false };
    }

    default:
      return { command, status: 'unparsed', reviewRequired: true, autoApplied: false };
  }
}

function lookupReview(input = {}, candidates) {
  if (input.candidateId) {
    const c = getCandidateById(candidates, input.candidateId);
    if (!c) return { error: 'candidate_not_found', candidateId: input.candidateId };
    return buildUnifiedReviewObject(c);
  }

  if (input.question) {
    const q = String(input.question).toLowerCase();
    const c = candidates.find((x) => x.question.toLowerCase().includes(q));
    if (!c) return { error: 'question_not_found', question: input.question };
    return buildUnifiedReviewObject(c);
  }

  if (input.topic) {
    const topic = resolveTopic(input.topic);
    const pool = candidates.filter((c) => c.topic === topic);
    return {
      topic,
      candidateCount: pool.length,
      reviews: pool.map((c) => buildUnifiedReviewObject(c)),
      reviewRequired: true,
      autoApplied: false,
    };
  }

  if (input.customResearchRequest || input.researchCommand) {
    const parsed = parseResearchCommand(input.customResearchRequest || input.researchCommand);
    return {
      parsed,
      result: parsed.status === 'structured'
        ? executeResearchCommand(parsed, candidates)
        : null,
      reviewRequired: true,
      autoApplied: false,
    };
  }

  return { error: 'missing_input', hint: 'Provide candidateId, question, topic, or customResearchRequest' };
}

function estimateTimeSavings(candidateCount) {
  const priorLayers = 6;
  const priorMinutesPerCandidate = 18;
  const consoleMinutesPerCandidate = 7;
  const totalPrior = candidateCount * priorMinutesPerCandidate * priorLayers / priorLayers;
  const totalConsole = candidateCount * consoleMinutesPerCandidate;
  const saved = totalPrior - totalConsole;
  return {
    priorMinutesPerCandidate,
    consoleMinutesPerCandidate,
    projectedPercentSaved: Math.round((saved / totalPrior) * 100),
    projectedHoursSaved: Math.round((saved / 60) * 10) / 10,
    consolidatedLayers: priorLayers,
  };
}

function runScriptureResearchReviewConsole(options = {}) {
  const candidates = loadUnifiedCandidates();
  const reviews = candidates.map((c) => buildUnifiedReviewObject(c));

  const strengthTierCounts = tierCounts(reviews);
  const actionCounts = { approve: 0, hold: 0, reject: 0 };
  for (const r of reviews) actionCounts[r.recommendedAction] += 1;

  const sampleCommands = [
    'Find more witnesses for Sabbath',
    'Expand this Genesis→Revelation chain',
    'Show me all supporting scriptures',
    'Merge Sabbath and Kingdom topics',
    'Find contradictions',
    'Find caution passages',
    'Build strongest chain',
    'Show candidates above 90',
    'Show me all Sabbath lessons above 90',
    'Find more parallel scriptures for Logos',
  ];

  const commandResults = sampleCommands.map((req) => {
    const parsed = parseResearchCommand(req);
    return {
      request: req,
      parsed,
      result: parsed.status === 'structured' ? executeResearchCommand(parsed, candidates) : null,
    };
  });

  const voiceSamples = [
    'Show me all Sabbath lessons above 90',
    'Find more parallel scriptures for Logos',
    'Expand this Genesis→Revelation chain',
    'Show contradiction scriptures for this lesson',
    'Show caution scriptures for this topic',
    'Merge Kingdom and Resurrection',
  ].map(parseVoiceToResearchCommand);

  const focusId = options.candidateId || 'rec_0017';
  const focusReview = lookupReview({ candidateId: focusId }, candidates);

  const timeSavings = estimateTimeSavings(candidates.length);
  const timeSavingsVs2JO = estimateTimeSavingsVs2JO(candidates.length);

  const queuePayload = {
    phase: '2J-Q',
    generatedAt: new Date().toISOString(),
    description: 'Scripture Strength Review — all discoveries enter Research Console automatically.',
    reviewModel: 'strength_tiers',
    retiredModels: ['GREEN', 'YELLOW', 'RED'],
    pipeline: FUTURE_PIPELINE,
    rule: 'Never Discovery → Production',
    humanDecisionRequired: true,
    autoApplied: false,
    autoApproved: false,
    autoPromoted: false,
    productionApplied: false,
    candidateCount: candidates.length,
    strengthTierCounts,
    reviews: reviews.map((r) => ({
      candidateId: r.candidateId,
      topic: r.topic,
      lessonTitle: r.lessonTitle,
      question: r.question,
      supportScore: r.supportScore,
      strengthTier: r.strengthTier,
      parallelScriptures: r.parallelScriptures,
      supportingScriptures: r.supportingScriptures,
      continuityScriptures: r.continuityScriptures,
      genesisToRevelationChain: r.genesisToRevelationChain,
      scoreExplanation: r.scoreExplanation,
      recommendedAction: r.recommendedAction,
      reviewNotes: r.reviewNotes,
      reviewRequired: true,
      autoApplied: false,
    })),
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATHS.consoleQueue), { recursive: true });
  fs.writeFileSync(OUTPUT_PATHS.consoleQueue, `${JSON.stringify(queuePayload, null, 2)}\n`);

  return {
    ranAt: queuePayload.generatedAt,
    phase: '2J-Q',
    pipeline: CONSOLE_PIPELINE,
    futurePipeline: FUTURE_PIPELINE,
    consolidatedSystems: CONSOLIDATED_SYSTEMS,
    strengthTiers: STRENGTH_TIERS,
    candidates,
    reviews,
    focusReview,
    strengthTierCounts,
    actionCounts,
    commandResults,
    voiceSamples,
    timeSavings,
    timeSavingsVs2JO,
    topByScore: sortReviews(reviews, 'supportScore').slice(0, 20),
    topByParallel: sortReviews(reviews, 'parallelCount').slice(0, 10),
    topBySupporting: sortReviews(reviews, 'supportingCount').slice(0, 10),
    topByContradiction: sortReviews(reviews, 'contradictionCount').slice(0, 10),
    topicG2RStrength: topicG2RStrength(reviews),
    reviewFirst: reviewPriorityList(reviews).slice(0, 15),
    metrics: {
      candidateCount: candidates.length,
      consolidatedSystemCount: CONSOLIDATED_SYSTEMS.length,
      strengthTierCounts,
      approveRecommendations: actionCounts.approve,
      holdRecommendations: actionCounts.hold,
      rejectRecommendations: actionCounts.reject,
      researchCommandsStructured: commandResults.filter((c) => c.parsed.status === 'structured').length,
    },
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
  runScriptureResearchReviewConsole,
  buildUnifiedReviewObject,
  lookupReview,
  detectIssues,
  parseResearchCommand,
  parseVoiceToResearchCommand,
  executeResearchCommand,
  filterReviews,
  sortReviews,
  CONSOLE_PIPELINE,
  FUTURE_PIPELINE,
  CONSOLIDATED_SYSTEMS,
  ISSUE_TYPES,
  REVIEW_ACTIONS,
  OUTPUT_PATHS,
};
