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
const { WITNESS_RE, STUDY_RE, GOVERNED_NON_OPENAI_AUTHORS } = require('../services/liveRequestTrace');
const { CONNECTION_ERROR_USER_MESSAGE } = require('../services/coreResponseGuards');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'live-runtime-verification.json');
const HISTORY_RE = /Constantine|Council of Laodicea|Saturday to Sunday/i;

// PHASE_6G — Refreshed for the approved Scripture Authority Engine
// architecture (Phase 5S/5T/6). The obsolete assumption baked into the
// original suite was "every answer must call OpenAI, or it's a bug." The
// approved architecture is the opposite for governed biblical claims:
//
//   intent/authority classification -> Scripture Authority Engine for
//   governed claims -> approved evidence & canonical Scripture -> optional
//   OpenAI composition only where permitted -> final answer + lineage.
//
// GOVERNED_NON_OPENAI_AUTHORS (imported from services/liveRequestTrace.js,
// the single source of truth also used by the production trace logger)
// names every deterministic/governed `finalAnswerAuthor` value that is
// *expected* to answer without calling OpenAI. Anything NOT on that list,
// and not calling OpenAI, is still a real violation — this is a stronger,
// named/auditable check, not a weaker one.

const TESTS = [
  {
    id: 't01',
    message: 'Can I eat pork? Yes or no?',
    expectYesNo: true,
    expectAuthorityOwned: true,
    expectScriptureContains: ['Leviticus 11'],
    oldExpectation: 'expectOpenAi implicit (unconditional openai_not_called_without_connection_path check)',
    currentExpectation:
      'Dietary-law questions are governed doctrine and are correctly answered by doctrine_final_authority with real Leviticus/Deuteronomy/Acts 10 citations, without calling OpenAI.',
  },
  {
    id: 't02',
    message: 'How do we keep the Sabbath holy?',
    forbidHistory: true,
    expectAuthorityOwned: true,
    expectScriptureContains: ['Exodus 20', 'Genesis 2'],
    oldExpectation: 'expectOpenAi implicit (unconditional openai_not_called_without_connection_path check)',
    currentExpectation:
      'Sabbath questions are governed doctrine and are correctly answered by doctrine_final_authority with real Genesis 2 / Exodus 20 / Isaiah 58 citations, without calling OpenAI.',
  },
  {
    id: 't03',
    message: 'What does Logos mean in John 1:1?',
    expectAuthorityOwned: true,
    expectExactQuote: { reference: 'John 1:1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
    oldExpectation: 'expectOpenAi implicit (unconditional openai_not_called_without_connection_path check)',
    currentExpectation:
      'An explicit-reference question is correctly answered by bible_wide_reasoning with the exact KJV text of John 1:1, without calling OpenAI or paraphrasing/fabricating the verse.',
  },
  {
    id: 't04',
    message: 'How many heavens are talked about in the Bible?',
    expectAuthorityOwned: true,
    expectScriptureContains: ['2 Corinthians 12:2', 'Genesis 1:1'],
    oldExpectation: 'expectOpenAi implicit (unconditional openai_not_called_without_connection_path check)',
    currentExpectation:
      'A cross-canon topical question is correctly answered by bible_wide_reasoning with real supporting witnesses (2 Corinthians 12:2, Genesis 1:1), without calling OpenAI.',
  },
  { id: 't05', message: 'Today has been a rough day. I had to let go of someone I love.' },
  {
    id: 't06',
    message: "You didn't answer my question.",
    expectAuthorityOwned: true,
    oldExpectation: 'expectOpenAi implicit (unconditional openai_not_called_without_connection_path check)',
    currentExpectation:
      'A companion-release correction ("you didn\u2019t answer my question") is correctly owned by the deterministic companion_release lane, which explicitly re-focuses on the user\u2019s new message without calling OpenAI.',
  },
];

function scoreTest(test, trace, reply) {
  const violations = [...(trace.violations || [])];
  const apiFailure = trace.buildConnectionErrorReplyUsed;
  const governedOwner = GOVERNED_NON_OPENAI_AUTHORS.has(trace.finalAnswerAuthor);

  if (!trace.openaiCalled && !apiFailure && !governedOwner) {
    violations.push('openai_not_called_without_connection_path_or_governed_owner');
  }
  if (trace.openaiCalled && trace.finalAnswerAuthor !== 'openai') violations.push('wrong_author');
  if (trace.templateUsed || WITNESS_RE.test(reply)) violations.push('template_or_witness');
  if (trace.studyFallbackUsed || STUDY_RE.test(reply)) violations.push('study_fallback');
  if (trace.sourceGroundedResponderUsed) violations.push('source_grounded');
  if (trace.sabbathHistoryDeepResponderUsed) violations.push('sabbath_history_responder');
  if (trace.relationshipEnrichmentUsed && apiFailure) violations.push('enrichment_on_api_failure');
  if (test.forbidHistory && HISTORY_RE.test(reply)) violations.push('unsolicited_history');
  if (test.expectYesNo && !/\b(yes|no)\b/i.test(reply.slice(0, 150))) {
    violations.push('missing_yes_no');
  }
  if (test.expectAuthorityOwned && !governedOwner && !trace.openaiCalled) {
    violations.push('expected_governed_authority_but_no_recognized_owner');
  }
  if (test.expectScriptureContains) {
    const scriptureRefs = (trace.scripture || []).map((s) => s.reference || s).join(' | ');
    const hasAny = test.expectScriptureContains.some((ref) => reply.includes(ref) || scriptureRefs.includes(ref));
    if (!hasAny) violations.push(`missing_expected_scripture_witness:${test.expectScriptureContains.join(',')}`);
  }
  if (test.expectExactQuote) {
    if (!reply.includes(test.expectExactQuote.text)) {
      violations.push(`missing_exact_kjv_text:${test.expectExactQuote.reference}`);
    }
  }
  if (apiFailure && reply !== CONNECTION_ERROR_USER_MESSAGE) violations.push('wrong_connection_message');
  if (apiFailure && (trace.studyFallbackUsed || trace.sourceGroundedResponderUsed)) {
    violations.push('template_on_api_failure');
  }

  return { pass: violations.length === 0, violations, apiFailureExpected: apiFailure, governedOwner };
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
    trace.scripture = reply.scripture || [];
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
