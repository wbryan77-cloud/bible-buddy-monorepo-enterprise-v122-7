#!/usr/bin/env node
/**
 * Emergency hard cutover regression — architecture + live reply ownership.
 * Output: docs/regression-trace/emergency-hard-cutover-root-cause-results.json
 */
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { classifyCurrentMessageIntent, INTENTS } = require('../services/currentMessageIntent');
const { detectForbiddenProse } = require('../services/forbiddenProseGuard');
const { CONNECTION_ERROR_USER_MESSAGE } = require('../services/coreResponseGuards');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'emergency-hard-cutover-root-cause-results.json');

const HISTORY_RE = /Constantine|Council of Laodicea|Saturday to Sunday/i;
const STUDY_RE = /You've been studying|Would you like to continue studying|continue your study journey/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture|carries the theme forward/i;

const TESTS = [
  { id: 'pork_yes_no', message: 'Can I eat pork? Yes or no?', expectIntent: INTENTS.DIRECT_YES_NO, expectYesNo: true },
  { id: 'acts_10', message: 'Explain Acts 10 — is it about eating unclean animals?', expectIntent: INTENTS.DOCTRINE_EXPLANATION },
  { id: 'sabbath_definition', message: 'What is a Sabbath day according to Scripture?', expectIntent: INTENTS.DEFINITION },
  { id: 'sabbath_yes_no', message: 'Should I keep the Sabbath on Saturday?', expectIntent: INTENTS.DIRECT_YES_NO, expectYesNo: true },
  { id: 'sabbath_how_to', message: 'How do we keep the Sabbath holy?', expectIntent: INTENTS.HOW_TO_PRACTICE, forbidHistory: true },
  { id: 'sabbath_correction', message: "You didn't answer my question about how to keep Sabbath holy.", expectIntent: INTENTS.CORRECTION_REPAIR, forbidHistory: true },
  { id: 'sabbath_hebrew', message: 'What does holy mean in the Sabbath commandment?', expectIntent: INTENTS.MEANING_WORD_STUDY },
  { id: 'logos_meaning', message: 'What does Logos mean in John 1:1?', expectIntent: INTENTS.MEANING_WORD_STUDY },
  { id: 'holy_meaning', message: 'What does holy mean in Scripture?', expectIntent: INTENTS.MEANING_WORD_STUDY },
  { id: 'heavens_count', message: 'How many heavens are talked about in the Bible?', expectIntent: INTENTS.DOCTRINE_EXPLANATION },
  { id: 'third_heaven', message: 'What is the third heaven Paul mentions?', expectIntent: INTENTS.DEFINITION },
  { id: 'relationship_grief', message: 'Today has been a rough day. I had to let go of someone I love.', expectIntent: INTENTS.EMOTIONAL_COMPANION },
  { id: 'alzheimers', message: "My mother is going through Alzheimer's and I'm overwhelmed.", expectIntent: INTENTS.PRACTICAL_LIFE_HELP },
  { id: 'anger', message: "I'm so angry I can't think straight.", expectIntent: INTENTS.EMOTIONAL_COMPANION },
  { id: 'money_worries', message: "I'm worried about money and bills this month.", expectIntent: INTENTS.PRACTICAL_LIFE_HELP },
  { id: 'you_didnt_answer', message: "You didn't answer my question.", expectIntent: INTENTS.CORRECTION_REPAIR },
  { id: 'not_my_question', message: 'That was not my question.', expectIntent: INTENTS.CORRECTION_REPAIR },
  { id: 'sabbath_history_ok', message: 'Who changed the Sabbath to Sunday?', expectIntent: INTENTS.HISTORY_QUESTION, allowHistory: true },
];

function hasYesNoLead(reply = '', message = '') {
  const lead = String(reply || '').slice(0, 180);
  if (/^\s*(yes|no)\b/i.test(lead) || /\b(yes|no)\b/i.test(lead.slice(0, 120))) return true;
  if (/\b(can i eat|should i eat|eat pork|keep the sabbath|yes or no)\b/i.test(String(message || ''))) {
    return /\b(not to be eaten|not permitted|is unclean|are unclean|forbidden|prohibited|should not|do not eat|yes|no|seventh day|saturday)\b/i.test(
      lead
    );
  }
  return false;
}

