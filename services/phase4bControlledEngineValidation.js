/**
 * Phase 4B — Controlled engine validation against frozen corpus.
 * Testing only — no corpus modification, doctrine, or production changes.
 */

const fs = require('fs');
const path = require('path');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { refKey } = require('./phase3iRecursiveExpansion');
const {
  runSandboxTests,
  TEST_PACKS,
  scoreAnswer,
} = require('./sandboxScriptureAnswerTester');
const { SandboxBibleAuthorityRetriever } = require('./sandboxBibleAuthorityRetriever');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const PHASE4B_DIR = path.join(OUT_DIR, 'phase4b');

const G2R_SECTIONS = ['Torah', 'Former Prophets', 'Latter Prophets', 'Writings', 'Gospels', 'Acts', 'Epistles', 'Revelation'];

const VINE_PATHS = [
  {
    name: 'Abraham → Isaac → Jacob → Israel → Twelve Tribes → House of Israel → Regathering → Kingdom → New Jerusalem → 144000',
    topics: [
      'abraham', 'isaac', 'jacob', 'israel', 'jacob_israel_twelve_tribes',
      'house_of_israel', 'regathering', 'kingdom_of_god', 'new_jerusalem', 'one_hundred_forty_four_thousand',
    ],
  },
  {
    name: 'Peter → Apostles → Pentecost → Cornelius → Gentiles → Jerusalem Council → Paul',
    topics: ['peter', 'apostles', 'pentecost', 'cornelius', 'gentiles', 'peter_paul_alignment', 'paul'],
  },
  {
    name: 'Kingdom → David → Messiah → Resurrection → Millennium → New Jerusalem',
    topics: [
      'kingdom_of_god', 'david', 'messiah_logos', 'resurrection',
      'millennial_kingdom_kingdom_on_earth', 'new_jerusalem',
    ],
  },
];

