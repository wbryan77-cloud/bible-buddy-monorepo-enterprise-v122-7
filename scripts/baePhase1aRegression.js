#!/usr/bin/env node
/**
 * BAE Phase 1A regression — claim validation happy path.
 * Requires OPENAI_API_KEY for live compose tests.
 * Output: docs/regression-trace/bae-phase1a-results.json
 */
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateClaimToScripture, matchesForbidden } = require('../services/claimToScriptureValidator');
const { validateBibleOnlyAuthority } = require('../services/bibleOnlyAuthorityValidator');
const { detectForbiddenProse } = require('../services/forbiddenProseGuard');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'bae-phase1a-results.json');

const STUDY_RE = /You've been studying|Would you like to continue studying|continue your study journey/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture/i;
const CONNECTION_RE = /trouble reaching the AI service/i;
const NIV_RE = /\bone and only\b|\bfor God so loved the world that he gave his one and only\b/i;

const TESTS = [
  { id: 'bae_01', message: 'What is the third heaven?', expectCards: ['heavens'], expectCatalog: ['threeHeavens'] },
  { id: 'bae_02', message: "What is the kingdom of God and does it come to earth?", expectCards: ['kingdom'], expectCatalog: ['kingdomComesToEarth'] },
  { id: 'bae_03', message: 'What happens when we die?', expectCards: ['deathState'], expectCatalog: ['stateOfTheDead'] },
  { id: 'bae_04', message: 'Does Acts 10 make pork clean?', expectCards: ['dietaryLaw'] },
  { id: 'bae_05', message: 'How do we keep the Sabbath holy?', expectCards: ['sabbath'] },
  { id: 'bae_06', message: 'What does Logos mean in John 1:1?', expectCards: ['messiahLogos'] },
  { id: 'bae_07', message: 'What does holy mean?', thinEvidence: true },
  { id: 'bae_08', message: 'What happens when we die — sleep in death and resurrection?', expectCards: ['deathState'], expectCatalog: ['stateOfTheDead'] },
];

function getDbg(reply) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function extractClaims(reply) {
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const results = reply.runtime?.claimValidation?.claimResults || reply.claimValidation?.claimResults;
  if (Array.isArray(results) && results.length) {
    return results.map((c) => ({
      claim: c.claim,
      type: c.type,
      supportingScriptures: c.supportingScriptures || [],
      classification: c.classification,
    }));
  }
  return [];
}

