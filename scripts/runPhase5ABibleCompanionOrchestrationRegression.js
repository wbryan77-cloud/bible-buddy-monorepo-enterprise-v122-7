#!/usr/bin/env node
/**
 * Phase 5A — Bible companion orchestration regression.
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
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');

const ROOT = path.join(__dirname, '..');
const USER = `phase5a-${Date.now()}`;

function assert(cond, label) {
  return { pass: !!cond, label };
}

function summarize(checks) {
  const failed = checks.filter((c) => !c.pass);
  return { pass: failed.length === 0, failed: failed.map((c) => c.label), checks };
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
    orchestrator: structured.runtime?.phase5A || structured.runtime?.orchestratorLane,
    structured,
  };
}

async function main() {
  const healthStart = getRuntimeHealthSnapshot();
  const results = [];

  const u1 = USER;
  clearDoctrineConversationState(u1);

  const t1 = await chat(u1, 'Can we eat pork?');
  results.push({
    id: '1_pork',
    preview: t1.reply.slice(0, 180),
    ...summarize([
      assert(/^no\b/i.test(t1.reply.trim()), 'starts No'),
      assert(/leviticus\s*11/i.test(t1.reply), 'Leviticus 11'),
      assert(/deuteronomy\s*14/i.test(t1.reply), 'Deuteronomy 14'),
      assert(!/^yes\b.*pork.*unclean/i.test(t1.reply), 'no Yes-pork bug'),
    ]),
  });

  await chat(u1, 'stop saying yes and say no first');
  const t2 = await chat(u1, 'Can we eat pork?');
  results.push({
    id: '2_correction_memory',
    preview: t2.reply.slice(0, 180),
    ...summarize([
      assert(/^no\b/i.test(t2.reply.trim()), 'correction applied'),
      assert(!/^yes\b/i.test(t2.reply.trim()), 'no Yes after correction'),
    ]),
  });

  const u3 = `${USER}-sex`;
  clearDoctrineConversationState(u3);
  const t3 = await chat(u3, 'Can we have sex without marriage?');
  results.push({
    id: '3_fornication',
    preview: t3.reply.slice(0, 180),
    ...summarize([
      assert(/^no\b/i.test(t3.reply.trim()), 'starts No'),
      assert(countScriptureWitnesses(t3.reply, t3.scripture) >= 2, '2+ refs'),
      assert(/1\s*corinthians\s*6|1\s*thessalonians\s*4|hebrews\s*13/i.test(t3.reply), 'fornication refs'),
    ]),
  });

  const t4 = await chat(u3, 'show me another verse about fornication?');
  results.push({
    id: '4_fornication_verse',
    preview: t4.reply.slice(0, 180),
    ...summarize([
      assert(!/which bible topic/i.test(t4.reply), 'no which topic'),
      assert(/fornication|corinthians|hebrews|galatians|ephesians/i.test(t4.reply), 'fornication witness'),
    ]),
  });

  const u5 = `${USER}-kingdom`;
  clearDoctrineConversationState(u5);
  await chat(u5, 'Can you give me more scriptures with man staying on earth and the kingdom coming?');
  const t5 = await chat(u5, 'Why won\'t you answer?');
  results.push({
    id: '5_pending_kingdom',
    preview: t5.reply.slice(0, 220),
    ...summarize([
      assert(/kingdom|earth|matthew|revelation/i.test(t5.reply), 'answers pending kingdom'),
      assert(/right|directly/i.test(t5.reply), 'acknowledges frustration'),
    ]),
  });

  const t6 = await chat(`${USER}-emo`, 'Love life is crashing.');
  results.push({
    id: '6_emotional',
    preview: t6.reply.slice(0, 200),
    ...summarize([
      assert(/sorry|here with you|heavy|heartbreak/i.test(t6.reply), 'warm companion'),
      assert(/psalm\s*34|1\s*peter\s*5/i.test(t6.reply), 'optional scripture'),
      assert(/\?/.test(t6.reply) || /what happened/i.test(t6.reply), 'follow-up'),
    ]),
  });

  const u7 = `${USER}-acts`;
  clearDoctrineConversationState(u7);
  const t7 = await chat(u7, 'Acts 10');
  results.push({
    id: '7_acts10',
    preview: t7.reply.slice(0, 200),
    ...summarize([
      assert(/acts\s*10/i.test(t7.reply), 'Acts 10 answer'),
      assert(!t7.openAiCalled, 'no OpenAI doctrine'),
      assert(/acts\s*10:?\s*(14|28|34)/i.test(t7.reply), 'Acts witnesses'),
    ]),
  });

  const t8 = await chat(u7, 'I had a bad day today.');
  results.push({
    id: '8_bad_day_after_acts',
    preview: t8.reply.slice(0, 180),
    ...summarize([
      assert(/sorry|here with you|hard/i.test(t8.reply), 'companion'),
      assert(!/acts\s*10:?\s*28/i.test(t8.reply), 'no Acts 10 repeat'),
    ]),
  });

  await chat(u7, 'show me another verse');
  const t9 = await chat(u7, 'stop');
  const t10 = await chat(u7, 'show me another verse');
  results.push({
    id: '9_stop_then_verse',
    preview: t10.reply.slice(0, 180),
    ...summarize([
      assert(/which|topic|explore|active/i.test(t10.reply), 'asks topic after stop'),
      assert(!getActiveDoctrineTopic(u7), 'active cleared'),
    ]),
  });

  const t11 = await chat(`${USER}-unk`, 'What does the parable of the sower mean for modern church planting?');
  results.push({
    id: '10_unknown_clarify',
    preview: t11.reply.slice(0, 200),
    ...summarize([
      assert(/tell me more|which book|topic|passage|clarif/i.test(t11.reply), 'clarifying question'),
      assert(!DENIAL_RE.test(t11.reply), 'no validator leak on clarify'),
    ]),
  });

  const t12 = await chat(u3, 'Can we have sex without marriage?');
  results.push({
    id: '11_no_validator_leak',
    preview: t12.reply.slice(0, 180),
    ...summarize([
      assert(!DENIAL_RE.test(t12.reply), 'no Scripture does not state leak'),
      assert(countScriptureWitnesses(t12.reply, t12.scripture) >= 2, '2+ witnesses'),
    ]),
  });

  const healthEnd = getRuntimeHealthSnapshot();
  const memoryOk = healthEnd.memoryPressureLevel === 'normal';

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);

  const report = {
    at: new Date().toISOString(),
    passed,
    total: results.length,
    memoryOk,
    results,
    failed: failed.map((f) => ({ id: f.id, failed: f.failed })),
  };

  const jsonPath = path.join(ROOT, 'docs', 'regression-trace', 'phase5a-orchestration-results.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    '# Phase 5A Bible Companion Orchestration Regression Report',
    '',
    `**Date:** ${report.at}`,
    `**Result:** ${passed}/${results.length}`,
    `**Memory OK:** ${memoryOk}`,
    '',
    failed.length
      ? failed.map((f) => `- FAIL **${f.id}**: ${f.failed.join(', ')}`).join('\n')
      : 'All passed.',
    '',
    results.map((r) => `### ${r.id} (${r.pass ? 'PASS' : 'FAIL'})\n${r.preview}\n`).join('\n'),
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'Phase5ABibleCompanionOrchestrationRegressionReport.md'), md);

  console.log(`Phase 5A: ${passed}/${results.length} passed, memoryOk=${memoryOk}`);
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
