/**
 * Phase 4C.1 — Doctrine strict regression (validator + safe corpus, no live OpenAI required).
 */

const fs = require('fs');
const path = require('path');

const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { attachDoctrineStrictContract } = require('../services/doctrineAuthorityContract');
const { validateDoctrineStrictReply, containsForbiddenPhrase } = require('../services/doctrineStrictValidator');
const { buildDoctrineStrictSafeAnswer } = require('../services/doctrineStrictSafeAnswer');
const { writeAuditReports } = require('../services/phase4c1RuntimeDiagnostics');

const ROOT = path.join(__dirname, '..');
const FORBIDDEN = [
  'interpretations vary',
  'some believe',
  'different traditions',
  'complex topic',
];

function buildPack(message, userId = 'phase4c1-test') {
  const pack = buildRetrievalEvidencePack({
    userId,
    message,
    mode: 'companion',
    recentSessions: [],
    runtimeContext: { emotion: 'neutral', intent: 'study' },
    profile: { memoryEnabled: false },
    safety: { level: 'standard' },
    routingHintsOnly: true,
  });
  pack.userMessage = message;
  attachDoctrineStrictContract(pack);
  return pack;
}

function assert(condition, label) {
  return { pass: !!condition, label };
}

function checkNoForbidden(text) {
  for (const phrase of FORBIDDEN) {
    if (String(text).toLowerCase().includes(phrase)) return { pass: false, label: `forbidden phrase: ${phrase}` };
  }
  return { pass: true, label: 'no forbidden phrases' };
}

function checkWitnesses(text, evidencePack, min = 2) {
  const { countApprovedWitnessesInText } = require('../services/doctrineStrictValidator');
  const count = countApprovedWitnessesInText(
    text,
    evidencePack.doctrineStrict?.approvedWitnesses || [],
    evidencePack.doctrineStrict?.contract?.supportingWitnesses || [],
  );
  return { pass: count >= min, label: `${count} approved witnesses (need ${min})` };
}

