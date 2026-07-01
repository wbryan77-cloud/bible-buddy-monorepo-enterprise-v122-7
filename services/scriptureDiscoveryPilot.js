/**
 * Scripture Discovery Pilot — candidate generation only.
 * Does not promote, modify doctrine, support graph, or production answers.
 */

const fs = require('fs');
const path = require('path');
const { crossReferenceCandidate } = require('./scriptureDiscoveryCrossReference');
const { loadContinuityChains } = require('./scriptureDiscoveryEngine');
const { getAllApprovedCards } = require('./evidenceCards');

const PILOT_SOURCES_PATH = path.join(__dirname, '..', 'data', 'scripture-discovery-pilot-sources.json');

/** Curated pilot questions from Phase 2I gaps + continuity expansion */
const PILOT_QUESTIONS = [
  {
    question: 'How do we keep the Sabbath holy?',
    topic: 'sabbath',
    scripturesCited: ['Isaiah 58:13-14', 'Acts 17:2', 'Acts 13:42-44'],
    scriptureOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Isaiah 58:13-14', 'Luke 4:16', 'Acts 17:2'],
    candidateConclusion: 'Sabbath observance pattern from creation through apostolic era (candidate chain extension)',
    source: 'phase2i_stress_gap',
    sourceType: 'stress_test_class_c',
  },
  {
    question: 'What is the state of the dead according to Scripture?',
    topic: 'death_state',
    scripturesCited: ['John 11:11-14', 'Ecclesiastes 9:5', '1 Thessalonians 4:13-16'],
    scriptureOrder: ['Genesis 2:7', 'Ecclesiastes 9:5', 'John 11:11-14', '1 Thessalonians 4:13-18'],
    candidateConclusion: 'Sleep in death until resurrection (catalog chain candidate)',
    source: 'phase2i_stress_gap',
    sourceType: 'stress_test_class_c',
  },
  {
    question: 'Can I eat pork?',
    topic: 'dietary_law',
    scripturesCited: ['Leviticus 11', 'Acts 10:28', 'Acts 11:1-18', 'Isaiah 66:17'],
    scriptureOrder: ['Leviticus 11', 'Deuteronomy 14', 'Acts 10:28', 'Acts 11:1-18'],
    candidateConclusion: 'Clean/unclean distinction with Acts 10-11 gentile clarification',
    source: 'phase2i_stress_gap',
    sourceType: 'stress_test_class_c',
  },
  {
    question: 'What does holy mean?',
    topic: 'holiness',
    scripturesCited: ['Leviticus 19:2', '1 Peter 1:15-16', 'Hebrews 12:14'],
    scriptureOrder: ['Leviticus 19:2', 'Leviticus 11:44-45', '1 Peter 1:15-16', 'Hebrews 12:14'],
    candidateConclusion: 'Be holy as God is holy — covenant holiness chain',
    source: 'phase2h_live_gap',
    sourceType: 'stress_test_class_c',
  },
  {
    question: 'I am grieving and cannot sleep.',
    topic: 'death_state',
    scripturesCited: ['Psalm 34:18', 'John 11:35'],
    scriptureOrder: ['Psalm 34:18', 'John 11:35', '1 Thessalonians 4:13'],
    candidateConclusion: 'Pastoral comfort scripture cross-ref (non-doctrine companion candidate)',
    source: 'phase2i_pastoral_gap',
    sourceType: 'user_conversation_stress',
  },
  {
    question: 'Why would God allow suffering?',
    topic: 'kingdom',
    scripturesCited: ['Job 1:21-22', 'Romans 5:3-5', 'Revelation 21:4'],
    scriptureOrder: ['Job 1:21-22', 'Romans 5:3-5', 'Revelation 21:4'],
    candidateConclusion: 'Suffering and future hope chain (off-card refs — review only)',
    source: 'phase2i_stress_gap',
    sourceType: 'stress_test_class_c',
  },
];

function loadPilotSources() {
  if (!fs.existsSync(PILOT_SOURCES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(PILOT_SOURCES_PATH, 'utf8')).sources || [];
  } catch {
    return [];
  }
}

function continuityExpansionCandidates() {
  const chains = loadContinuityChains().chains || [];
  const cards = getAllApprovedCards();
  const candidates = [];

  for (const chain of chains.filter((c) => c.approved)) {
    const card = cards.find((c) => c.topic === chain.topic);
    const cardRefs = new Set([
      ...(card?.primaryScriptures || []),
      ...(card?.supportingScriptures || []),
    ]);

    for (const node of chain.nodes || []) {
      const ref = node.reference;
      const onCard = [...cardRefs].some((r) => r === ref || r.includes(ref.split(':')[0]));
      if (onCard) continue;

      candidates.push({
        question: `Continuity expansion: ${chain.topic} — ${node.theme || ref}`,
        topic: chain.topic,
        scripturesCited: [ref],
        scriptureOrder: (chain.nodes || []).map((n) => n.reference),
        candidateConclusion: `Continuity node ${node.era}: ${node.theme} (${ref})`,
        source: `scripture_continuity_sample:${chain.chainId}`,
        sourceType: 'approved_continuity_chain',
        confidence: node.confidence || chain.confidenceScore || 0.7,
      });
    }
  }

  return candidates;
}

