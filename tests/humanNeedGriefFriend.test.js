#!/usr/bin/env node
/**
 * humanNeedDetector — bereavement phrasing must not collapse to clarification.
 * Regression for Sprint2 turn "I lost a friend."
 */
const assert = require('assert');
const { detectHumanNeed } = require('../services/humanNeedDetector');

const cases = [
  ['I lost a friend.', 'emotional_support'],
  ['I lost my friend.', 'emotional_support'],
  ['I lost someone.', 'emotional_support'],
  ['My mother passed away.', 'emotional_support'],
  ['What is the Sabbath?', (v) => v !== 'emotional_support'],
  ['My knees hurt.', 'health_support'],
  ['My chest has been hurting too.', 'health_support'],
  ["I'm angry at God.", 'emotional_support'],
  ["I'm thinking about quitting my job.", 'open_life'],
];

let failed = 0;
for (const [message, expected] of cases) {
  const actual = detectHumanNeed(message, {}, {});
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (!ok) {
    failed += 1;
    console.log(`FAIL  ${JSON.stringify(message)} → ${actual} (expected ${expected})`);
  } else {
    console.log(`PASS  ${JSON.stringify(message)} → ${actual}`);
  }
}

assert.strictEqual(failed, 0, `${failed} humanNeed cases failed`);
console.log(`Results: ${cases.length - failed}/${cases.length} passed`);
