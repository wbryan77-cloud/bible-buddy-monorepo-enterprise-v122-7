#!/usr/bin/env node
/**
 * Bible-only authority happy-path regression — requires OPENAI_API_KEY.
 * Output: docs/regression-trace/bible-only-authority-results.json
 */
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { validateBibleOnlyAuthority } = require('../services/bibleOnlyAuthorityValidator');
const { detectForbiddenProse } = require('../services/forbiddenProseGuard');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'bible-only-authority-results.json');

const STUDY_RE = /You've been studying|Would you like to continue studying|continue your study journey/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture/i;
const MASK_RE = /I'm here with you\. Tell me a little more\./i;
const CONNECTION_RE = /trouble reaching the AI service/i;

const TESTS = [
  { id: 'bo_01', message: 'What is the third heaven?', expectCards: ['heavens'], expectCatalog: ['threeHeavens'] },
  { id: 'bo_02', message: 'Does the Bible say believers go to the third heaven?', expectCards: ['heavens'], forbidThirdHeavenDest: true },
  { id: 'bo_03', message: 'Where does Jesus say no man has ascended to heaven?', expectCards: ['heavens'], mustMention: ['john 3:13'] },
  { id: 'bo_04', message: 'Jesus said where I go ye cannot come. What does that mean?', expectCards: ['kingdom'], mustMention: ['john'] },
  { id: 'bo_05', message: 'What does Thy Kingdom Come mean?', expectCards: ['kingdom'], mustMention: ['matthew 6'] },
  { id: 'bo_06', message: "Does Revelation teach that God's kingdom comes to earth?", expectCards: ['kingdom'], mustMention: ['revelation'] },
  {
    id: 'bo_07',
    message: 'Are believers going to heaven or is the kingdom coming to earth?',
    expectCards: ['heavens', 'kingdom'],
    forbidThirdHeavenDest: true,
  },
  { id: 'bo_08', message: 'Explain heaven line upon line from Scripture only.', expectCards: ['heavens'], bibleOnly: true },
  { id: 'bo_09', message: 'Give me Bible only. No traditions.', expectCards: ['heavens'], bibleOnly: true },
  { id: 'bo_10', message: 'What does Logos mean in John 1:1?', expectCards: ['messiahLogos'], companionOk: true },
  {
    id: 'bo_11',
    message: 'Today has been a rough day. I had to let go of someone I love.',
    companionOk: true,
    forbidDoctrineDump: false,
  },
  {
    id: 'bo_12',
    message: "My mother has Alzheimer's and I feel overwhelmed.",
    companionOk: true,
  },
];

function getDbg(reply) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function scoreTest(test, reply, pack) {
  const violations = [];
  const text = String(reply.reply || '').toLowerCase();
  const dbg = getDbg(reply);
  const apiFailure = dbg.buildConnectionErrorReplyUsed || dbg.finalAnswerAuthor === 'connection_error';

  if (!process.env.OPENAI_API_KEY) {
    return { passed: false, violations: ['missing_openai_api_key'], apiFailure: true, dbg };
  }

  if (apiFailure || CONNECTION_RE.test(reply.reply || '')) {
    violations.push('connection_error');
    return { passed: false, violations, apiFailure: true, dbg };
  }

  if (!dbg.openaiCalled) violations.push('openai_not_called');
  if (dbg.finalAnswerAuthor !== 'openai') violations.push('wrong_author');
  if (dbg.sourceGroundedResponderUsed || dbg.sabbathHistoryDeepResponderUsed) violations.push('template_speaker');
  if (dbg.studyFallbackUsed || STUDY_RE.test(text) || WITNESS_RE.test(text)) violations.push('study_loop');
  if (MASK_RE.test(reply.reply || '')) violations.push('client_mask_phrase');
  if ((dbg.openaiAttempts || 0) > 2) violations.push('excessive_openai_attempts');

  const auth = validateBibleOnlyAuthority({ reply: reply.reply, evidencePack: pack, message: test.message });
  if (!auth.passed) violations.push(...auth.issues.map((i) => `bible_only:${i}`));

  if (test.forbidThirdHeavenDest && auth.adminFindings?.thirdHeavenAffirmative?.length) {
    violations.push('third_heaven_destination');
  }
  if (auth.adminFindings?.corinthians58Standalone?.length) violations.push('corinthians_5_8_standalone');

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
  if (test.bibleOnly && !pack.bibleOnlyMode) violations.push('bible_only_mode_not_set');
  if (test.mustMention) {
    for (const phrase of test.mustMention) {
      if (!text.includes(phrase)) violations.push(`missing_mention:${phrase}`);
    }
  }
  if (!test.companionOk && !auth.evidenceUsed && pack.evidenceCards?.cards?.length) {
    violations.push('evidence_not_cited');
  }

  return { passed: violations.length === 0, violations, apiFailure: false, dbg, auth };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required for happy-path validation');
  }

  const memStart = snapshotMemory();
  const results = [];

  for (const test of TESTS) {
    const uid = `bible-only-${test.id}`;
    clearActiveConversation(uid);
    const memBefore = snapshotMemory();
    const pack = buildRetrievalEvidencePack({ userId: uid, message: test.message, routingHintsOnly: true });
    const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', test.message);
    const memAfter = snapshotMemory();
    const scored = scoreTest(test, reply, pack);

    results.push({
      ...test,
      ...scored,
      catalogWired: pack.approvedCatalogEvidence?.wired,
      catalogKeys: pack.approvedCatalogEvidence?.catalogKeys,
      cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
      bibleOnlyMode: pack.bibleOnlyMode,
      replyPreview: String(reply.reply || '').slice(0, 400),
      memoryDeltaMB: memAfter.rssMB - memBefore.rssMB,
      rssMB: memAfter.rssMB,
      openaiAttempts: scored.dbg?.openaiAttempts,
    });
  }

  const memEnd = snapshotMemory();
  const passCount = results.filter((r) => r.passed).length;
  const report = {
    ranAt: new Date().toISOString(),
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    memory: { startRssMB: memStart.rssMB, endRssMB: memEnd.rssMB, deltaMB: memEnd.rssMB - memStart.rssMB },
    tests: results,
    summary: {
      passed: passCount,
      total: results.length,
      allPass: passCount === results.length,
      connectionErrors: results.filter((r) => r.violations?.includes('connection_error')).length,
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
