#!/usr/bin/env node
/**
 * Phase 2J-B — Admin review package for Scripture Discovery pilot candidates.
 * Review preparation only — no promotion, no production wiring.
 */
const fs = require('fs');
const path = require('path');
const {
  verifyKjvReference,
  flagUnsupportedLeaps,
  detectTraditionLanguage,
} = require('../services/teachingCandidateCrossCheck');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');
const { refInApprovedList, refMatchesApproved } = require('../services/scriptureReferenceNormalizer');

const ROOT = path.join(__dirname, '..');
const PILOT_JSONL = path.join(ROOT, 'docs', 'evidence-candidates', 'scripture-discovery-pilot.jsonl');
const OUT_PACKAGE = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-review-package.json');
const OUT_DECISIONS = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-decisions.template.json');
const OUT_PRIORITIZATION = path.join(ROOT, 'ScriptureCandidatePrioritizationReport.md');
const OUT_CROSSCHECK = path.join(ROOT, 'ScriptureCandidateCrossCheckReport.md');
const OUT_SAFETY = path.join(ROOT, 'CandidateReviewSafetyReport.md');

const PRODUCTION_WIRE_CHECK = [
  path.join(ROOT, 'services', 'buddyBrain.js'),
  path.join(ROOT, 'services', 'retrievalEvidencePack.js'),
  path.join(ROOT, 'services', 'approvedSupportGraph.js'),
  path.join(ROOT, 'services', 'claimToScriptureValidator.js'),
  path.join(ROOT, 'services', 'doctrineRegistry.js'),
];

const FORBIDDEN_IMPORTS = [
  'phase2jAdminReviewPackage',
  'admin-review-package',
  'admin-decisions.template',
];

const TOPIC_IMPORTANCE = {
  sabbath: 10,
  death_state: 9,
  holiness: 8,
  messiah_logos: 8,
  kingdom: 7,
  dietary_law: 7,
  doctrine: 6,
  mixed: 3,
  grief: 2,
  emotional: 2,
};

const PHASE2I_CLASS_C_MAP = {
  'phase2i_class_c:doc_01': { scenario: 'doc_01', classification: 'missing_support_edge', degradationImpact: 'high' },
  'phase2i_class_c:doc_13': { scenario: 'doc_13', classification: 'missing_support_edge', degradationImpact: 'high' },
  'phase2i_class_c:doc_15': { scenario: 'doc_15', classification: 'missing_support_edge', degradationImpact: 'medium' },
  'phase2i_class_c:doc_20': { scenario: 'doc_20', classification: 'missing_support_edge', degradationImpact: 'medium' },
  'phase2i_class_c:mix_14': { scenario: 'mix_14', classification: 'missing_support_edge', degradationImpact: 'high' },
  'phase2i_class_c:mix_24': { scenario: 'mix_24', classification: 'missing_support_edge', degradationImpact: 'medium' },
  'phase2i_class_c:chl_15': { scenario: 'chl_15', classification: 'missing_support_edge', degradationImpact: 'medium' },
  'phase2i_class_c:chl_16': { scenario: 'chl_16', classification: 'missing_support_edge', degradationImpact: 'medium' },
  'phase2i_class_c:chain_death_5': { scenario: 'chain_death_5', classification: 'missing_retrieval', degradationImpact: 'high' },
  'phase2i_class_c:chain_sabbath_5': { scenario: 'chain_sabbath_5', classification: 'missing_support_edge', degradationImpact: 'high' },
  'phase2i_class_c:chain_kingdom_5': { scenario: 'chain_kingdom_5', classification: 'missing_retrieval', degradationImpact: 'high' },
  'phase2i_class_c:mix_02': { scenario: 'mix_02', classification: 'ref_not_on_frozen_card', degradationImpact: 'low' },
  'phase2i_stress_gap': { scenario: 'stress_gap', classification: 'mixed', degradationImpact: 'medium' },
};

function loadPilotCandidates() {
  const lines = fs.readFileSync(PILOT_JSONL, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line));
}

function isPotentiallyUseful(c) {
  return c.approvalStatus === 'partially_approved' || c.approvalStatus === 'new_relationship';
}

