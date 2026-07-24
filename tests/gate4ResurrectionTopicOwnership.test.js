/**
 * GATE 4 regression — resurrection_timeline source-topic ownership must not
 * hijack death-state or bare verse-content questions.
 */
const assert = require('assert');
const { detectSourceTopic } = require('../services/sourceGroundedResponder');
const { detectResurrectionTimelineTopic } = require('../services/doctrineTopicDetector');

function run() {
  assert.strictEqual(
    detectSourceTopic('According to Scripture, what is the state of the dead before resurrection?'),
    null,
    'death-state before resurrection must not own resurrection_timeline',
  );
  assert.strictEqual(
    detectSourceTopic('What does 1 Corinthians 15 teach about resurrection?'),
    null,
    '1 Cor 15 content request must not own resurrection_timeline',
  );
  assert.strictEqual(
    detectSourceTopic('What does Matthew 12:40 say?'),
    null,
    'Matthew 12:40 verse-content request must not own resurrection_timeline',
  );
  assert.strictEqual(
    detectSourceTopic('Did Jesus rise Sunday morning?'),
    'resurrection_timeline',
    'Sunday-morning timing question must own resurrection_timeline',
  );
  assert.strictEqual(
    detectSourceTopic('How can Friday afternoon to Sunday morning be three days and three nights?'),
    'resurrection_timeline',
    'three-days timing question must own resurrection_timeline',
  );
  assert.ok(
    detectResurrectionTimelineTopic('Explain Matthew 12:40 and the three days and three nights.'),
    'timing-shaped Matthew 12:40 remains a timeline topic for the detector',
  );
  assert.strictEqual(
    detectSourceTopic('Explain Matthew 12:40 and the three days and three nights.'),
    'resurrection_timeline',
  );
  console.log('gate4ResurrectionTopicOwnership.test.js PASS');
}

run();