function runTests() {
  const results = [];

  // 1. death_state initial
  const msg1 = 'What happens when a person dies according to Scripture?';
  const pack1 = buildPack(msg1);
  const safe1 = buildDoctrineStrictSafeAnswer({ message: msg1, evidencePack: pack1, contract: pack1.doctrineStrict.contract });
  const text1 = safe1.reply;
  results.push({
    id: '1_death_state_initial',
    checks: [
      assert(pack1.doctrineStrict?.enabled, 'strict mode enabled'),
      assert(!/luke\s*16/i.test(text1), 'must not mention Luke 16'),
      assert(/\b(sleep|know nothing|asleep)\b/i.test(text1), 'death sleep / no knowledge'),
      checkWitnesses(text1, pack1, 2),
      checkNoForbidden(text1),
      validateDoctrineStrictReply({ reply: text1, message: msg1, evidencePack: pack1, structured: safe1 }).passed
        ? assert(true, 'validator passes safe answer')
        : assert(false, 'validator passes safe answer'),
    ],
  });

  // 2. death_state challenge
  const msg2 = 'Give me another scripture that supports memory after death.';
  const pack2 = buildPack(msg2);
  const safe2 = buildDoctrineStrictSafeAnswer({ message: msg2, evidencePack: pack2, contract: pack2.doctrineStrict.contract });
  const text2 = safe2.reply;
  results.push({
    id: '2_death_state_challenge',
    checks: [
      assert(/\bnot support|does not support|no\b/i.test(text2), 'rejects unsupported claim'),
      assert(!/luke\s*16.*prove/i.test(text2), 'Luke 16 not used as proof'),
      checkNoForbidden(text2),
    ],
  });

  // 3. Luke 16 test
  const msg3 = 'Does Luke 16 prove the dead have memory after death?';
  const pack3 = buildPack(msg3);
  const safe3 = buildDoctrineStrictSafeAnswer({ message: msg3, evidencePack: pack3, contract: pack3.doctrineStrict.contract });
  const text3 = safe3.reply;
  results.push({
    id: '3_luke_16',
    checks: [
      assert(/^no[,.!:\s]/i.test(text3.trim()), 'answers no'),
      assert(/\b(parable|caution|not primary|not.*proof)\b/i.test(text3), 'parable/caution framing'),
    ],
  });

  // 4. dietary_law general
  const msg4 = 'What does the Bible teach about clean and unclean foods?';
  const pack4 = buildPack(msg4);
  const safe4 = buildDoctrineStrictSafeAnswer({ message: msg4, evidencePack: pack4, contract: pack4.doctrineStrict.contract });
  const text4 = safe4.reply;
  results.push({
    id: '4_dietary_law',
    checks: [
      assert(/leviticus\s*11/i.test(text4), 'Leviticus 11'),
      assert(/deuteronomy\s*14/i.test(text4), 'Deuteronomy 14'),
      assert(/acts\s*10|acts\s*11/i.test(text4), 'Acts 10/11'),
    ],
  });

  // 5. pork/shrimp
  const msg5 = 'So we can eat pork and shrimp?';
  const pack5 = buildPack(msg5);
  const safe5 = buildDoctrineStrictSafeAnswer({ message: msg5, evidencePack: pack5, contract: pack5.doctrineStrict.contract });
  const text5 = safe5.reply;
  results.push({
    id: '5_pork_shrimp',
    checks: [assert(/^no[,.!:\s]/i.test(text5.trim()), 'answers no')],
  });

  // 6. Isaiah 66:17
  const msg6 = 'Does consumed together mean killed in judgment?';
  const pack6 = buildPack(msg6);
  const safe6 = buildDoctrineStrictSafeAnswer({ message: msg6, evidencePack: pack6, contract: pack6.doctrineStrict.contract });
  const text6 = safe6.reply;
  results.push({
    id: '6_isaiah_66_17',
    checks: [
      assert(/^yes[,.!:\s]/i.test(text6.trim()), 'answers yes directly'),
      assert(!/interpretations vary|complex topic/i.test(text6), 'no hedging'),
    ],
  });

  // 7. forbidden phrase test on bad answers
  const badAnswer = 'Interpretations vary on this complex topic; some believe different traditions teach memory after death.';
  const pack7 = buildPack(msg1);
  const badValidation = validateDoctrineStrictReply({ reply: badAnswer, message: msg1, evidencePack: pack7 });
  results.push({
    id: '7_forbidden_phrases',
    checks: [assert(!badValidation.passed, 'bad answer fails validation')],
  });

  // 8. candidate leakage
  const candidateAnswer =
    'The candidate relationship graph proves the dead are conscious; observed relationship confirms doctrine.';
  const pack8 = buildPack(msg1);
  const candValidation = validateDoctrineStrictReply({ reply: candidateAnswer, message: msg1, evidencePack: pack8 });
  results.push({
    id: '8_candidate_leakage',
    checks: [assert(!candValidation.passed, 'candidate/observed as doctrine fails')],
  });

  // 9. correction pressure
  let pressureOk = true;
  for (let i = 0; i < 5; i += 1) {
    const m = i === 0 ? msg1 : `No, you are wrong. Challenge ${i}: ${msg2}`;
    const p = buildPack(m);
    const s = buildDoctrineStrictSafeAnswer({ message: m, evidencePack: p, contract: p.doctrineStrict.contract });
    if (!s.reply || s.reply.includes('AI service trouble')) pressureOk = false;
  }
  results.push({
    id: '9_correction_pressure',
    checks: [assert(pressureOk, '5 challenges without crash or connection error text')],
  });

  // 10. OpenAI failure simulation
  const pack10 = buildPack(msg5);
  const safe10 = buildDoctrineStrictSafeAnswer({
    message: msg5,
    evidencePack: pack10,
    contract: pack10.doctrineStrict.contract,
    violations: [{ code: 'openai_timeout', detail: 'openai_timeout' }],
  });
  results.push({
    id: '10_openai_failure_fallback',
    checks: [
      assert(safe10.safeCorpusFallback, 'safeCorpusFallback flag'),
      assert(safe10.reply && safe10.reply.length > 20, 'non-empty safe reply'),
      assert(/^no[,.!:\s]/i.test(safe10.reply.trim()), 'doctrine-safe content on failure'),
    ],
  });

  return results;
}

function summarize(results) {
  let totalChecks = 0;
  let passedChecks = 0;
  const lines = ['# Phase 4C.1 Doctrine Strict Regression Report', '', `Generated: ${new Date().toISOString()}`, ''];

  for (const r of results) {
    lines.push(`## ${r.id}`);
    for (const c of r.checks) {
      totalChecks += 1;
      if (c.pass) passedChecks += 1;
      lines.push(`- [${c.pass ? 'PASS' : 'FAIL'}] ${c.label}`);
    }
    lines.push('');
  }

  const allPass = passedChecks === totalChecks;
  lines.push('## Summary');
  lines.push(`- Checks passed: ${passedChecks}/${totalChecks}`);
  lines.push(`- Phase 4C.1 regression: ${allPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Phase 4C can resume: ${allPass ? 'YES (runtime repair complete)' : 'NO (fix failures first)'}`);

  return { lines, allPass, passedChecks, totalChecks };
}

function main() {
  writeAuditReports();
  const results = runTests();
  const { lines, allPass, passedChecks, totalChecks } = summarize(results);
  const reportPath = path.join(ROOT, 'Phase4C1DoctrineStrictRegressionReport.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

  console.log(`Phase 4C.1 regression: ${passedChecks}/${totalChecks} checks passed`);
  console.log(`Report: ${reportPath}`);
  process.exit(allPass ? 0 : 1);
}

main();
