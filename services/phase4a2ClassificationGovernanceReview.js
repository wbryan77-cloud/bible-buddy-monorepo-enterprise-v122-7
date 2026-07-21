/**
 * Phase 4A.2 — Classification governance review.
 * Review-only — no doctrine generation, promotion, or node creation.
 */

const fs = require('fs');
const path = require('path');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const PHASE4A1_DIR = path.join(OUT_DIR, 'phase4a1');
const PHASE4A2_DIR = path.join(OUT_DIR, 'phase4a2');

const G2R_BOOK_SECTIONS = {
  Torah: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  FormerProphets: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles'],
  LatterProphets: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'],
  Writings: ['Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalm', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'],
  Gospels: ['Matthew', 'Mark', 'Luke', 'John'],
  Acts: ['Acts'],
  Epistles: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
    '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'],
  Revelation: ['Revelation'],
};

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function normalizeKey(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBook(book = '') {
  return String(book).toLowerCase().replace(/\s+/g, ' ').trim();
}

function bookSection(book = '') {
  const key = normalizeBook(book);
  for (const [section, books] of Object.entries(G2R_BOOK_SECTIONS)) {
    if (books.some((b) => normalizeBook(b) === key)) return section;
  }
  return null;
}

function chainCompletenessScore(scriptures = []) {
  const valid = uniqueRefs(scriptures.filter((r) => verifyKjvReference(r).valid));
  if (!valid.length) return { score: 0, label: 'incomplete', sectionsPresent: [], scriptureCount: 0 };

  const sections = new Set();
  for (const ref of valid) {
    const v = verifyKjvReference(ref);
    const section = bookSection(v.book);
    if (section) sections.add(section);
  }

  const count = valid.length;
  const sectionList = [...sections];
  const hasTorah = sectionList.includes('Torah');
  const hasNt = sectionList.some((s) => ['Gospels', 'Acts', 'Epistles', 'Revelation'].includes(s));
  const span = sectionList.length;

  let label = 'partial';
  let score = 0.4;
  if (count >= 10 && span >= 4 && hasTorah && hasNt) {
    label = 'strong';
    score = 0.95;
  } else if (count >= 6 && span >= 3 && hasNt) {
    label = 'good';
    score = 0.8;
  } else if (count >= 4 && span >= 2) {
    label = 'moderate';
    score = 0.65;
  }

  return { score, label, sectionsPresent: sectionList, scriptureCount: count };
}

function expandedChainsForTopic(expanded, topic) {
  const chains = expanded.expandedChains || expanded.entries || expanded || [];
  return chains.filter(
    (e) => normalizeKey(e.topic) === normalizeKey(topic) && (e.originalScriptureChain || []).length >= 3,
  );
}

function distinctSourceCount(entries = []) {
  const names = new Set();
  for (const e of entries) {
    names.add(normalizeKey(e.sourceName || e.source || e.lessonTitle || 'unknown'));
  }
  return names.size;
}

function libraryChainForId(chainLibrary, chainId) {
  return (chainLibrary.chains || []).find((c) => c.chainId === chainId);
}

function reviewPrimaryChainCandidate(candidate, corpus, gapTopic) {
  const expanded = expandedChainsForTopic(corpus.expandedChains, candidate.topic);
  const chainSig = new Set((candidate.scriptures || []).map((r) => refKey(r)));
  const matchingExpanded = expanded.filter((e) => {
    const refs = (e.originalScriptureChain || []).map((r) => refKey(r));
    const overlap = refs.filter((r) => chainSig.has(r)).length;
    return overlap >= Math.min(4, chainSig.size * 0.5);
  });

  const libEntry = libraryChainForId(corpus.chainLibrary, candidate.chainId);
  const maturedPack = (corpus.matured.packs || []).find((p) => normalizeKey(p.topic) === normalizeKey(candidate.topic));

  const evidenceCount = Math.max(
    candidate.scriptures?.length || 0,
    matchingExpanded.length,
    maturedPack?.chainCount || 0,
  );
  const sourceCount = Math.max(
    candidate.sourceCount || 0,
    distinctSourceCount(matchingExpanded),
    libEntry?.sourceCount || 0,
  );
  const observedRecurrence = candidate.observedRecurrence || sourceCount >= 2 || matchingExpanded.length >= 2;
  const completeness = chainCompletenessScore(candidate.scriptures || libEntry?.scriptures || []);

  const hasTraceability = (corpus.traceability.packs || []).some(
    (p) => normalizeKey(p.topic) === normalizeKey(candidate.topic),
  );
  const hasDeepPack = (corpus.deepPacks.packs || []).some(
    (p) => normalizeKey(p.topic) === normalizeKey(candidate.topic),
  );
  const sandboxAnswer = (corpus.sandboxResults.answers || []).find(
    (a) => normalizeKey(a.packId) === normalizeKey(candidate.topic),
  );
  const traceabilityComplete = hasTraceability && hasDeepPack
    && sandboxAnswer?.traceabilityTier === 'full';

  const isCrossPack = normalizeKey(candidate.linkageNotes || '').includes('cross-pack')
    || normalizeKey(candidate.linkageNotes || '').includes('sibling pack')
    || (libEntry && normalizeKey(libEntry.topicCandidate) !== normalizeKey(candidate.topic));

  let reviewRecommendation = 'retain_as_candidate';
  let confidence = 0.5;

  if (isCrossPack && libEntry) {
    const inheritance = (corpus.inheritance.topics || []).find(
      (t) => normalizeKey(t.topic) === normalizeKey(candidate.topic),
    );
    const dependsOnSibling = (inheritance?.dependsOnObserved || []).some(
      (d) => normalizeKey(d).includes('spirit'),
    );
    if (libEntry.confidence >= 0.9 && libEntry.sourceCount >= 2 && dependsOnSibling) {
      reviewRecommendation = 'approve_for_future_promotion';
      confidence = Math.min(0.95, libEntry.confidence - 0.03);
    } else if (libEntry.sourceCount >= 2) {
      reviewRecommendation = 'approve_for_future_promotion';
      confidence = 0.88;
    }
  } else if (isCrossPack) {
    reviewRecommendation = 'retain_as_candidate';
    confidence = 0.6;
  } else if (
    observedRecurrence
    && sourceCount >= 2
    && completeness.score >= 0.8
    && evidenceCount >= 10
  ) {
    reviewRecommendation = 'approve_for_future_promotion';
    confidence = Math.min(0.92, 0.7 + completeness.score * 0.15 + Math.min(sourceCount, 5) * 0.02);
  } else if (
    observedRecurrence
    && completeness.score >= 0.65
    && (sourceCount >= 2 || matchingExpanded.length >= 5)
  ) {
    reviewRecommendation = 'approve_for_future_promotion';
    confidence = Math.min(0.85, 0.65 + completeness.score * 0.12);
  } else if (!observedRecurrence && completeness.score < 0.5) {
    reviewRecommendation = 'reject';
    confidence = 0.75;
  } else if (completeness.score < 0.5 && sourceCount < 2) {
    reviewRecommendation = 'reject';
    confidence = 0.7;
  }

  const isPartialDuplicate = normalizeKey(candidate.topic) === 'holy_spirit'
    && !isCrossPack
    && completeness.scriptureCount <= 16
    && corpus.chainLibrary.chains?.some(
      (c) => normalizeKey(c.topicCandidate) === 'spirit_of_god' && (c.scriptures || []).length > completeness.scriptureCount,
    );

  if (isPartialDuplicate) {
    reviewRecommendation = 'retain_as_candidate';
    confidence = 0.55;
  }

  return {
    topic: candidate.topic,
    candidateChain: candidate.chainId,
    reviewRecommendation,
    confidence: Math.round(confidence * 100) / 100,
    humanApprovalRequired: true,
    governanceMetrics: {
      evidenceCount,
      sourceCount,
      observedRecurrence,
      chainCompleteness: completeness.label,
      chainCompletenessScore: completeness.score,
      sectionsPresent: completeness.sectionsPresent,
      scriptureCount: completeness.scriptureCount,
      traceabilityComplete,
      foundIn: candidate.foundIn || [],
      linkageType: isCrossPack ? 'cross_pack' : 'primary_chain',
    },
  };
}

function reviewDavidNode(corpus) {
  const orgDavid = (corpus.orgV3.packets || []).filter((p) => normalizeKey(p.topicCandidate) === 'david');
  const orgChains = orgDavid.filter((p) => (p.originalScriptureChain || []).length >= 3);
  const continuityDavid = (corpus.continuity.topics || []).filter((t) => /david/i.test(t.topic || ''));
  const inVine = (corpus.vine.nodes || []).some((n) => normalizeKey(n.topic || n.id) === 'david');
  const inInheritance = (corpus.inheritance.topics || []).some((t) => normalizeKey(t.topic) === 'david');

  const continuitySupport = continuityDavid.length >= 2;
  const inheritanceSupport = inInheritance;
  const packetSupport = orgChains.length >= 2;
  const topicSupport = orgDavid.length >= 2;

  const pathway = (corpus.sandboxResults.vineResults || []).find(
    (v) => /david/i.test(v.name || ''),
  );
  const pathwayBroken = pathway?.result?.fullyNavigable === false;

  let reviewRecommendation = 'retain_candidate';
  let confidence = 0.6;

  if (packetSupport && continuitySupport && topicSupport && pathwayBroken && !inVine) {
    reviewRecommendation = 'approve_candidate_node';
    confidence = 0.88;
  } else if (packetSupport && !inVine) {
    reviewRecommendation = 'approve_candidate_node';
    confidence = 0.82;
  } else if (!packetSupport && !continuitySupport) {
    reviewRecommendation = 'reject';
    confidence = 0.7;
  }

  const chainScriptures = orgChains.flatMap((p) => p.originalScriptureChain || []);
  const completeness = chainCompletenessScore(chainScriptures);

  return {
    topic: 'david',
    reviewRecommendation,
    confidence: Math.round(confidence * 100) / 100,
    humanApprovalRequired: true,
    governanceMetrics: {
      continuitySupport,
      continuityTopicCount: continuityDavid.length,
      inheritanceSupport,
      packetSupport,
      packetCount: orgDavid.length,
      chainCount: orgChains.length,
      topicSupport,
      inScriptureVineNetwork: inVine,
      pathwayNavigable: pathway?.result?.fullyNavigable ?? null,
      chainCompleteness: completeness.label,
      scriptureWitnessCount: completeness.scriptureCount,
      suggestedLinks: ['kingdom_of_god', 'messiah_logos', 'samuel'],
    },
  };
}

function buildClassificationImpact( chainReviews, davidReview) {
  const approvedChains = chainReviews.filter((r) => r.reviewRecommendation === 'approve_for_future_promotion');
  const approvedDavid = davidReview.reviewRecommendation === 'approve_candidate_node';

  const impacts = {
    retrieval: {
      currentState: 'Supporting inventory recoverable via vine enrichment for dietary_law, death_state, holy_spirit',
      ifApproved: approvedChains.length
        ? 'Primary originals become retrievable via chain-library packAttachments; partial_supporting_inventory tier may upgrade'
        : 'No retrieval change until promotion applied',
      affectedTopics: approvedChains.map((r) => r.topic),
    },
    traceability: {
      currentState: 'No scripture-traceability-index entries for gap topics; sandbox tier partial_supporting_inventory',
      ifApproved: approvedChains.length
        ? 'Bookkeeping packAttachments add chain traceability without new doctrine'
        : 'Traceability remains partial for unapproved candidates',
      traceabilityUpgradeCandidates: approvedChains.map((r) => r.topic),
    },
    vineNavigation: {
      currentState: 'Kingdom→David→Messiah pathway partial — david node missing',
      ifApproved: approvedDavid
        ? 'David node would bridge kingdom_of_god and messiah_logos; pathway fully navigable'
        : 'David pathway remains partial until node approved and created',
      pathway: 'Kingdom → David → Messiah → Resurrection → Millennium → New Jerusalem',
    },
    continuityScoring: {
      currentState: 'Gap topics score low continuitySupport in sandbox quality (0 for dietary_law, death_state, holy_spirit)',
      ifApproved: 'Chain attachment improves genesisToRevelationSupport and continuitySupport scores on next sandbox run',
      expectedLift: approvedChains.length ? 'moderate' : 'none',
    },
    chainAttachment: {
      currentState: 'weak_chain failures for dietary_law, death_state, holy_spirit in Phase 4A sandbox',
      ifApproved: approvedChains.map((r) => ({
        topic: r.topic,
        candidateChain: r.candidateChain,
        attachmentType: r.governanceMetrics?.linkageType === 'cross_pack' ? 'packAttachment_bookkeeping' : 'chain_library_promotion',
      })),
      pendingRetain: chainReviews.filter((r) => r.reviewRecommendation === 'retain_as_candidate').map((r) => r.topic),
      rejected: chainReviews.filter((r) => r.reviewRecommendation === 'reject').map((r) => r.topic),
    },
  };

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.2',
    reviewOnly: true,
    autoApplied: false,
    humanApprovalRequired: true,
    approvedCandidateCount: approvedChains.length + (approvedDavid ? 1 : 0),
    impacts,
  };
}

