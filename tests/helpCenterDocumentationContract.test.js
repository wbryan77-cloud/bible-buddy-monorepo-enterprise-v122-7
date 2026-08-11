/**
 * Help Center must not overclaim exclusive Bible-text answering.
 */
const assert = require('assert');
const {
  listArticles,
  getArticle,
} = require('../services/helpCenterContentStore');

const OVERCLAIM = /Buddy always answers Scripture questions from the Bible text itself/i;

function main() {
  const articles = listArticles({ limit: 100 });
  assert.ok(articles.length >= 1, 'expected help articles');
  for (const article of articles) {
    assert.ok(!OVERCLAIM.test(String(article.body || '')), `overclaim in ${article.id}`);
  }
  const gs = getArticle('getting-started');
  assert.ok(gs, 'getting-started present');
  assert.ok(!OVERCLAIM.test(gs.body), 'getting-started repaired');
  assert.ok(/retrieves the actual Bible text/i.test(gs.body), 'contract wording present');
  console.log('PASS helpCenterDocumentationContract');
}

main();