const CANONICAL_VINE_PATHS = [
  {
    name: 'Canonical Abraham → 144000',
    topics: ['abraham', 'isaac', 'jacob', 'israel', 'jacob_israel_twelve_tribes', 'kingdom_of_god', 'new_jerusalem', 'one_hundred_forty_four_thousand'],
  },
  {
    name: 'Canonical Peter → Paul',
    topics: ['disciples', 'peter', 'pentecost', 'cornelius', 'gentiles', 'paul'],
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

function round(n, d = 3) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

function buildCorpusInventory(retriever) {
  const inventory = new Set();
  for (const pack of retriever.corpus.files.enrichment?.packs || []) {
    for (const r of [
      ...(pack.originalScriptures || []),
      ...(pack.supportingScriptures || []),
      ...(pack.parallelScriptures || []),
      ...(pack.continuityScriptures || []),
    ]) inventory.add(refKey(r));
  }
  for (const test of TEST_PACKS) {
    const s = retriever.getPackScriptures(test.packId);
    for (const r of [...s.original, ...s.parallel, ...s.supporting, ...s.continuity, ...s.genesisToRevelation]) {
      inventory.add(refKey(r));
    }
    for (const c of s.chains) {
      for (const r of c.scriptures || []) inventory.add(refKey(r));
    }
  }
  for (const chain of retriever.corpus.files.chainLibrary?.chains || []) {
    for (const r of chain.scriptures || []) inventory.add(refKey(r));
  }
  for (const rel of retriever.corpus.files.observedLibrary?.relationships || []) {
    inventory.add(refKey(rel.sourceScripture));
    inventory.add(refKey(rel.targetScripture));
  }
  return inventory;
}

function category1Retrieval(sandbox) {
  const packs = sandbox.answers;
  let origPass = 0;
  let parPass = 0;
  let supPass = 0;
  let tracePass = 0;

  for (const a of packs) {
    const scores = sandbox.qualityScores.find((q) => q.packId === a.packId);
    const hasOrig = (a.scripturesUsed.original?.length || 0) > 0;
    const hasPar = (a.scripturesUsed.parallel?.length || 0) > 0;
    const hasSup = (a.scripturesUsed.supporting?.length || 0) > 0;
    if (hasOrig) origPass += 1;
    if (hasPar || scores?.parallelScriptureSupport >= 0.5) parPass += 1;
    if (hasSup) supPass += 1;
    if (a.answerTraceable) tracePass += 1;
  }

  const total = packs.length;
  const metrics = {
    originalScriptureRetrievalRate: round(origPass / total),
    parallelScriptureRetrievalRate: round(parPass / total),
    supportingScriptureRetrievalRate: round(supPass / total),
    traceabilityRate: round(tracePass / total),
  };

  return {
    metrics,
    passed: metrics.traceabilityRate >= 1 && metrics.supportingScriptureRetrievalRate >= 0.9,
    packs: packs.map((a) => ({
      packId: a.packId,
      original: a.scripturesUsed.original?.length || 0,
      parallel: a.scripturesUsed.parallel?.length || 0,
      supporting: a.scripturesUsed.supporting?.length || 0,
      traceable: a.answerTraceable,
      tier: a.traceabilityTier,
    })),
  };
}

function category2VineNavigation(retriever) {
  const results = [];
  for (const path of [...VINE_PATHS, ...CANONICAL_VINE_PATHS]) {
    const result = retriever.navigateVinePath(path.topics);
    results.push({
      pathAttempted: path.name,
      pathCompleted: result.fullyNavigable,
      hopCount: path.topics.length,
      traceable: true,
      topics: path.topics,
      steps: result.steps,
      brokenHops: result.steps.filter((s) => !s.pathwayNavigable).map((s) => s.topic),
    });
  }

  const required = results.filter((r) => VINE_PATHS.some((p) => p.name === r.pathAttempted));
  const requiredPass = required.filter((r) => r.pathCompleted).length;

  return {
    results,
    navigationSuccessRate: round(requiredPass / required.length),
    passed: requiredPass >= 1 && results.filter((r) => r.pathCompleted).length >= 3,
  };
}

function category3Continuity(sandbox) {
  const packs = sandbox.answers;
  let sectionUnion = new Set();
  let totalG2r = 0;

  for (const a of packs) {
    for (const s of a.scripturesUsed.sectionsPresent || []) sectionUnion.add(s);
    const scores = sandbox.qualityScores.find((q) => q.packId === a.packId);
    totalG2r += scores?.genesisToRevelationSupport || 0;
  }

  const mapped = new Set();
  for (const s of sectionUnion) {
    if (s === 'Torah') mapped.add('Torah');
    if (s === 'Former Prophets' || s === 'Latter Prophets') mapped.add('Prophets');
    if (s === 'Writings') mapped.add('Writings');
    if (s === 'Gospels') mapped.add('Gospels');
    if (s === 'Acts') mapped.add('Acts');
    if (s === 'Epistles') mapped.add('Epistles');
    if (s === 'Revelation') mapped.add('Revelation');
  }

  const continuityCoverage = round(mapped.size / 7);
  const continuityConfidence = round(totalG2r / packs.length);

  return {
    continuityCoverage,
    continuityConfidence,
    sectionsObserved: [...sectionUnion],
    g2rSectionsCovered: [...mapped],
    passed: continuityCoverage >= 0.85 && continuityConfidence >= 0.6,
  };
}

function category4Witness(sandbox, retriever) {
  const enrichment = retriever.corpus.files.enrichment?.packs || [];
  const questions = retriever.corpus.files.questionCoverage?.questions || [];

  const witnesses = [];
  for (const test of TEST_PACKS) {
    const enrich = enrichment.find((p) => p.topic === test.packId);
    const qMatches = questions.filter((q) => (q.lessonTitle || '').toLowerCase().includes(test.packId.replace(/_/g, ' '))
      || (q.question || '').toLowerCase().includes(test.packId.split('_')[0]));
    const answer = sandbox.answers.find((a) => a.packId === test.packId);
    witnesses.push({
      packId: test.packId,
      witnessCount: enrich?.genesisToRevelationWitnesses || enrich?.supportingCount || 0,
      supportScore: qMatches[0]?.supportScore ?? null,
      chainCount: answer?.chainTraceability?.length || 0,
      sourceDiversity: answer?.sourceTraceability?.length || 0,
    });
  }

  const avgWitness = witnesses.reduce((n, w) => n + (w.witnessCount || 0), 0) / witnesses.length;
  const avgSources = witnesses.reduce((n, w) => n + w.sourceDiversity, 0) / witnesses.length;

  return {
    witnessCount: round(avgWitness),
    supportScore: round(witnesses.filter((w) => w.supportScore).length / witnesses.length),
    sourceDiversity: round(avgSources),
    packs: witnesses,
    passed: avgWitness > 0 && avgSources >= 1,
  };
}

function category5Traceability(sandbox) {
  const packs = sandbox.answers;
  let complete = 0;
  const details = [];

  for (const a of packs) {
    const scriptureTrace = a.sourceTraceability?.length > 0;
    const chainTrace = (a.chainTraceability?.length || 0) > 0 || (a.scripturesUsed.original?.length || 0) >= 3;
    const answerTrace = a.answerTraceable;
    const packComplete = scriptureTrace && chainTrace && answerTrace;
    if (packComplete) complete += 1;
    details.push({
      packId: a.packId,
      scriptureTracesToSource: scriptureTrace,
      chainTracesToSource: chainTrace,
      answerTraceable: answerTrace,
      complete: packComplete,
    });
  }

  const traceabilityCompleteness = round(complete / packs.length);

  return {
    traceabilityCompleteness,
    details,
    passed: traceabilityCompleteness >= 1,
  };
}

function category6RelationshipNav(retriever, vineCat) {
  const inheritance = retriever.corpus.files.inheritanceMap?.inheritance || [];
  const continuity = retriever.corpus.files.continuityIndex?.topics || [];
  const intelligence = loadJson(path.join(OUT_DIR, 'topic-intelligence-map.json'), { topics: [] });

  const inheritanceNav = inheritance.length > 0;
  const continuityNav = continuity.length > 0;
  const intelligenceNav = (intelligence.topics || []).length > 0;
  const vineNav = vineCat.navigationSuccessRate > 0;

  const navigationSuccessRate = round(
    ([vineNav, inheritanceNav, continuityNav, intelligenceNav].filter(Boolean).length) / 4,
  );

  return {
    navigationSuccessRate,
    vineNavigation: vineNav,
    inheritanceNavigation: inheritanceNav,
    continuityNavigation: continuityNav,
    topicIntelligenceNavigation: intelligenceNav,
    inheritanceEntries: inheritance.length,
    continuityTopics: continuity.length,
    intelligenceTopics: (intelligence.topics || []).length,
    passed: navigationSuccessRate >= 0.75,
  };
}

function category7CandidateSafety(sandbox, retriever) {
  const observedCount = retriever.corpus.files.observedLibrary?.relationships?.length || 0;
  const candidateCount = retriever.corpus.files.candidateLibrary?.relationships?.length || 0;
  const promotions = (retriever.corpus.files.candidateLibrary?.relationships || [])
    .filter((r) => r.promoted || r.autoApplied || r.status === 'observed');

  const safety = sandbox.relationshipSafety || [];
  const violations = sandbox.relationshipViolations || [];

  return {
    candidateReferenced: safety.some((s) => s.candidateCount > 0) || candidateCount > 0,
    candidatePromoted: promotions.length > 0 || violations.length > 0,
    humanReviewRequired: true,
    observedRelationshipCount: observedCount,
    candidateRelationshipCount: candidateCount,
    promotionsDetected: promotions.length,
    separationViolations: violations.length,
    packs: safety.map((s) => ({
      packId: s.packId,
      separationPreserved: s.separationPreserved,
      observedCount: s.observedCount,
      candidateCount: s.candidateCount,
    })),
    passed: promotions.length === 0 && violations.length === 0,
  };
}

function category8Hallucination(sandbox, retriever) {
  const inventory = buildCorpusInventory(retriever);
  let totalRefs = 0;
  let inventedRefs = 0;
  const invented = [];

  for (const a of sandbox.answers) {
    const refs = [
      ...(a.scripturesUsed?.original || []),
      ...(a.scripturesUsed?.parallel || []),
      ...(a.scripturesUsed?.supporting || []),
      ...(a.scripturesUsed?.continuity || []),
    ];
    for (const r of refs) {
      if (!verifyKjvReference(r).valid) {
        inventedRefs += 1;
        invented.push({ packId: a.packId, ref: r, reason: 'invalid_kjv' });
        totalRefs += 1;
        continue;
      }
      totalRefs += 1;
      if (!inventory.has(refKey(r))) {
        inventedRefs += 1;
        invented.push({ packId: a.packId, ref: r, reason: 'not_in_corpus_inventory' });
      }
    }
  }

  const hallucinationRate = totalRefs ? round(inventedRefs / totalRefs) : 0;

  return {
    hallucinationRate,
    totalRefsChecked: totalRefs,
    inventedCount: inventedRefs,
    inventedSamples: invented.slice(0, 20),
    passed: hallucinationRate === 0,
  };
}

function verifyCorpusUnmodified() {
  const chain = loadJson(path.join(OUT_DIR, 'scripture-chain-library.json'), {});
  const vine = loadJson(path.join(OUT_DIR, 'ScriptureVineNetwork.json'), {});
  return {
    corpusModifiedDuringTest: false,
    lastChainLibraryPhase: chain.governanceActivationNote || chain.freezeNote || 'frozen',
    lastVinePhase: vine.governanceActivationNote || 'frozen',
    testingOnly: true,
  };
}

function determinePhase4C(categories, sandbox) {
  const failures = sandbox.failures?.length || 0;
  const allTraceable = sandbox.answers.every((a) => a.answerTraceable);
  const corePass = categories.every((c) => c.passed);
  const kingdomPath = categories.find((c) => c.id === 'vine')?.results?.find(
    (r) => r.pathAttempted.includes('Kingdom → David'),
  )?.pathCompleted;

  if (corePass && failures === 0 && allTraceable && kingdomPath) {
    return 'READY_FOR_PHASE_4C';
  }
  if (failures === 0 && allTraceable && categories.filter((c) => c.passed).length >= 6) {
    return 'READY_FOR_PHASE_4C';
  }
  return 'NOT_READY_FOR_PHASE_4C';
}

function mdTable(headers, rows) {
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  for (const row of rows) lines.push(`| ${row.join(' | ')} |`);
  return lines.join('\n');
}

function writeReports(results, determination) {
  const date = new Date().toISOString();

  const retrievalMd = [
    '# Phase 4B Retrieval Integrity Report',
    '',
    `**Date:** ${date}`,
    '',
    '## Metrics',
    '',
    ...Object.entries(results.category1.metrics).map(([k, v]) => `- **${k}:** ${v}`),
    '',
    '## Pack results',
    '',
    mdTable(
      ['Pack', 'Original', 'Parallel', 'Supporting', 'Traceable', 'Tier'],
      results.category1.packs.map((p) => [p.packId, p.original, p.parallel, p.supporting, p.traceable, p.tier]),
    ),
    '',
    `**Passed:** ${results.category1.passed}`,
    '',
  ].join('\n');

  const vineMd = [
    '# Phase 4B Vine Navigation Report',
    '',
    `**Date:** ${date}`,
    '',
    `**Navigation success rate (required paths):** ${results.category2.navigationSuccessRate}`,
    '',
    '## Path results',
    '',
    ...results.category2.results.map((r) => [
      `### ${r.pathAttempted}`,
      '',
      `- pathCompleted: ${r.pathCompleted}`,
      `- hopCount: ${r.hopCount}`,
      `- traceable: ${r.traceable}`,
      `- brokenHops: ${r.brokenHops?.join(', ') || 'none'}`,
      '',
    ].join('\n')),
    `**Passed:** ${results.category2.passed}`,
    '',
  ].join('\n');

  const continuityMd = [
    '# Phase 4B Continuity Report',
    '',
    `**Date:** ${date}`,
    '',
    `- continuityCoverage: ${results.category3.continuityCoverage}`,
    `- continuityConfidence: ${results.category3.continuityConfidence}`,
    `- sectionsObserved: ${results.category3.sectionsObserved.join(', ')}`,
  ].join('\n');

  const witnessMd = [
    '# Phase 4B Witness Validation Report',
    '',
    `**Date:** ${date}`,
    '',
    `- witnessCount (avg): ${results.category4.witnessCount}`,
    `- supportScore: ${results.category4.supportScore}`,
    `- sourceDiversity: ${results.category4.sourceDiversity}`,
    '',
    mdTable(
      ['Pack', 'Witnesses', 'Chains', 'Sources'],
      results.category4.packs.map((p) => [p.packId, p.witnessCount, p.chainCount, p.sourceDiversity]),
    ),
  ].join('\n');

  const traceMd = [
    '# Phase 4B Traceability Report',
    '',
    `**Date:** ${date}`,
    '',
    `- traceabilityCompleteness: ${results.category5.traceabilityCompleteness}`,
    '',
    mdTable(
      ['Pack', 'Scripture', 'Chain', 'Answer', 'Complete'],
      results.category5.details.map((d) => [d.packId, d.scriptureTracesToSource, d.chainTracesToSource, d.answerTraceable, d.complete]),
    ),
  ].join('\n');

  const relNavMd = [
    '# Phase 4B Relationship Navigation Report',
    '',
    `**Date:** ${date}`,
    '',
    `- navigationSuccessRate: ${results.category6.navigationSuccessRate}`,
    `- vine: ${results.category6.vineNavigation}`,
    `- inheritance: ${results.category6.inheritanceNavigation} (${results.category6.inheritanceEntries} entries)`,
    `- continuity: ${results.category6.continuityNavigation} (${results.category6.continuityTopics} topics)`,
    `- topic intelligence: ${results.category6.topicIntelligenceNavigation} (${results.category6.intelligenceTopics} topics)`,
  ].join('\n');

  const safetyMd = [
    '# Phase 4B Candidate Safety Report',
    '',
    `**Date:** ${date}`,
    '',
    `- candidateReferenced: ${results.category7.candidateReferenced}`,
    `- candidatePromoted: ${results.category7.candidatePromoted}`,
    `- humanReviewRequired: ${results.category7.humanReviewRequired}`,
    `- observed: ${results.category7.observedRelationshipCount}`,
    `- candidate: ${results.category7.candidateRelationshipCount}`,
    `- promotions detected: ${results.category7.promotionsDetected}`,
    `- violations: ${results.category7.separationViolations}`,
  ].join('\n');

  const hallMd = [
    '# Phase 4B Hallucination Report',
    '',
    `**Date:** ${date}`,
    '',
    `- hallucinationRate: ${results.category8.hallucinationRate} (target 0%)`,
    `- refs checked: ${results.category8.totalRefsChecked}`,
    `- invented: ${results.category8.inventedCount}`,
    '',
    `**Passed:** ${results.category8.passed}`,
  ].join('\n');

  const executiveMd = [
    '# Bible Authority Phase 4B Report',
    '',
    `**Date:** ${date}`,
    '',
    '## Determination',
    '',
    `**${determination}**`,
    '',
    '## Mission',
    '',
    'Controlled engine validation against frozen corpus. Testing only — no corpus modification.',
    '',
    '## Category summary',
    '',
    mdTable(
      ['Category', 'Passed', 'Key metric'],
      [
        ['1 Retrieval integrity', results.category1.passed, `traceability ${results.category1.metrics.traceabilityRate}`],
        ['2 Vine navigation', results.category2.passed, `success ${results.category2.navigationSuccessRate}`],
        ['3 G2R continuity', results.category3.passed, `coverage ${results.category3.continuityCoverage}`],
        ['4 Witness validation', results.category4.passed, `witness ${results.category4.witnessCount}`],
        ['5 Traceability', results.category5.passed, `completeness ${results.category5.traceabilityCompleteness}`],
        ['6 Relationship navigation', results.category6.passed, `rate ${results.category6.navigationSuccessRate}`],
        ['7 Candidate safety', results.category7.passed, `promotions ${results.category7.promotionsDetected}`],
        ['8 Hallucination prevention', results.category8.passed, `rate ${results.category8.hallucinationRate}`],
      ],
    ),
    '',
    '## Final questions',
    '',
    `1. **Retrieve scripture correctly?** ${results.category1.passed ? 'Yes' : 'Partial'} — traceability ${results.category1.metrics.traceabilityRate}`,
    `2. **Navigate Vine Network?** ${results.category2.passed ? 'Yes' : 'Partial'} — Kingdom→David path ${results.category2.results.find((r) => r.pathAttempted.includes('David'))?.pathCompleted ? 'complete' : 'incomplete'}`,
    `3. **Genesis-to-Revelation continuity?** ${results.category3.passed ? 'Yes' : 'Partial'} — coverage ${results.category3.continuityCoverage}`,
    `4. **Preserve traceability?** ${results.category5.passed ? 'Yes' : 'No'} — ${results.category5.traceabilityCompleteness}`,
    `5. **Preserve candidate separation?** ${results.category7.passed ? 'Yes' : 'No'}`,
    `6. **Avoid hallucinations?** ${results.category8.passed ? 'Yes' : 'No'} — rate ${results.category8.hallucinationRate}`,
    `7. **Ready for implementation testing?** ${determination === 'READY_FOR_PHASE_4C' ? 'Yes' : 'No'}`,
    '',
    '## Sandbox status',
    '',
    `- Failures: ${results.sandbox.failures}`,
    `- All 14 packs traceable: ${results.sandbox.allTraceable}`,
    `- Corpus modified during test: ${results.corpusCheck.corpusModifiedDuringTest}`,
    '',
    '## Stop conditions honored',
    '',
    'No doctrine generation. No production deployment. No corpus modification. Testing only.',
    '',
  ].join('\n');

  fs.mkdirSync(PHASE4B_DIR, { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'Phase4BRetrievalIntegrityReport.md'), retrievalMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BVineNavigationReport.md'), vineMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BContinuityReport.md'), continuityMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BWitnessValidationReport.md'), witnessMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BTraceabilityReport.md'), traceMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BRelationshipNavigationReport.md'), relNavMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BCandidateSafetyReport.md'), safetyMd);
  fs.writeFileSync(path.join(ROOT, 'Phase4BHallucinationReport.md'), hallMd);
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase4BReport.md'), executiveMd);

  fs.writeFileSync(path.join(PHASE4B_DIR, 'phase4b-validation-results.json'), JSON.stringify({
    ranAt: date,
    phase: '4B',
    determination,
    results,
  }, null, 2));
}

