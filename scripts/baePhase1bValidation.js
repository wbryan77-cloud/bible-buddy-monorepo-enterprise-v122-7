#!/usr/bin/env node
/**
 * BAE Phase 1B — full traceability validation.
 * Requires OPENAI_API_KEY for live compose tests.
 * Output: docs/regression-trace/bae-phase1b-results.json
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateClaimToScripture, matchesForbidden } = require('../services/claimToScriptureValidator');
const { buildClaimTraceabilityMatrix } = require('../services/claimTraceabilityMatrix');
const { validateBibleOnlyAuthority } = require('../services/bibleOnlyAuthorityValidator');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'bae-phase1b-results.json');

const DOCTRINE_TESTS = [
  { id: 'pork', message: 'Can I eat pork?', expectCards: ['dietaryLaw'] },
  { id: 'acts10', message: 'Does Acts 10 make pork clean?', expectCards: ['dietaryLaw'] },
  { id: 'third_heaven', message: 'What is the third heaven?', expectCards: ['heavens'], expectCatalog: ['threeHeavens'] },
  { id: 'kingdom', message: 'What is the kingdom of God?', expectCards: ['kingdom'], expectCatalog: ['kingdomComesToEarth'] },
  { id: 'death', message: 'What happens when we die?', expectCards: ['deathState'], expectCatalog: ['stateOfTheDead'] },
  { id: 'resurrection', message: 'What does Scripture teach about resurrection?', expectCards: ['deathState'] },
  { id: 'sabbath', message: 'How do we keep the Sabbath holy?', expectCards: ['sabbath'] },
  { id: 'holy_days', message: 'What feasts does Scripture command?', expectCards: ['feasts'] },
  { id: 'logos', message: 'What does Logos mean in John 1:1?', expectCards: ['messiahLogos'] },
  { id: 'holy', message: 'What does holy mean?', thinEvidence: true },
  { id: 'no_ascended', message: 'Where does the Bible say no man has ascended to heaven?', expectCards: ['heavens'] },
  { id: 'cannot_come', message: 'What did Jesus mean where I go ye cannot come?', expectCards: ['kingdom'] },
];

function getDbg(reply) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function extractClaims(reply) {
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const results = reply.runtime?.claimValidation?.claimResults;
  if (Array.isArray(results) && results.length) return results;
  return [];
}

function scoreLive(test, reply, pack) {
  const violations = [];
  const text = String(reply.reply || '');
  const dbg = getDbg(reply);
  const claims = extractClaims(reply);

  if (!process.env.OPENAI_API_KEY) {
    return { passed: false, violations: ['missing_openai_api_key'], claims, dbg };
  }
  if (dbg.buildConnectionErrorReplyUsed || dbg.finalAnswerAuthor === 'connection_error') {
    return { passed: false, violations: ['connection_error'], claims, dbg };
  }
  if (!dbg.openaiCalled) violations.push('openai_not_called');
  if ((dbg.openaiAttempts || 0) > 2) violations.push('excessive_openai_attempts');

  const postClaim = validateClaimToScripture({ reply: text, claims, evidencePack: pack, message: test.message });
  if (!postClaim.passed && !dbg.claimDegraded) {
    violations.push(...postClaim.unsupportedClaims.map((c) => `unsupported:${c.slice(0, 50)}`));
    violations.push(...postClaim.contradictedClaims.map((c) => `contradicted:${c.slice(0, 50)}`));
  }
  if (dbg.claimDegraded && matchesForbidden(text).length) {
    violations.push('degraded_still_forbidden');
  }

  const auth = validateBibleOnlyAuthority({ reply: text, evidencePack: pack, message: test.message });
  if (!auth.passed) violations.push(...auth.issues.map((i) => `bible_only:${i}`));

  if (test.expectCards) {
    const cardIds = (pack.evidenceCards?.cards || []).map((c) => c.cardId);
    for (const c of test.expectCards) {
      if (!cardIds.includes(c)) violations.push(`missing_card:${c}`);
    }
  }
  if (test.thinEvidence && (pack.evidenceCards?.cards || []).length) {
    violations.push('unexpected_evidence_card');
  }

  const matrix = buildClaimTraceabilityMatrix({
    question: test.message,
    claims,
    claimResults: postClaim.claimResults,
    retrievedEvidence: {
      cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
      scriptureRefs: (pack.scripture?.references || []).map((r) => r.reference || r),
      effectiveTopic: pack.effectiveTopic,
    },
    validation: postClaim,
  });

  return {
    passed: violations.length === 0,
    violations,
    claims,
    claimsMade: claims.map((c) => c.claim),
    supportingScriptures: claims.flatMap((c) => c.supportingScriptures || []),
    supportClasses: postClaim.claimResults.map((c) => c.classification),
    unsupportedClaims: postClaim.unsupportedClaims,
    contradictedClaims: postClaim.contradictedClaims,
    validatorResult: postClaim.validatorResult,
    claimTraceabilityMatrix: matrix,
    openaiCalled: dbg.openaiCalled,
    finalAnswerAuthor: dbg.finalAnswerAuthor,
    dbg,
  };
}

async function main() {
  let fixtureResult = { allPass: false };
  try {
    const out = execSync('node scripts/baeClaimValidatorFixtures.js', { encoding: 'utf8' });
    const match = out.match(/\{.*\}/s);
    fixtureResult = match ? JSON.parse(match[0]) : { allPass: false };
  } catch (e) {
    fixtureResult = { allPass: false, error: String(e.message || e) };
  }

  const memStart = snapshotMemory();
  const rssSamples = [memStart.rssMB];
  const liveResults = [];

  for (const test of DOCTRINE_TESTS) {
    const uid = `bae-1b-${test.id}`;
    clearActiveConversation(uid);
    const memBefore = snapshotMemory();
    const pack = buildRetrievalEvidencePack({ userId: uid, message: test.message, routingHintsOnly: true });
    const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', test.message);
    const memAfter = snapshotMemory();
    rssSamples.push(memAfter.rssMB);
    const scored = scoreLive(test, reply, pack);

    liveResults.push({
      question: test.message,
      id: test.id,
      retrievedEvidence: {
        cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
        catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
        scriptureRefs: (pack.scripture?.references || []).map((r) => r.reference || r),
        effectiveTopic: pack.effectiveTopic,
        bindingRuleCount: (pack.evidenceCards?.cards || []).reduce((n, c) => n + (c.bindingRules?.length || 0), 0),
      },
      claimsMade: scored.claimsMade,
      supportingScriptures: scored.supportingScriptures,
      supportClass: scored.supportClasses,
      unsupportedClaims: scored.unsupportedClaims,
      contradictedClaims: scored.contradictedClaims,
      validatorResult: scored.validatorResult,
      finalAnswer: String(reply.reply || '').slice(0, 800),
      openaiCalled: scored.openaiCalled,
      finalAnswerAuthor: scored.finalAnswerAuthor,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      claimTraceabilityMatrix: scored.claimTraceabilityMatrix,
      passed: scored.passed,
      violations: scored.violations,
      claimDegraded: reply.runtime?.claimDegraded || getDbg(reply).claimDegraded,
      openaiAttempts: scored.dbg?.openaiAttempts,
      regenerated: scored.dbg?.regenerated,
    });
  }

  const memEnd = snapshotMemory();
  rssSamples.push(memEnd.rssMB);

  const livePass = liveResults.filter((r) => r.passed).length;
  const report = {
    ranAt: new Date().toISOString(),
    phase: '1b',
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    fixtureValidation: fixtureResult,
    memory: {
      startRssMB: memStart.rssMB,
      endRssMB: memEnd.rssMB,
      peakRssMB: Math.max(...rssSamples),
      avgRssMB: Math.round(rssSamples.reduce((a, b) => a + b, 0) / rssSamples.length),
      deltaMB: memEnd.rssMB - memStart.rssMB,
    },
    stability: {
      maxOpenaiAttempts: Math.max(...liveResults.map((r) => r.openaiAttempts || 0), 0),
      regenCount: liveResults.filter((r) => r.regenerated).length,
      claimDegradedCount: liveResults.filter((r) => r.claimDegraded).length,
      baeTraceDefault: process.env.BAE_TRACE !== '1',
      buddyDebugOff: process.env.BUDDY_DEBUG !== '1',
    },
    liveTests: liveResults,
    summary: {
      fixtureAllPass: !!fixtureResult.allPass,
      livePassed: livePass,
      liveTotal: liveResults.length,
      allPass: !!fixtureResult.allPass && livePass === liveResults.length && !!process.env.OPENAI_API_KEY,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));

  if (!process.env.OPENAI_API_KEY) process.exit(2);
  process.exit(report.summary.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
