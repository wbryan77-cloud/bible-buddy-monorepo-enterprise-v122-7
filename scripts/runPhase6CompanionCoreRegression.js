const { determineTurnIntent } = require('../services/turnIntentOwner');
const { planContinuation } = require('../services/companionCore');

const cases = [
  ['Stop.', true, 'STOP', 'stop'],
  ['Tell me more', true, 'REVISE', 'continue'],
  ['I need a better prayer', true, 'REVISE', 'continue'],
  ['More scriptures', true, 'REVISE', 'continue'],
  ['Go deeper', true, 'REVISE', 'continue'],
  ['Can you pray with me?', false, 'PRAY', 'pray'],
  ['What about Acts 10?', false, 'TEACH', 'teach'],
  ["I'm nervous about tomorrow.", false, 'COMPANION', 'new_companion_turn'],
];

const rows = cases.map(([message, hasMemory, expectedIntent, expectedAction]) => {
  const turnIntent = determineTurnIntent({ message, hasMemory });
  const plan = planContinuation({ message, memory: hasMemory ? { lastAssistantReply: 'prior' } : null, turnIntent });
  return {
    message,
    expectedIntent,
    actualIntent: turnIntent.intent,
    expectedAction,
    actualAction: plan.action,
    pass: turnIntent.intent === expectedIntent && plan.action === expectedAction,
  };
});

console.table(rows);
const failures = rows.filter((r) => !r.pass);
if (failures.length) {
  console.error('Phase 6 Companion Core failures:', JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log('Phase 6 Companion Core regression PASS');
