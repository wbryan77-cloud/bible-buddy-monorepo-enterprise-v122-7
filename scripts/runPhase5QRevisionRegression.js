/**
 * Phase 5Q Revision Regression
 * Enterprise rule: all tests must enter through public runtime runBuddy().
 * Helpers, owners, strategies, and legacy routes are implementation details.
 */

const { runBuddy } = require('../services/buddyBrain');

async function ask(userId, message) {
  const response = await runBuddy({ userId, message });

  return {
    message,
    route: response?.runtime?.masterRoute || null,
    owner: response?.runtime?.responseOwner || null,
    fallback: response?.runtime?.fallbackErrorCode || null,
    reply: String(response?.reply || ''),
  };
}

(async () => {
  const userId = `phase5q-public-runtime-${Date.now()}`;

  const rows = [];

  rows.push(await ask(userId, 'What does the app do?'));
  rows.push(await ask(userId, 'Tell me more'));

  rows.push(await ask(userId, 'Can you pray with me?'));
  rows.push(await ask(userId, 'I need a better prayer'));

  rows.push(await ask(userId, 'What about Acts 10?'));
  rows.push(await ask(userId, 'More scriptures'));

  rows.push(await ask(userId, "I'm nervous about tomorrow."));
  rows.push(await ask(userId, 'Go deeper'));

  console.table(rows.map((r) => ({
    message: r.message,
    route: r.route,
    owner: r.owner,
    fallback: r.fallback,
    reply: r.reply.slice(0, 120),
  })));

  const mustBeCompanionCore = [
    'Tell me more',
    'I need a better prayer',
    'More scriptures',
    'Go deeper',
  ];

  const failures = rows.filter((r) =>
    mustBeCompanionCore.includes(r.message) &&
    r.owner !== 'companion_core'
  );

  if (failures.length) {
    console.error('Phase 5Q revision failures:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Phase 5Q revision regression PASS');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
