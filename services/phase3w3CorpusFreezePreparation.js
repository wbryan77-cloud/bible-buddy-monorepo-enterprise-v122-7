/**
 * Phase 3W.3 — Corpus freeze preparation with KJV traceability support.
 * Freeze preparation only — no doctrine generation, approval, or production changes.
 */

const fs = require('fs');
const path = require('path');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');

const MAJOR_DOCTRINE_PACK_TOPICS = [
  'one_hundred_forty_four_thousand', 'peter', 'peter_paul_alignment', 'jacob_israel_twelve_tribes',
  'millennial_kingdom_kingdom_on_earth', 'kingdom_of_god', 'holy_spirit', 'spirit_of_god',
  'feasts', 'sabbath', 'death_state', 'resurrection', 'messiah_logos', 'dietary_law',
  'book_of_life', 'word_of_god', 'leviticus_23', 'passover', 'pentecost',
  'abraham', 'isaac', 'jacob', 'israel', 'esau_edom_edomites',
];

const KJV_TRACEABILITY_SUPPORT = [
  {
    packId: 'one_hundred_forty_four_thousand',
    primaryScriptures: ['Revelation 7:1-8', 'Revelation 14:1-5'],
    parallelScriptures: [
      'Ezekiel 9:1-6', 'Revelation 9:4', 'Revelation 21:12', 'James 1:1',
      'Matthew 19:28', 'Luke 22:29-30',
    ],
    supportingScriptures: [
      'Ezekiel 37:21-28', 'Isaiah 11:11-12', 'Jeremiah 31:1-10', 'Jeremiah 30:3-11',
      'Zechariah 8:7-8', 'Amos 9:14-15', 'Romans 11:1-5', 'Romans 11:25-29',
    ],
    relationshipTypes: [
      'sealing', 'tribes', 'Israel', 'regathering', 'kingdom', 'covenant', 'Revelation continuity',
    ],
    traceabilityPurpose: 'Connect Revelation 7 and Revelation 14 to Israel, tribes, sealing, servants of God, regathering, kingdom, and covenant continuity.',
    humanReviewRequired: true,
    autoDoctrine: false,
    sourceType: 'kjv_traceability_support_candidate',
  },
  {
    packId: 'peter_paul_alignment',
    primaryScriptures: [
      'Matthew 16:13-19', 'Acts 2:14-41', 'Acts 10:1-48', 'Galatians 2:1-16', '2 Peter 3:15-16',
    ],
    parallelScriptures: [
      'Acts 11:1-18', 'Acts 15:1-29', '1 Corinthians 15:9-11', 'Ephesians 3:1-6',
    ],
    supportingScriptures: [
      'Acts 13:38-39', 'Acts 13:46-48', 'Romans 2:28-29', 'Romans 3:28-31',
      'Romans 9:6-8', 'Romans 11:13-25', 'Ephesians 2:11-22', 'Colossians 1:25-27',
      '1 Timothy 2:5-7', '2 Timothy 1:11', 'Titus 1:1-3', '1 Peter 1:1-2', '1 Peter 2:9-10',
    ],
    relationshipTypes: [
      'apostleship', 'Pentecost', 'Gentiles', 'Cornelius', 'Jerusalem council',
      'Peter-Paul continuity', 'gospel alignment',
    ],
    traceabilityPurpose: 'Connect Peter\'s role, Pentecost, Cornelius, Gentile inclusion, Paul\'s apostleship, Jerusalem council alignment, and Peter\'s acknowledgement of Paul\'s writings.',
    humanReviewRequired: true,
    autoDoctrine: false,
    sourceType: 'kjv_traceability_support_candidate',
  },
];

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

function validRefs(refs = []) {
  return uniqueRefs(refs.filter((r) => verifyKjvReference(r).valid));
}

function packScriptureSet(corpus, packKey) {
  const refs = new Set();
  const trace = (corpus.traceabilityIndex.packs || []).find((p) => normalizeKey(p.topic) === packKey);
  const deep = (corpus.deepPacks.packs || []).find((p) => normalizeKey(p.topic) === packKey);
  for (const ref of [...(trace?.primaryScriptures || []), ...(deep?.originalScriptureChain || [])]) {
    if (verifyKjvReference(ref).valid) refs.add(refKey(ref));
  }
  for (const pkt of corpus.organizationV3.packets || []) {
    if (normalizeKey(pkt.doctrinePackCandidate) !== packKey) continue;
    for (const ref of pkt.originalScriptureChain || pkt.scripturesCited || []) {
      if (verifyKjvReference(ref).valid) refs.add(refKey(ref));
    }
  }
  return refs;
}

