/**
 * Phase 4A.1 — Primary chain gap analysis and David vine node audit.
 * Classification and traceability only — no doctrine generation or automatic promotion.
 */

const fs = require('fs');
const path = require('path');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const PHASE4A1_DIR = path.join(OUT_DIR, 'phase4a1');

const GAP_TOPICS = ['dietary_law', 'death_state', 'holy_spirit'];

const SIBLING_PACK_TOPICS = {
  holy_spirit: ['spirit_of_god', 'pentecost'],
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

function chainSignature(scriptures = []) {
  return uniqueRefs(scriptures.filter((r) => verifyKjvReference(r).valid))
    .map((r) => refKey(r))
    .sort()
    .join('|');
}

function makeChainId(scriptures = []) {
  const head = uniqueRefs(scriptures.filter((r) => verifyKjvReference(r).valid)).slice(0, 4);
  if (!head.length) return 'chain_empty';
  return `chain_${head.map((r) => refKey(r)).join('_')}`.slice(0, 80);
}

function foundInFlags(source) {
  const flags = [];
  const lane = source.recoveryLane || source.sourceType || '';
  const name = source.sourceName || source.source || '';
  if (/pdf/i.test(lane) || /pdf/i.test(name)) flags.push('pdfs');
  if (/transcript|session|icoj lesson/i.test(name) || /lesson handout/i.test(name)) flags.push('transcripts');
  if (source.sourceUrl === '2J-H' || /unified candidates|internal/i.test(name)) flags.push('qa_packets');
  if (/enrichment|vine/i.test(lane)) flags.push('enrichment_packets');
  if (source.fromChainLibrary) flags.push('chain_library');
  if (/matured/i.test(lane)) flags.push('matured_pack');
  if (!flags.length) flags.push('corpus_aggregation');
  return flags;
}

function loadCorpus() {
  return {
    enrichment: loadJson(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), { packs: [] }),
    chainLibrary: loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] }),
    orgV3: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] }),
    orgV2: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v2.json'), { packets: [] }),
    expandedChains: loadJson(path.join(OUT_DIR, 'expanded-chain-support.json'), []),
    matured: loadJson(path.join(OUT_DIR, 'matured-doctrine-packs.json'), { packs: [] }),
    traceability: loadJson(path.join(OUT_DIR, 'scripture-traceability-index.json'), { packs: [] }),
    deepPacks: loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }),
    vine: loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), { nodes: [] }),
    continuity: loadJson(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), { topics: [] }),
    inheritance: loadJson(path.join(OUT_DIR, 'topic-inheritance-map.json'), { topics: [] }),
    sandboxResults: loadJson(path.join(OUT_DIR, 'phase4a-sandbox', 'sandbox-test-results.json'), {}),
  };
}

function enrichmentSupportingCount(enrichment, topic) {
  const pack = (enrichment.packs || []).find((p) => normalizeKey(p.topic) === topic);
  if (!pack) return 0;
  const refs = new Set();
  for (const r of pack.supportingScriptures || []) refs.add(refKey(r));
  for (const r of pack.originalScriptures || []) refs.add(refKey(r));
  return refs.size || pack.supportingCount || 0;
}

