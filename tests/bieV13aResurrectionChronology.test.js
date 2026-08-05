/**
 * BIE v1.3A — Resurrection chronology repair (approved)
 * Run: node --test tests/bieV13aResurrectionChronology.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  detectStrictTopicFromMessage,
  detectDeathStateTopic,
  detectResurrectionChronologyTopic,
  detectResurrectionTimelineTopic,
} = require('../services/doctrineTopicDetector');
const { BASE_CONTRACTS } = require('../services/doctrineAuthorityContract');
const {
  buildFinalAuthorityAnswer,
  buildResurrectionFinalAnswer,
  composeDeterministicDoctrineReply,
} = require('../services/doctrineFinalAuthorityEngine');

describe('BIE v1.3A resurrection chronology', () => {
  it('1. chronology phrases route to resurrection, not death_state', () => {
    assert.equal(detectResurrectionChronologyTopic('What happens to the rest of the dead?'), true);
    assert.equal(detectDeathStateTopic('What happens to the rest of the dead?'), false);
    assert.equal(detectStrictTopicFromMessage('What happens to the rest of the dead?'), 'resurrection');
    assert.equal(
      detectStrictTopicFromMessage("What happens to God’s people in the first resurrection?"),
      'resurrection',
    );
    assert.equal(detectStrictTopicFromMessage('By the Bible, how many resurrections are there?'), 'resurrection');
  });

  it('2. true death-state sleep questions still route to death_state', () => {
    assert.equal(detectStrictTopicFromMessage('What happens when a person dies?'), 'death_state');
    assert.equal(detectStrictTopicFromMessage('Do the dead know anything now?'), 'death_state');
  });

  it('3. resurrection chronology is not Jesus Gospel timeline null-route', () => {
    assert.equal(detectResurrectionTimelineTopic('Give the short version of the resurrection chronology.'), false);
    assert.equal(detectStrictTopicFromMessage('Give the short version of the resurrection chronology.'), 'resurrection');
  });

  it('4. contract includes Rev 20 / John 5 chronology witnesses', () => {
    const c = BASE_CONTRACTS.resurrection;
    assert.ok(c.approvedWitnesses.some((w) => /Revelation 20/i.test(w)));
    assert.ok(c.approvedWitnesses.some((w) => /John 5/i.test(w)));
    assert.ok(/first resurrection/i.test(c.requiredConclusion));
    assert.ok(/rest of the dead/i.test(c.requiredConclusion));
  });

  it('5. first-resurrection ask uses chronology conclusion and Rev 20 witnesses', () => {
    const auth = buildFinalAuthorityAnswer({
      topic: 'resurrection',
      message: "What happens to God’s people in the first resurrection?",
    });
    assert.ok(/first resurrection/i.test(auth.finalConclusion));
    assert.ok(!/hope Scripture gives; death is described as sleep/i.test(auth.finalConclusion));
    assert.ok(auth.scriptureWitnesses.some((w) => /Revelation 20/i.test(w)));
    const composed = composeDeterministicDoctrineReply({
      authority: auth,
      evidencePack: {
        verifiedLessonPacket: {
          passageRoles: [
            { reference: 'Matthew 28:1-6' },
            { reference: 'Mark 16:1-6' },
            { reference: 'Revelation 20:4-6' },
          ],
        },
      },
      message: "What happens to God’s people in the first resurrection?",
    });
    assert.ok(/Revelation 20/i.test(composed.reply));
    assert.ok(!/Matthew 28/i.test(composed.reply));
    assert.ok(/Direct answer/i.test(composed.reply));
  });

  it('6. rest of the dead uses Rev 20:5 focus, not sleep pack conclusion', () => {
    const auth = buildResurrectionFinalAnswer('What happens to the rest of the dead?');
    assert.ok(/rest of the dead/i.test(auth.finalConclusion));
    assert.ok(/Revelation 20:5/i.test(auth.finalConclusion) || auth.scriptureWitnesses.includes('Revelation 20:5'));
    assert.ok(!/dead know nothing/i.test(auth.finalConclusion));
  });

  it('7. Sabbath contract untouched', () => {
    assert.ok(BASE_CONTRACTS.sabbath);
    assert.ok(/sabbath/i.test(BASE_CONTRACTS.sabbath.requiredConclusion || BASE_CONTRACTS.sabbath.topic));
  });
});
