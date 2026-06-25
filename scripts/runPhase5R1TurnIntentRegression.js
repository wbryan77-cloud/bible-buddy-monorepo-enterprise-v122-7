const { determineTurnIntent } = require('../services/turnIntentOwner');

const tests = [
  ['Stop.', 'STOP'],
  ['Tell me more', 'REVISE'],
  ['I need a better prayer', 'REVISE'],
  ['More scriptures', 'REVISE'],
  ['Go deeper', 'REVISE'],
  ['Can you pray with me?', 'PRAY'],
  ['What about Acts 10?', 'TEACH'],
  ['Can we eat pork?', 'TEACH'],
  ["I'm nervous about tomorrow.", 'COMPANION'],
];

const rows = tests.map(([message, expected]) => {
  const result = determineTurnIntent({ message, hasMemory: true });
  return { message, expected, actual: result.intent, pass: result.intent === expected };
});

console.table(rows);

const failures = rows.filter((r) => !r.pass);
if (failures.length) {
  console.error('Phase 5R.1 Turn Intent failures:', JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log('Phase 5R.1 Turn Intent regression PASS');
