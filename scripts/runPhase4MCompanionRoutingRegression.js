#!/usr/bin/env node
/**
 * Phase 4M — Companion orchestration restore + doctrine release gate regression.
 * Uses runBuddy (same path as /buddy/chat).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const {
  clearDoctrineConversationState,
  getDoctrineConversationState,
  getActiveDoctrineTopic,
} = require('../services/doctrineConversationState');
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');
const { DIETARY_LEAK_TERMS } = require('../services/companionDoctrineRouter');

const ROOT = path.join(__dirname, '..');
const USER = `phase4m-${Date.now()}`;

const ACTS10_LEAK = /\b(acts\s*10|peter|cornelius|gentiles? vision)\b/i;
const DIETARY_LEAK = DIETARY_LEAK_TERMS;

function assert(cond, label) {
  return { pass: !!cond, label };
}

function noLeak(text, pattern, label) {
  return assert(!pattern.test(String(text)), label || 'no leak');
}

async function chat(userId, message) {
  const healthBefore = getRuntimeHealthSnapshot();
  const strictBefore = healthBefore.strictDoctrineCalls;
  const blockedBefore = healthBefore.strictDoctrineOpenAiBlocked;

  const structured = await runBuddy({
    userId,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });

  const healthAfter = getRuntimeHealthSnapshot();
  const reply = String(structured.reply || '');
  const state = getDoctrineConversationState(userId);

  return {
    reply,
    route: structured.runtime?.masterRoute,
    openAiCalled: structured.runtime?.openAiCalled,
    doctrineTopic: structured.runtime?.doctrineTopic,
    activeDoctrineTopic: getActiveDoctrineTopic(userId),
    lastUserQuestion: state.lastUserQuestion,
    lastLane: state.lastLane,
    strictDoctrineDelta: healthAfter.strictDoctrineCalls - strictBefore,
    blockedDelta: healthAfter.strictDoctrineOpenAiBlocked - blockedBefore,
    structured,
  };
}

function summarizeChecks(checks) {
  const failed = checks.filter((c) => !c.pass);
  return {
    pass: failed.length === 0,
    failed: failed.map((c) => c.label),
    checks,
  };
}

async function runSequenceA(userId) {
  const results = [];

  const t1 = await chat(userId, 'Acts 10');
  results.push({
    id: 'A1_acts_10',
    message: 'Acts 10',
    preview: t1.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/acts\s*10:28/i.test(t1.reply), 'acts 10 doctrine answer'),
      assert(t1.strictDoctrineDelta > 0, 'strictDoctrineCalls increments'),
      assert(!t1.openAiCalled, 'openAiCalls 0 for strict doctrine'),
      assert(t1.activeDoctrineTopic === 'acts_10', 'activeDoctrineTopic acts_10'),
    ]),
  });

  const t2 = await chat(userId, 'I had a bad day today.');
  results.push({
    id: 'A2_bad_day',
    message: 'I had a bad day today.',
    preview: t2.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/sorry|here with you|hard/i.test(t2.reply), 'warm companion response'),
      noLeak(t2.reply, ACTS10_LEAK, 'must not mention Acts 10/Peter'),
      assert(!t2.strictDoctrineDelta, 'strictDoctrineCalls must not increment'),
      assert(!t2.activeDoctrineTopic, 'activeDoctrineTopic cleared or suspended'),
    ]),
  });

  const t3 = await chat(userId, "I'm not talking about Peter.");
  results.push({
    id: 'A3_not_peter',
    message: "I'm not talking about Peter.",
    preview: t3.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/right|asking about|listen/i.test(t3.reply), 'apology/listening response'),
      noLeak(t3.reply, ACTS10_LEAK, 'must not repeat Acts 10'),
      assert(!t3.activeDoctrineTopic, 'activeDoctrineTopic cleared'),
    ]),
  });

  const t4 = await chat(userId, 'why are you not listening?');
  results.push({
    id: 'A4_not_listening',
    message: 'why are you not listening?',
    preview: t4.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/listen|stuck|with you/i.test(t4.reply), 'apology/listening response'),
      noLeak(t4.reply, ACTS10_LEAK, 'must not repeat Acts 10'),
    ]),
  });

  return results;
}

async function runSequenceB(userId) {
  const results = [];

  const t5 = await chat(userId, 'What about eating pork');
  results.push({
    id: 'B5_pork',
    message: 'What about eating pork',
    preview: t5.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/pork|unclean|leviticus/i.test(t5.reply), 'dietary_law answer'),
      assert(t5.activeDoctrineTopic === 'dietary_law', 'activeDoctrineTopic dietary_law'),
    ]),
  });

  const t6 = await chat(userId, 'Can we have sex without marriage?');
  results.push({
    id: 'B6_fornication',
    message: 'Can we have sex without marriage?',
    preview: t6.reply.slice(0, 180),
    ...summarizeChecks([
      noLeak(t6.reply, DIETARY_LEAK, 'must not mention pork/shellfish/Acts 10/Isaiah 66'),
      assert(!/dietary law template/i.test(t6.reply), 'not dietary law template'),
      assert(
        /marriage|fornication|sex|scripture|bible/i.test(t6.reply) || t6.route === 'companion_lane' || t6.route === 'companion_doctrine_release',
        'companion or Bible retrieval about marriage/fornication',
      ),
      assert(!t6.activeDoctrineTopic || t6.activeDoctrineTopic !== 'dietary_law', 'old dietary topic cleared'),
    ]),
  });

  const t7 = await chat(userId, "I'm asking about fornication");
  results.push({
    id: 'B7_fornication_followup',
    message: "I'm asking about fornication",
    preview: t7.reply.slice(0, 180),
    ...summarizeChecks([
      noLeak(t7.reply, DIETARY_LEAK, 'no pork/shellfish/Acts 10 repetition'),
      assert(/fornication|marriage|sexual/i.test(t7.reply), 'answer fornication not dietary'),
    ]),
  });

  const t8 = await chat(userId, 'what are the 10 commandments');
  results.push({
    id: 'B8_commandments',
    message: 'what are the 10 commandments',
    preview: t8.reply.slice(0, 180),
    ...summarizeChecks([
      noLeak(t8.reply, /\bpork\b|\bshellfish\b|\bdietary\b/i, 'must not repeat dietary law'),
      assert(/commandment|exodus|deuteronomy/i.test(t8.reply), 'answer commandments or Bible retrieval'),
    ]),
  });

  const t9 = await chat(userId, 'stop');
  results.push({
    id: 'B9_stop',
    message: 'stop',
    preview: t9.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/I hear you.*stop that topic/i.test(t9.reply), 'stop release reply'),
      assert(!t9.activeDoctrineTopic, 'activeDoctrineTopic cleared'),
    ]),
  });

  const t10 = await chat(userId, 'Do you remember my last question?');
  results.push({
    id: 'B10_memory',
    message: 'Do you remember my last question?',
    preview: t10.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/stop/i.test(t10.reply) || /last question/i.test(t10.reply), 'mentions stop or last question'),
      noLeak(t10.reply, /\bdietary\b|\bpork\b/i, 'must not repeat dietary_law'),
    ]),
  });

  return results;
}

async function runSequenceC(userId) {
  const results = [];

  const t11 = await chat(userId, 'Tell me about death');
  results.push({
    id: 'C11_death',
    message: 'Tell me about death',
    preview: t11.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/death|sleep|know nothing|asleep/i.test(t11.reply), 'death_state answer'),
      assert(t11.activeDoctrineTopic === 'death_state', 'activeDoctrineTopic death_state'),
    ]),
  });

  const t12 = await chat(userId, 'show me another verse');
  results.push({
    id: 'C12_continuation',
    message: 'show me another verse',
    preview: t12.reply.slice(0, 180),
    ...summarizeChecks([
      assert(t12.strictDoctrineDelta > 0 || /verse|witness|scripture/i.test(t12.reply), 'death_state continuation'),
      assert(!t12.openAiCalled, 'no OpenAI doctrine authoring'),
    ]),
  });

  const t13 = await chat(userId, 'stop');
  results.push({
    id: 'C13_stop',
    message: 'stop',
    preview: t13.reply.slice(0, 180),
    ...summarizeChecks([
      assert(!t13.activeDoctrineTopic, 'clears death_state'),
    ]),
  });

  const t14 = await chat(userId, 'show me another verse');
  results.push({
    id: 'C14_orphan_continuation',
    message: 'show me another verse',
    preview: t14.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/which|topic|explore|active/i.test(t14.reply), 'asks which topic to continue'),
      assert(!/ecclesiastes 9:5|know nothing/i.test(t14.reply), 'must not repeat death_state'),
    ]),
  });

  return results;
}

async function runSequenceD(userId) {
  const results = [];

  const t15 = await chat(userId, 'I am tired and discouraged');
  results.push({
    id: 'D15_tired',
    message: 'I am tired and discouraged',
    preview: t15.reply.slice(0, 180),
    ...summarizeChecks([
      assert(/sorry|here|worn|weighing|discouraged/i.test(t15.reply), 'warm companion response'),
      assert(!/leviticus 11|acts 10:28|pork and shellfish remain/i.test(t15.reply), 'no strict doctrine template'),
      assert(!t15.strictDoctrineDelta, 'no strict doctrine on emotional turn'),
    ]),
  });

  return results;
}

async function main() {
  clearDoctrineConversationState(USER);
  const healthStart = getRuntimeHealthSnapshot();

  const sequenceA = await runSequenceA(USER);
  const userB = `${USER}-b`;
  clearDoctrineConversationState(userB);
  const sequenceB = await runSequenceB(userB);
  const userC = `${USER}-c`;
  clearDoctrineConversationState(userC);
  const sequenceC = await runSequenceC(userC);
  const userD = `${USER}-d`;
  clearDoctrineConversationState(userD);
  const sequenceD = await runSequenceD(userD);

  const all = [...sequenceA, ...sequenceB, ...sequenceC, ...sequenceD];
  const passed = all.filter((r) => r.pass).length;
  const failed = all.filter((r) => !r.pass);

  const healthEnd = getRuntimeHealthSnapshot();
  const metrics = {
    errors: healthEnd.errors - healthStart.errors,
    timeouts: healthEnd.timeouts - healthStart.timeouts,
    memoryPressureLevel: healthEnd.memoryPressureLevel,
    strictDoctrineCalls: healthEnd.strictDoctrineCalls - healthStart.strictDoctrineCalls,
    strictDoctrineOpenAiBlocked: healthEnd.strictDoctrineOpenAiBlocked - healthStart.strictDoctrineOpenAiBlocked,
    openAiCalls: healthEnd.openAiCalls - healthStart.openAiCalls,
  };

  const metricsOk =
    metrics.errors === 0 &&
    metrics.timeouts === 0 &&
    metrics.memoryPressureLevel === 'normal';

  const report = {
    at: new Date().toISOString(),
    user: USER,
    passed,
    total: all.length,
    metrics,
    metricsOk,
    failed: failed.map((f) => ({ id: f.id, failed: f.failed, preview: f.preview })),
    results: all,
  };

  const reportPath = path.join(ROOT, 'Phase4MCompanionRoutingRegressionReport.md');
  const jsonPath = path.join(ROOT, 'docs', 'regression-trace', 'phase4m-companion-routing-results.json');

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    '# Phase 4M Companion Routing Regression Report',
    '',
    `**Date:** ${report.at}`,
    `**Result:** ${passed}/${all.length} passed`,
    `**Metrics OK:** ${metricsOk ? 'yes' : 'no'}`,
    '',
    '## Metrics',
    '',
    `- errors: ${metrics.errors}`,
    `- timeouts: ${metrics.timeouts}`,
    `- memoryPressureLevel: ${metrics.memoryPressureLevel}`,
    `- strictDoctrineCalls: ${metrics.strictDoctrineCalls}`,
    `- strictDoctrineOpenAiBlocked: ${metrics.strictDoctrineOpenAiBlocked}`,
    `- openAiCalls: ${metrics.openAiCalls}`,
    '',
    '## Failed',
    '',
    failed.length
      ? failed.map((f) => `- **${f.id}**: ${f.failed.join(', ')}`).join('\n')
      : 'None',
    '',
    '## All results',
    '',
    all
      .map((r) => `### ${r.id} (${r.pass ? 'PASS' : 'FAIL'})\n- Message: ${r.message}\n- Preview: ${r.preview}\n`)
      .join('\n'),
  ].join('\n');

  fs.writeFileSync(reportPath, md);

  console.log(`Phase 4M: ${passed}/${all.length} passed, metricsOk=${metricsOk}`);
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
