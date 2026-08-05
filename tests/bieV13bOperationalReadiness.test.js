/**
 * BIE v1.3B — Operational readiness hotfixes
 * Run: node --test tests/bieV13bOperationalReadiness.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  detectCorrectionRequest,
  buildRevisionReply,
} = require('../services/responseRevisionOwner');
const {
  detectResurrectionChronologyTopic,
  detectStrictTopicFromMessage,
} = require('../services/doctrineTopicDetector');
const { saveContinuationMemory } = require('../services/conversationContinuationMemory');

describe('BIE v1.3B operational readiness hotfixes', () => {
  it('1. bare answer-yes-or-no on a new question is not a correction', () => {
    const userId = `v13b-corr-${Date.now()}`;
    saveContinuationMemory(userId, {
      message: 'What happens when a person dies?',
      answer: { reply: 'The dead know nothing until resurrection.' },
      route: 'death_state',
    });
    const msg =
      'Does Revelation explicitly name who releases Satan after the thousand years? Answer yes or no first.';
    assert.equal(detectCorrectionRequest(msg, { lastReply: 'prior', lastRoute: 'death_state' }), false);
    const revision = buildRevisionReply({ userId, message: msg });
    assert.equal(revision, null);
  });

  it('2. real missed-answer challenges still detect as corrections', () => {
    assert.equal(
      detectCorrectionRequest('You did not answer my pork question', {
        lastReply: 'something',
        lastRoute: 'dietary_law',
      }),
      true,
    );
  });

  it('3. satan-release questions are not swallowed by resurrection chronology', () => {
    const msg =
      'Does Revelation explicitly name who releases Satan after the thousand years? Answer yes or no first.';
    assert.equal(detectResurrectionChronologyTopic(msg), false);
    assert.notEqual(detectStrictTopicFromMessage(msg), 'resurrection');
  });

  it('4. first-resurrection chronology still routes to resurrection', () => {
    assert.equal(
      detectStrictTopicFromMessage("What happens to God’s people in the first resurrection?"),
      'resurrection',
    );
  });
});
