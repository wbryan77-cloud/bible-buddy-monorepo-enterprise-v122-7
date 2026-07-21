const assert = require('assert');

const BASE = process.env.BUDDY_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com';

const cases = [
  ['What is this app?', /Scripture-grounded companion|listen|study/i, /phase5l_app_identity/],
  ['What does the app do?', /Scripture-grounded companion|listen|study|pray/i, /phase5l_app_identity/],
  ['Can you pray with me?', /pray with you|Father/i, /phase5k_prayer_companion/],
  ['I need a better prayer', /pray|Father|Lord/i, /prayer|companion/],
  ["I'm nervous about tomorrow.", /nervous|weighing|breathe/i, /presence|nervous|companion/],
  ['Decision', /decision|tell me|what decision|weighing/i, /(presence|companion|guidance|clarification)/],
  ['I have a decision that is not about the Bible.', /decision|tell me|wisdom|choice/i, /(companion|guidance|presence)/],
  ['What should I say to my son?', /situation with your son|what happened|want him to understand/i, /practical|context/],
  ['Can we eat pork?', /No.*pork.*unclean|Leviticus|Deuteronomy/i, /doctrine_final_authority/],
  ['Can we eat shellfish?', /No.*shellfish.*unclean|Leviticus|Deuteronomy/i, /doctrine_final_authority/],
  ['What about Acts 10?', /Acts 10:28|people|Gentiles|common or unclean/i, /doctrine_final_authority/],
  ['Stop.', /stop|topic|what do you want/i, /stop|release|no_glitch_stop/],
];

(async () => {
  const out = [];
  for (const [message, replyRe, routeRe] of cases) {
    const res = await fetch(`${BASE}/buddy/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `phase5n-${Date.now()}`, message }),
    });
    const json = await res.json();
    const reply = json.reply?.reply || '';
    const route = json.reply?.runtime?.masterRoute || '';
    const fallback = json.reply?.runtime?.fallbackErrorCode || null;

    const pass = replyRe.test(reply) && routeRe.test(route) && !fallback;
    out.push({ message, pass, route, fallback, reply });
  }

  console.table(out.map(x => ({
    pass: x.pass,
    message: x.message,
    route: x.route,
    fallback: x.fallback,
    reply: x.reply.slice(0, 90),
  })));

  const failed = out.filter(x => !x.pass);
  if (failed.length) {
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
  console.log('Phase 5N single voice regression PASS');
})();
