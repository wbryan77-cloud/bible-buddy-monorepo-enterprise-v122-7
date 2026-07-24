/**
 * GATE 6 — OpenAI resiliency drill
 *
 * Exercises the SAME production stack as POST /buddy/chat:
 *   withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime
 *   → composeReasonFirstReply → callOpenAI → openaiClient
 *
 * Faults injected locally (env + SDK stub). Env/stubs restored in finally.
 * No public fault endpoint. Does NOT leave faults enabled.
 */
const assert = require('assert');
const path = require('path');

const LEAK_RE =
  /sk-[a-zA-Z0-9]|api[_-]?key|traceback|ECONNREFUSED|openai_unavailable|openai_timeout|TypeError|at Object\.|stack:|OPENAI_API_KEY/i;
const HALLUCINATION_RE =
  /acts 10 makes pork clean|jesus rose sunday morning for certain|believers go to the third heaven when they die/i;

function assertSafeUserText(text, id) {
  const t = String(text || '');
  assert(t.length > 8, `${id}: empty/too-short user reply`);
  assert(!LEAK_RE.test(t), `${id}: secret/stack leak in user reply: ${t.slice(0, 120)}`);
  assert(!HALLUCINATION_RE.test(t), `${id}: fabricated doctrine fallback: ${t.slice(0, 120)}`);
}

function extractReply(payload) {
  const structured = payload?.reply && typeof payload.reply === 'object' ? payload.reply : null;
  return String(structured?.reply || payload?.reply || '');
}

function extractRoute(payload) {
  const structured = payload?.reply && typeof payload.reply === 'object' ? payload.reply : null;
  return structured?.runtime?.masterRoute || structured?.runtime?.fallbackErrorCode || '';
}