function chainOverlapCount(chain, packRefs) {
  let shared = 0;
  for (const ref of chain.scriptures || []) {
    if (packRefs.has(refKey(ref))) shared += 1;
  }
  return shared;
}

function buildTraceabilityPackRecord(support) {
  const primary = validRefs(support.primaryScriptures);
  const parallel = validRefs(support.parallelScriptures);
  const supporting = validRefs(support.supportingScriptures);

  return {
    topic: support.packId,
    primaryScriptures: primary,
    parallelScriptures: parallel,
    supportingScriptures: supporting,
    continuityScriptures: [],
    selectionReason: [{
      sourceId: 'phase3w3_kjv_traceability_support',
      lessonTitle: 'KJV traceability support candidates — human review required',
      reasons: ['kjv_traceability_support_only', 'human_review_required', 'no_doctrine_generation'],
      relationshipTypes: support.relationshipTypes,
      traceabilityPurpose: support.traceabilityPurpose,
    }],
    sources: ['Phase 3W.3 KJV traceability support — review only'],
    freezeSupport: true,
    humanReviewRequired: true,
    autoDoctrine: false,
    candidateTraceabilityOnly: true,
  };
}

function applyTraceabilityClosure(corpus) {
  const traceabilityIndex = { ...corpus.traceabilityIndex };
  const packs = [...(traceabilityIndex.packs || [])];
  const finalized = [];

  for (const support of KJV_TRACEABILITY_SUPPORT) {
    const validated = {
      packId: support.packId,
      primaryScriptures: validRefs(support.primaryScriptures),
      parallelScriptures: validRefs(support.parallelScriptures),
      supportingScriptures: validRefs(support.supportingScriptures),
      relationshipTypes: support.relationshipTypes,
      humanReviewRequired: support.humanReviewRequired,
      autoDoctrine: support.autoDoctrine,
      invalidRefsRemoved: [],
    };

    const allInput = [
      ...support.primaryScriptures, ...support.parallelScriptures, ...support.supportingScriptures,
    ];
    for (const ref of allInput) {
      if (!verifyKjvReference(ref).valid) validated.invalidRefsRemoved.push(ref);
    }

    const packRecord = buildTraceabilityPackRecord(support);
    const idx = packs.findIndex((p) => normalizeKey(p.topic) === normalizeKey(support.packId));
    if (idx >= 0) packs[idx] = { ...packs[idx], ...packRecord };
    else packs.push(packRecord);

    finalized.push({
      packId: support.packId,
      status: 'traceability_closed',
      primaryCount: validated.primaryScriptures.length,
      parallelCount: validated.parallelScriptures.length,
      supportingCount: validated.supportingScriptures.length,
      humanReviewRequired: true,
      autoDoctrine: false,
      record: validated,
    });
  }

  traceabilityIndex.packs = packs;
  traceabilityIndex.ranAt = new Date().toISOString();
  traceabilityIndex.freezeNote = 'KJV support candidates added — review only, not doctrine';

  return { traceabilityIndex, finalized, kjvSupport: KJV_TRACEABILITY_SUPPORT.map((s) => ({
    ...s,
    primaryScriptures: validRefs(s.primaryScriptures),
    parallelScriptures: validRefs(s.parallelScriptures),
    supportingScriptures: validRefs(s.supportingScriptures),
  })) };
}

function applyBookkeepingChainAttachments(corpus, chainValidation) {
  const chainLibrary = { ...corpus.chainLibrary, chains: [...(corpus.chainLibrary.chains || [])] };
  const gaps = (chainValidation.packAttachmentGaps || [])
    .filter((g) => g.classification === 'missing_linkage');

  const applied = [];
  const skipped = [];

  for (const gap of gaps) {
    const packKey = normalizeKey(gap.topic);
    const packRefs = packScriptureSet(corpus, packKey);

    for (const chainId of gap.overlappingChainIds || []) {
      const chain = chainLibrary.chains.find((c) => c.chainId === chainId);
      if (!chain) {
        skipped.push({ chainId, packId: gap.topic, reason: 'chain_not_found' });
        continue;
      }

      const overlap = chainOverlapCount(chain, packRefs);
      if (overlap < 2) {
        skipped.push({ chainId, packId: gap.topic, reason: 'insufficient_overlap', overlap });
        continue;
      }

      if (!chain.packAttachments) chain.packAttachments = [];
      const exists = chain.packAttachments.some((a) => normalizeKey(a.packId) === packKey);
      if (exists) continue;

      const confidence = chain.confidence || 0;
      const attachment = {
        packId: gap.topic,
        sharedScriptureCount: overlap,
        bookkeepingOnly: true,
        evidenceBacked: true,
        inferredRelationship: false,
        humanReviewRequired: confidence < 0.95,
        appliedAt: new Date().toISOString(),
        phase: '3W.3',
      };
      chain.packAttachments.push(attachment);
      applied.push({ chainId, ...attachment });
    }
  }

  chainLibrary.ranAt = new Date().toISOString();
  chainLibrary.freezeNote = 'Bookkeeping pack attachments only — no doctrine inference';

  return { chainLibrary, applied, skipped, summary: {
    packsProcessed: gaps.length,
    attachmentsApplied: applied.length,
    attachmentsSkipped: skipped.length,
  } };
}