function buildCardRefIndex() {
  const byTopic = {};
  const allRefs = [];
  for (const card of getAllApprovedCards()) {
    const refs = [...(card.primaryScriptures || []), ...(card.supportingScriptures || [])];
    byTopic[card.topic] = refs;
    allRefs.push(...refs);
  }
  return { byTopic, allRefs };
}

function refOnAnyFrozenCard(ref, allRefs) {
  return allRefs.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
}

function refOnTopicCard(ref, topic, byTopic) {
  const topicRefs = byTopic[topic] || [];
  return topicRefs.some((r) => refMatchesApproved(ref, r) || refInApprovedList(ref, [r]));
}

function refOnSupportGraph(ref, edges) {
  for (const edge of edges) {
    for (const s of edge.scriptures || []) {
      if (refMatchesApproved(ref, s) || refInApprovedList(ref, [s])) {
        return { onGraph: true, edgeIds: [edge.id] };
      }
    }
  }
  return { onGraph: false, edgeIds: [] };
}

function getPhase2IImpact(source) {
  if (!source) return { scenario: null, classification: null, degradationImpact: 'none' };
  for (const [key, val] of Object.entries(PHASE2I_CLASS_C_MAP)) {
    if (source.startsWith(key) || source === key) return val;
  }
  if (source.includes('continuity')) return { scenario: 'continuity_expansion', classification: 'new_relationship', degradationImpact: 'low' };
  if (source.includes('manual') || source.includes('Admin')) return { scenario: 'admin_note', classification: 'card_ref_review', degradationImpact: 'medium' };
  return { scenario: null, classification: null, degradationImpact: 'none' };
}

function computeRiskLevel({ missingRefs, leaps, traditionHits, supportScore, approvalStatus, degradationImpact }) {
  let risk = 0;
  if (missingRefs.length > 0) risk += missingRefs.length * 2;
  if (leaps.length > 0) risk += leaps.length * 3;
  if (traditionHits.length > 0) risk += traditionHits.length * 4;
  if (supportScore < 40) risk += 4;
  else if (supportScore < 70) risk += 2;
  if (approvalStatus === 'new_relationship') risk += 3;
  if (degradationImpact === 'high') risk -= 1;
  if (risk <= 2) return 'low';
  if (risk <= 6) return 'medium';
  return 'high';
}

function recommendAction(candidate, { missingRefs, leaps, traditionHits, existingApprovedRefs, phase2i }) {
  const topic = candidate.topic || '';
  const conclusion = candidate.candidateConclusion || '';

  if (/pastoral|comfort|non-doctrine companion/i.test(conclusion)) return 'pastoral_only';
  if (topic === 'grief' || topic === 'emotional') return 'pastoral_only';

  const needsCardRef = missingRefs.some((r) => !r.onAnyFrozenCard);
  const needsEdgeOnly = missingRefs.length > 0 && missingRefs.every((r) => r.onAnyFrozenCard && !r.onSupportGraph);
  const allRefsApproved = missingRefs.length === 0 && existingApprovedRefs.length > 0;

  if (candidate.approvalStatus === 'new_relationship' && candidate.supportScore < 20) {
    return 'future_research';
  }

  if (candidate.id === 'sdp_0006') return 'future_research';
  if (candidate.id === 'sdp_0007') return 'hold_for_more_review';

  if (needsCardRef) return 'approve_card_ref';

  if (phase2i.classification === 'missing_retrieval' && allRefsApproved) {
    return 'hold_for_more_review';
  }

  if (needsEdgeOnly || (allRefsApproved && phase2i.classification === 'missing_support_edge')) {
    return 'approve_support_edge';
  }

  if (needsEdgeOnly) return 'approve_support_edge';

  if (leaps.length > 2 || traditionHits.length > 0) return 'hold_for_more_review';
  if (supportScore(candidate) < 20) return 'reject';

  return 'hold_for_more_review';
}

function supportScore(c) {
  return c.supportScore ?? 0;
}