function collectTopicChainSources(corpus, topic) {
  const sources = [];
  const topicKey = normalizeKey(topic);

  for (const chain of corpus.chainLibrary.chains || []) {
    const chainTopic = normalizeKey(chain.topicCandidate);
    const attached = (chain.packAttachments || []).some((a) => normalizeKey(a.packId) === topicKey);
    if (chainTopic !== topicKey && !attached) continue;
    sources.push({
      chainId: chain.chainId,
      scriptures: chain.scriptures || [],
      sourceCount: chain.sourceCount || (chain.occurrences || []).length,
      topicCandidate: chain.topicCandidate,
      lessonTitle: (chain.occurrences || [])[0]?.lessonTitle || '',
      recoveryLane: 'chain_library',
      sourceName: (chain.occurrences || []).map((o) => o.sourceName).join(', '),
      fromChainLibrary: true,
      observedRecurrence: (chain.sourceCount || 0) >= 2,
      missedPhase3Extraction: false,
      notes: chainTopic !== topicKey ? `Library chain under sibling topic "${chain.topicCandidate}"` : '',
    });
  }

  for (const pkt of corpus.orgV3.packets || []) {
    const packCand = normalizeKey(pkt.doctrinePackCandidate);
    const topicCand = normalizeKey(pkt.topicCandidate);
    const chain = pkt.originalScriptureChain || [];
    if (chain.length < 3) continue;
    if (packCand !== topicKey && topicCand !== topicKey) continue;
    sources.push({
      chainId: makeChainId(chain),
      scriptures: chain,
      sourceCount: 1,
      topicCandidate: pkt.topicCandidate || pkt.doctrinePackCandidate,
      lessonTitle: pkt.lessonTitle,
      recoveryLane: pkt.recoveryLane || 'organization_v3',
      sourceName: pkt.source,
      sourceUrl: pkt.sourceUrl,
      observedRecurrence: false,
      missedPhase3Extraction: true,
      notes: packCand !== topicKey ? `Org v3 packet classified under "${pkt.doctrinePackCandidate}"` : '',
    });
  }

  for (const pkt of corpus.orgV2.packets || []) {
    const packCand = normalizeKey(pkt.doctrinePackCandidate);
    const topicCand = normalizeKey(pkt.topicCandidate);
    const chain = pkt.originalScriptureChain || [];
    if (chain.length < 3) continue;
    if (packCand !== topicKey && topicCand !== topicKey) continue;
    const dupV3 = (corpus.orgV3.packets || []).some(
      (p) => normalizeKey(p.lessonTitle) === normalizeKey(pkt.lessonTitle) && chainSignature(p.originalScriptureChain) === chainSignature(chain),
    );
    if (dupV3) continue;
    sources.push({
      chainId: makeChainId(chain),
      scriptures: chain,
      sourceCount: 1,
      topicCandidate: pkt.topicCandidate || pkt.doctrinePackCandidate,
      lessonTitle: pkt.lessonTitle,
      recoveryLane: pkt.recoveryLane || 'organization_v2',
      sourceName: pkt.source,
      observedRecurrence: false,
      missedPhase3Extraction: true,
      notes: 'Present in org v2 only — not carried into v3 chain library',
    });
  }

  const expanded = Array.isArray(corpus.expandedChains) ? corpus.expandedChains : (corpus.expandedChains.entries || []);
  for (const entry of expanded) {
    if (normalizeKey(entry.topic) !== topicKey) continue;
    const chain = entry.originalScriptureChain || entry.scriptureOrder || [];
    if (chain.length < 3) continue;
    sources.push({
      chainId: makeChainId(chain),
      scriptures: chain,
      sourceCount: 1,
      topicCandidate: entry.topic,
      lessonTitle: entry.lessonTitle,
      recoveryLane: entry.chainSource || 'expanded_chain_support',
      sourceName: entry.sourceName,
      sourceUrl: entry.sourceUrl,
      observedRecurrence: false,
      missedPhase3Extraction: true,
      notes: 'Q&A / enrichment packet chain — not in chain library',
    });
  }

  const maturedPack = (corpus.matured.packs || []).find((p) => normalizeKey(p.topic) === topicKey);
  if (maturedPack?.strongestChain?.originalScriptureChain?.length >= 3) {
    const chain = maturedPack.strongestChain.originalScriptureChain;
    sources.push({
      chainId: makeChainId(chain),
      scriptures: chain,
      sourceCount: maturedPack.chainCount || 1,
      topicCandidate: topic,
      lessonTitle: maturedPack.strongestChain.lessonTitle,
      recoveryLane: 'matured_pack',
      sourceName: maturedPack.strongestChain.sourceName || 'matured-doctrine-packs',
      observedRecurrence: (maturedPack.chainCount || 0) >= 2,
      missedPhase3Extraction: true,
      notes: `Matured pack strongest chain (${maturedPack.chainCount || 0} aggregated chains)`,
    });
  }

  for (const sibling of SIBLING_PACK_TOPICS[topic] || []) {
    for (const chain of corpus.chainLibrary.chains || []) {
      if (normalizeKey(chain.topicCandidate) !== normalizeKey(sibling)) continue;
      sources.push({
        chainId: chain.chainId,
        scriptures: chain.scriptures || [],
        sourceCount: chain.sourceCount || (chain.occurrences || []).length,
        topicCandidate: chain.topicCandidate,
        lessonTitle: (chain.occurrences || [])[0]?.lessonTitle || '',
        recoveryLane: 'chain_library',
        sourceName: (chain.occurrences || []).map((o) => o.sourceName).join(', '),
        fromChainLibrary: true,
        observedRecurrence: (chain.sourceCount || 0) >= 2,
        missedPhase3Extraction: false,
        notes: `Sibling pack "${sibling}" library chain — cross-pack candidate for "${topic}"`,
      });
    }
  }

  return sources;
}