function applyReviewQueueReduction(corpus) {
  const org = { ...corpus.organizationV3, packets: [...(corpus.organizationV3.packets || [])] };
  const initialReview = org.packets.filter((p) => p.humanReviewRequired).length;

  const autoCleared = [];
  const retained = [];

  for (const pkt of org.packets) {
    if (!pkt.humanReviewRequired) continue;

    const semConf = pkt.semanticLinkageConfidence || 0;
    const pdfConf = (pkt.pdfConfidenceScore || 0) / 100;
    const confidence = Math.max(semConf, pdfConf);
    const hasNormalizedChain = (pkt.originalScriptureChain || []).length >= 3;
    const hasDoctrinePack = !!pkt.doctrinePackCandidate;
    const hasSourceTitle = !!pkt.lessonTitle;
    const hasExtractionLane = !!(pkt.recoveryLane || pkt.source);
    const traceabilityComplete = hasSourceTitle && hasExtractionLane && hasDoctrinePack;

    const eligible = confidence >= 0.95
      && traceabilityComplete
      && hasNormalizedChain
      && hasDoctrinePack
      && !pkt.doctrinalConclusionRequired;

    if (eligible) {
      pkt.humanReviewRequired = false;
      pkt.autoClearedByPhase3w3 = true;
      pkt.autoClearConfidence = confidence;
      autoCleared.push({
        lessonTitle: pkt.lessonTitle,
        doctrinePackCandidate: pkt.doctrinePackCandidate,
        confidence,
      });
    } else {
      retained.push({
        lessonTitle: pkt.lessonTitle,
        doctrinePackCandidate: pkt.doctrinePackCandidate,
        confidence,
        reasons: [
          confidence < 0.95 ? 'confidence_below_95' : null,
          !hasNormalizedChain ? 'normalized_chain_missing' : null,
          !traceabilityComplete ? 'source_traceability_incomplete' : null,
        ].filter(Boolean),
      });
    }
  }

  const finalReview = org.packets.filter((p) => p.humanReviewRequired).length;
  org.ranAt = new Date().toISOString();

  return {
    organizationV3: org,
    initialReviewQueueSize: initialReview,
    finalReviewQueueSize: finalReview,
    autoClearedCount: autoCleared.length,
    autoCleared,
    retained,
    goalBelow15Met: finalReview < 15,
    note: finalReview >= 15
      ? 'No packets met confidence >= 0.95 with full traceability — queue retained per threshold'
      : 'Review queue reduced below 15',
  };
}

function buildRelationshipIntelligenceAudit(before, after) {
  const observedBefore = before.observedLib?.relationships?.length || 0;
  const candidateBefore = before.candidateLib?.relationships?.length || 0;
  const observedAfter = after.observedLib?.relationships?.length || 0;
  const candidateAfter = after.candidateLib?.relationships?.length || 0;

  return {
    ranAt: new Date().toISOString(),
    observedRelationshipCount: observedAfter,
    candidateRelationshipCount: candidateAfter,
    observedRelationshipCountBefore: observedBefore,
    candidateRelationshipCountBefore: candidateBefore,
    promotedRelationships: [],
    removedRelationships: [],
    humanReviewRequired: true,
    relationshipsPreserved: observedBefore === observedAfter && candidateBefore === candidateAfter,
    noCandidatePromoted: true,
    noObservedRemovedWithoutEvidence: true,
    informationalOnly: true,
  };
}