function buildCandidateRecord(input, crossRef, index) {
  const confidence =
    typeof input.confidence === 'number'
      ? input.confidence
      : crossRef.supportScore >= 70
        ? 0.85
        : crossRef.supportScore >= 40
          ? 0.6
          : 0.35;

  return {
    id: `sdp_${String(index + 1).padStart(4, '0')}`,
    question: input.question,
    scripturesCited: input.scripturesCited || [],
    scriptureOrder: input.scriptureOrder || input.scripturesCited || [],
    topic: input.topic,
    candidateConclusion: input.candidateConclusion || '',
    source: input.source,
    sourceType: input.sourceType || 'manual',
    confidence: Math.round(confidence * 1000) / 1000,
    reviewRequired: true,
    autoApplied: false,
    status: 'pending_review',
    approvalStatus: crossRef.approvalStatus,
    crossReferences: crossRef.crossReferences,
    concordanceLinks: crossRef.concordanceLinks,
    supportScore: crossRef.supportScore,
    metrics: crossRef.metrics,
    createdAt: new Date().toISOString(),
    pilotPhase: '2J-A',
  };
}

function extractClassCCandidates(phase2iPath) {
  if (!fs.existsSync(phase2iPath)) return [];

  const data = JSON.parse(fs.readFileSync(phase2iPath, 'utf8'));
  const seen = new Set();
  const items = [];

  for (const turn of data.turns || []) {
    const claimMap = {};
    for (const c of turn.claims || []) claimMap[c.claimId] = c;

    for (const cr of turn.claimResults || []) {
      if (cr.supportClass !== 'C') continue;
      const claimObj = claimMap[cr.claimId] || {};
      const scriptures = claimObj.scriptures || [];
      if (!scriptures.length && !claimObj.claim) continue;

      const key = `${turn.message}::${scriptures.join('|')}::${claimObj.claim?.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        question: turn.message,
        topic: turn.retrievedEvidence?.effectiveTopic || turn.group,
        scripturesCited: scriptures,
        scriptureOrder: scriptures,
        candidateConclusion: claimObj.claim || '',
        source: `phase2i_class_c:${turn.scenarioId}`,
        sourceType: 'stress_test_class_c',
        confidence: 0.4,
      });
    }
  }

  return items;
}

function sourcesToCandidates(sources) {
  return sources.map((s) => ({
    question: s.question,
    topic: s.topic,
    scripturesCited: s.scripturesCited || s.scriptures || [],
    scriptureOrder: s.scriptureOrder || s.scripturesCited || [],
    candidateConclusion: s.candidateConclusion || s.notes || '',
    source: s.sourceName || s.sourceUrl || 'manual_notes',
    sourceType: s.sourceType || 'manual_notes',
    confidence: s.confidence || 0.5,
  }));
}

/**
 * Run discovery pilot — returns candidates only.
 */
function runScriptureDiscoveryPilot({ phase2iResultsPath } = {}) {
  const phase2iPath =
    phase2iResultsPath ||
    path.join(__dirname, '..', 'docs', 'regression-trace', 'phase2i-conversation-stress-results.json');

  const inputs = [
    ...PILOT_QUESTIONS,
    ...continuityExpansionCandidates(),
    ...extractClassCCandidates(phase2iPath),
    ...sourcesToCandidates(loadPilotSources()),
  ];

  const candidates = inputs.map((input, i) => {
    const crossRef = crossReferenceCandidate({
      question: input.question,
      scriptures: input.scripturesCited,
      scriptureOrder: input.scriptureOrder,
      topic: input.topic,
      candidateConclusion: input.candidateConclusion,
    });
    return buildCandidateRecord(input, crossRef, i);
  });

  return {
    ranAt: new Date().toISOString(),
    pilotPhase: '2J-A',
    candidateCount: candidates.length,
    candidates,
    summary: summarizeCandidates(candidates),
  };
}

function summarizeCandidates(candidates) {
  const byStatus = {};
  for (const c of candidates) {
    byStatus[c.approvalStatus] = (byStatus[c.approvalStatus] || 0) + 1;
  }
  return {
    total: candidates.length,
    byApprovalStatus: byStatus,
    reviewRequired: candidates.filter((c) => c.reviewRequired).length,
    potentiallyUseful: candidates.filter(
      (c) => c.approvalStatus === 'new_relationship' || c.approvalStatus === 'partially_approved'
    ).length,
    alreadyApproved: byStatus.already_approved || 0,
  };
}

module.exports = {
  PILOT_QUESTIONS,
  runScriptureDiscoveryPilot,
  summarizeCandidates,
  PILOT_SOURCES_PATH,
};