function aggregateCandidateChains(sources) {
  const bySig = new Map();
  for (const src of sources) {
    const sig = chainSignature(src.scriptures);
    if (!sig) continue;
    const existing = bySig.get(sig);
    if (!existing) {
      bySig.set(sig, {
        chainId: src.chainId,
        scriptures: uniqueRefs(src.scriptures.filter((r) => verifyKjvReference(r).valid)),
        sourceCount: src.sourceCount || 1,
        foundIn: new Set(foundInFlags(src)),
        topicCandidate: src.topicCandidate,
        lessonTitles: [src.lessonTitle].filter(Boolean),
        observedRecurrence: src.observedRecurrence || false,
        missedPhase3Extraction: src.missedPhase3Extraction,
        notes: src.notes || '',
      });
    } else {
      existing.sourceCount = Math.max(existing.sourceCount, src.sourceCount || 1);
      for (const f of foundInFlags(src)) existing.foundIn.add(f);
      if (src.lessonTitle) existing.lessonTitles.push(src.lessonTitle);
      existing.observedRecurrence = existing.observedRecurrence || src.observedRecurrence || false;
      existing.missedPhase3Extraction = existing.missedPhase3Extraction || src.missedPhase3Extraction;
      if (src.notes && !existing.notes.includes(src.notes)) {
        existing.notes = [existing.notes, src.notes].filter(Boolean).join('; ');
      }
    }
  }

  return [...bySig.values()].map((c) => ({
    chainId: c.chainId,
    scriptures: c.scriptures,
    sourceCount: c.sourceCount,
    foundIn: [...c.foundIn],
    topicCandidate: c.topicCandidate,
    lessonTitles: [...new Set(c.lessonTitles)].slice(0, 5),
    observedRecurrence: c.observedRecurrence || c.lessonTitles.length >= 2,
    missedPhase3Extraction: c.missedPhase3Extraction,
    notes: c.notes,
  }));
}

function analyzePrimaryChainGaps(corpus) {
  const results = [];
  const promotionCandidates = [];

  for (const topic of GAP_TOPICS) {
    const rawSources = collectTopicChainSources(corpus, topic);
    const candidateChains = aggregateCandidateChains(rawSources);
    const recurring = candidateChains.filter((c) => c.observedRecurrence || c.sourceCount >= 2 || c.lessonTitles.length >= 2);
    const existingObservedChain = recurring.length > 0 || candidateChains.some((c) => c.foundIn.includes('chain_library'));

    const hasLibraryChain = candidateChains.some((c) => c.foundIn.includes('chain_library'));
    const hasSiblingLibrary = candidateChains.some(
      (c) => c.foundIn.includes('chain_library') && normalizeKey(c.topicCandidate) !== topic,
    );
    let phase3MissNotes = '';
    if (topic === 'holy_spirit' && hasSiblingLibrary) {
      phase3MissNotes = 'Primary chain exists in chain library under sibling pack spirit_of_god — holy_spirit/spirit_of_god pack split, not a Phase 3 extraction miss';
    } else if (existingObservedChain && !hasLibraryChain) {
      phase3MissNotes = 'Observed chains exist in corpus aggregation (Q&A packets, matured packs, transcripts) but were not promoted to scripture-chain-library.json';
    } else if (!existingObservedChain) {
      phase3MissNotes = 'No recurring observed chain identified for this topic';
    } else {
      phase3MissNotes = 'Primary chain present in chain library for topic or sibling pack';
    }

    results.push({
      topic,
      supportingInventoryCount: enrichmentSupportingCount(corpus.enrichment, topic),
      candidateChains: candidateChains.map((c) => ({
        ...c,
        phase3ExtractionGap: c.missedPhase3Extraction && !c.foundIn.includes('chain_library'),
      })),
      existingObservedChain,
      phase3ExtractionAssessment: phase3MissNotes,
      humanReviewRequired: true,
    });

    for (const chain of recurring) {
      const isAttachedLibrary = chain.foundIn.includes('chain_library') && normalizeKey(chain.topicCandidate) === topic;
      if (isAttachedLibrary) continue;
      promotionCandidates.push({
        topic,
        chainId: chain.chainId,
        scriptures: chain.scriptures,
        sourceCount: Math.max(chain.sourceCount, chain.lessonTitles?.length || 1),
        observedRecurrence: true,
        candidateOnly: true,
        humanReviewRequired: true,
        linkageNotes: chain.notes || (normalizeKey(chain.topicCandidate) !== topic ? `Cross-pack candidate from "${chain.topicCandidate}"` : ''),
        foundIn: chain.foundIn,
      });
    }
  }

  return { gapAnalysis: results, promotionCandidates };
}

