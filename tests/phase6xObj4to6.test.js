/**
 * Phase 6X Obj4–6 local regressions.
 */
const assert = require('assert');
const { isUnknownBiblePhraseAsk } = require('../services/bibleReasoningEngine');
const { classifyCurrentMessageIntent, INTENTS } = require('../services/currentMessageIntent');
const { buildTruthClassificationGuidance, TRUTH_CATEGORIES } = require('../services/truthClassificationGuidance');
const { scoreCompanionQuality } = require('../services/runtimeOrchestrator');
const { polishCompanionReply } = require('../services/companionReplyPolish');

function run() {
  // Obj6 — clarification must not claim ordinary facts
  assert.strictEqual(isUnknownBiblePhraseAsk('What is the capital of France?'), false);
  assert.strictEqual(isUnknownBiblePhraseAsk('What is photosynthesis?'), false);
  assert.strictEqual(isUnknownBiblePhraseAsk('What does the Bible say about the Zephyrian covenant?'), true);
  assert.strictEqual(isUnknownBiblePhraseAsk('What is the Zephyrian scroll?'), true);
  assert.strictEqual(isUnknownBiblePhraseAsk('What does Scripture say about the Sabbath?'), true);

  assert.strictEqual(
    classifyCurrentMessageIntent('What is the capital of France?').intent,
    INTENTS.GENERAL_FACTUAL,
  );
  assert.strictEqual(
    classifyCurrentMessageIntent('What is photosynthesis?').intent,
    INTENTS.GENERAL_FACTUAL,
  );
  assert.strictEqual(
    classifyCurrentMessageIntent('What is the Sabbath according to Scripture?').intent,
    INTENTS.DEFINITION,
  );

  // Obj4
  assert.ok(TRUTH_CATEGORIES.includes('Explicit Scripture'));
  assert.ok(TRUTH_CATEGORIES.includes('Historical Context'));
  const g = buildTruthClassificationGuidance({ currentIntent: 'general_factual', historyIncluded: true });
  assert.ok(/Historical Context/i.test(g));
  assert.ok(/never merge/i.test(g) || /Do not blend/i.test(g));

  // Obj5 polish
  const polished = polishCompanionReply("That's a thoughtful question. Paris is the capital. As an AI I cannot.");
  assert.ok(!/thoughtful question/i.test(polished));
  assert.ok(!/As an AI/i.test(polished));

  // Obj8 quality dimensions
  const q = scoreCompanionQuality({
    message: 'What is the capital of France?',
    reply: 'I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?',
  });
  assert.ok(q.dimensions);
  assert.ok(q.issues.includes('factual_question_clarifier'));
  assert.ok(q.score < 90);

  const good = scoreCompanionQuality({
    message: 'What is the capital of France?',
    reply: 'Paris is the capital of France.',
  });
  assert.ok(good.passed);

  console.log('phase6xObj4to6.test.js PASS');
}

run();