function scoreTest(test, reply, pack) {
  const violations = [];
  const text = String(reply.reply || '');
  const dbg = getDbg(reply);
  const apiFailure = dbg.buildConnectionErrorReplyUsed || dbg.finalAnswerAuthor === 'connection_error';
  const claimValidation = reply.runtime?.claimValidation || reply.claimValidation || null;
  const claims = extractClaims(reply);

  if (!process.env.OPENAI_API_KEY) {
    return { passed: false, violations: ['missing_openai_api_key'], apiFailure: true, dbg, claimValidation, claims };
  }

  if (apiFailure || CONNECTION_RE.test(text)) {
    violations.push('connection_error');
    return { passed: false, violations, apiFailure: true, dbg, claimValidation, claims };
  }

  if (!dbg.openaiCalled) violations.push('openai_not_called');
  if (dbg.finalAnswerAuthor !== 'openai' && !dbg.claimDegraded) violations.push('wrong_author');
  if (dbg.sourceGroundedResponderUsed || dbg.sabbathHistoryDeepResponderUsed) violations.push('template_speaker');
  if (dbg.studyFallbackUsed || STUDY_RE.test(text) || WITNESS_RE.test(text)) violations.push('study_loop');
  if ((dbg.openaiAttempts || 0) > 2) violations.push('excessive_openai_attempts');
  if (NIV_RE.test(text)) violations.push('niv_drift');

  const auth = validateBibleOnlyAuthority({ reply: text, evidencePack: pack, message: test.message });
  if (!auth.passed) violations.push(...auth.issues.map((i) => `bible_only:${i}`));

  const postClaim = validateClaimToScripture({
    reply: text,
    claims,
    evidencePack: pack,
    message: test.message,
  });
  if (!postClaim.passed && !dbg.claimDegraded) {
    violations.push(...postClaim.unsupportedClaims.map((c) => `unsupported:${c.slice(0, 60)}`));
    violations.push(...postClaim.contradictedClaims.map((c) => `contradicted:${c.slice(0, 60)}`));
    violations.push(...postClaim.claimResults.flatMap((c) => (c.issues || []).map((i) => `claim:${i}`)));
  }
  if (dbg.claimDegraded) {
    const stillForbidden = matchesForbidden(text);
    if (stillForbidden.length) {
      violations.push(...stillForbidden.map((f) => `degraded_still_forbidden:${f.id}`));
    }
  }

  if (test.expectCards) {
    const cardIds = (pack.evidenceCards?.cards || []).map((c) => c.cardId);
    for (const expected of test.expectCards) {
      if (!cardIds.includes(expected)) violations.push(`missing_card:${expected}`);
    }
  }
  if (test.expectCatalog) {
    for (const key of test.expectCatalog) {
      if (!(pack.approvedCatalogEvidence?.catalogKeys || []).includes(key)) {
        violations.push(`missing_catalog:${key}`);
      }
    }
  }
  if (test.thinEvidence && (pack.evidenceCards?.cards || []).length) {
    violations.push('unexpected_evidence_card');
  }
  if (test.thinEvidence && dbg.openaiCalled && !/\bscripture does not state\b/i.test(text) && !dbg.claimDegraded) {
    violations.push('thin_evidence_missing_denial');
  }

  const forbidden = detectForbiddenProse(text);
  if (forbidden.detected) violations.push('forbidden_prose');

  return {
    passed: violations.length === 0,
    violations,
    apiFailure: false,
    dbg,
    auth,
    claimValidation: postClaim,
    claims,
    claimsMade: claims.map((c) => c.claim),
    supportingScriptures: claims.flatMap((c) => c.supportingScriptures || []),
    supportClasses: claims.map((c) => c.classification).filter(Boolean),
    unsupportedClaims: postClaim.unsupportedClaims,
    contradictedClaims: postClaim.contradictedClaims,
    openaiCalled: dbg.openaiCalled,
    finalAnswerAuthor: dbg.finalAnswerAuthor,
  };
}

async function main() {
  const memStart = snapshotMemory();
  const results = [];

  for (const test of TESTS) {
    const uid = `bae-phase1a-${test.id}`;
    clearActiveConversation(uid);
    const memBefore = snapshotMemory();
    const pack = buildRetrievalEvidencePack({ userId: uid, message: test.message, routingHintsOnly: true });
    const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', test.message);
    const memAfter = snapshotMemory();
    const scored = scoreTest(test, reply, pack);

    results.push({
      question: test.message,
      ...test,
      ...scored,
      retrievedEvidence: {
        cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
        catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
        scriptureRefs: (pack.scripture?.references || []).map((r) => r.reference || r),
        effectiveTopic: pack.effectiveTopic,
        bindingRuleCount: (pack.evidenceCards?.cards || []).reduce(
          (n, c) => n + (c.bindingRules?.length || 0),
          0
        ),
        evidencePackBytes: Buffer.byteLength(JSON.stringify(pack), 'utf8'),
      },
      validatorResult: scored.claimValidation?.validatorResult,
      finalAnswer: String(reply.reply || '').slice(0, 800),
      claimDegraded: reply.runtime?.claimDegraded || getDbg(reply).claimDegraded,
      doctrineTraceId: reply.runtime?.doctrineTraceId,
      memoryBefore: memBefore,
      memoryAfter: memAfter,
      memoryDeltaMB: memAfter.rssMB - memBefore.rssMB,
      openaiAttempts: scored.dbg?.openaiAttempts,
      regenerated: scored.dbg?.regenerated,
    });
  }

  const memEnd = snapshotMemory();
  const passCount = results.filter((r) => r.passed).length;
  const report = {
    ranAt: new Date().toISOString(),
    phase: '1a',
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    memory: { startRssMB: memStart.rssMB, endRssMB: memEnd.rssMB, deltaMB: memEnd.rssMB - memStart.rssMB },
    tests: results,
    summary: {
      passed: passCount,
      total: results.length,
      allPass: passCount === results.length,
      connectionErrors: results.filter((r) => r.violations?.includes('connection_error')).length,
      claimDegradedCount: results.filter((r) => r.claimDegraded).length,
      maxOpenaiAttempts: Math.max(...results.map((r) => r.openaiAttempts || 0), 0),
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