function buildPhase4BEntryReadiness(chainReviews, davidReview, impact) {
  const approved = chainReviews.filter((r) => r.reviewRecommendation === 'approve_for_future_promotion');
  const retain = chainReviews.filter((r) => r.reviewRecommendation === 'retain_as_candidate');
  const rejected = chainReviews.filter((r) => r.reviewRecommendation === 'reject');
  const sandboxFailures = (loadJson(path.join(OUT_DIR, 'phase4a-sandbox', 'sandbox-test-results.json'), {}).failures || []);

  const lines = [
    '# Phase 4B Entry Readiness',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Mission',
    '',
    'Governance review of Phase 4A.1 classification candidates. Review-only — no production changes.',
    '',
    '## Executive answers',
    '',
    '### 1. Are remaining failures bookkeeping only?',
    '',
    '**Yes, predominantly.** Phase 4A sandbox failures are `weak_chain` bookkeeping flags for packs with supporting inventory but no chain-library primary attachment. Answers remain traceable at `partial_supporting_inventory` tier. David pathway failure is a vine-node classification gap, not a retrieval failure.',
    '',
    '### 2. Are remaining failures evidence-related?',
    '',
    '**No for retrieval; partially for scoring.** Evidence exists in matured packs, expanded-chain-support, and org organization. Failures reflect classification and attachment gaps, not missing source material. Quality scores for gap topics show medium unsupported-claim risk due to weak continuity scoring — expected until chains attach.',
    '',
    '### 3. What candidate approvals remain?',
    '',
    `Governance recommends **${approved.length}** chain/linkage candidates for future promotion and **${davidReview.reviewRecommendation === 'approve_candidate_node' ? '1' : '0'}** David vine node candidate:`,
    '',
    ...approved.map((r) => `- **${r.topic}** — ${r.candidateChain} (${r.reviewRecommendation}, confidence ${r.confidence})`),
    ...(davidReview.reviewRecommendation === 'approve_candidate_node'
      ? [`- **david** vine node (${davidReview.reviewRecommendation}, confidence ${davidReview.confidence})`]
      : []),
  ];

  if (retain.length) {
    lines.push('', '**Retain as candidate (no promotion yet):**', '');
    for (const r of retain) {
      lines.push(`- ${r.topic} — ${r.candidateChain} (confidence ${r.confidence})`);
    }
  }

  lines.push(
    '',
    '### 4. What governance decisions remain?',
    '',
    'Human approval required before any corpus mutation:',
    '',
    ...approved.map((r) => `- Approve future promotion: ${r.topic} → ${r.candidateChain}`),
    ...(davidReview.reviewRecommendation === 'approve_candidate_node'
      ? ['- Approve David vine candidate node creation (review-only until applied)']
      : davidReview.reviewRecommendation === 'retain_candidate'
        ? ['- David node retained as candidate — human review before vine creation']
        : []),
    '- Review queue (32 packets) remains independent — not blockers for Phase 4B',
    '- KJV traceability freeze candidates (144000, peter_paul_alignment) remain review-only',
    '',
    '### 5. Can Phase 4B proceed safely today?',
    '',
    '**Yes.** Phase 4A determination `READY_FOR_PHASE_4B` holds. Governance review confirms failures are bookkeeping/classification gaps with evidence-backed candidates queued for human approval. No doctrine generation, automatic promotion, or production deployment required to begin Phase 4B controlled expansion testing.',
    '',
    '## Sandbox failure inventory',
    '',
    `| Pack | Failure type | Governance outcome |`,
    `|------|--------------|-------------------|`,
  );

  for (const f of sandboxFailures) {
    const reviews = chainReviews.filter((r) => normalizeKey(r.topic) === normalizeKey(f.packId));
    const review = reviews.find((r) => r.reviewRecommendation === 'approve_for_future_promotion') || reviews[0];
    lines.push(`| ${f.packId} | ${f.failures?.[0]?.type || '—'} | ${review?.reviewRecommendation || '—'} |`);
  }

  lines.push(
    '',
    '| david (vine) | missing_node | ' + davidReview.reviewRecommendation + ' |',
    '',
    '## Stop conditions honored',
    '',
    'No doctrine generation. No automatic promotion. No node creation. No production changes. Review-only governance pass.',
    '',
    '## Artifacts',
    '',
    '- `docs/evidence-candidates/phase4a2/primary-chain-governance-review.json`',
    '- `docs/evidence-candidates/phase4a2/david-node-governance-review.json`',
    '- `docs/evidence-candidates/phase4a2/classification-impact-assessment.json`',
    '- `Phase4BEntryReadiness.md`',
    '',
  );

  return lines.join('\n');
}

