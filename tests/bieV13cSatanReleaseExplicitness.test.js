/**
 * BIE v1.3C — Satan release explicitness
 * Run: node --test tests/bieV13cSatanReleaseExplicitness.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isCorrectionMessage } = require('../services/userCorrectionMemory');
const { detectHumanNeed } = require('../services/humanNeedDetector');
const { detectConceptFromGraph } = require('../services/bibleConceptGraph');
const {
  detectSatanReleaseQuestion,
  findHintedReference,
  buildGroundedScriptureAnswer,
} = require('../services/groundedScriptureEngine');
const { planCompanionDoctrineRouting } = require('../services/companionDoctrineRouter');

describe('BIE v1.3C satan release explicitness', () => {
  it('1. bare answer-yes-or-no is preference-only, not correction', () => {
    assert.equal(isCorrectionMessage('Answer yes or no.'), false);
    assert.equal(
      isCorrectionMessage(
        'Does Revelation explicitly name who releases Satan? Answer yes or no.',
      ),
      false,
    );
    assert.notEqual(detectHumanNeed('Answer yes or no.'), 'correction_repair');
    assert.equal(
      detectHumanNeed('You did not answer my pork question'),
      'correction_repair',
    );
  });

  it('2. satan-release outranks millennial_kingdom', () => {
    const node = detectConceptFromGraph(
      'After the thousand years, is Satan released?',
    );
    assert.equal(node?.id, 'satan_released_after_millennium');
    const imperfect = detectConceptFromGraph(
      'after thousand years satan loosed who lets him out answer yes or no does rev name who',
    );
    assert.equal(imperfect?.id, 'satan_released_after_millennium');
  });

  it('3. grounded subtypes distinguish release vs named agent', () => {
    assert.equal(
      detectSatanReleaseQuestion('After the thousand years, is Satan released?'),
      'is_released',
    );
    assert.equal(
      detectSatanReleaseQuestion(
        'Does Revelation explicitly name the person or agent who releases him?',
      ),
      'explicit_agent_named',
    );
    assert.equal(
      detectSatanReleaseQuestion('Does God release Satan?'),
      'god_releases_claim',
    );
    assert.equal(
      detectSatanReleaseQuestion('Does an angel release Satan?'),
      'angel_releases_claim',
    );
    assert.equal(
      detectSatanReleaseQuestion('Does Satan release himself?'),
      'self_releases_claim',
    );
    assert.equal(
      detectSatanReleaseQuestion('Who releases him?'),
      'who_releases',
    );
  });

  it('4. claim hints identify Revelation 20:7-10', () => {
    assert.equal(
      findHintedReference('Who releases Satan after the thousand years?'),
      'Revelation 20:7-10',
    );
  });

  it('5. grounded replies do not name God as explicit releaser', async () => {
    const released = await buildGroundedScriptureAnswer({
      message: 'After the thousand years, is Satan released?',
      references: ['Revelation 20:7-10'],
    });
    assert.match(released.reply, /^Yes\b/i);
    assert.match(released.reply, /loosed|released/i);

    const named = await buildGroundedScriptureAnswer({
      message:
        'Does Revelation explicitly name the person or agent who releases him?',
      references: ['Revelation 20:7-10'],
    });
    assert.match(named.reply, /^No\b/i);
    assert.match(named.reply, /does not explicitly name/i);

    const god = await buildGroundedScriptureAnswer({
      message: 'Does God release Satan?',
      references: ['Revelation 20:7-10'],
    });
    assert.match(god.reply, /^No\b/i);
    assert.doesNotMatch(god.reply, /^Yes,\s*God releases/i);
    assert.match(god.reply, /does not explicitly state/i);

    const who = await buildGroundedScriptureAnswer({
      message: 'Who releases him?',
      references: ['Revelation 20:7-10'],
    });
    assert.match(who.reply, /does not explicitly name who/i);
    assert.doesNotMatch(who.reply, /^God releases Satan/i);
  });

  it('7. adversarial Pass B wording stays grounded', async () => {
    const cases = [
      {
        m: 'Once the millennium ends, is the devil set free again? Yes or no.',
        re: /^Yes\b/i,
      },
      {
        m: 'Name the releaser if Revelation actually names one.',
        re: /^No\b/i,
      },
      {
        m: 'Is it explicit that God lets Satan out, or is that reading into the verse?',
        re: /^No\b/i,
      },
    ];
    for (const c of cases) {
      assert.equal(findHintedReference(c.m), 'Revelation 20:7-10');
      const ans = await buildGroundedScriptureAnswer({
        message: c.m,
        references: ['Revelation 20:7-10'],
      });
      assert.match(ans.reply, c.re, c.m);
      assert.doesNotMatch(ans.reply, /Yes,\s*God releases Satan/i);
      assert.doesNotMatch(ans.reply, /releaser named.*is Satan/i);
    }
  });
});