async function run() {
  const results = [];
  function check(id, ok, detail = '') {
    results.push({ id, pass: !!ok, detail: String(detail).slice(0, 240) });
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
  }

  const saved = {
    DISABLE: process.env.BIBLEBUDDY_DISABLE_OPENAI,
    TIMEOUT: process.env.OPENAI_TIMEOUT_MS,
    CHAT_TIMEOUT: process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS,
    KEY: process.env.OPENAI_API_KEY,
  };

  // Ensure openaiClient constructs so we can stub chat.completions.create.
  // Prefer existing key; otherwise use a non-networked placeholder for client init only.
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = 'sk-resiliency-drill-placeholder-not-for-network';
  }

  // Install controllable stub client BEFORE loading the production compose chain.
  const clientPath = require.resolve('../services/openaiClient');
  const stubState = { impl: null, calls: 0 };
  const stubClient = {
    chat: {
      completions: {
        create: async (...args) => {
          stubState.calls += 1;
          if (typeof stubState.impl === 'function') return stubState.impl(...args);
          throw new Error('resiliency stub not configured');
        },
      },
    },
  };
  require.cache[clientPath] = {
    id: clientPath,
    filename: clientPath,
    loaded: true,
    exports: stubClient,
  };

  // Reload dependents so they bind the stub client.
  for (const rel of [
    '../services/reasonFirstComposer',
    '../services/openAiFirstCompanionRuntime',
    '../services/buddyBrain',
    '../services/responseGuarantee',
  ]) {
    try {
      delete require.cache[require.resolve(rel)];
    } catch (_) {
      /* ignore */
    }
  }

  const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
  const { runBuddy } = require('../services/buddyBrain');
  const fs = require('fs');
  const guaranteeSrc = fs.readFileSync(require.resolve('../services/responseGuarantee'), 'utf8');

  check(
    'P1_module_import_path',
    require.resolve('../services/reasonFirstComposer').includes('reasonFirstComposer') &&
      require.resolve('../services/openaiClient').includes('openaiClient') &&
      require.resolve('../services/openAiFirstCompanionRuntime').includes('openAiFirstCompanionRuntime'),
    `composer+client+runtime resolved; stubClient installed`,
  );
  check(
    'P2_authority_chain_documents_openai_first',
    /withBuddyChatGuarantee/.test(guaranteeSrc) &&
      /openAiFirstCompanionRuntime/.test(guaranteeSrc) &&
      /runBuddy/.test(guaranteeSrc),
    'ROUTE_OWNER documents POST /buddy/chat → … → openAiFirstCompanionRuntime',
  );

  async function invokeBuddy(message, userId) {
    return withBuddyChatGuarantee(
      () =>
        runBuddy({
          userId,
          mode: 'study',
          personaKey: 'default',
          message,
        }),
      { userId, message },
    );
  }

  function restoreEnv() {
    if (saved.DISABLE === undefined) delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
    else process.env.BIBLEBUDDY_DISABLE_OPENAI = saved.DISABLE;
    if (saved.TIMEOUT === undefined) delete process.env.OPENAI_TIMEOUT_MS;
    else process.env.OPENAI_TIMEOUT_MS = saved.TIMEOUT;
    if (saved.CHAT_TIMEOUT === undefined) delete process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS;
    else process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS = saved.CHAT_TIMEOUT;
    if (saved.KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved.KEY;
  }

  try {
    // Secondary helper leak checks
    {
      const { mapInternalErrorToUserMessage } = require('../services/doctrineErrorFirewall');
      const { buildConnectionErrorReply } = require('../services/coreResponseGuards');
      const timeoutMsg = mapInternalErrorToUserMessage('openai_timeout', { strictDoctrine: false });
      check('O1_timeout_message_safe', timeoutMsg && !LEAK_RE.test(timeoutMsg), timeoutMsg.slice(0, 80));
      const rateMsg = mapInternalErrorToUserMessage('rate_limit', { strictDoctrine: false });
      check('O2_rate_limit_message_safe', rateMsg && !LEAK_RE.test(rateMsg), rateMsg.slice(0, 80));
      const conn = buildConnectionErrorReply({ error: 'openai_unavailable', safety: { level: 'standard' } });
      check('O3_connection_error_structure', conn?.reply && !LEAK_RE.test(conn.reply), String(conn.reply).slice(0, 80));
      const malformed = buildConnectionErrorReply({
        error: 'malformed_structured_output',
        safety: { level: 'standard' },
      });
      check('O4_malformed_does_not_hallucinate_doctrine', !HALLUCINATION_RE.test(malformed.reply), String(malformed.reply).slice(0, 80));
    }

    // Disable OpenAI via production env switch (no SDK call)
    {
      process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
      stubState.impl = async () => {
        throw new Error('stub should not be called when disabled');
      };
      stubState.calls = 0;
      const payload = await invokeBuddy(
        'Explain in your own words how Proverbs wisdom applies to choosing friends carefully today.',
        `g6-disable-${Date.now()}`,
      );
      const reply = extractReply(payload);
      assertSafeUserText(reply, 'R1');
      check(
        'R1_disable_openai_safe_reply',
        stubState.calls === 0 && !LEAK_RE.test(reply),
        `calls=${stubState.calls} route=${extractRoute(payload)} | ${reply.slice(0, 90)}`,
      );
      delete process.env.BIBLEBUDDY_DISABLE_OPENAI;
    }

    // Rate limit
    {
      stubState.calls = 0;
      stubState.impl = async () => {
        const err = new Error('429 Rate limit exceeded');
        err.status = 429;
        throw err;
      };
      const payload = await invokeBuddy(
        'Share a thoughtful reflection on patience from James without quoting a full chapter.',
        `g6-429-${Date.now()}`,
      );
      const reply = extractReply(payload);
      assertSafeUserText(reply, 'R2');
      check('R2_rate_limit_stub_safe', !LEAK_RE.test(reply) && !HALLUCINATION_RE.test(reply), reply.slice(0, 100));
    }

    // 5xx
    {
      stubState.impl = async () => {
        const err = new Error('503 Service Unavailable');
        err.status = 503;
        throw err;
      };
      const payload = await invokeBuddy(
        'Offer a brief pastoral encouragement about waiting on the Lord from the Psalms.',
        `g6-5xx-${Date.now()}`,
      );
      const reply = extractReply(payload);
      assertSafeUserText(reply, 'R3');
      check('R3_5xx_stub_safe', !LEAK_RE.test(reply), reply.slice(0, 100));
    }

    // Timeout (hung create)
    {
      process.env.OPENAI_TIMEOUT_MS = '40';
      stubState.impl = () => new Promise(() => {});
      const payload = await invokeBuddy(
        'Write a short reflection on kindness drawn from New Testament teaching.',
        `g6-timeout-${Date.now()}`,
      );
      const reply = extractReply(payload);
      assertSafeUserText(reply, 'R4');
      check('R4_timeout_stub_safe', !LEAK_RE.test(reply) && !/openai_timeout/i.test(reply), reply.slice(0, 100));
      delete process.env.OPENAI_TIMEOUT_MS;
    }

    // Empty content
    {
      stubState.impl = async () => ({ choices: [{ message: { content: '' } }] });
      const payload = await invokeBuddy(
        'Give a concise thought on gratitude from Scripture themes.',
        `g6-empty-${Date.now()}`,
      );
      const reply = extractReply(payload);
      check(
        'R5_empty_response_no_crash',
        payload &&
          typeof reply === 'string' &&
          reply.trim().length > 8 &&
          !LEAK_RE.test(reply) &&
          !HALLUCINATION_RE.test(reply) &&
          !/^\[object Object\]$/i.test(reply.trim()),
        `len=${reply.length} route=${extractRoute(payload)} | ${reply.slice(0, 80)}`,
      );
    }

    // Invalid JSON
    {
      stubState.impl = async () => ({ choices: [{ message: { content: 'This is not JSON {{{' } }] });
      const payload = await invokeBuddy(
        'Share one sentence of encouragement about trust from biblical themes.',
        `g6-badjson-${Date.now()}`,
      );
      const reply = extractReply(payload);
      check(
        'R6_malformed_json_no_crash',
        payload && !LEAK_RE.test(reply) && !HALLUCINATION_RE.test(reply),
        reply.slice(0, 100),
      );
    }

    // Auth failure
    {
      stubState.impl = async () => {
        const err = new Error('Incorrect API key provided');
        err.status = 401;
        throw err;
      };
      const payload = await invokeBuddy(
        'Reflect briefly on humility using biblical themes.',
        `g6-401-${Date.now()}`,
      );
      const reply = extractReply(payload);
      assertSafeUserText(reply, 'R7');
      check('R7_auth_failure_safe', !/api key|Incorrect API/i.test(reply) && !LEAK_RE.test(reply), reply.slice(0, 100));
    }

    // No retry storm (compose single-shot under coreRestoration)
    {
      stubState.calls = 0;
      stubState.impl = async () => {
        throw new Error('500 Internal Server Error');
      };
      await invokeBuddy('A short biblical reflection on honesty.', `g6-retry-${Date.now()}`);
      check('R8_no_retry_storm', stubState.calls <= 2, `openai_create_calls=${stubState.calls}`);
    }

    // Memory pin still works
    {
      const pin = require('../services/explicitRememberPin');
      const entry = pin.maybeCapturePin(`resiliency-${Date.now()}`, 'Remember this marker: RESILIENCY_OK.');
      check('R9_memory_write_capture_ok', entry && /RESILIENCY_OK/i.test(entry.text), String(entry?.text || '').slice(0, 80));
    }

    // Production claim verifier (not universalClaimVerifier)
    {
      const { validateClaimToScripture, applyClaimDegradation } = require('../services/claimToScriptureValidator');
      const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
      const bad = 'Most Christians as biblical teach Sunday replaced the Sabbath.';
      const pack = buildRetrievalEvidencePack({ message: 'Is Sunday the Sabbath?', routingHintsOnly: true });
      const v = validateClaimToScripture({
        reply: bad,
        claims: [{ claimId: 'c1', claim: bad, type: 'doctrine', supportingScriptures: ['Acts 20:7'] }],
        evidencePack: pack,
        message: 'Is Sunday the Sabbath?',
      });
      const degraded = applyClaimDegradation(bad, v);
      check(
        'R10_claim_verifier_production_module',
        !v.passed && !/sunday replaced the sabbath/i.test(degraded),
        degraded.slice(0, 100),
      );
    }

    // Disable recovery: stub success after faults
    {
      stubState.impl = async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                reply: 'In the beginning God created the heaven and the earth. (Genesis 1:1)',
                scripture: ['Genesis 1:1'],
                mode: 'study',
              }),
            },
          },
        ],
      });
      const payload = await invokeBuddy('What does Genesis 1:1 say?', `g6-recover-${Date.now()}`);
      const reply = extractReply(payload);
      check(
        'R11_recovery_after_faults',
        /genesis|beginning|created/i.test(reply) && !LEAK_RE.test(reply),
        reply.slice(0, 100),
      );
    }
  } catch (err) {
    check('R_FATAL', false, String(err && err.stack ? err.stack : err));
  } finally {
    restoreEnv();
    stubState.impl = null;
    // Remove stub from cache so later processes don't inherit it in same worker
    delete require.cache[clientPath];
  }

  check(
    'P3_env_restored_no_fault_left',
    process.env.BIBLEBUDDY_DISABLE_OPENAI !== '1' &&
      (saved.DISABLE === undefined
        ? process.env.BIBLEBUDDY_DISABLE_OPENAI === undefined
        : process.env.BIBLEBUDDY_DISABLE_OPENAI === saved.DISABLE),
    `DISABLE=${process.env.BIBLEBUDDY_DISABLE_OPENAI} TIMEOUT=${process.env.OPENAI_TIMEOUT_MS}`,
  );

  const fail = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - fail}/${results.length} passed, ${fail} failed.`);
  if (fail) {
    console.log('OPENAI_RESILIENCY_DRILL FAIL');
    process.exit(1);
  }
  console.log('OPENAI_RESILIENCY_DRILL PASS');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
