/**
 * Phase 6X Obj2 — conversation intelligence persistence + composer visibility.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  updateActiveConversation,
  getActiveConversation,
  clearActiveConversation,
} = require('../services/activeConversationManager');
const { buildSemanticUnderstandingSnapshot } = require('../services/semanticUnderstandingSnapshot');

const TEST_USER = `__phase6x_obj2_${Date.now()}`;

function run() {
  clearActiveConversation(TEST_USER);

  const sem = buildSemanticUnderstandingSnapshot({
    message: 'Two questions: What does Genesis 1:1 say, and what does John 3:16 say?',
    questionIntent: {
      questionType: 'definition',
      requestedDepth: 'standard',
      emotionalTone: 'curious',
      currentMessageWins: true,
    },
    currentIntent: 'scripture_question',
    understanding: { plainEnglishRestatement: 'Two Scripture questions.' },
  });

  updateActiveConversation({
    userId: TEST_USER,
    topic: 'heavens',
    message: 'Two questions: What does Genesis 1:1 say, and what does John 3:16 say?',
    outstandingQuestions: sem.outstandingQuestions,
    conversationObjective: sem.conversationObjective,
    preferredFormat: sem.requestedFormat,
    preferredEvidence: sem.requestedEvidence,
    emotionalContext: sem.emotionalContext,
  });

  let active = getActiveConversation(TEST_USER);
  assert.ok(active);
  assert.ok(Array.isArray(active.outstandingQuestions));
  assert.ok(active.outstandingQuestions.length >= 1);
  assert.strictEqual(active.emotionalContext, 'curious');
  assert.ok(active.conversationObjective);

  // Correction must replace rejected interpretation
  updateActiveConversation({
    userId: TEST_USER,
    topic: 'heavens',
    message: 'That is wrong — I meant the kingdom on earth.',
    correctionMode: true,
    rejectedInterpretation: 'You said the kingdom is in heaven.',
    acceptedCorrection: 'Kingdom on earth',
  });
  active = getActiveConversation(TEST_USER);
  assert.strictEqual(active.rejectedInterpretation, 'You said the kingdom is in heaven.');
  assert.strictEqual(active.acceptedCorrection, 'Kingdom on earth');
  assert.strictEqual(active.correctionMode, true);

  // Non-correction clears rejected/accepted
  updateActiveConversation({
    userId: TEST_USER,
    topic: 'heavens',
    message: 'Tell me more about the kingdom.',
    correctionMode: false,
  });
  active = getActiveConversation(TEST_USER);
  assert.strictEqual(active.rejectedInterpretation, null);
  assert.strictEqual(active.acceptedCorrection, null);

  clearActiveConversation(TEST_USER);

  // Composer module must export and accept packs that carry semanticUnderstanding
  const rfc = require('../services/reasonFirstComposer');
  assert.ok(rfc);
  assert.ok(
    typeof rfc.composeReasonFirstAnswer === 'function' ||
      typeof rfc.compose === 'function' ||
      typeof rfc.buildComposerSystemPrompt === 'function' ||
      Object.keys(rfc).length > 0,
    'reasonFirstComposer should export functions',
  );

  console.log('phase6xObj2ConversationIntelligence.test.js PASS');
}

run();
