#!/usr/bin/env node
/**
 * Sprint 2.REPAIR — end-to-end tests via POST /buddy/chat handler logic.
 * Mirrors routes/buddy.js POST /chat (same runBuddy call + normalizePayload).
 * Usage: node tests/sprint2RepairRoute.test.js
 */

const assert = require('assert');
const { runBuddy } = require('../services/buddyBrain');
const { containsInternalRuntimeLabels } = require('../services/runtimeLabelStripper');

const USER_ID = `s2repair-route-${Date.now()}`;

function normalizePayload(reply) {
  if (reply && typeof reply === 'object') return reply;
  return {
    reply: String(reply || "I'm here with you. Tell me a little more."),
    scripture: [],
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
  };
}

/** Same contract as POST /buddy/chat in routes/buddy.js */
async function postBuddyChat(message, userId = USER_ID) {
  const reply = await runBuddy({
    userId,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    message,
  });
  return { ok: true, status: 200, reply: normalizePayload(reply) };
}

function replyText(body) {
  return body?.reply?.reply || body?.reply || '';
}

function assertNoInternalLabels(text, label) {
  assert.ok(!/Source-grounded answer:/i.test(text), `${label}: leaked Source-grounded answer`);
  assert.ok(!/The app should not/i.test(text), `${label}: leaked The app should...`);
  assert.ok(!/Validation:/i.test(text), `${label}: leaked Validation:`);
  assert.ok(!containsInternalRuntimeLabels(text), `${label}: internal runtime labels present`);
}

function assertNoSlowDownFallback(text, label) {
  assert.ok(!/slow this down together/i.test(text), `${label}: old slow-down fallback appeared`);
}

async function runSequence() {
  const results = [];

  const steps = [
    {
      name: '1. What is the Sabbath?',
      message: 'What is the Sabbath?',
      assert: (text) => {
        assertNoInternalLabels(text, 'Sabbath definition');
        assert.match(text, /Genesis 2:2-3|seventh day|Sabbath/i);
        assert.ok(!/You're asking the historical side now/i.test(text), 'definition should not be history-only answer');
      },
    },
    {
      name: '2. Who changed the Sabbath and why?',
      message: 'Who changed the Sabbath and why?',
      assert: (text) => {
        assertNoInternalLabels(text, 'Sabbath history');
        assertNoSlowDownFallback(text, 'Sabbath history');
        assert.match(text, /historical/i);
        assert.match(text, /Scripture|Genesis|Exodus/i);
        assert.match(text, /not the same as a biblical command|does not show God changing/i);
        assert.ok(
          !/^That is a good question\. Let us walk it from Scripture first\.\s*Scripture explicitly identifies the seventh day/i.test(
            text.replace(/\s+/g, ' ')
          ),
          'should not repeat definition-only block'
        );
      },
    },
    {
      name: '3. That was not my question. Who changed it historically?',
      message: 'That was not my question. Who changed it historically?',
      assert: (text) => {
        assertNoInternalLabels(text, 'Correction turn');
        assert.match(text, /right|You're right|historical/i);
        assert.match(text, /Sunday|historical|Scripture/i);
      },
    },
    {
      name: '4. Give me historical evidence.',
      message: 'Give me the historical evidence.',
      assert: (text) => {
        assertNoInternalLabels(text, 'Historical evidence');
        assertNoSlowDownFallback(text, 'Historical evidence');
        assert.match(text, /historical/i);
        assert.match(text, /Scripture|Genesis|Exodus/i);
      },
    },
    {
      name: '5. I lost a friend.',
      message: 'I lost a friend.',
      assert: (text) => {
        assertNoSlowDownFallback(text, 'Grief');
        assert.match(text, /sorry|grief|here with you|comfort|Scripture|Psalm/i);
      },
    },
    {
      name: '6. My knees hurt.',
      message: 'My knees hurt.',
      assert: (text) => {
        assert.match(text, /knee|pain|health|Scripture|pray|gentle/i);
      },
    },
    {
      name: '7. Continue.',
      message: 'Continue.',
      assert: (text) => {
        assert.match(text, /continue|study|Scripture|pick up|where we left/i);
      },
    },
    {
      name: '8. What is the Kingdom of God?',
      message: 'What is the Kingdom of God?',
      assert: (text) => {
        assertNoInternalLabels(text, 'Kingdom');
        assert.match(text, /Kingdom|Scripture|Isaiah|Daniel|Revelation/i);
        assert.ok(!/\[object Object\]/i.test(text), 'Kingdom should not contain [object Object]');
      },
    },
  ];

  for (const step of steps) {
    try {
      const body = await postBuddyChat(step.message);
      assert.strictEqual(body.ok, true, `${step.name}: ok flag`);
      const text = replyText(body);
      assert.ok(text.length > 20, `${step.name}: empty reply`);
      step.assert(text);
      results.push({ name: step.name, passed: true, preview: text.slice(0, 160) });
    } catch (error) {
      results.push({ name: step.name, passed: false, error: error.message });
    }
  }

  return results;
}

async function main() {
  console.log('=== Sprint 2.REPAIR Route Tests (POST /buddy/chat handler parity) ===');
  console.log(`userId: ${USER_ID}`);
  console.log('');

  const results = await runSequence();
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.passed) {
      passed += 1;
      console.log(`PASS  ${result.name}`);
      console.log(`      ${result.preview}...`);
    } else {
      failed += 1;
      console.log(`FAIL  ${result.name}`);
      console.log(`      ${result.error}`);
    }
  }

  console.log('');
  console.log(`Results: ${passed}/${results.length} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
