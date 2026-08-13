/**
 * Help Center must not overclaim capabilities the Founder Alpha surface lacks.
 */
const assert = require('assert');
const {
  listArticles,
  getArticle,
} = require('../services/helpCenterContentStore');
const { askUserAssistance, isBibleOrDoctrineQuestion } = require('../services/userAssistanceAssistant');

const OVERCLAIM = /Buddy always answers Scripture questions from the Bible text itself/i;

function main() {
  const articles = listArticles({ limit: 100 });
  assert.ok(articles.length >= 1, 'expected help articles');
  for (const article of articles) {
    assert.ok(!OVERCLAIM.test(String(article.body || '')), `overclaim in ${article.id}`);
    assert.ok(
      !/feedback control near a response/i.test(String(article.body || '')),
      `feedback control overclaim in ${article.id}`
    );
    assert.ok(
      !/Use the notification preferences screen/i.test(String(article.body || '')),
      `notification screen overclaim in ${article.id}`
    );
  }
  const gs = getArticle('getting-started');
  assert.ok(gs, 'getting-started present');
  assert.ok(!OVERCLAIM.test(gs.body), 'getting-started repaired');
  assert.ok(/retrieves the actual Bible text/i.test(gs.body), 'contract wording present');
  assert.ok(!/Tap the chat orb to start talking/i.test(gs.body), 'dead orb-only CTA removed');
  assert.ok(/chat box|composer|Type a message/i.test(gs.body), 'getting-started points to chat');

  const fb = getArticle('how-do-i-give-feedback');
  assert.ok(fb, 'feedback article present');
  assert.ok(/Help Assistant|alpha\/beta feedback/i.test(fb.body), 'honest feedback path');

  const np = getArticle('notification-preferences');
  assert.ok(np, 'notification article present');
  assert.ok(/alpha tester/i.test(np.body), 'notifications scoped to alpha');

  // Help Ask must serve seeded how-to FAQs, not Companion redirect
  assert.equal(isBibleOrDoctrineQuestion('How do I ask a Bible question?'), false);
  assert.equal(isBibleOrDoctrineQuestion('How do I ask Buddy to pray with me?'), false);
  assert.equal(isBibleOrDoctrineQuestion('What does John 3:16 mean?'), true);

  const bibleHowTo = askUserAssistance({ question: 'How do I ask a Bible question?' });
  assert.equal(bibleHowTo.redirectToCompanionAI, false, 'FAQ must not redirect to Companion');
  assert.equal(bibleHowTo.answered, true);
  assert.ok(bibleHowTo.article && bibleHowTo.article.id === 'how-do-i-ask-a-bible-question');

  const prayerHowTo = askUserAssistance({ question: 'How do I ask Buddy to pray with me?' });
  assert.equal(prayerHowTo.redirectToCompanionAI, false);
  assert.equal(prayerHowTo.answered, true);
  assert.ok(prayerHowTo.article && prayerHowTo.article.id === 'how-do-i-ask-for-prayer');

  const doctrine = askUserAssistance({ question: 'What does John 3:16 mean?' });
  assert.equal(doctrine.redirectToCompanionAI, true);

  const low = askUserAssistance({ question: 'Is there a purple widget called zorp?' });
  assert.equal(low.escalated, true);
  assert.ok(!/you'll be able to see a reply once it's answered/i.test(String(low.answer || '')));
  assert.ok(/team for review/i.test(String(low.answer || '')));

  console.log('PASS helpCenterDocumentationContract');
}

main();