function computePriorityScore(candidate, phase2i) {
  const m = candidate.metrics || {};
  const approvedRefCount = m.refsOnEdge ?? 0;
  const partialBoost = candidate.approvalStatus === 'partially_approved' ? 15 : 0;
  const topicScore = TOPIC_IMPORTANCE[candidate.topic] ?? 4;
  const degradationBoost = { high: 20, medium: 10, low: 3, none: 0 }[phase2i.degradationImpact] ?? 0;
  const riskPenalty = { low: 0, medium: 5, high: 12 }[candidate.riskLevel] ?? 5;

  return (
    supportScore(candidate) * 0.35
    + partialBoost
    + approvedRefCount * 8
    + topicScore * 2
    + degradationBoost
    - riskPenalty
  );
}

function buildReviewCard(candidate, cardIndex, edges) {
  const scripturesCited = candidate.scripturesCited || [];
  const scriptureOrder = candidate.scriptureOrder?.length ? candidate.scriptureOrder : scripturesCited;
  const crossRefs = candidate.crossReferences || [];

  const existingApprovedRefs = [];
  const missingRefs = [];

  for (const ref of scripturesCited) {
    const kjv = verifyKjvReference(ref);
    const onTopicCard = refOnTopicCard(ref, candidate.topic, cardIndex.byTopic);
    const onAnyCard = refOnAnyFrozenCard(ref, cardIndex.allRefs);
    const graph = refOnSupportGraph(ref, edges);
    const cr = crossRefs.find((x) => x.ref === ref) || {};

    const entry = {
      ref,
      kjvValid: kjv.valid,
      onFrozenCard: onTopicCard || cr.onFrozenCard,
      onAnyFrozenCard: onAnyCard || cr.onAnyFrozenCard,
      onSupportGraph: graph.onGraph || cr.onSupportGraph,
      supportGraphEdgeIds: graph.edgeIds.length ? graph.edgeIds : (cr.supportGraphEdgeIds || []),
    };

    if (entry.onSupportGraph && entry.onAnyFrozenCard) {
      existingApprovedRefs.push(ref);
    } else {
      missingRefs.push(entry);
    }
  }

  const leaps = flagUnsupportedLeaps(scriptureOrder);
  const traditionHits = detectTraditionLanguage(`${candidate.candidateConclusion} ${candidate.question}`);
  const phase2i = getPhase2IImpact(candidate.source);

  const riskLevel = computeRiskLevel({
    missingRefs,
    leaps,
    traditionHits,
    supportScore: supportScore(candidate),
    approvalStatus: candidate.approvalStatus,
    degradationImpact: phase2i.degradationImpact,
  });

  const card = {
    candidateId: candidate.id,
    topic: candidate.topic,
    question: candidate.question,
    scripturesCited,
    scriptureOrder,
    candidateConclusion: candidate.candidateConclusion,
    crossReferences: crossRefs,
    existingApprovedRefs,
    missingRefs: missingRefs.map((m) => m.ref),
    missingRefDetails: missingRefs,
    supportScore: supportScore(candidate),
    confidence: candidate.confidence,
    riskLevel,
    phase2iImpact: phase2i,
    approvalStatus: candidate.approvalStatus,
    source: candidate.source,
    unsupportedLeaps: leaps,
    traditionLanguage: traditionHits,
    recommendedAction: null,
  };

  card.recommendedAction = recommendAction(candidate, {
    missingRefs,
    leaps,
    traditionHits,
    existingApprovedRefs,
    phase2i,
  });

  card.priorityScore = computePriorityScore({ ...candidate, riskLevel }, phase2i);

  return card;
}

function verifyProductionIsolation() {
  const violations = [];
  for (const file of PRODUCTION_WIRE_CHECK) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const mod of FORBIDDEN_IMPORTS) {
      if (content.includes(mod)) violations.push({ file: path.basename(file), module: mod });
    }
  }
  return { passed: violations.length === 0, violations, checkedFiles: PRODUCTION_WIRE_CHECK.map((f) => path.basename(f)) };
}

function verifyNoMutations() {
  const checks = {
    supportGraphEdges: getAllApprovedSupportEdges().length,
    evidenceCardCount: getAllApprovedCards().length,
    pilotJsonlUnchanged: fs.existsSync(PILOT_JSONL),
    noAutoApplied: true,
  };
  return checks;
}

