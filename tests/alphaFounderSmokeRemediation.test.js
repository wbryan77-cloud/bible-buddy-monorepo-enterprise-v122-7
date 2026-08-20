/**
 * Founder Alpha smoke remediation — focused owner tests.
 * Run: node --test tests/alphaFounderSmokeRemediation.test.js
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('alpha founder smoke remediation', () => {
  beforeEach(() => {
    for (const key of Object.keys(require.cache)) {
      if (
        key.includes('explicitRememberPin') ||
        key.includes('humanNeedDetector') ||
        key.includes('practicalWisdomEngine') ||
        key.includes('practicalGuidanceEngine')
      ) {
        delete require.cache[key];
      }
    }
  });

  it('captures Remember that I prefer… (not false-success skip)', () => {
    const pin = require('../services/explicitRememberPin');
    const userId = 'tester-prefer-smoke-' + Date.now();
    pin.clearPinsForUser(userId);
    const entry = pin.maybeCapturePin(userId, 'Remember that I prefer shorter Bible studies.');
    assert.ok(entry, 'pin must capture prefer-style remember');
    assert.match(String(entry.text || ''), /shorter Bible studies/i);
    const recall = pin.tryAnswerPinRecall(userId, 'What did I ask you to remember?');
    assert.ok(recall?.reply, 'immediate recall must hit');
    assert.match(recall.reply, /shorter Bible studies/i);
    pin.clearPinsForUser(userId);
  });

  it('does not pin meta recall instructions as the remembered fact', () => {
    const pin = require('../services/explicitRememberPin');
    const userId = 'tester-meta-skip-' + Date.now();
    pin.clearPinsForUser(userId);
    pin.maybeCapturePin(userId, 'Remember that I prefer shorter Bible studies.');
    const meta = pin.maybeCapturePin(
      userId,
      'Remember that you need to find the remembered statement from earlier.',
    );
    assert.equal(meta, null);
    const recall = pin.tryAnswerPinRecall(userId, 'What did I ask you to remember?');
    assert.match(recall.reply, /shorter Bible studies/i);
    pin.clearPinsForUser(userId);
  });

  it('routes writing/text requests away from temptation_boundary', () => {
    const { detectHumanNeed, isWritingHelpRequest } = require('../services/humanNeedDetector');
    const msg =
      "Give me a text to tell her politely and empathetically that I don't want to commit fornication because of my commitment to God's Word.";
    assert.equal(isWritingHelpRequest(msg), true);
    assert.equal(detectHumanNeed(msg), 'practical_words_to_say');
    assert.equal(
      detectHumanNeed('Make that text warmer, more human, and mention the massage and my faith.'),
      'practical_words_to_say',
    );
    assert.equal(detectHumanNeed('Now give me the final text I can copy and paste to her.'), 'practical_words_to_say');
  });

  it('practical wisdom returns a copyable boundary draft for writing asks', () => {
    const { buildPracticalWisdomResponse } = require('../services/practicalWisdomEngine');
    const out = buildPracticalWisdomResponse({
      message:
        "Give me a text to tell her politely that I don't want to commit fornication because of my faith.",
    });
    assert.ok(out?.reply);
    assert.match(out.reply, /copy|You could say|Here is a text/i);
    assert.ok(!/^No\.\s*Staying with Scripture/i.test(out.reply));
    const revise = buildPracticalWisdomResponse({
      message: 'Make that text warmer, more human, and mention the massage and my faith.',
    });
    assert.ok(revise?.reply);
    assert.match(revise.reply, /massage|faith|respect/i);
  });

  it('public index contains alpha overlay and product shell markers', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
    assert.match(html, /id="alphaOverlay"/);
    assert.match(html, /bb_alpha_tester_id/);
    assert.match(html, /id="orbStage"/);
    assert.match(html, /id="helpOpenBtn"/);
    assert.match(html, /Was this response helpful/);
    assert.doesNotMatch(html, /Alpha chat/);
  });
});
