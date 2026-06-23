const BASE = process.env.BUDDY_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com';

async function ask(userId, message) {
  const res = await fetch(`${BASE}/buddy/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message }),
  });
  const json = await res.json();
  return {
    message,
    reply: json.reply?.reply || '',
    route: json.reply?.runtime?.masterRoute || '',
    fallback: json.reply?.runtime?.fallbackErrorCode || null,
  };
}

(async () => {
  const user = `phase5o-${Date.now()}`;
  const cases = [];
  cases.push(await ask(user, 'What does the app do?'));
  cases.push(await ask(user, 'Tell me more.'));
  cases.push(await ask(user, 'Can you pray with me?'));
  cases.push(await ask(user, 'I need a better prayer'));
  cases.push(await ask(user, "I'm nervous about tomorrow."));
  cases.push(await ask(user, 'Decision'));
  cases.push(await ask(user, 'Stop.'));

  console.table(cases.map(c => ({
    message: c.message,
    route: c.route,
    fallback: c.fallback,
    reply: c.reply.slice(0, 100),
  })));

  const failures = cases.filter(c =>
    c.fallback ||
    /trouble retrieving|Which Bible topic|ask your question again/i.test(c.reply)
  );

  if (failures.length) {
    console.error('Phase 5O failures:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Phase 5O continuation regression PASS');
})();