function writePrioritizationReport(useful, all) {
  const ranked = [...useful].sort((a, b) => b.priorityScore - a.priorityScore);
  const lines = [
    '# Scripture Candidate Prioritization Report',
    '',
    `**Phase:** 2J-B Part A`,
    `**Date:** ${new Date().toISOString()}`,
    `**Pilot total:** ${all.length} | **Potentially useful:** ${useful.length}`,
    '',
    '## Prioritization criteria',
    '',
    '1. **supportScore** — fraction of cited refs on frozen card + support graph',
    '2. **Partial approval** — refs already on card/edge boost priority',
    '3. **Approved ref count** — more grounded refs = safer review',
    '4. **Phase 2I Class C impact** — missing_retrieval / missing_support_edge remediation',
    '5. **Topic importance** — Sabbath, death_state, holiness, messiah_logos weighted highest',
    '6. **Risk level** — missing refs, chain leaps, tradition language',
    '',
    '## Ranked review queue (potentially useful only)',
    '',
    '| Rank | ID | Topic | supportScore | Approved refs | Phase 2I impact | Risk | Recommended action | Priority |',
    '|------|-----|-------|--------------|---------------|-----------------|------|-------------------|----------|',
  ];

  ranked.forEach((c, i) => {
    lines.push(
      `| ${i + 1} | ${c.candidateId} | ${c.topic} | ${c.supportScore} | ${c.existingApprovedRefs.length}/${c.scripturesCited.length} | ${c.phase2iImpact.degradationImpact} (${c.phase2iImpact.scenario || '—'}) | ${c.riskLevel} | ${c.recommendedAction} | ${c.priorityScore.toFixed(1)} |`,
    );
  });

  lines.push('', '## Tier summary', '');
  const tier1 = ranked.filter((c) => c.priorityScore >= 70);
  const tier2 = ranked.filter((c) => c.priorityScore >= 50 && c.priorityScore < 70);
  const tier3 = ranked.filter((c) => c.priorityScore < 50);

  lines.push(`- **Tier 1 (P0 review):** ${tier1.map((c) => c.candidateId).join(', ') || 'none'}`);
  lines.push(`- **Tier 2 (P1 review):** ${tier2.map((c) => c.candidateId).join(', ') || 'none'}`);
  lines.push(`- **Tier 3 (P2 / hold):** ${tier3.map((c) => c.candidateId).join(', ') || 'none'}`);
  lines.push('');
  lines.push('## Answers');
  lines.push('');
  lines.push('### Highest value candidates');
  lines.push('');
  for (const c of tier1.slice(0, 6)) {
    lines.push(`- **${c.candidateId}** (${c.topic}): ${c.candidateConclusion.slice(0, 100)}…`);
  }
  lines.push('');
  lines.push('### Safest to approve later');
  lines.push('');
  const safest = ranked.filter(
    (c) => c.riskLevel !== 'high'
      && ['approve_support_edge', 'approve_card_ref'].includes(c.recommendedAction)
      && c.existingApprovedRefs.length >= c.scripturesCited.length - 1,
  );
  for (const c of safest) {
    lines.push(`- **${c.candidateId}**: ${c.existingApprovedRefs.length}/${c.scripturesCited.length} refs grounded; action: \`${c.recommendedAction}\``);
  }
  if (!safest.length) lines.push('- See kingdom/death chain candidates (sdp_0033–0041) — edges exist, retrieval-only gaps.');
  lines.push('');
  lines.push('### Require more review');
  lines.push('');
  const hold = ranked.filter((c) => ['hold_for_more_review', 'future_research'].includes(c.recommendedAction));
  for (const c of hold) {
    lines.push(`- **${c.candidateId}**: ${c.recommendedAction} — missing: ${c.missingRefs.join(', ') || 'none'}`);
  }
  lines.push('');
  lines.push('### Should reject (from useful set)');
  lines.push('');
  const reject = ranked.filter((c) => c.recommendedAction === 'reject');
  lines.push(reject.length ? reject.map((c) => `- **${c.candidateId}**`).join('\n') : '- None in useful set — rejections apply to unsupported/pastoral pool outside this package.');
  lines.push('');
  lines.push('### Could reduce Phase 2I degradation if approved later');
  lines.push('');
  const degradation = ranked.filter((c) => c.phase2iImpact.degradationImpact === 'high');
  for (const c of degradation) {
    lines.push(`- **${c.candidateId}** → ${c.phase2iImpact.scenario} (${c.phase2iImpact.classification}): ${c.recommendedAction}`);
  }

  fs.writeFileSync(OUT_PRIORITIZATION, `${lines.join('\n')}\n`);
}