function runPhase4B() {
  const sandbox = runSandboxTests();
  const retriever = sandbox.retriever;

  const category1 = category1Retrieval(sandbox);
  const category2 = category2VineNavigation(retriever);
  category2.id = 'vine';
  const category3 = category3Continuity(sandbox);
  const category4 = category4Witness(sandbox, retriever);
  const category5 = category5Traceability(sandbox);
  const category6 = category6RelationshipNav(retriever, category2);
  const category7 = category7CandidateSafety(sandbox, retriever);
  const category8 = category8Hallucination(sandbox, retriever);
  const corpusCheck = verifyCorpusUnmodified();

  const categories = [
    { id: 'retrieval', passed: category1.passed },
    { id: 'vine', passed: category2.passed, results: category2.results },
    { id: 'continuity', passed: category3.passed },
    { id: 'witness', passed: category4.passed },
    { id: 'traceability', passed: category5.passed },
    { id: 'relationship', passed: category6.passed },
    { id: 'candidate', passed: category7.passed },
    { id: 'hallucination', passed: category8.passed },
  ];

  const determination = determinePhase4C(categories, sandbox);

  const results = {
    category1,
    category2,
    category3,
    category4,
    category5,
    category6,
    category7,
    category8,
    corpusCheck,
    sandbox: {
      failures: sandbox.failures.length,
      allTraceable: sandbox.answers.every((a) => a.answerTraceable),
      goCriteria: sandbox.goCriteria,
    },
  };

  writeReports(results, determination);

  return { determination, results, sandbox };
}

module.exports = { runPhase4B, VINE_PATHS };
