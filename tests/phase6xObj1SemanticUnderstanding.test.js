/**
 * Phase 6X Obj1 — semantic understanding snapshot unit checks.
 */
const assert = require('assert');
const {
  isMultiPartUserQuestion,
  buildSemanticUnderstandingSnapshot,
} = require('../services/semanticUnderstandingSnapshot');

function run() {
  assert.strictEqual(
    isMultiPartUserQuestion('Two questions: What does Genesis 1:1 say, and what does John 3:16 say?'),
    true,
  );
  assert.strictEqual(isMultiPartUserQuestion('What does John 3:16 say?'), false);

  const snap = buildSemanticUnderstandingSnapshot({
    message: 'Two questions: What does Genesis 1:1 say, and what does John 3:16 say?',
    questionIntent: {
      questionType: 'definition',
      topic: null,
      requestedDepth: 'standard',
      emotionalTone: 'neutral',
      currentMessageWins: true,
    },
    currentIntent: 'scripture_question',
    understanding: { plainEnglishRestatement: 'User asked two Scripture questions.' },
  });

  assert.strictEqual(snap.mixedIntent, true);
  assert.ok(snap.primaryIntent.question);
  assert.ok(snap.secondaryIntents.length >= 1);
  assert.strictEqual(snap.latestMessagePriority, true);
  assert.ok(Array.isArray(snap.requestedEvidence));
  assert.strictEqual(snap.source, 'aggregated_existing_signals');

  const single = buildSemanticUnderstandingSnapshot({
    message: 'What does John 3:16 say?',
    questionIntent: {
      questionType: 'definition',
      requestedDepth: 'standard',
      emotionalTone: 'neutral',
      currentMessageWins: true,
      isEvidenceRequest: true,
    },
    currentIntent: 'scripture_question',
    understanding: {},
  });
  assert.strictEqual(single.mixedIntent, false);
  assert.ok(single.requestedEvidence.includes('scripture') || single.requestedEvidence.includes('auto'));

  console.log('phase6xObj1SemanticUnderstanding.test.js PASS');
}

run();