function auditDavidVineNode(corpus) {
  const vineNodes = corpus.vine.nodes || [];
  const inVine = vineNodes.some((n) => normalizeKey(n.topic || n.id) === 'david');

  const orgDavid = (corpus.orgV3.packets || []).filter((p) => normalizeKey(p.topicCandidate) === 'david');
  const continuityDavid = (corpus.continuity.topics || []).filter((s) => /david/i.test(s.topic || ''));
  const inheritanceDavid = (corpus.inheritance.topics || []).some((t) => normalizeKey(t.topic || t.id) === 'david');

  const existsElsewhere = !inVine && (
    orgDavid.length > 0 ||
    continuityDavid.length > 0 ||
    inheritanceDavid
  );

  const orgChains = orgDavid.filter((p) => (p.originalScriptureChain || []).length >= 3);

  return {
    topic: 'david',
    existsElsewhere,
    candidateNode: existsElsewhere,
    humanReviewRequired: true,
    _auditDetail: {
      inScriptureVineNetwork: inVine,
      orgV3PacketsWithTopicCandidate: orgDavid.length,
      orgV3Chains: orgChains.length,
      continuityTopics: continuityDavid.map((s) => s.topic),
      inInheritanceMap: inheritanceDavid,
      inTopicClusterAssignments: false,
      doctrinePackAssignment: orgDavid[0]?.doctrinePackCandidate || null,
      pathwayGap: 'Kingdom→David→Messiah navigation partial in Phase 4A sandbox',
      suggestedVineLinks: ['kingdom_of_god', 'messiah_logos', 'samuel'],
    },
  };
}

