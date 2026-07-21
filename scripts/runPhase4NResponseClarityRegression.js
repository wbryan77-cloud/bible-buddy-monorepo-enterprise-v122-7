#!/usr/bin/env node
/**
 * Phase 4N — Response clarity, companion warmth, follow-up routing regression.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const {
  clearDoctrineConversationState,
  getActiveDoctrineTopic,
} = require('../services/doctrineConversationState');
const { DENIAL_RE, countScriptureWitnesses } = require('../services/directAnswerFormatter');

const ROOT = path.join(__dirname, '..');
const USER = `phase4n-${Date.now()}`;

function assert(cond, label) {
  return { pass: !!cond, label };
}

async function chat(userId, message) {
  const structured = await runBuddy({
    userId,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    reply: String(structured.reply || ''),
    route: structured.runtime?.masterRoute,
    openAiCalled: structured.runtime?.openAiCalled,
    scripture: structured.scripture || [],
    structured,
  };
}

function summarize(checks) {
  const failed = checks.filter((c) => !c.pass);
  return { pass: failed.length === 0, failed: failed.map((c) => c.label), checks };
}

async function main() {
  const results = [];

  const u1 = `${USER}-1`;
  clearDoctrineConversationState(u1);
  const t1 = await chat(u1, 'Can we eat pork?');
  results.push({
    id: '1_pork_yesno',
    preview: t1.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t1.reply.trim()), 'starts with No.'),
      assert(!/^yes\b/i.test(t1.reply.trim()), 'must not start with Yes'),
      assert(!DENIAL_RE.test(t1.reply), 'no validator leak'),
      assert(countScriptureWitnesses(t1.reply, t1.scripture) >= 2, '2+ scripture witnesses'),
    ]),
  });

  const t2 = await chat(u1, 'So are you saying we can eat pork?');
  results.push({
    id: '2_pork_clarify',
    preview: t2.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t2.reply.trim()), 'starts with No.'),
      assert(!/^yes\b.*unclean/i.test(t2.reply), 'no Yes-unclean polarity bug'),
    ]),
  });

  const u3 = `${USER}-3`;
  clearDoctrineConversationState(u3);
  const t3 = await chat(u3, 'Can we have sex without marriage?');
  results.push({
    id: '3_fornication_yesno',
    preview: t3.reply.slice(0, 200),
    ...summarize([
      assert(/^no\b/i.test(t3.reply.trim()), 'starts with No.'),
      assert(/fornication|marriage/i.test(t3.reply), 'mentions fornication/marriage'),
      assert(!/\bpork\b|\bshellfish\b/i.test(t3.reply), 'not pork'),
    ]),
  });

  const t4 = await chat(u3, "I'm asking about fornication.");
  results.push({
    id: '4_fornication_direct',
    preview: t4.reply.slice(0, 200),
    ...summarize([
      assert(/fornication/i.test(t4.reply), 'answers fornication'),
      assert(countScriptureWitnesses(t4.reply, t4.scripture) >= 2, '2-3 scriptures'),
      assert(!/\bpork\b/i.test(t4.reply), 'not dietary'),
    ]),
  });

  const u5 = `${USER}-5`;
  clearDoctrineConversationState(u5);
  const t5 = await chat(u5, 'Love life is crashing.');
  results.push({
    id: '5_emotional_warmth',
    preview: t5.reply.slice(0, 200),
    ...summarize([
      assert(/sorry|here with you|heavy|hurt/i.test(t5.reply), 'warm companion'),
      assert(/psalm\s*34:?\s*18|broken heart/i.test(t5.reply), 'optional scripture'),
      assert(!/leviticus\s*11:7/i.test(t5.reply), 'no doctrine template'),
    ]),
  });

  const u6 = `${USER}-6`;
  clearDoctrineConversationState(u6);
  const heavenMsg =
    'Heaven on earth. Can you give me more scriptures with man staying on earth and the kingdom coming here?';
  const t6 = await chat(u6, heavenMsg);
  results.push({
    id: '6_kingdom_on_earth',
    preview: t6.reply.slice(0, 220),
    ...summarize([
      assert(!/which bible topic would you like/i.test(t6.reply), 'not orphan clarification'),
      assert(/matthew\s*6:?\s*10|revelation\s*21/i.test(t6.reply), 'kingdom scriptures'),
      assert(/earth|kingdom/i.test(t6.reply), 'kingdom on earth theme'),
      assert(countScriptureWitnesses(t6.reply, t6.scripture) >= 2, '2+ witnesses'),
    ]),
  });

  const u7 = `${USER}-7`;
  clearDoctrineConversationState(u7);
  await chat(u7, 'Acts 10');
  const t7a = await chat(u7, 'show me another verse');
  results.push({
    id: '7_continuation_after_strict',
    preview: t7a.reply.slice(0, 200),
    ...summarize([
      assert(/acts|verse|scripture|witness/i.test(t7a.reply), 'continuation works'),
      assert(!t7a.openAiCalled, 'no openai doctrine authoring'),
    ]),
  });

  await chat(u7, 'stop');
  const t7b = await chat(u7, 'show me another verse');
  results.push({
    id: '8_continuation_after_stop',
    preview: t7b.reply.slice(0, 200),
    ...summarize([
      assert(/which|topic|explore|active/i.test(t7b.reply), 'asks topic after stop'),
      assert(!getActiveDoctrineTopic(u7), 'active cleared'),
    ]),
  });

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);

  const report = {
    at: new Date().toISOString(),
    passed,
    total: results.length,
    failed: failed.map((f) => ({ id: f.id, failed: f.failed, preview: f.preview })),
    results,
  };

  const jsonPath = path.join(ROOT, 'docs', 'regression-trace', 'phase4n-response-clarity-results.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    '# Phase 4N Response Clarity Regression Report',
    '',
    `**Date:** ${report.at}`,
    `**Result:** ${passed}/${results.length} passed`,
    '',
    failed.length
      ? failed.map((f) => `- FAIL **${f.id}**: ${f.failed.join(', ')}`).join('\n')
      : 'All tests passed.',
    '',
    results.map((r) => `### ${r.id} (${r.pass ? 'PASS' : 'FAIL'})\n${r.preview}\n`).join('\n'),
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'Phase4NResponseClarityRegressionReport.md'), md);

  console.log(`Phase 4N: ${passed}/${results.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`FAIL ${f.id}: ${f.failed.join(', ')}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
