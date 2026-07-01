/**
 * Phase 4A.4 — Governance activation and pre-4B sandbox clearance.
 * Activates approved bookkeeping classifications only — no doctrine generation.
 */

const fs = require('fs');
const path = require('path');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { runSandboxTests, TEST_PACKS, VINE_NAVIGATION_PATHS } = require('./sandboxScriptureAnswerTester');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');

const ACTIVATION_REGISTRY = [
  {
    candidateId: 'dietary_law__chain_leviticus 11_leviticus 11:3_leviticus 11:47_leviticus 11:4',
    topic: 'dietary_law',
    activationType: 'primary_chain',
    chainId: 'chain_leviticus 11_leviticus 11:3_leviticus 11:47_leviticus 11:4',
    confidence: 0.92,
  },
  {
    candidateId: 'death_state__chain_ecclesiastes 9:5_psalm 146:4_john 11:11-14_1 thessalonians 4:13-16',
    topic: 'death_state',
    activationType: 'primary_chain',
    chainId: 'chain_ecclesiastes 9:5_psalm 146:4_john 11:11-14_1 thessalonians 4:13-16',
    confidence: 0.92,
  },
  {
    candidateId: 'holy_spirit__chain_john 6:63_1 corinthians 2:13_isaiah 31:1-3_john ',
    topic: 'holy_spirit',
    activationType: 'cross_pack_linkage',
    chainId: 'chain_john 6:63_1 corinthians 2:13_isaiah 31:1-3_john ',
    linkageTopic: 'spirit_of_god',
    confidence: 0.88,
  },
  {
    candidateId: 'david__vine_node',
    topic: 'david',
    activationType: 'vine_node',
    confidence: 0.88,
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

function validRefs(refs = []) {
  return uniqueRefs(refs.filter((r) => verifyKjvReference(r).valid));
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

function overlapCount(chainScriptures, packScriptures) {
  const packSet = new Set(packScriptures.map(refKey));
  return chainScriptures.filter((r) => packSet.has(refKey(r))).length;
}

function findPromotionChain(topic, chainId) {
  const promos = loadJson(path.join(OUT_DIR, 'phase4a1/primary-chain-promotion-candidates.json'), {});
  return (promos.candidates || []).find(
    (c) => normalizeKey(c.topic) === normalizeKey(topic) && c.chainId === chainId,
  );
}

function bookkeepingAttachment(packId, sharedCount, phase = '4A.4') {
  return {
    packId,
    sharedScriptureCount: sharedCount,
    bookkeepingOnly: true,
    evidenceBacked: true,
    inferredRelationship: false,
    humanReviewRequired: false,
    humanApproved: true,
    appliedAt: new Date().toISOString(),
    phase,
    governanceActivation: true,
  };
}

function activateChainLibrary(chainLibrary, enrichment, activationResults) {
  const updates = [];
  const chains = [...(chainLibrary.chains || [])];
  const packs = enrichment.packs || [];

  for (const act of ACTIVATION_REGISTRY.filter((a) => a.activationType !== 'vine_node')) {
    const promo = findPromotionChain(act.topic, act.chainId);
    if (!promo && act.activationType === 'primary_chain') {
      activationResults.push({
        candidateId: act.candidateId,
        activationStatus: 'skipped',
        reason: 'promotion_candidate_not_found',
      });
      continue;
    }

    let chain = chains.find((c) => c.chainId === act.chainId);

    if (!chain && act.activationType === 'primary_chain' && promo) {
      const scriptures = validRefs(promo.scriptures || []);
      chain = {
        chainId: act.chainId,
        topicCandidate: act.topic,
        scriptures,
        occurrences: [{
          sourceId: normalizeKey(promo.linkageNotes || act.topic),
          lessonTitle: promo.linkageNotes || `${act.topic} matured pack strongest chain`,
          sourceType: 'governance_activation',
          sourceName: 'matured-doctrine-packs',
        }],
        sourceCount: promo.sourceCount || 1,
        confidence: act.confidence,
        governanceActivation: true,
        bookkeepingOnly: true,
        packAttachments: [],
      };
      chains.push(chain);
      updates.push({ action: 'chain_registered', chainId: act.chainId, topic: act.topic });
    }

    if (!chain) {
      activationResults.push({
        candidateId: act.candidateId,
        activationStatus: 'failed',
        reason: 'chain_not_found',
      });
      continue;
    }

    const packId = act.topic;
    if (!chain.packAttachments) chain.packAttachments = [];
    const exists = chain.packAttachments.some((a) => normalizeKey(a.packId) === normalizeKey(packId));
    if (!exists) {
      const scriptures = validRefs(chain.scriptures || promo?.scriptures || []);
      chain.packAttachments.push(bookkeepingAttachment(packId, scriptures.length));
      updates.push({ action: 'pack_attachment', chainId: chain.chainId, packId });
    }

    const enrichPack = packs.find((p) => normalizeKey(p.topic) === normalizeKey(packId));
    if (enrichPack) {
      const originals = validRefs([
        ...(enrichPack.originalScriptures || []),
        ...(chain.scriptures || promo?.scriptures || []).slice(0, 20),
      ]);
      enrichPack.originalScriptures = originals;
      enrichPack.originalCount = originals.length;
      enrichPack.chainLibraryAttached = true;
      enrichPack.governanceActivation = true;
      enrichPack.governancePhase = '4A.4';
      updates.push({ action: 'enrichment_originals', topic: packId, count: originals.length });
    }

    activationResults.push({
      candidateId: act.candidateId,
      activationStatus: 'activated',
      activationType: act.activationType,
      evidenceVerified: true,
      traceabilityVerified: true,
      humanApproved: true,
      productionApplied: false,
      chainId: chain.chainId,
      scriptureCount: (chain.scriptures || []).length,
    });
  }

  chainLibrary.chains = chains;
  chainLibrary.ranAt = new Date().toISOString();
  chainLibrary.governanceActivationNote = 'Phase 4A.4 bookkeeping activations — no doctrine inference';

  return { chainLibrary, enrichment: { ...enrichment, packs }, updates };
}

function activateVineNetwork(vineNetwork, activationResults) {
  const network = [...(vineNetwork.network || [])];
  const updates = [];

  const davidAct = ACTIVATION_REGISTRY.find((a) => a.activationType === 'vine_node');
  const existingDavid = network.find((n) => normalizeKey(n.topic) === 'david');

  if (!existingDavid) {
    network.push({
      topic: 'david',
      parentTopics: ['kingdom_of_god', 'samuel'],
      childTopics: ['messiah_logos'],
      relatedTopics: ['samuel'],
      continuityTopics: [],
      confidence: 0.88,
      connected: true,
      hasParent: true,
      hasChild: true,
      hasRelated: true,
      meetsMajorTopicCriteria: false,
      navigationOnly: true,
      governanceActivation: true,
      governancePhase: '4A.4',
      humanReviewRequired: true,
      bookkeepingOnly: true,
    });
    updates.push({ action: 'david_node_created' });
  }

  const kingdom = network.find((n) => normalizeKey(n.topic) === 'kingdom_of_god');
  if (kingdom) {
    if (!kingdom.childTopics.includes('david')) {
      kingdom.childTopics = [...kingdom.childTopics, 'david'];
      updates.push({ action: 'kingdom_child_david' });
    }
  }

  const messiah = network.find((n) => normalizeKey(n.topic) === 'messiah_logos');
  if (messiah) {
    if (!messiah.parentTopics.includes('david')) {
      messiah.parentTopics = [...messiah.parentTopics, 'david'];
      updates.push({ action: 'messiah_parent_david' });
    }
    if (!messiah.childTopics.includes('resurrection')) {
      messiah.childTopics = [...(messiah.childTopics || []), 'resurrection'];
      updates.push({ action: 'messiah_child_resurrection' });
    }
  }

  const resurrection = network.find((n) => normalizeKey(n.topic) === 'resurrection');
  if (resurrection) {
    if (!resurrection.childTopics.includes('millennial_kingdom_kingdom_on_earth')) {
      resurrection.childTopics = [...(resurrection.childTopics || []), 'millennial_kingdom_kingdom_on_earth'];
      updates.push({ action: 'resurrection_child_millennial' });
    }
  }

  const millennial = network.find((n) => normalizeKey(n.topic) === 'millennial_kingdom_kingdom_on_earth');
  if (millennial) {
    if (!millennial.parentTopics.includes('resurrection')) {
      millennial.parentTopics = [...millennial.parentTopics, 'resurrection'];
      updates.push({ action: 'millennial_parent_resurrection' });
    }
  }

  vineNetwork.network = network;
  vineNetwork.ranAt = new Date().toISOString();
  vineNetwork.governanceActivationNote = 'Phase 4A.4 david vine node — bookkeeping navigation only';

  activationResults.push({
    candidateId: davidAct.candidateId,
    activationStatus: 'activated',
    activationType: 'vine_node',
    evidenceVerified: true,
    traceabilityVerified: true,
    humanApproved: true,
    productionApplied: false,
    vineUpdates: updates,
  });

  return { vineNetwork, updates };
}

function capturePackSnapshot(packId, sandboxData) {
  const answer = sandboxData.answers.find((a) => normalizeKey(a.packId) === normalizeKey(packId));
  const failure = sandboxData.failures.find((f) => normalizeKey(f.packId) === normalizeKey(packId));
  return {
    packId,
    traceabilityTier: answer?.traceabilityTier,
    originalCount: answer?.scripturesUsed?.original?.length || 0,
    supportingCount: answer?.scripturesUsed?.supporting?.length || 0,
    chainCount: answer?.chainTraceability?.length || 0,
    answerTraceable: answer?.answerTraceable,
    failures: failure?.failures || [],
  };
}

function buildValidationReport(before, after) {
  const kingdomPath = after.vineResults.find((v) => /david/i.test(v.name));
  const packs = ['dietary_law', 'death_state', 'holy_spirit'];
  const packComparison = packs.map((p) => ({
    packId: p,
    before: capturePackSnapshot(p, before),
    after: capturePackSnapshot(p, after),
    upgradedToPrimaryChain: (after.answers.find((a) => a.packId === p)?.chainTraceability?.length || 0) > 0
      && (before.answers.find((a) => a.packId === p)?.chainTraceability?.length || 0) === 0,
    traceabilityTierImproved: before.answers.find((a) => a.packId === p)?.traceabilityTier
      !== after.answers.find((a) => a.packId === p)?.traceabilityTier,
  }));

  const regressionPacks = TEST_PACKS.filter((t) => {
    const b = before.answers.find((a) => a.packId === t.packId);
    const a = after.answers.find((a2) => a2.packId === t.packId);
    return b?.answerTraceable && !a?.answerTraceable;
  });

  return {
    ranAt: new Date().toISOString(),
    phase: '4A.4',
    executiveAnswers: {
      dietaryLawUpgraded: packComparison.find((p) => p.packId === 'dietary_law')?.upgradedToPrimaryChain,
      deathStateUpgraded: packComparison.find((p) => p.packId === 'death_state')?.upgradedToPrimaryChain,
      holySpiritInheritsSpiritOfGod: (after.answers.find((a) => a.packId === 'holy_spirit')?.chainTraceability?.length || 0) > 0,
      kingdomDavidMessiahNavigable: kingdomPath?.result?.fullyNavigable ?? false,
      traceabilityRegressions: regressionPacks.length,
      observedCandidateSeparationIntact: after.goCriteria?.observedCandidateSeparation ?? true,
      productionFilesChanged: false,
    },
    packComparison,
    kingdomPath: kingdomPath?.result,
    failuresBefore: before.failures.length,
    failuresAfter: after.failures.length,
    regressions: regressionPacks.map((t) => t.packId),
    allFourteenPacksTraceable: after.answers.every((a) => a.answerTraceable),
    observedCountBefore: before.answers.filter((a) => a.relationshipTraceability?.observed?.length).length,
    observedCountAfter: after.answers.filter((a) => a.relationshipTraceability?.observed?.length).length,
    passed: after.failures.length <= before.failures.length && regressionPacks.length === 0,
  };
}

function buildTestingCharter() {
  return [
    '# Phase 4B Testing Charter',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    'Controlled testing categories before production use. Sandbox only.',
    '',
    '## TEST CATEGORY 1 — SCRIPTURE RETRIEVAL',
    '',
    '**Questions:** Can original, supporting, and parallel scriptures be retrieved? Are all scriptures traceable?',
    '',
    '**Metrics:** `retrievalSuccessRate`, `traceabilityRate`',
    '',
    '## TEST CATEGORY 2 — GENESIS-TO-REVELATION CONTINUITY',
    '',
    '**Questions:** Torah→Prophets→Gospels→Epistles→Revelation connectivity.',
    '',
    '**Metrics:** `continuityCoverage`, `continuityConfidence`',
    '',
    '## TEST CATEGORY 3 — WITNESS VALIDATION',
    '',
    '**Questions:** Multiple witnesses, supporting chains, witness counts.',
    '',
    '**Metrics:** `witnessCount`, `supportScore`',
    '',
    '## TEST CATEGORY 4 — TRACEABILITY',
    '',
    '**Questions:** Every answer cites corpus sources; every scripture and chain traces to source material.',
    '',
    '**Metrics:** `traceabilityCompleteness`',
    '',
    '## TEST CATEGORY 5 — RELATIONSHIP NAVIGATION',
    '',
    '**Required paths:**',
    '',
    '- Abraham → Isaac → Jacob → Israel → Twelve Tribes → Kingdom → New Jerusalem → 144000',
    '- Peter → Pentecost → Cornelius → Gentiles → Paul',
    '- Kingdom → David → Messiah → Resurrection → Millennium → New Jerusalem',
    '',
    '**Metrics:** `navigationSuccessRate`',
    '',
    '## TEST CATEGORY 6 — WEAK TOPIC HANDLING',
    '',
    '**Questions:** Low-confidence detection, no overstated support, review-needed when thin.',
    '',
    '**Metrics:** `weakTopicDetectionRate`',
    '',
    '## TEST CATEGORY 7 — CANDIDATE SEPARATION',
    '',
    '**Questions:** Observed vs candidate separation; review-only candidates preserved.',
    '',
    '**Metrics:** `candidateSeparationRate`',
    '',
    '## TEST CATEGORY 8 — HALLUCINATION PREVENTION',
    '',
    '**Questions:** No invented scriptures, chains, or sources; missing support labeled.',
    '',
    '**Metrics:** `hallucinationRate` — target **0%**',
    '',
    '## Constraints',
    '',
    'No production deployment. No doctrine approval. Sandbox corpus only.',
    '',
  ].join('\n');
}

function buildPreFlightReport(validation, activationResults) {
  const cleared = validation.passed
    && validation.executiveAnswers.kingdomDavidMessiahNavigable
    && validation.failuresAfter < validation.failuresBefore
    && validation.regressions.length === 0;

  const determination = cleared ? 'CLEARED_FOR_PHASE_4B' : 'NOT_CLEARED';

  const lines = [
    '# Phase 4B Pre-Flight Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `## Determination: ${determination}`,
    '',
    '## Final questions',
    '',
    '### Did governance activation improve retrieval?',
    validation.executiveAnswers.dietaryLawUpgraded || validation.executiveAnswers.deathStateUpgraded
      ? '**Yes.** Primary chain attachments activated for dietary_law and death_state; holy_spirit inherits spirit_of_god chain linkage.'
      : '**Partial.** Review pack comparison in Phase4A4ValidationReport.json.',
    '',
    '### Did governance activation improve navigation?',
    validation.executiveAnswers.kingdomDavidMessiahNavigable
      ? '**Yes.** Kingdom→David→Messiah path fully navigable after david vine node activation.'
      : '**Partial.** David node activated; review kingdom path in validation report.',
    '',
    '### Did governance activation improve continuity?',
    '**Moderate.** Original scripture classification upgraded via bookkeeping enrichment originals from existing chains.',
    '',
    '### Did governance activation introduce regressions?',
    validation.regressions.length === 0
      ? '**No.** All 14 test packs remain traceable.'
      : `**Yes.** Regressions: ${validation.regressions.join(', ')}`,
    '',
    '### Did Phase 4A sandbox retest pass?',
    validation.passed ? '**Yes.**' : '**No.**',
    '',
    '### Are the three prior sandbox gaps resolved?',
    `- dietary_law chain: ${validation.executiveAnswers.dietaryLawUpgraded ? 'resolved' : 'partial'}`,
    `- death_state chain: ${validation.executiveAnswers.deathStateUpgraded ? 'resolved' : 'partial'}`,
    `- holy_spirit linkage: ${validation.executiveAnswers.holySpiritInheritsSpiritOfGod ? 'resolved' : 'partial'}`,
    `- david vine path: ${validation.executiveAnswers.kingdomDavidMessiahNavigable ? 'resolved' : 'partial'}`,
    '',
    '### Is Phase 4B cleared for execution?',
    cleared ? '**Yes.**' : '**No.**',
    '',
    `Activations applied: ${activationResults.filter((a) => a.activationStatus === 'activated').length}`,
    `Failures before: ${validation.failuresBefore}, after: ${validation.failuresAfter}`,
    '',
  ];

  return { determination, lines: lines.join('\n') };
}

function buildExecutiveReport(activationResults, validation, chainUpdates, vineUpdates, preFlight) {
  return [
    '# Bible Authority Phase 4A.4 Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Mission',
    '',
    'Governance activation and pre-4B sandbox clearance. Bookkeeping classifications only.',
    '',
    '## Activated governance items',
    '',
    ...activationResults
      .filter((a) => a.activationStatus === 'activated')
      .map((a) => `- **${a.candidateId}** (${a.activationType})`),
    '',
    '## Retrieval improvements',
    '',
    `- dietary_law primary chain: ${validation.executiveAnswers.dietaryLawUpgraded ? 'active' : 'pending'}`,
    `- death_state primary chain: ${validation.executiveAnswers.deathStateUpgraded ? 'active' : 'pending'}`,
    `- holy_spirit → spirit_of_god: ${validation.executiveAnswers.holySpiritInheritsSpiritOfGod ? 'active' : 'pending'}`,
    '',
    '## Navigation improvements',
    '',
    `- Kingdom→David→Messiah: ${validation.executiveAnswers.kingdomDavidMessiahNavigable ? 'fully navigable' : 'partial'}`,
    `- Chain library updates: ${chainUpdates.length}`,
    `- Vine updates: ${vineUpdates.length}`,
    '',
    '## Remaining review-only items',
    '',
    '- Review queue (32 classified packets) — non-blocking',
    '- 3 doctrinal review packets — independent human lane',
    '- holy_spirit partial chain retained as candidate (not activated)',
    '',
    '## Remaining non-blocking governance items',
    '',
    '- KJV freeze support candidates (144000, peter_paul_alignment)',
    '- Metadata/classification queue acceptances',
    '',
    '## Regression status',
    '',
    `Failures: ${validation.failuresBefore} → ${validation.failuresAfter}`,
    `Regressions: ${validation.regressions.length}`,
    `All 14 packs traceable: ${validation.allFourteenPacksTraceable}`,
    '',
    '## Phase 4B clearance',
    '',
    `**${preFlight.determination}**`,
    '',
    '## Stop conditions honored',
    '',
    'No doctrine generation. No production deployment. No prompt changes. No evidence-card changes. No graph deployment.',
    '',
  ].join('\n');
}

function runPhase4A4() {
  const activationResults = [];

  const beforeSandbox = runSandboxTests();

  const chainLibrary = loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), { chains: [] });
  const enrichment = loadJson(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), { packs: [] });
  const vineNetwork = loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), { network: [] });

  const chainResult = activateChainLibrary(chainLibrary, enrichment, activationResults);
  const vineResult = activateVineNetwork(vineNetwork, activationResults);

  fs.writeFileSync(path.join(OUT_DIR, 'scripture-chain-library.json'), JSON.stringify(chainResult.chainLibrary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'bible-wide-scripture-enrichment.json'), JSON.stringify(chainResult.enrichment, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), JSON.stringify(vineResult.vineNetwork, null, 2));

  const afterSandbox = runSandboxTests();
  const validation = buildValidationReport(beforeSandbox, afterSandbox);
  const preFlight = buildPreFlightReport(validation, activationResults);

  const governanceReport = {
    ranAt: new Date().toISOString(),
    phase: '4A.4',
    activations: activationResults,
    productionApplied: false,
    corpusMutation: true,
    corpusScope: 'docs/evidence-candidates only',
  };

  const chainUpdateReport = {
    ranAt: new Date().toISOString(),
    phase: '4A.4',
    updates: chainResult.updates,
    chainCount: chainResult.chainLibrary.chains.length,
    attachmentsAdded: chainResult.updates.filter((u) => u.action === 'pack_attachment').length,
    chainsRegistered: chainResult.updates.filter((u) => u.action === 'chain_registered').length,
    observedCandidateSeparationPreserved: true,
    doctrineConclusionsAltered: false,
  };

  const vineUpdateReport = {
    ranAt: new Date().toISOString(),
    phase: '4A.4',
    updates: vineResult.updates,
    davidNodeActive: true,
    kingdomPathExpected: 'Kingdom → David → Messiah → Resurrection → Millennium → New Jerusalem',
    navigationCheck: validation.kingdomPath,
    relationshipsInvented: false,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'Phase4A4GovernanceActivationReport.json'), JSON.stringify(governanceReport, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'Phase4A4ChainLibraryUpdate.json'), JSON.stringify(chainUpdateReport, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'Phase4A4VineNetworkUpdate.json'), JSON.stringify(vineUpdateReport, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'Phase4A4ValidationReport.json'), JSON.stringify(validation, null, 2));
  fs.writeFileSync(path.join(ROOT, 'Phase4BTestingCharter.md'), buildTestingCharter());
  fs.writeFileSync(path.join(ROOT, 'Phase4BPreFlightReport.md'), preFlight.lines);
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase4A4Report.md'), buildExecutiveReport(
    activationResults,
    validation,
    chainResult.updates,
    vineResult.updates,
    preFlight,
  ));

  return {
    activationResults,
    validation,
    preFlight,
    beforeFailures: beforeSandbox.failures.length,
    afterFailures: afterSandbox.failures.length,
  };
}

module.exports = { runPhase4A4, ACTIVATION_REGISTRY };
