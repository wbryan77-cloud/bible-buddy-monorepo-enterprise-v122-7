#!/usr/bin/env node
/**
 * Post-OpenAI core restoration smoke test — requires OPENAI_API_KEY.
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { detectDangerousFallbackSpeaker } = require('../services/coreResponseGuards');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'post-openai-core-restoration-results.json');

const STUDY_LOOP = /You've been studying|We can continue that study|continue your study journey/i;
const WITNESS = /establishes the matter|confirms it alongside Scripture/i;
const PRAY_UNASKED = /glad you asked to pray/i;
const HISTORY_DUMP = /Constantine|Council of Laodicea/i;

const TESTS = [
  { id: '1_relationship', message: 'Today I let go of someone I truly love. It hurts.' },
  { id: '2_alzheimers', message: "Mom has Alzheimer's. What do I do?" },
  { id: '3_sabbath_def', message: 'What is a Sabbath day?' },
  { id: '4_sabbath_how', message: 'How do we keep the Sabbath holy?' },
  {
    id: '5_yahweh_wording',
    message: 'Why do you say Yahweh instead of Jesus?',
    forbidHistory: true,
  },
  { id: '6_dietary_law', message: 'Is dietary law still in effect according to the Bible?' },
  { id: '7_pork_yesno', message: 'So yes or no, can I eat pork?', requireYesNo: true },
  {
    id: '8_acts10_correction',
    message: "You didn't answer. Acts 10 is about Gentiles, not pork. Just answer yes or no.",
    requireYesNo: true,
  },
  { id: '9_homework', message: 'Help me with my homework on the book of Ruth chapter 1.' },
  { id: '10_no_prayer', message: "I didn't ask to pray. Is Jesus the God of the Old Testament?" },
  { id: '11_wont_answer', message: "Why won't you answer my question directly?" },
  { id: '12_heavens', message: 'How many heavens are there according to the Bible?' },
  { id: '13_logos', message: 'Is the Logos in John 1 the same as the God revealed in the Old Testament?' },
];

function assertTurn(test, s) {
  const r = String(s.reply || '');
  const dbg = s.coreDebug || s.runtime?.coreDebug || {};

  if (!dbg.openaiCalled && !s.runtime?.openAiCalled) {
    return 'openaiCalled false';
  }
  if (dbg.finalAnswerAuthor && dbg.finalAnswerAuthor !== 'openai') {
    return `finalAnswerAuthor=${dbg.finalAnswerAuthor}`;
  }
  if (dbg.fallbackUsed) return 'fallbackUsed true';
  if (STUDY_LOOP.test(r)) return 'study loop in reply';
  if (WITNESS.test(r)) return 'witness template in reply';
  if (PRAY_UNASKED.test(r) && !/\bpray\b/i.test(test.message)) return 'unasked prayer template';
  if (test.forbidHistory && HISTORY_DUMP.test(r) && !/history|constantine|rome/i.test(test.message)) {
    return 'Sabbath history on non-history question';
  }
  if (test.requireYesNo && !/^\s*(yes|no)\b/i.test(r) && !/\b(yes|no),?\s/i.test(r.slice(0, 80))) {
    return 'yes/no not in opening';
  }
  const danger = detectDangerousFallbackSpeaker(r);
  if (danger.studyLoopUsed) return 'dangerous study loop';
  return null;
}

async function runOne(test, i) {
  const userId = `post-openai-smoke-${test.id}-${Date.now()}-${i}`;
  clearActiveConversation(userId);
  const structured = await runBuddy({
    userId,
    message: test.message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  const dbg = structured.coreDebug || structured.runtime?.coreDebug || {};
  const fail = assertTurn(test, structured);
  return {
    id: test.id,
    message: test.message,
    pass: !fail,
    failReason: fail,
    openaiCalled: dbg.openaiCalled ?? structured.runtime?.openAiCalled,
    finalAnswerAuthor: dbg.finalAnswerAuthor,
    fallbackUsed: dbg.fallbackUsed,
    templateUsed: dbg.templateUsed,
    routeUsed: dbg.routeUsed || structured.runtime?.masterRoute,
    studyLoopUsed: dbg.studyLoopUsed,
    errorMessage: dbg.errorMessage,
    replyPreview: String(structured.reply || '').slice(0, 400),
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required for post-OpenAI smoke test.');
    process.exit(2);
  }
  if (process.env.BUDDY_OPENAI_FIRST === '0') {
    console.error('Unset BUDDY_OPENAI_FIRST=0 for core path.');
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const results = [];
  for (let i = 0; i < TESTS.length; i++) {
    const row = await runOne(TESTS[i], i);
    results.push(row);
    console.log(`[${row.pass ? 'PASS' : 'FAIL'}] ${row.id} openAi=${row.openaiCalled} author=${row.finalAnswerAuthor}`);
    if (!row.pass) console.log(`       ${row.failReason}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  const summary = {
    ranAt: new Date().toISOString(),
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  };
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(`Passed ${summary.passed}/${results.length}`);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