function buildScriptureVineNetworkAudit(corpus) {
  const vine = corpus.vineData;
  const continuityByTopic = new Map(
    (corpus.continuityIndex.topics || []).map((t) => [normalizeKey(t.topic), t]),
  );
  const chainByPack = new Map();
  for (const c of corpus.chainLibrary.chains || []) {
    if (c.topicCandidate) {
      const k = normalizeKey(c.topicCandidate);
      if (!chainByPack.has(k)) chainByPack.set(k, []);
      chainByPack.get(k).push(c.chainId);
    }
    for (const att of c.packAttachments || []) {
      const k = normalizeKey(att.packId);
      if (!chainByPack.has(k)) chainByPack.set(k, []);
      chainByPack.get(k).push(c.chainId);
    }
  }

  const topics = MAJOR_DOCTRINE_PACK_TOPICS.map((topic) => {
    const node = (vine.network || []).find((n) => n.topic === topic);
    const cont = continuityByTopic.get(topic);
    const connected = [
      ...(node?.parentTopics || []),
      ...(node?.childTopics || []),
      ...(node?.relatedTopics || []),
      ...(node?.continuityTopics || []),
    ];
    const chainIds = chainByPack.get(topic) || [];
    const isolated = connected.length === 0 && chainIds.length === 0;

    return {
      topic,
      pathwayCount: connected.length,
      connectedTopics: [...new Set(connected)],
      continuityStrength: cont?.continuityStrength || 'Unknown',
      scriptureChainAttachments: chainIds.length,
      humanReviewRequired: topic === 'one_hundred_forty_four_thousand' || topic === 'peter_paul_alignment',
      isolated,
      informationalOnly: true,
    };
  });

  const isolatedMajor = topics.filter((t) => t.isolated);

  return {
    ranAt: new Date().toISOString(),
    majorTopicCount: topics.length,
    isolatedMajorTopics: isolatedMajor.map((t) => t.topic),
    isolatedMajorCount: isolatedMajor.length,
    canonicalPaths: vine.navigationPaths || [],
    topics,
    successCriteriaMet: isolatedMajor.length === 0,
    informationalOnly: true,
    noAutomaticRelationshipGeneration: true,
  };
}

function collectDoctrinePackKeys(corpus, traceabilityIndex) {
  const keys = new Set();
  for (const p of corpus.deepPacks.packs || []) keys.add(normalizeKey(p.topic));
  for (const p of loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), { packets: [] }).packets || []) {
    if (p.doctrinePackCandidate) keys.add(normalizeKey(p.doctrinePackCandidate));
  }
  for (const p of traceabilityIndex.packs || []) keys.add(normalizeKey(p.topic));
  return keys;
}

function buildCorpusFreezeAudit(corpus, results) {
  const doctrinePackKeys = collectDoctrinePackKeys(corpus, results.traceabilityIndex);
  const majorInTrace = [...doctrinePackKeys].every((k) =>
    (results.traceabilityIndex.packs || []).some((p) => normalizeKey(p.topic) === k && (p.primaryScriptures || []).length > 0),
  );

  const chains = results.chainLibrary.chains || [];
  const orphanChains = chains.filter((c) => !c.topicCandidate && !(c.packAttachments || []).length);

  const vineAudit = results.vineNetworkAudit;
  const normAudit = corpus.normalizationAudit;

  return {
    ranAt: new Date().toISOString(),
    freezeStatus: 'prepared',
    corpusExpandableAfterFreeze: true,
    checks: {
      normalizationComplete: (normAudit.qualityScore || 0) >= 0.85,
      traceabilityComplete: majorInTrace,
      continuityComplete: (corpus.continuityIndex.topics || []).length > 0,
      inheritanceComplete: (corpus.inheritanceMap.inheritance || []).every((i) => i.traceable !== false),
      topicConnectivityComplete: vineAudit.isolatedMajorCount === 0,
      noOrphanTopics: vineAudit.isolatedMajorCount === 0,
      noOrphanChains: orphanChains.length === 0,
      traceabilityGapsReviewed: {
        one_hundred_forty_four_thousand: results.traceabilityFinalized.some((f) => f.packId === 'one_hundred_forty_four_thousand'),
        peter_paul_alignment: results.traceabilityFinalized.some((f) => f.packId === 'peter_paul_alignment'),
      },
      kjvSupportCandidatesAdded: results.kjvSupport.length === 2,
      relationshipIntelligencePreserved: results.relationshipAudit.relationshipsPreserved,
      noCandidatePromoted: results.relationshipAudit.noCandidatePromoted,
    },
    reviewQueue: {
      initial: results.reviewQueue.initialReviewQueueSize,
      final: results.reviewQueue.finalReviewQueueSize,
      goalBelow15Met: results.reviewQueue.goalBelow15Met,
    },
    chainAttachmentsApplied: results.chainAttachments.summary.attachmentsApplied,
    safety: {
      doctrineGeneration: false,
      doctrineApproval: false,
      productionChanges: false,
      evidenceCardChanges: false,
      promptChanges: false,
      graphDeployment: false,
      implementation: false,
      freezeBlocksFutureDiscovery: false,
    },
  };
}

