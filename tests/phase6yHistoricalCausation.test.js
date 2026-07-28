/**
 * Phase 6Y — historical causation must not hit doctrine_final_authority.
 */
const assert = require('assert');
const { isExplicitHistoricalCausationAsk } = require('../services/historicalCausationAsk');
const { planCompanionDoctrineRouting } = require('../services/companionDoctrineRouter');
const { resolveFinalAuthorityForPack } = require('../services/doctrineFinalAuthorityEngine');
const { mustBlockOpenAi } = require('../services/strictDoctrineGate');

function run() {
  assert.strictEqual(isExplicitHistoricalCausationAsk('Who changed the Sabbath to Sunday historically?'), true);
  assert.strictEqual(isExplicitHistoricalCausationAsk('Who changed the Sabbath to Sunday?'), true);
  assert.strictEqual(isExplicitHistoricalCausationAsk('What is the Sabbath?'), false);
  assert.strictEqual(isExplicitHistoricalCausationAsk('Should I keep the seventh-day Sabbath?'), false);

  const plan = planCompanionDoctrineRouting({
    userId: 'phase6y-hist',
    message: 'Who changed the Sabbath to Sunday historically?',
  });
  assert.notStrictEqual(plan.lane, 'strict_doctrine');
  assert.strictEqual(plan.historyCausationAsk, true);

  const finalAuth = resolveFinalAuthorityForPack({
    userId: 'phase6y-hist',
    message: 'Who changed the Sabbath to Sunday?',
    evidencePack: { doctrineStrict: { enabled: true, strictTopic: 'sabbath' } },
  });
  assert.strictEqual(finalAuth.handled, false);

  const pack = { doctrineStrict: { enabled: true, strictTopic: 'sabbath' } };
  assert.strictEqual(mustBlockOpenAi(pack, 'phase6y-hist', 'Who changed the Sabbath to Sunday?'), false);

  // Doctrine WHAT questions still allow strict path planning for sabbath
  const doctrinePlan = planCompanionDoctrineRouting({
    userId: 'phase6y-hist2',
    message: 'What is the Sabbath according to Scripture?',
  });
  assert.ok(doctrinePlan.lane === 'strict_doctrine' || doctrinePlan.lane === 'bible_wide' || doctrinePlan.lane === 'companion');

  console.log('phase6yHistoricalCausation.test.js PASS');
}

run();