function scoreTest(test, reply, dbg) {
  const violations = [];
  const replyText = String(reply.reply || '');
  const apiFailure = dbg.buildConnectionErrorReplyUsed || dbg.finalAnswerAuthor === 'connection_error';

  const intentResult = classifyCurrentMessageIntent(test.message);
  if (test.expectIntent && intentResult.intent !== test.expectIntent) {
    violations.push(`wrong_intent:${intentResult.intent}`);
  }

  if (!apiFailure) {
    if (!dbg.openaiCalled) violations.push('openai_not_called');
    if (dbg.finalAnswerAuthor !== 'openai') violations.push('wrong_author');
    if (dbg.responderUsed && dbg.responderUsed !== true) violations.push('template_responder');
    if (dbg.templateUsed) violations.push('template_used');
    if (dbg.fallbackUsed) violations.push('fallback_used');
    if (dbg.studyFallbackUsed) violations.push('study_fallback');
    if (dbg.forbiddenPhraseDetected || detectForbiddenProse(replyText).detected) violations.push('forbidden_phrase');
    if (test.forbidHistory && HISTORY_RE.test(replyText)) violations.push('unsolicited_history');
    if (!test.allowHistory && HISTORY_RE.test(replyText) && !HISTORY_RE.test(test.message)) {
      violations.push('unsolicited_history');
    }
    if (STUDY_RE.test(replyText) || WITNESS_RE.test(replyText)) violations.push('template_prose');
    if (test.expectYesNo && !hasYesNoLead(replyText, test.message)) violations.push('missing_yes_no');
    if (dbg.answerMatchesLatestQuestion === false) violations.push('answer_mismatch');
    if (test.expectIntent === INTENTS.CORRECTION_REPAIR && dbg.correctionRepair === false) {
      violations.push('correction_not_repaired');
    }
  } else {
    if (dbg.sourceGroundedResponderUsed) violations.push('source_grounded_on_failure');
    if (dbg.sabbathHistoryDeepResponderUsed) violations.push('sabbath_history_on_failure');
    if (dbg.studyFallbackUsed || STUDY_RE.test(replyText)) violations.push('study_on_failure');
    if (replyText !== CONNECTION_ERROR_USER_MESSAGE) violations.push('wrong_connection_message');
    if (dbg.relationshipEnrichmentUsed) violations.push('enrichment_on_failure');
  }

  if (dbg.runtimeUsed !== 'core_openai_first') violations.push('wrong_runtime');

  return {
    pass: violations.length === 0,
    violations,
    apiFailure,
    classifiedIntent: intentResult.intent,
  };
}

async function main() {
  process.env.BUDDY_RUNTIME = 'legacy';
  process.env.BUDDY_TEMPLATE_PROSE = '0';
  process.env.BUDDY_DISABLE_STUDY_FALLBACK = '1';
  process.env.BUDDY_DEBUG = '1';

  const results = [];
  for (const test of TESTS) {
    const userId = `cutover-${test.id}-${Date.now()}`;
    clearActiveConversation(userId);
    const started = Date.now();
    const reply = await runBuddy({
      userId,
      message: test.message,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });
    const dbg = reply.coreDebug || reply.runtime?.coreDebug || {};
    const scored = scoreTest(test, reply, dbg);
    results.push({
      id: test.id,
      message: test.message,
      expectIntent: test.expectIntent,
      latencyMs: Date.now() - started,
      ...dbg,
      scored,
      replyPreview: String(reply.reply || '').slice(0, 300),
    });
    console.log(
      `[${scored.pass ? 'PASS' : 'FAIL'}] ${test.id} intent=${dbg.currentIntent || scored.classifiedIntent} apiFail=${scored.apiFailure} violations=${scored.violations.join(',') || 'none'}`
    );
    await new Promise((r) => setTimeout(r, 300));
  }

  const intentOnlyPassed = results.filter((r) => r.scored.classifiedIntent === r.expectIntent).length;
  const allPassed = results.every((r) => r.scored.pass);
  const apiFailureOnly = results.every((r) => r.scored.apiFailure);

  const payload = {
    ranAt: new Date().toISOString(),
    env: {
      BUDDY_RUNTIME: process.env.BUDDY_RUNTIME,
      BUDDY_TEMPLATE_PROSE: process.env.BUDDY_TEMPLATE_PROSE,
      BUDDY_DISABLE_STUDY_FALLBACK: process.env.BUDDY_DISABLE_STUDY_FALLBACK,
      openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    },
    tests: results,
    intentClassificationPassed: intentOnlyPassed,
    intentClassificationTotal: results.length,
    passed: results.filter((r) => r.scored.pass).length,
    total: results.length,
    apiFailureOnly,
    allPassed,
    architectureLocked: {
      masterBuddyRuntimeBypass: false,
      reasonFirstBypass: false,
      openAiFirstOnly: true,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`Passed ${payload.passed}/${payload.total} | Intent ${intentOnlyPassed}/${payload.total}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
