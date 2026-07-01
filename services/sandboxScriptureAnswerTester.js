/**
 * Phase 4A — Sandbox scripture answer tester.
 * Runs test question set, scoring, vine navigation, and failure analysis.
 */

const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { SandboxBibleAuthorityRetriever, ensureSandboxManifests } = require('./sandboxBibleAuthorityRetriever');
const { SandboxBibleAuthorityEngine } = require('./sandboxBibleAuthorityEngine');

const TEST_PACKS = [
  { label: 'Sabbath', packId: 'sabbath', question: 'What Scriptures in the recovered corpus address the Sabbath?' },
  { label: 'Dietary Law', packId: 'dietary_law', question: 'What Scriptures support traceability for dietary law?' },
  { label: 'Death State', packId: 'death_state', question: 'What Scriptures address the death state in the frozen corpus?' },
  { label: 'Jesus OT/NT', packId: 'messiah_logos', question: 'What Scriptures connect Messiah across Old and New Testaments?' },
  { label: 'Holy Spirit', packId: 'holy_spirit', question: 'What Scriptures are traced for the Holy Spirit pack?' },
  { label: 'Kingdom of God', packId: 'kingdom_of_god', question: 'What Scriptures support Kingdom of God traceability?' },
  { label: 'Feasts / High Sabbaths', packId: 'feasts', question: 'What Scriptures are linked to feasts and high Sabbaths?' },
  { label: '144000', packId: 'one_hundred_forty_four_thousand', question: 'What Scriptures support 144000 traceability candidates?' },
  { label: 'Peter / Paul Alignment', packId: 'peter_paul_alignment', question: 'What Scriptures support Peter-Paul alignment traceability?' },
  { label: 'Jacob / Israel / Twelve Tribes', packId: 'jacob_israel_twelve_tribes', question: 'What Scriptures trace Jacob, Israel, and the twelve tribes?' },
  { label: 'Millennial Kingdom', packId: 'millennial_kingdom_kingdom_on_earth', question: 'What Scriptures support millennial kingdom traceability?' },
  { label: 'Book of Life', packId: 'book_of_life', question: 'What Scriptures are in the Book of Life pack inventory?' },
  { label: 'Word of God', packId: 'word_of_god', question: 'What Scriptures trace the Word of God pack?' },
  { label: 'Spirit of God', packId: 'spirit_of_god', question: 'What Scriptures trace Spirit of God in the corpus?' },
];

const VINE_NAVIGATION_PATHS = [
  {
    name: 'Abraham → Isaac → Jacob → Israel → Twelve Tribes → Kingdom → New Jerusalem → 144000',
    topics: ['abraham', 'isaac', 'jacob', 'israel', 'jacob_israel_twelve_tribes', 'kingdom_of_god', 'new_jerusalem', 'one_hundred_forty_four_thousand'],
  },
  {
    name: 'Peter → Pentecost → Cornelius → Gentiles → Paul',
    topics: ['peter', 'pentecost', 'cornelius', 'gentiles', 'paul'],
  },
  {
    name: 'Kingdom → David → Messiah → Resurrection → Millennium → New Jerusalem',
    topics: ['kingdom_of_god', 'david', 'messiah_logos', 'resurrection', 'millennial_kingdom_kingdom_on_earth', 'new_jerusalem'],
  },
];

function scoreAnswer(answer) {
  const orig = answer.scripturesUsed.original || [];
  const parallel = answer.scripturesUsed.parallel || [];
  const supporting = answer.scripturesUsed.supporting || [];
  const continuity = answer.scripturesUsed.continuity || [];
  const g2r = answer.scripturesUsed.genesisToRevelation || [];
  const sections = answer.scripturesUsed.sectionsPresent || [];

  const allRefs = [...orig, ...parallel, ...supporting, ...continuity, ...g2r];
  const validCount = allRefs.filter((r) => verifyKjvReference(r).valid).length;
  const scriptureAccuracy = allRefs.length ? validCount / allRefs.length : 0;

  const traceability = answer.answerTraceable ? 1 : (answer.sourceTraceability.length ? 0.5 : 0);
  const g2rSupport = sections.length >= 4 ? 1 : sections.length >= 2 ? 0.6 : g2r.length >= 3 ? 0.5 : 0.2;
  const parallelSupport = parallel.length >= 2 ? 1 : parallel.length ? 0.5 : 0;
  const supportingSupport = supporting.length >= 2 ? 1 : supporting.length ? 0.5 : 0;
  const continuitySupport = continuity.length >= 2 ? 1 : continuity.length ? 0.5 : 0;
  const clarity = answer.summaryText && answer.summaryText.length > 40 ? 1 : 0.3;
  const unsupportedClaimRisk = answer.unsupportedClaimRisk === 'low' ? 1 : answer.unsupportedClaimRisk === 'medium' ? 0.5 : 0;

  const overall = (scriptureAccuracy + traceability + g2rSupport + parallelSupport + supportingSupport + continuitySupport + clarity + unsupportedClaimRisk) / 8;

  return {
    scriptureAccuracy: Math.round(scriptureAccuracy * 1000) / 1000,
    traceability,
    genesisToRevelationSupport: Math.round(g2rSupport * 1000) / 1000,
    parallelScriptureSupport: Math.round(parallelSupport * 1000) / 1000,
    supportingScriptureSupport: Math.round(supportingSupport * 1000) / 1000,
    continuitySupport: Math.round(continuitySupport * 1000) / 1000,
    clarity,
    unsupportedClaimRiskScore: Math.round(unsupportedClaimRisk * 1000) / 1000,
    unsupportedClaimRisk: answer.unsupportedClaimRisk,
    overallScore: Math.round(overall * 1000) / 1000,
    passed: overall >= 0.55 && answer.answerTraceable,
  };
}