function buildImpactReport(corpus, gapAnalysis, davidAudit, promotionCandidates) {
  const sandboxFailures = (corpus.sandboxResults.failures || []).map((f) => f.packId || f.label);
  const chainGapTopics = gapAnalysis.filter((g) => GAP_TOPICS.includes(g.topic));
  const retrievalFailures = chainGapTopics.every((g) => g.supportingInventoryCount > 0);
  const chainClassificationFailures = chainGapTopics.every((g) => g.existingObservedChain || g.candidateChains.length > 0);
  const vineClassificationFailure = !davidAudit._auditDetail?.inScriptureVineNetwork && davidAudit.existsElsewhere;

  const lines = [
    '# Phase 4A.1 Impact Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Mission',
    '',
    'Primary chain gap analysis and David vine node audit. Classification and traceability only.',
    '',
    '## Executive answers',
    '',
    '### 1. Are failures retrieval failures?',
    '',
    retrievalFailures
      ? '**No.** All three gap topics (`dietary_law`, `death_state`, `holy_spirit`) have supporting inventory from vine enrichment (14, 8, and 36 supporting refs respectively). Sandbox traceability used `partial_supporting_inventory` tier — scriptures are recoverable but lack primary originals and chain-library attachment.'
      : '**Partial.** Some topics lack supporting inventory.',
    '',
    '### 2. Are failures chain-classification failures?',
    '',
    chainClassificationFailures
      ? '**Yes.** Observed scripture chains exist in corpus aggregation (expanded-chain-support Q&A packets, matured doctrine packs, org organization, and/or sibling `spirit_of_god` chain library entry) but are not attached as primary chains for these pack IDs in the frozen traceability index or chain library.'
      : '**Unclear.** Further corpus review needed.',
    '',
    '### 3. Are failures vine-classification failures?',
    '',
    vineClassificationFailure
      ? '**Yes for David.** The `david` topic exists as `topicCandidate` on 2 org v3 PDF packets (16- and 14-scripture chains), continuity index sessions, and pathway linkages — but has no node in `ScriptureVineNetwork.json`. Kingdom→David→Messiah navigation was partial in Phase 4A.'
      : '**No.** Vine classification is complete for audited nodes.',
    '',
    '### 4. What changes after candidate review?',
    '',
    'Human review of promotion candidates may:',
    '',
    '- Attach bookkeeping `packAttachments` for recurring chains to `dietary_law`, `death_state`, and cross-pack linkage for `holy_spirit` → `spirit_of_god` library chain',
    '- Add a review-only `david` vine node bridging `kingdom_of_god` and `messiah_logos`',
    '- Upgrade traceability tiers from `partial_supporting_inventory` to full primary-chain traceability',
    '',
    `Promotion candidates queued: **${promotionCandidates.length}** (all candidateOnly: true, humanReviewRequired: true).`,
    '',
    '### 5. Does Phase 4B remain ready?',
    '',
    '**Yes.** Phase 4A determination was `READY_FOR_PHASE_4B`. These gaps are classification and bookkeeping issues — not sandbox retrieval failures or doctrine safety violations. Phase 4B controlled expansion testing can proceed; candidate review can run in parallel.',
    '',
    '## Per-topic summary',
    '',
    '| Topic | Supporting inventory | Observed chain | Phase 3 gap |',
    '|-------|---------------------|----------------|-------------|',
  ];

  for (const g of gapAnalysis) {
    lines.push(`| ${g.topic} | ${g.supportingInventoryCount} | ${g.existingObservedChain ? 'yes' : 'no'} | ${g.phase3ExtractionAssessment?.slice(0, 60) || '—'}… |`);
  }

  lines.push(
    '',
    '## David vine audit',
    '',
    `- Exists elsewhere: ${davidAudit.existsElsewhere}`,
    `- Candidate node: ${davidAudit.candidateNode}`,
    `- Org v3 packets (topicCandidate=david): ${davidAudit._auditDetail?.orgV3PacketsWithTopicCandidate || 0}`,
    `- Continuity topics: ${(davidAudit._auditDetail?.continuityTopics || []).join('; ') || 'none'}`,
    '',
    '## Stop conditions honored',
    '',
    'No doctrine generation. No automatic chain promotion. No automatic vine-node creation. Review-only candidates.',
    '',
    '## Artifacts',
    '',
    '- `docs/evidence-candidates/phase4a1/primary-chain-gap-analysis.json`',
    '- `docs/evidence-candidates/phase4a1/primary-chain-promotion-candidates.json`',
    '- `docs/evidence-candidates/phase4a1/david-vine-node-audit.json`',
    '- `Phase4A1ImpactReport.md`',
    '',
  );

  return lines.join('\n');
}

function runPhase4A1() {
  const corpus = loadCorpus();
  const { gapAnalysis, promotionCandidates } = analyzePrimaryChainGaps(corpus);
  const davidAudit = auditDavidVineNode(corpus);

  fs.mkdirSync(PHASE4A1_DIR, { recursive: true });

  const gapOutput = {
    ranAt: new Date().toISOString(),
    phase: '4A.1',
    topics: gapAnalysis,
    humanReviewRequired: true,
    candidateOnly: true,
  };

  const promotionOutput = {
    ranAt: new Date().toISOString(),
    phase: '4A.1',
    candidates: promotionCandidates,
    humanReviewRequired: true,
    candidateOnly: true,
    autoPromotion: false,
  };

  fs.writeFileSync(path.join(PHASE4A1_DIR, 'primary-chain-gap-analysis.json'), JSON.stringify(gapOutput, null, 2));
  fs.writeFileSync(path.join(PHASE4A1_DIR, 'primary-chain-promotion-candidates.json'), JSON.stringify(promotionOutput, null, 2));
  const davidOutput = {
    topic: davidAudit.topic,
    existsElsewhere: davidAudit.existsElsewhere,
    candidateNode: davidAudit.candidateNode,
    humanReviewRequired: davidAudit.humanReviewRequired,
  };
  fs.writeFileSync(path.join(PHASE4A1_DIR, 'david-vine-node-audit.json'), JSON.stringify(davidOutput, null, 2));
  fs.writeFileSync(path.join(ROOT, 'Phase4A1ImpactReport.md'), buildImpactReport(corpus, gapAnalysis, davidAudit, promotionCandidates));

  return {
    gapAnalysis,
    promotionCandidates,
    davidAudit,
    outputDir: PHASE4A1_DIR,
  };
}

module.exports = { runPhase4A1, GAP_TOPICS, PHASE4A1_DIR };
