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
    route: json.reply?.runtime?.masterRoute || '',
    fallback: json.reply?.runtime?.fallbackErrorCode || null,
    reply: json.reply?.reply || '',
  };
}

(async () => {
  const rows = [];

  let user = `phase5q-identity-${Date.now()}`;
  rows.push(await ask(user, 'What does the app do?'));
  rows.push(await ask(user, 'Tell me more'));

  user = `phase5q-prayer-${Date.now()}`;
  rows.push(await ask(user, 'Can you pray with me?'));
  rows.push(await ask(user, 'I need a better prayer'));

  user = `phase5q-scripture-${Date.now()}`;
  rows.push(await ask(user, 'What about Acts 10?'));
  rows.push(await ask(user, 'More scriptures'));

  user = `phase5q-nervous-${Date.now()}`;
  rows.push(await ask(user, "I'm nervous about tomorrow."));
  rows.push(await ask(user, 'Go deeper'));

  console.table(rows.map(r => ({
    message: r.message,
    route: r.route,
    fallback: r.fallback,
    reply: r.reply.slice(0, 100),
  })));

  const revisionRows = rows.filter(r =>
    /Tell me more|better prayer|More scriptures|Go deeper/i.test(r.message)
  );

  const failures = revisionRows.filter(r =>
    r.fallback ||
    !r.route.startsWith('response_revision_') ||
    /trouble retrieving|Which Bible topic|ask your question again/i.test(r.reply)
  );

  if (failures.length) {
    console.error('Phase 5Q revision failures:', JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Phase 5Q response revision regression PASS');
})();