function detectFailures(answer, scores) {
  const failures = [];
  const hasPrimary = answer.scripturesUsed.original?.length > 0;
  const hasSupporting = answer.scripturesUsed.supporting?.length >= 3;
  if (!hasPrimary && !hasSupporting) failures.push({ type: 'missing_scripture', detail: 'No original or supporting scripture inventory retrieved' });
  if (!answer.chainTraceability?.length && !hasPrimary) failures.push({ type: 'weak_chain', detail: 'No scripture chain and no primary scriptures' });
  if (!answer.answerTraceable) failures.push({ type: 'weak_traceability', detail: 'Answer not fully traceable to corpus sources' });
  if (answer.unsupportedClaimRisk === 'high') failures.push({ type: 'unsupported_claim', detail: 'High unsupported claim risk or empty retrieval' });
  if (answer.candidateUsedAsDoctrine) failures.push({ type: 'relationship_confusion', detail: 'Candidate relationship used as doctrine' });
  if (!scores.passed) failures.push({ type: 'retrieval_failure', detail: `Overall score ${scores.overallScore} below threshold` });
  return failures;
}

function runSandboxTests() {
  ensureSandboxManifests();
  const retriever = new SandboxBibleAuthorityRetriever();
  const engine = new SandboxBibleAuthorityEngine(retriever);

  const testQuestionSet = {
    ranAt: new Date().toISOString(),
    phase: '4A',
    sandboxOnly: true,
    questions: TEST_PACKS,
  };

  const answers = [];
  const qualityScores = [];
  const failures = [];
  const relationshipSafety = [];

  for (const test of TEST_PACKS) {
    const answer = engine.buildTraceableAnswer(test.question, test.packId);
    const scores = scoreAnswer(answer);
    const testFailures = detectFailures(answer, scores);

    answers.push({
      question: test.question,
      packId: test.packId,
      label: test.label,
      traceabilityTier: answer.traceabilityTier,
      scripturesUsed: answer.scripturesUsed,
      sourceTraceability: answer.sourceTraceability,
      chainTraceability: answer.chainTraceability,
      relationshipTraceability: answer.relationshipTraceability,
      answerTraceable: answer.answerTraceable,
    });

    qualityScores.push({ label: test.label, packId: test.packId, question: test.question, ...scores });
    if (testFailures.length) {
      failures.push({ label: test.label, packId: test.packId, question: test.question, failures: testFailures, answer });
    }

    relationshipSafety.push(engine.testRelationshipSafety(test.packId));
  }

  const vineResults = VINE_NAVIGATION_PATHS.map((path) => ({
    name: path.name,
    result: retriever.navigateVinePath(path.topics),
  }));

  const relationshipViolations = relationshipSafety.filter((r) => !r.separationPreserved);

  const corpusLoaded = retriever.corpus.loaded;
  const retrievalWorked = answers.filter((a) => a.scripturesUsed.original?.length > 0).length;
  const traceableCount = answers.filter((a) => a.answerTraceable).length;
  const vineNavWorked = vineResults.filter((v) => v.result.fullyNavigable).length;
  const separationHeld = relationshipViolations.length === 0;

  const goCriteria = {
    corpusLoaded,
    scriptureRetrieval: retrievalWorked >= 10,
    genesisToRevelationNavigation: answers.filter((a) => (a.scripturesUsed.sectionsPresent || []).length >= 2).length >= 10,
    vineNavigation: vineNavWorked >= 2,
    observedCandidateSeparation: separationHeld,
    answersTraceable: traceableCount >= 13,
    failureRateAcceptable: failures.length <= 3,
  };

  const passedCriteria = Object.values(goCriteria).filter(Boolean).length;
  const totalCriteria = Object.keys(goCriteria).length;
  const readyForPhase4B = passedCriteria >= totalCriteria - 1;

  return {
    testQuestionSet,
    answers,
    qualityScores,
    failures,
    relationshipSafety,
    vineResults,
    relationshipViolations,
    goCriteria,
    passedCriteria,
    totalCriteria,
    readyForPhase4B,
    determination: readyForPhase4B ? 'READY_FOR_PHASE_4B' : 'NOT_READY',
    retriever,
    engine,
  };
}

module.exports = {
  runSandboxTests,
  TEST_PACKS,
  VINE_NAVIGATION_PATHS,
  scoreAnswer,
};