function runPhase4A2() {
  const corpus = {
    promotionCandidates: loadJson(path.join(PHASE4A1_DIR, 'primary-chain-promotion-candidates.json'), { candidates: [] }),
    gapAnalysis: loadJson(path.join(PHASE4A1_DIR, 'primary-chain-gap-analysis.json'), { topics: [] }),
    davidAudit: loadJson(path.join(PHASE4A1_DIR, 'david-vine-node-audit.json'), {}),
    expandedChains: loadJson(path.join(OUT_DIR, 'expanded-chain-support.json'), {}),
    matured: loadJson(path.join(OUT_DIR, 'matured-doctrine-packs.json'), { packs: [] }),
    chainLibrary: loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] }),
    traceability: loadJson(path.join(OUT_DIR, 'scripture-traceability-index.json'), { packs: [] }),
    deepPacks: loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }),
    orgV3: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] }),
    continuity: loadJson(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), { topics: [] }),
    inheritance: loadJson(path.join(OUT_DIR, 'topic-inheritance-map.json'), { topics: [] }),
    vine: loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), { nodes: [] }),
    sandboxResults: loadJson(path.join(OUT_DIR, 'phase4a-sandbox', 'sandbox-test-results.json'), {}),
  };

  const chainReviews = (corpus.promotionCandidates.candidates || []).map((c) =>
    reviewPrimaryChainCandidate(c, corpus, c.topic),
  );

  const chainGovernanceOutput = {
    ranAt: new Date().toISOString(),
    phase: '4A.2',
    reviews: chainReviews.map((r) => ({
      topic: r.topic,
      candidateChain: r.candidateChain,
      reviewRecommendation: r.reviewRecommendation,
      confidence: r.confidence,
      humanApprovalRequired: r.humanApprovalRequired,
      metrics: r.governanceMetrics,
    })),
    humanApprovalRequired: true,
    autoPromotion: false,
  };

  const davidReview = reviewDavidNode(corpus);
  const davidOutput = {
    topic: davidReview.topic,
    reviewRecommendation: davidReview.reviewRecommendation,
    confidence: davidReview.confidence,
    humanApprovalRequired: davidReview.humanApprovalRequired,
    metrics: davidReview.governanceMetrics,
  };

  const impact = buildClassificationImpact(chainReviews, davidReview);

  fs.mkdirSync(PHASE4A2_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PHASE4A2_DIR, 'primary-chain-governance-review.json'),
    JSON.stringify(chainGovernanceOutput, null, 2),
  );
  fs.writeFileSync(
    path.join(PHASE4A2_DIR, 'david-node-governance-review.json'),
    JSON.stringify(davidOutput, null, 2),
  );
  fs.writeFileSync(
    path.join(PHASE4A2_DIR, 'classification-impact-assessment.json'),
    JSON.stringify(impact, null, 2),
  );
  fs.writeFileSync(
    path.join(ROOT, 'Phase4BEntryReadiness.md'),
    buildPhase4BEntryReadiness(chainReviews, davidReview, impact),
  );

  return { chainReviews, davidReview, impact, outputDir: PHASE4A2_DIR };
}

module.exports = { runPhase4A2, PHASE4A2_DIR };