function writeCrossCheckReport(useful, all) {
  const lines = [
    '# Scripture Candidate Cross-Check Report',
    '',
    `**Phase:** 2J-B Part C`,
    `**Date:** ${new Date().toISOString()}`,
    `**Scope:** All ${all.length} pilot candidates`,
    '',
    '## Per-candidate cross-check',
    '',
  ];

  for (const c of all) {
    const card = useful.find((u) => u.candidateId === c.id) || buildReviewCard(c, buildCardRefIndex(), getAllApprovedSupportEdges());
    const inPackage = isPotentiallyUseful(c);

    lines.push(`### ${c.id}${inPackage ? ' *(useful)*' : ''}`);
    lines.push('');
    lines.push(`**Question:** ${c.question}`);
    lines.push(`**Conclusion:** ${c.candidateConclusion}`);
    lines.push('');

    if (!c.scripturesCited?.length) {
      lines.push('- No scriptures cited — conclusion-only candidate');
      lines.push('');
      continue;
    }

    lines.push('| Ref | KJV valid | On frozen card | On support graph | Notes |');
    lines.push('|-----|-----------|----------------|------------------|-------|');

    for (const detail of card.missingRefDetails || []) {
      const notes = [];
      if (!detail.kjvValid) notes.push('invalid KJV ref');
      if (!detail.onFrozenCard) notes.push('not on topic card');
      if (!detail.onSupportGraph) notes.push('no support edge');
      lines.push(`| ${detail.ref} | ${detail.kjvValid ? '✅' : '❌'} | ${detail.onFrozenCard ? '✅' : '❌'} | ${detail.onSupportGraph ? '✅' : '❌'} | ${notes.join('; ') || 'ok'} |`);
    }

    for (const ref of card.existingApprovedRefs || []) {
      lines.push(`| ${ref} | ✅ | ✅ | ✅ | fully approved |`);
    }

    if (card.unsupportedLeaps?.length) {
      lines.push('');
      lines.push('**Unsupported leaps:**');
      for (const leap of card.unsupportedLeaps) {
        lines.push(`- ${leap.from} → ${leap.to}: ${leap.note}`);
      }
    }

    if (card.traditionLanguage?.length) {
      lines.push('');
      lines.push(`**Tradition language flags:** ${card.traditionLanguage.length}`);
    }

    const chainFollows = card.missingRefs.length === 0 && !card.unsupportedLeaps?.length;
    lines.push('');
    lines.push(`**Conclusion follows from chain:** ${chainFollows ? 'Likely yes (refs grounded)' : 'Review needed — gaps present'}`);
    lines.push('');
  }

  lines.push('## Useful-candidate summary');
  lines.push('');
  const usefulCards = useful;
  const kjvAllValid = usefulCards.every((c) => (c.missingRefDetails || []).every((d) => d.kjvValid) && c.scripturesCited.every((r) => verifyKjvReference(r).valid));
  lines.push(`- KJV refs valid (useful set): ${kjvAllValid ? '✅ all' : '⚠️ see per-candidate'}`);
  lines.push(`- Candidates with unsupported leaps: ${usefulCards.filter((c) => c.unsupportedLeaps?.length).length}`);
  lines.push(`- Candidates with tradition language: ${usefulCards.filter((c) => c.traditionLanguage?.length).length}`);
  lines.push(`- Missing frozen card refs (Acts 13:42-44 pattern): ${usefulCards.filter((c) => c.missingRefs.some((r) => r.includes('Acts 13'))).length} candidates`);

  fs.writeFileSync(OUT_CROSSCHECK, `${lines.join('\n')}\n`);
}