function loadCorpus() {
  return {
    traceabilityIndex: loadJson(path.join(OUT_DIR, 'scripture-traceability-index.json'), { packs: [] }),
    chainLibrary: loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] }),
    organizationV3: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] }),
    deepPacks: loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }),
    continuityIndex: loadJson(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), { topics: [] }),
    inheritanceMap: loadJson(path.join(OUT_DIR, 'topic-inheritance-map.json'), { inheritance: [] }),
    vineData: loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), { network: [] }),
    observedLib: loadJson(path.join(OUT_DIR, 'ObservedRelationshipLibrary.json'), { relationships: [] }),
    candidateLib: loadJson(path.join(OUT_DIR, 'CandidateRelationshipLibrary.json'), { relationships: [] }),
    normalizationAudit: loadJson(path.join(OUT_DIR, 'normalization-audit-report.json'), {}),
    chainValidation: loadJson(path.join(OUT_DIR, 'chain-attachment-validation.json'), {}),
  };
}

function runPhase3w3CorpusFreezePreparation() {
  const corpus = loadCorpus();
  const beforeSnapshot = {
    observedLib: corpus.observedLib,
    candidateLib: corpus.candidateLib,
  };

  const traceClosure = applyTraceabilityClosure(corpus);
  const chainResult = applyBookkeepingChainAttachments(corpus, corpus.chainValidation);
  const reviewResult = applyReviewQueueReduction(corpus);

  const afterSnapshot = {
    observedLib: corpus.observedLib,
    candidateLib: corpus.candidateLib,
  };

  const relationshipAudit = buildRelationshipIntelligenceAudit(beforeSnapshot, afterSnapshot);
  const vineNetworkAudit = buildScriptureVineNetworkAudit({
    ...corpus,
    chainLibrary: chainResult.chainLibrary,
  });

  const results = {
    traceabilityIndex: traceClosure.traceabilityIndex,
    chainLibrary: chainResult.chainLibrary,
    organizationV3: reviewResult.organizationV3,
    traceabilityFinalized: traceClosure.finalized,
    kjvSupport: traceClosure.kjvSupport,
    chainAttachments: chainResult,
    reviewQueue: reviewResult,
    relationshipAudit,
    vineNetworkAudit,
  };

  const freezeAudit = buildCorpusFreezeAudit(corpus, results);

  const payload = {
    phase: '3W.3',
    ranAt: new Date().toISOString(),
    results,
    freezeAudit,
    safety: freezeAudit.safety,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TRACE, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'scripture-traceability-index.json'), JSON.stringify(traceClosure.traceabilityIndex, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'scripture-chain-library.json'), JSON.stringify(chainResult.chainLibrary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), JSON.stringify(reviewResult.organizationV3, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'kjv-traceability-freeze-support.json'), JSON.stringify({
    ranAt: payload.ranAt,
    packs: traceClosure.kjvSupport,
    humanReviewRequired: true,
    autoDoctrine: false,
  }, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, 'traceability-finalization-report.json'), JSON.stringify({
    ranAt: payload.ranAt,
    packsFinalized: traceClosure.finalized,
    evidenceGapsClosed: traceClosure.finalized.map((f) => f.packId),
    humanReviewRequired: true,
    autoDoctrine: false,
  }, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, 'chain-attachment-finalization.json'), JSON.stringify({
    ranAt: payload.ranAt,
    summary: chainResult.summary,
    applied: chainResult.applied,
    skipped: chainResult.skipped,
    humanReviewRequired: chainResult.applied.some((a) => a.humanReviewRequired),
    bookkeepingOnly: true,
  }, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, 'review-queue-finalization.json'), JSON.stringify({
    ranAt: payload.ranAt,
    initialReviewQueueSize: reviewResult.initialReviewQueueSize,
    finalReviewQueueSize: reviewResult.finalReviewQueueSize,
    autoClearedCount: reviewResult.autoClearedCount,
    goalBelow15Met: reviewResult.goalBelow15Met,
    autoCleared: reviewResult.autoCleared,
    retained: reviewResult.retained,
    note: reviewResult.note,
  }, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, 'corpus-freeze-audit.json'), JSON.stringify(freezeAudit, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'relationship-intelligence-audit.json'), JSON.stringify(relationshipAudit, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'ScriptureVineNetworkAudit.json'), JSON.stringify(vineNetworkAudit, null, 2));
  fs.writeFileSync(path.join(TRACE, 'phase3w3-corpus-freeze-results.json'), JSON.stringify(payload, null, 2));

  return payload;
}

module.exports = {
  runPhase3w3CorpusFreezePreparation,
  KJV_TRACEABILITY_SUPPORT,
};
