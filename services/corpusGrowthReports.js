/**
 * Corpus growth reports — informational metrics only.
 * Parts 3.1, 3.2, 4.1, 5.1: vine growth, topic connections, pathway expansion, corpus opportunities.
 * Never blocks enrichment, expansion, or discovery.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const GROWTH_OPPORTUNITY_THRESHOLDS = {
  minRelatedConnections: 2,
  minContinuityConnections: 1,
  stronglyConnectedMinScore: 10,
  growingMinScore: 5,
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

function pathwayKey(source, target, type) {
  return `${normalizeKey(source)}|${normalizeKey(target)}|${type}`;
}

function buildScriptureVineGrowthReport(vineData) {
  const topics = vineData?.network || [];
  const entries = topics.map((node) => {
    const parentCount = (node.parentTopics || []).length;
    const childCount = (node.childTopics || []).length;
    const relatedCount = (node.relatedTopics || []).length;
    const continuityCount = (node.continuityTopics || []).length;
    const growthOpportunities = [];

    if (parentCount === 0) growthOpportunities.push('add_parent_topic_connections');
    if (childCount === 0) growthOpportunities.push('add_child_topic_connections');
    if (relatedCount < GROWTH_OPPORTUNITY_THRESHOLDS.minRelatedConnections) {
      growthOpportunities.push('expand_related_topic_connections');
    }
    if (continuityCount < GROWTH_OPPORTUNITY_THRESHOLDS.minContinuityConnections) {
      growthOpportunities.push('expand_continuity_topic_connections');
    }
    if (parentCount === 0 && childCount === 0 && relatedCount === 0 && continuityCount === 0) {
      growthOpportunities.push('isolated_topic_needs_vine_linkage');
    }
    if (node.canonicalPath && parentCount === 0) {
      growthOpportunities.push('canonical_path_root_topic');
    }

    return {
      topic: node.topic,
      parentCount,
      childCount,
      relatedCount,
      continuityCount,
      totalConnections: parentCount + childCount + relatedCount + continuityCount,
      growthOpportunities,
      informationalOnly: true,
    };
  });

  const withOpportunities = entries.filter((e) => e.growthOpportunities.length > 0);

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Measure Scripture Vine topic connectivity — informational only',
    topicCount: entries.length,
    topicsWithGrowthOpportunities: withOpportunities.length,
    topics: entries.sort((a, b) => b.totalConnections - a.totalConnections),
    summary: {
      avgParentConnections: Math.round((entries.reduce((n, e) => n + e.parentCount, 0) / Math.max(1, entries.length)) * 100) / 100,
      avgChildConnections: Math.round((entries.reduce((n, e) => n + e.childCount, 0) / Math.max(1, entries.length)) * 100) / 100,
      avgRelatedConnections: Math.round((entries.reduce((n, e) => n + e.relatedCount, 0) / Math.max(1, entries.length)) * 100) / 100,
      avgContinuityConnections: Math.round((entries.reduce((n, e) => n + e.continuityCount, 0) / Math.max(1, entries.length)) * 100) / 100,
    },
    safety: {
      informationalOnly: true,
      neverBlocksEnrichment: true,
      neverBlocksExpansion: true,
      neverBlocksDiscovery: true,
    },
  };
}

function classifyTopicConnection({
  topicConnectionCount,
  inheritanceCount,
  continuitySectionCount,
  chainCount,
  limitedTopic,
  limitedInheritance,
  limitedContinuity,
  limitedChain,
}) {
  const limitedCount = [limitedTopic, limitedInheritance, limitedContinuity, limitedChain].filter(Boolean).length;
  const totalScore = topicConnectionCount + inheritanceCount + continuitySectionCount + chainCount;

  if (limitedCount === 0 && totalScore >= GROWTH_OPPORTUNITY_THRESHOLDS.stronglyConnectedMinScore) {
    return 'Strongly Connected';
  }
  if (limitedCount >= 3 || (limitedTopic && limitedInheritance && limitedContinuity)) {
    return 'Expansion Opportunity';
  }
  if (totalScore >= GROWTH_OPPORTUNITY_THRESHOLDS.growingMinScore || limitedCount <= 1) {
    return 'Growing';
  }
  return 'Expansion Opportunity';
}

function buildTopicConnectionGrowthReport(vineData, inheritanceMap, continuityIndex, chainLibrary, enrichment) {
  const vineByTopic = new Map((vineData?.network || []).map((n) => [n.topic, n]));
  const inheritanceByTopic = new Map(
    (inheritanceMap?.inheritance || []).map((i) => [normalizeKey(i.topic), i]),
  );
  const continuityByTopic = new Map(
    (continuityIndex?.topics || []).map((t) => [normalizeKey(t.topic), t]),
  );
  const chainsByTopic = new Map();
  for (const c of chainLibrary?.chains || []) {
    if (!c.topicCandidate) continue;
    const k = normalizeKey(c.topicCandidate);
    if (!chainsByTopic.has(k)) chainsByTopic.set(k, []);
    chainsByTopic.get(k).push(c);
  }

  const enrichmentByTopic = new Map((enrichment?.packs || enrichment || []).map((e) => [normalizeKey(e.topic), e]));
  const topicKeys = new Set([
    ...vineByTopic.keys(),
    ...inheritanceByTopic.keys(),
    ...continuityByTopic.keys(),
    ...chainsByTopic.keys(),
    ...enrichmentByTopic.keys(),
  ]);

  const entries = [];

  for (const key of topicKeys) {
    if (!key) continue;
    const vine = vineByTopic.get(key);
    const inh = inheritanceByTopic.get(key);
    const cont = continuityByTopic.get(key);
    const chains = chainsByTopic.get(key) || [];
    const enrich = enrichmentByTopic.get(key);

    const topicConnectionCount = vine
      ? (vine.parentTopics?.length || 0) + (vine.childTopics?.length || 0)
        + (vine.relatedTopics?.length || 0) + (vine.continuityTopics?.length || 0)
      : 0;
    const inheritanceCount = (inh?.dependsOn?.length || 0) + (inh?.dependsOnObserved?.length || 0);
    const continuitySectionCount = (cont?.sectionsPresent || []).length;
    const chainCount = chains.length;

    const limitedTopicConnections = topicConnectionCount < 3;
    const limitedInheritanceConnections = inheritanceCount < 2;
    const limitedContinuityConnections = continuitySectionCount < 4
      || cont?.continuityStrength === 'Weak'
      || cont?.continuityStrength === 'None';
    const limitedScriptureChainConnections = chainCount === 0;

    const classification = classifyTopicConnection({
      topicConnectionCount,
      inheritanceCount,
      continuitySectionCount,
      chainCount,
      limitedTopic: limitedTopicConnections,
      limitedInheritance: limitedInheritanceConnections,
      limitedContinuity: limitedContinuityConnections,
      limitedChain: limitedScriptureChainConnections,
    });

    const growthNotes = [];
    if (limitedTopicConnections) growthNotes.push('limited_topic_connections');
    if (limitedInheritanceConnections) growthNotes.push('limited_inheritance_connections');
    if (limitedContinuityConnections) growthNotes.push('limited_continuity_connections');
    if (limitedScriptureChainConnections) growthNotes.push('limited_scripture_chain_connections');
    if (enrich && !enrich.witnessInventoryComplete) growthNotes.push('witness_inventory_incomplete');

    entries.push({
      topic: vine?.topic || inh?.topic || cont?.topic || enrich?.topic || key,
      classification,
      topicConnectionCount,
      inheritanceConnectionCount: inheritanceCount,
      continuitySectionCount,
      scriptureChainCount: chainCount,
      limitedTopicConnections,
      limitedInheritanceConnections,
      limitedContinuityConnections,
      limitedScriptureChainConnections,
      growthNotes,
      informationalOnly: true,
      neverBlocked: true,
    });
  }

  const byClass = {
    stronglyConnected: entries.filter((e) => e.classification === 'Strongly Connected').length,
    growing: entries.filter((e) => e.classification === 'Growing').length,
    expansionOpportunity: entries.filter((e) => e.classification === 'Expansion Opportunity').length,
  };

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Identify doctrine packs and topics that could benefit from additional connections',
    topicCount: entries.length,
    classificationSummary: byClass,
    topics: entries.sort((a, b) => {
      const rank = { 'Expansion Opportunity': 0, Growing: 1, 'Strongly Connected': 2 };
      return (rank[a.classification] ?? 0) - (rank[b.classification] ?? 0);
    }),
    expansionOpportunities: entries
      .filter((e) => e.classification === 'Expansion Opportunity')
      .map((e) => ({ topic: e.topic, growthNotes: e.growthNotes })),
    safety: {
      informationalOnly: true,
      noTopicAutomaticallyBlocked: true,
      noTopicAutomaticallyDowngraded: true,
    },
  };
}

function evidenceStrength(rel) {
  const evidence = rel.evidence || [];
  const sourceIds = new Set();
  const evidenceTypes = new Set();
  for (const e of evidence) {
    if (e.sourceId) sourceIds.add(e.sourceId);
    if (e.lessonTitle) sourceIds.add(normalizeKey(e.lessonTitle));
    if (e.evidenceType) evidenceTypes.add(e.evidenceType);
  }
  return {
    evidenceCount: evidence.length,
    independentSourceCount: sourceIds.size,
    evidenceTypeCount: evidenceTypes.size,
  };
}

function buildScripturePathwayExpansionReport(observedLib, candidateLib) {
  const observedRelationships = observedLib?.relationships || [];
  const candidateRelationships = candidateLib?.relationships || [];

  const observedPathways = [];
  const supportedPathways = [];
  const pathwaysNeedingEvidence = [];

  const observedByType = new Map();

  for (const rel of observedRelationships) {
    const source = rel.sourceScripture || rel.sourceTopic || '';
    const target = rel.targetScripture || rel.targetTopic || '';
    const strength = evidenceStrength(rel);
    const pathway = {
      source,
      target,
      relationshipType: rel.relationshipType,
      pathwayType: 'observed',
      evidenceCount: strength.evidenceCount,
      independentSourceCount: strength.independentSourceCount,
      evidenceTypes: rel.evidenceTypes || [],
      traceable: true,
      reviewable: true,
      autoDoctrine: false,
    };

    observedPathways.push(pathway);

    const typeKey = rel.relationshipType || 'unknown';
    observedByType.set(typeKey, (observedByType.get(typeKey) || 0) + 1);

    const supported = strength.independentSourceCount >= 2
      || (strength.evidenceCount >= 2 && strength.evidenceTypeCount >= 1);
    if (supported) {
      supportedPathways.push(pathway);
    } else {
      pathwaysNeedingEvidence.push({
        ...pathway,
        reason: 'observed_single_source_or_low_evidence',
      });
    }
  }

  const candidatePathways = candidateRelationships.map((rel) => {
    const strength = evidenceStrength(rel);
    const pathway = {
      source: rel.sourceTopic || rel.sourceScripture || '',
      target: rel.targetTopic || rel.targetScripture || '',
      relationshipType: rel.relationshipType,
      pathwayType: 'candidate',
      inferenceBasis: rel.inferenceBasis || null,
      confidence: rel.confidence ?? null,
      evidenceCount: strength.evidenceCount,
      evidenceTypes: (rel.evidence || []).map((e) => e.evidenceType).filter(Boolean),
      traceable: true,
      reviewable: true,
      autoDoctrine: false,
      candidateOnly: true,
    };
    pathwaysNeedingEvidence.push({
      ...pathway,
      reason: 'candidate_pathway_needs_additional_evidence',
    });
    return pathway;
  });

  const observedNeedingEvidenceCount = pathwaysNeedingEvidence.filter((p) => p.pathwayType === 'observed').length;
  const candidateNeedingEvidenceCount = candidatePathways.length;

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Track observed and candidate Scripture pathways as the vine network matures',
    summary: {
      observedPathwayCount: observedPathways.length,
      candidatePathwayCount: candidatePathways.length,
      supportedPathwayCount: supportedPathways.length,
      observedPathwaysNeedingEvidenceCount: observedNeedingEvidenceCount,
      candidatePathwaysNeedingEvidenceCount: candidateNeedingEvidenceCount,
      pathwaysNeedingAdditionalEvidenceCount: observedNeedingEvidenceCount + candidateNeedingEvidenceCount,
      observedByRelationshipType: Object.fromEntries(observedByType),
    },
    observedPathwaysSample: observedPathways.slice(0, 50),
    candidatePathways: candidatePathways,
    supportedPathwaysSample: supportedPathways.slice(0, 50),
    pathwaysNeedingAdditionalEvidenceSample: pathwaysNeedingEvidence.slice(0, 75),
    allCandidatePathwaysTraceable: candidatePathways.every((p) => p.traceable),
    allCandidatePathwaysReviewable: candidatePathways.every((p) => p.reviewable),
    safety: {
      candidatePathwaysNeverAutoDoctrine: true,
      informationalOnly: true,
      observedPathwaysFullCount: observedPathways.length,
      supportedPathwaysFullCount: supportedPathways.length,
      pathwaysNeedingEvidenceFullCount: pathwaysNeedingEvidence.length,
    },
  };
}

function buildCorpusGrowthOpportunities(corpus, vineGrowth, topicGrowth, pathwayReport) {
  const opportunities = [];

  const phase3r = loadJson(path.join(ROOT, 'docs', 'regression-trace', 'phase3r-source-recovery-results.json'), {});
  const youtubeBlock = phase3r.youtube || phase3r.youtubeRecovery || {};
  const transcriptUnavailable = youtubeBlock.transcriptUnavailable
    ?? (youtubeBlock.results || []).filter((m) => m.transcript_unavailable).length
    ?? 0;

  if (transcriptUnavailable > 0) {
    opportunities.push({
      type: 'transcript_unavailable',
      count: transcriptUnavailable,
      description: 'YouTube sources without recovered transcripts — additional transcript recovery could expand scripture chains',
      blocksLearning: false,
    });
  }

  const org = corpus.organizationV3;
  const incompleteLinkage = (org.packets || []).filter((p) =>
    !p.doctrinePackCandidate || p.semanticLinkageConfidence < 0.7,
  );
  if (incompleteLinkage.length > 0) {
    opportunities.push({
      type: 'source_linkage_incomplete',
      count: incompleteLinkage.length,
      sampleTitles: incompleteLinkage.slice(0, 10).map((p) => p.lessonTitle),
      description: 'Packets with missing or low-confidence doctrine pack linkage',
      blocksLearning: false,
    });
  }

  const humanReview = (org.packets || []).filter((p) => p.humanReviewRequired);
  if (humanReview.length > 0) {
    opportunities.push({
      type: 'human_review_queue',
      count: humanReview.length,
      description: 'Packets awaiting human review — completion could unlock additional classified scriptures',
      blocksLearning: false,
    });
  }

  const unchainedTopics = (topicGrowth.topics || []).filter((t) => t.limitedScriptureChainConnections);
  if (unchainedTopics.length > 0) {
    opportunities.push({
      type: 'scripture_chain_expansion_opportunity',
      count: unchainedTopics.length,
      topics: unchainedTopics.slice(0, 20).map((t) => t.topic),
      description: 'Topics without attached scripture chains from the chain library',
      blocksLearning: false,
    });
  }

  const continuityLimited = (topicGrowth.topics || []).filter((t) => t.limitedContinuityConnections);
  if (continuityLimited.length > 0) {
    opportunities.push({
      type: 'continuity_expansion_opportunity',
      count: continuityLimited.length,
      topics: continuityLimited.slice(0, 20).map((t) => t.topic),
      description: 'Topics with limited Genesis-to-Revelation continuity section coverage',
      blocksLearning: false,
    });
  }

  const inheritanceLimited = (topicGrowth.topics || []).filter((t) => t.limitedInheritanceConnections);
  if (inheritanceLimited.length > 0) {
    opportunities.push({
      type: 'inheritance_expansion_opportunity',
      count: inheritanceLimited.length,
      topics: inheritanceLimited.slice(0, 20).map((t) => t.topic),
      description: 'Topics with limited inheritance map connections',
      blocksLearning: false,
    });
  }

  const topicConnectivityLimited = (vineGrowth.topics || []).filter((t) => t.growthOpportunities.length > 0);
  if (topicConnectivityLimited.length > 0) {
    opportunities.push({
      type: 'topic_connectivity_opportunity',
      count: topicConnectivityLimited.length,
      topics: topicConnectivityLimited.slice(0, 20).map((t) => t.topic),
      sampleOpportunities: topicConnectivityLimited.slice(0, 5).map((t) => ({
        topic: t.topic,
        growthOpportunities: t.growthOpportunities,
      })),
      description: 'Vine network topics that could strengthen parent, child, related, or continuity connections',
      blocksLearning: false,
    });
  }

  if (pathwayReport.summary.pathwaysNeedingAdditionalEvidenceCount > 0) {
    opportunities.push({
      type: 'pathway_evidence_expansion_opportunity',
      count: pathwayReport.summary.pathwaysNeedingAdditionalEvidenceCount,
      candidateCount: pathwayReport.summary.candidatePathwayCount,
      description: 'Observed and candidate pathways that could benefit from additional independent source evidence',
      blocksLearning: false,
    });
  }

  const enrichment = loadJson(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), { packs: [] });
  const incompleteWitness = (enrichment.packs || []).filter((p) => !p.witnessInventoryComplete);
  if (incompleteWitness.length > 0) {
    opportunities.push({
      type: 'witness_inventory_expansion_opportunity',
      count: incompleteWitness.length,
      topics: incompleteWitness.map((p) => p.topic),
      description: 'Doctrine packs needing additional original, supporting, or continuity witness inventory',
      blocksLearning: false,
    });
  }

  return {
    ranAt: new Date().toISOString(),
    purpose: 'Document where additional corpus maturity could improve coverage',
    opportunityCount: opportunities.length,
    totalDocumentedItems: opportunities.reduce((n, o) => n + (o.count || 0), 0),
    opportunities,
    safety: {
      informationalOnly: true,
      neverPreventsCorpusLearning: true,
      neverPreventsEnrichment: true,
      neverPreventsExpansion: true,
      neverPreventsFutureDiscovery: true,
      allOpportunitiesDocumented: opportunities.length > 0,
    },
  };
}

function loadCorpusInputs() {
  return {
    vineData: loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), { network: [] }),
    inheritanceMap: loadJson(path.join(OUT_DIR, 'topic-inheritance-map.json'), { inheritance: [] }),
    continuityIndex: loadJson(path.join(OUT_DIR, 'genesis-to-revelation-continuity-index.json'), { topics: [] }),
    chainLibrary: loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] }),
    enrichment: loadJson(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), { packs: [] }),
    observedLib: loadJson(path.join(OUT_DIR, 'ObservedRelationshipLibrary.json'), { relationships: [] }),
    candidateLib: loadJson(path.join(OUT_DIR, 'CandidateRelationshipLibrary.json'), { relationships: [] }),
    organizationV3: loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), { packets: [] }),
  };
}

function runCorpusGrowthReports() {
  const corpus = loadCorpusInputs();

  const vineGrowth = buildScriptureVineGrowthReport(corpus.vineData);
  const topicGrowth = buildTopicConnectionGrowthReport(
    corpus.vineData,
    corpus.inheritanceMap,
    corpus.continuityIndex,
    corpus.chainLibrary,
    corpus.enrichment.packs,
  );
  const pathwayReport = buildScripturePathwayExpansionReport(corpus.observedLib, corpus.candidateLib);
  const corpusOpportunities = buildCorpusGrowthOpportunities(
    corpus,
    vineGrowth,
    topicGrowth,
    pathwayReport,
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const outputs = {
    scriptureVineGrowth: vineGrowth,
    topicConnectionGrowth: topicGrowth,
    scripturePathwayExpansion: pathwayReport,
    corpusGrowthOpportunities: corpusOpportunities,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'scripture-vine-growth-report.json'),
    JSON.stringify(vineGrowth, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'topic-connection-growth-report.json'),
    JSON.stringify(topicGrowth, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'scripture-pathway-expansion-report.json'),
    JSON.stringify(pathwayReport, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'corpus-growth-opportunities.json'),
    JSON.stringify(corpusOpportunities, null, 2),
  );

  return {
    ranAt: new Date().toISOString(),
    outputs,
    executive: {
      vineTopics: vineGrowth.topicCount,
      vineTopicsWithOpportunities: vineGrowth.topicsWithGrowthOpportunities,
      topicConnectionCount: topicGrowth.topicCount,
      stronglyConnected: topicGrowth.classificationSummary.stronglyConnected,
      growing: topicGrowth.classificationSummary.growing,
      expansionOpportunity: topicGrowth.classificationSummary.expansionOpportunity,
      observedPathways: pathwayReport.summary.observedPathwayCount,
      candidatePathways: pathwayReport.summary.candidatePathwayCount,
      supportedPathways: pathwayReport.summary.supportedPathwayCount,
      pathwaysNeedingEvidence: pathwayReport.summary.pathwaysNeedingAdditionalEvidenceCount,
      corpusOpportunityTypes: corpusOpportunities.opportunityCount,
    },
  };
}

module.exports = {
  runCorpusGrowthReports,
  buildScriptureVineGrowthReport,
  buildTopicConnectionGrowthReport,
  buildScripturePathwayExpansionReport,
  buildCorpusGrowthOpportunities,
};