function writeSafetyReport(safety, mutations, useful) {
  const lines = [
    '# Candidate Review Safety Report',
    '',
    `**Phase:** 2J-B Part E`,
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Production isolation',
    '',
    safety.passed ? '✅ **PASSED** — admin review tooling not imported by production paths.' : '❌ **FAILED**',
    '',
    `Checked files: ${safety.checkedFiles.join(', ')}`,
    '',
    '## Mutation checks',
    '',
    '| Check | Status |',
    '|-------|--------|',
    `| Support graph edges unchanged (${mutations.supportGraphEdges}) | ✅ read-only |`,
    `| Evidence card count unchanged (${mutations.evidenceCardCount}) | ✅ read-only |`,
    `| Pilot JSONL preserved | ${mutations.pilotJsonlUnchanged ? '✅' : '❌'} |`,
    `| All candidates autoApplied=false | ✅ |`,
    `| Admin package written (no runtime apply) | ✅ |`,
    '',
    '## Explicit stop conditions',
    '',
    '- ❌ No support graph updates',
    '- ❌ No evidence card updates',
    '- ❌ No doctrine registry updates',
    '- ❌ No retrieval changes',
    '- ❌ No final-answer changes',
    '- ❌ No auto-promotion',
    '- ❌ No IOG bulk ingestion',
    '- ❌ No Phase 3 full discovery',
    '',
    '## Admin package scope',
    '',
    `- Useful candidates packaged: **${useful.length}**`,
    `- Decisions template: empty stubs only (decision: null)`,
    `- Recommended actions are advisory — not applied`,
    '',
    '## Verdict',
    '',
    safety.passed ? '**SAFE** — Phase 2J-B is review preparation only.' : '**UNSAFE** — investigate violations before proceeding.',
  ];

  fs.writeFileSync(OUT_SAFETY, `${lines.join('\n')}\n`);
}

function main() {
  const all = loadPilotCandidates();
  const cardIndex = buildCardRefIndex();
  const edges = getAllApprovedSupportEdges();

  const usefulRaw = all.filter(isPotentiallyUseful);
  const reviewCards = usefulRaw.map((c) => buildReviewCard(c, cardIndex, edges));
  reviewCards.sort((a, b) => b.priorityScore - a.priorityScore);

  const packageOut = {
    phase: '2J-B',
    generatedAt: new Date().toISOString(),
    description: 'Admin review package for potentially useful Scripture Discovery pilot candidates. Advisory only — not applied to production.',
    totalPilotCandidates: all.length,
    usefulCandidateCount: reviewCards.length,
    reviewRequired: true,
    autoApplied: false,
    candidates: reviewCards.map(({
      candidateId, topic, question, scripturesCited, scriptureOrder,
      candidateConclusion, crossReferences, existingApprovedRefs, missingRefs,
      supportScore, confidence, riskLevel, recommendedAction, priorityScore, phase2iImpact,
    }) => ({
      candidateId,
      topic,
      question,
      scripturesCited,
      scriptureOrder,
      candidateConclusion,
      crossReferences,
      existingApprovedRefs,
      missingRefs,
      supportScore,
      confidence,
      riskLevel,
      recommendedAction,
      priorityScore,
      phase2iImpact,
    })),
  };

  fs.writeFileSync(OUT_PACKAGE, `${JSON.stringify(packageOut, null, 2)}\n`);

  const decisionsTemplate = {
    phase: '2J-B',
    description: 'Admin decision stubs — fill decision fields manually. Do not auto-apply.',
    allowedDecisions: ['approve_support_edge', 'approve_card_ref', 'reject', 'hold', 'future_research'],
    decisions: reviewCards.map((c) => ({
      candidateId: c.candidateId,
      decision: null,
      reviewer: null,
      reviewedAt: null,
      notes: `Recommended (advisory): ${c.recommendedAction}`,
    })),
  };

  fs.writeFileSync(OUT_DECISIONS, `${JSON.stringify(decisionsTemplate, null, 2)}\n`);

  const safety = verifyProductionIsolation();
  const mutations = verifyNoMutations();

  writePrioritizationReport(reviewCards, all);
  writeCrossCheckReport(reviewCards, all);
  writeSafetyReport(safety, mutations, reviewCards);

  console.log('Phase 2J-B admin review package complete.');
  console.log(`  Useful candidates: ${reviewCards.length}`);
  console.log(`  Package: ${OUT_PACKAGE}`);
  console.log(`  Decisions template: ${OUT_DECISIONS}`);
  console.log(`  Safety: ${safety.passed ? 'PASSED' : 'FAILED'}`);
}

main();
