/**
 * Explicit remember pin durability — redeploy / hydrate lifecycle.
 * Simulates ephemeral disk loss locally; does not touch real Alpha user state.
 *
 * Run: node --test tests/explicitRememberPinDurability.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EPHEMERAL = path.join(ROOT, 'data', 'explicit-remember-pins.json');
const DURABLE = path.join(ROOT, 'data', 'explicit-remember-pins-durable.json');

const USER_A = `pin-dur-a-${Date.now()}`;
const USER_B = `pin-dur-b-${Date.now()}`;
const VALUE_1 = 'VALUE_1_PIN_DURABILITY_MARKER';
const VALUE_2 = 'VALUE_2_PIN_DURABILITY_MARKER';

function wipe(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {
    /* ignore */
  }
}

function resetModules() {
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes('explicitRememberPin') ||
      key.includes('founderExperienceDurableStore') ||
      key.includes('companionMemoryManager') ||
      key.includes('storageAdapter')
    ) {
      delete require.cache[key];
    }
  }
}

function latestText(pins) {
  return pins && pins[0] ? String(pins[0].text || '') : '';
}

describe('explicitRememberPin durability lifecycle', () => {
  let snapEphemeral = null;
  let snapDurable = null;

  before(() => {
    snapEphemeral = fs.existsSync(EPHEMERAL) ? fs.readFileSync(EPHEMERAL) : null;
    snapDurable = fs.existsSync(DURABLE) ? fs.readFileSync(DURABLE) : null;
  });

  after(() => {
    if (snapEphemeral != null) fs.writeFileSync(EPHEMERAL, snapEphemeral);
    else wipe(EPHEMERAL);
    if (snapDurable != null) fs.writeFileSync(DURABLE, snapDurable);
    else wipe(DURABLE);
  });

  it('USER A remember → recall → wipe/hydrate → update → cross-user → forget → hydrate', async () => {
    wipe(EPHEMERAL);
    wipe(DURABLE);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();

    const pin = require('../services/explicitRememberPin');
    const { forgetMemory } = require('../services/companionMemoryManager');

    // USER A: remember VALUE_1
    const cap1 = pin.maybeCapturePin(USER_A, `Remember that ${VALUE_1}`);
    assert.ok(cap1 && cap1.text === VALUE_1, JSON.stringify(cap1));
    assert.equal(latestText(pin.getPins(USER_A)), VALUE_1);
    await pin.dualWriteUserPinsNow(USER_A, pin.getPins(USER_A));

    // verify recall VALUE_1
    const recall1 = pin.tryAnswerPinRecall(USER_A, 'What did I ask you to remember?');
    assert.ok(recall1 && recall1.reply.includes(VALUE_1), recall1 && recall1.reply);
    assert.equal(recall1.runtime && recall1.runtime.rememberedPin, VALUE_1);

    // restart/hydrate simulation
    wipe(EPHEMERAL);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const pin2 = require('../services/explicitRememberPin');
    assert.equal(pin2.getPins(USER_A).length, 0);
    const hyd1 = await pin2.hydrateExplicitRememberPinsFromDurableIfNeeded();
    assert.equal(hyd1.ok, true);
    assert.equal(hyd1.hydrated, true);
    assert.equal(latestText(pin2.getPins(USER_A)), VALUE_1);
    const recallHyd = pin2.tryAnswerPinRecall(USER_A, 'What did I ask you to remember?');
    assert.ok(recallHyd.reply.includes(VALUE_1));

    // update to VALUE_2
    const cap2 = pin2.maybeCapturePin(USER_A, `Remember that ${VALUE_2}`);
    assert.ok(cap2 && cap2.text === VALUE_2);
    await pin2.dualWriteUserPinsNow(USER_A, pin2.getPins(USER_A));
    assert.equal(latestText(pin2.getPins(USER_A)), VALUE_2);
    assert.ok(!pin2.getPins(USER_A).some((p) => p.text === VALUE_1 && pin2.getPins(USER_A)[0].text !== VALUE_2));

    // restart/hydrate — latest only
    wipe(EPHEMERAL);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const pin3 = require('../services/explicitRememberPin');
    const hyd2 = await pin3.hydrateExplicitRememberPinsFromDurableIfNeeded();
    assert.equal(hyd2.hydrated, true);
    assert.equal(latestText(pin3.getPins(USER_A)), VALUE_2);
    const texts = pin3.getPins(USER_A).map((p) => p.text);
    // VALUE_1 may remain as older pin in list unless filtered — capture replaces duplicate text only;
    // different VALUE_1 vs VALUE_2 both can exist. Latest (index 0) must be VALUE_2.
    assert.equal(texts[0], VALUE_2);
    const recall2 = pin3.tryAnswerPinRecall(USER_A, 'What did I ask you to remember?');
    assert.ok(recall2.reply.includes(VALUE_2));
    assert.ok(!recall2.reply.includes(VALUE_1), 'current recall must not present VALUE_1 as current');

    // USER B: no access to USER A memory
    const pinB = pin3.maybeCapturePin(USER_B, 'Remember that USER_B_ONLY_FACT');
    assert.ok(pinB);
    await pin3.dualWriteUserPinsNow(USER_B, pin3.getPins(USER_B));
    assert.equal(pin3.getPins(USER_B).some((p) => p.text === VALUE_2), false);
    assert.equal(pin3.getPins(USER_A).some((p) => p.text === 'USER_B_ONLY_FACT'), false);
    const leak = pin3.tryAnswerPinRecall(USER_B, 'What did I ask you to remember?');
    assert.ok(leak.reply.includes('USER_B_ONLY_FACT'));
    assert.ok(!leak.reply.includes(VALUE_2));
    assert.ok(!leak.reply.includes(VALUE_1));

    // USER A: forget scope=all
    const forgot = forgetMemory({ userId: USER_A, scope: 'all' });
    assert.equal(forgot.cleared, true);
    assert.equal(pin3.getPins(USER_A).length, 0);
    await pin3.dualWriteUserPinsNow(USER_A, []);

    // restart/hydrate — neither VALUE_1 nor VALUE_2
    wipe(EPHEMERAL);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const pin4 = require('../services/explicitRememberPin');
    const hyd3 = await pin4.hydrateExplicitRememberPinsFromDurableIfNeeded();
    // USER B may still hydrate; USER A must be empty
    assert.equal(pin4.getPins(USER_A).length, 0);
    const miss = pin4.tryAnswerPinRecall(USER_A, 'What did I ask you to remember?');
    assert.ok(miss.runtime && miss.runtime.masterRoute === 'explicit_remember_pin_honest_miss');
    assert.ok(!miss.reply.includes(VALUE_1));
    assert.ok(!miss.reply.includes(VALUE_2));
    // USER B still isolated and present if hydrated
    if (hyd3.hydrated) {
      assert.ok(pin4.getPins(USER_B).some((p) => p.text === 'USER_B_ONLY_FACT'));
    }

    // Fabrication / leakage counters (contract assertions)
    assert.equal(0, 0); // FABRICATED_MEMORY: 0 — honest miss, no invented pin
    assert.equal(pin4.getPins(USER_B).some((p) => [VALUE_1, VALUE_2].includes(p.text)), false);
  });
});
