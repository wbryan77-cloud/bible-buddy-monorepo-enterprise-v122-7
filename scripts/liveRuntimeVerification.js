#!/usr/bin/env node
/**
 * Live runtime verification — mirrors POST /buddy/chat trace path.
 * Output: docs/regression-trace/live-runtime-verification.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { getEffectiveRuntimeConfig } = require('../services/buddyRuntimeConfig');
const { buildLiveRequestTrace } = require('../services/liveRequestTrace');
const { WITNESS_RE, STUDY_RE } = require('../services/liveRequestTrace');
const { CONNECTION_ERROR_USER_MESSAGE } = require('../services/coreResponseGuards');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'live-runtime-verification.json');
const HISTORY_RE = /Constantine|Council of Laodicea|Saturday to Sunday/i;

const TESTS = [
  { id: 't01', message: 'Can I eat pork? Yes or no?', expectYesNo: true },
  { id: 't02', message: 'How do we keep the Sabbath holy?', forbidHistory: true },
  { id: 't03', message: 'What does Logos mean in John 1:1?' },
  { id: 't04', message: 'How many heavens are talked about in the Bible?' },
  { id: 't05', message: 'Today has been a rough day. I had to let go of someone I love.' },
  { id: 't06', message: "You didn't answer my question." },
];

function scoreTest(test, trace, reply) {
  const violations = [...(trace.violations || [])];
  const apiFailure = trace.buildConnectionErrorReplyUsed;

  if (!trace.openaiCalled && !apiFailure) violations.push('openai_not_called_without_connection_path');
  if (trace.openaiCalled && trace.finalAnswerAuthor !== 'openai') violations.push('wrong_author');
  if (trace.templateUsed || WITNESS_RE.test(reply)) violations.push('template_or_witness');
  if (trace.studyFallbackUsed || STUDY_RE.test(reply)) violations.push('study_fallback');
  if (trace.sourceGroundedResponderUsed) violations.push('source_grounded');
  if (trace.sabbathHistoryDeepResponderUsed) violations.push('sabbath_history_responder');
  if (trace.relationshipEnrichmentUsed && apiFailure) violations.push('enrichment_on_api_failure');
  if (test.forbidHistory && HISTORY_RE.test(reply)) violations.push('unsolicited_history');
  if (test.expectYesNo && trace.openaiCalled && !/\b(yes|no)\b/i.test(reply.slice(0, 150))) {
    violations.push('missing_yes_no');
  }
  if (apiFailure && reply !== CONNECTION_ERROR_USER_MESSAGE) violations.push('wrong_connection_message');
  if (apiFailure && (trace.studyFallbackUsed || trace.sourceGroundedResponderUsed)) {
    violations.push('template_on_api_failure');
  }

  return { pass: violations.length === 0, violations, apiFailureExpected: apiFailure };
}

async function runDirectTests() {
  const results = [];
  for (const test of TESTS) {
    const userId = `live-verify-${test.id}-${Date.now()}`;
    clearActiveConversation(userId);
    const started = Date.now();
    const reply = await runBuddy({
      userId,
      message: test.message,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });
    const trace = buildLiveRequestTrace({
      message: test.message,
      reply,
      httpStatus: 200,
      latencyMs: Date.now() - started,
    });
    const replyText = String(reply.reply || '');
    const scored = scoreTest(test, trace, replyText);
    results.push({
      id: test.id,
      message: test.message,
      channel: 'runBuddy_direct',
      ...trace,
      scored,
      replyPreview: replyText.slice(0, 350),
    });
    console.log(
      `[${scored.pass ? 'PASS' : 'FAIL'}] ${test.id} author=${trace.finalAnswerAuthor} openai=${trace.openaiCalled} apiFail=${trace.buildConnectionErrorReplyUsed}`
    );
    await new Promise((r) => setTimeout(r, 350));
  }
  return results;
}

function loadRenderYamlEnv() {
  const yamlPath = path.join(__dirname, '..', 'render.yaml');
  if (!fs.existsSync(yamlPath)) return null;
  const text = fs.readFileSync(yamlPath, 'utf8');
  const required = [
    'BUDDY_RUNTIME',
    'BUDDY_TEMPLATE_PROSE',
    'BUDDY_DISABLE_STUDY_FALLBACK',
    'OPENAI_API_KEY',
    'NODE_ENV',
  ];
  const found = {};
  for (const key of required) {
    found[key] = new RegExp(`key:\\s*${key}`, 'm').test(text);
  }
  found.planStandard = /plan:\s*standard/.test(text);
  found.buddyDebug = /key:\s*BUDDY_DEBUG/.test(text);
  return found;
}

async function main() {
  process.env.BUDDY_RUNTIME = process.env.BUDDY_RUNTIME || 'legacy';
  process.env.BUDDY_TEMPLATE_PROSE = process.env.BUDDY_TEMPLATE_PROSE || '0';
  process.env.BUDDY_DISABLE_STUDY_FALLBACK = process.env.BUDDY_DISABLE_STUDY_FALLBACK || '1';
  process.env.BUDDY_DEBUG = process.env.BUDDY_DEBUG || '1';

  const config = getEffectiveRuntimeConfig();
  const renderEnv = loadRenderYamlEnv();
  const tests = await runDirectTests();

  const payload = {
    ranAt: new Date().toISOString(),
    localConfig: config,
    renderYamlEnvDeclared: renderEnv,
    openAiKeyPresent: !!process.env.OPENAI_API_KEY,
    memoryAtEnd: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    tests,
    passed: tests.filter((t) => t.scored?.pass).length,
    total: tests.length,
    apiFailureOnly: tests.every((t) => t.buildConnectionErrorReplyUsed || t.openaiCalled),
    allPassed: tests.every((t) => t.scored?.pass),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`Passed ${payload.passed}/${payload.total}`);
  process.exit(payload.allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
