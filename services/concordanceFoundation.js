/**
 * Approved Concordance Foundation — strengthens Evidence Cards; never authors final prose.
 */

const fs = require('fs');
const path = require('path');
const { assertNoAutomaticCardMutation } = require('./approvedDoctrineRegistry');

const PLAN_PATH = path.join(__dirname, '..', 'docs', 'bible-learning', 'concordance-index-plan.json');

let _plan = null;
let _seedIndex = null;

function loadConcordancePlan() {
  if (_plan) return _plan;
  const raw = fs.readFileSync(PLAN_PATH, 'utf8');
  _plan = JSON.parse(raw);
  _seedIndex = _plan.seedEntries || [];
  return _plan;
}

function getSeedConcordanceIndex() {
  loadConcordancePlan();
  return _seedIndex || [];
}

function lookupByTopic(topic = '') {
  const key = String(topic || '').trim();
  return getSeedConcordanceIndex().filter(
    (e) => (e.linkedTopics || []).includes(key) || (e.doctrinalThemes || []).includes(key)
  );
}

function lookupByStrongs(strongsId = '') {
  const id = String(strongsId || '').trim().toUpperCase();
  return getSeedConcordanceIndex().find((e) => String(e.strongsId).toUpperCase() === id) || null;
}

/**
 * Strengthen cards with concordance support — returns reinforcement metadata only.
 */
function enrichCardsWithConcordance(cards = []) {
  const support = [];

  for (const card of cards) {
    const entries = lookupByTopic(card.topic);
    if (!entries.length) continue;

    const concordanceSupportFound = entries.map((e) => ({
      strongsId: e.strongsId,
      lemma: e.lemma,
      transliteration: e.transliteration,
      gloss: e.gloss,
      occurrences: e.occurrences,
      language: e.language,
    }));

    const extraRefs = entries.flatMap((e) => e.occurrences || []);
    const novelRefs = extraRefs.filter(
      (r) =>
        !card.primaryScriptures?.includes(r) &&
        !card.supportingScriptures?.includes(r)
    );

    support.push({
      topic: card.topic,
      concordanceSupportFound,
      additionalScriptureCandidates: [...new Set(novelRefs)],
      reviewRequired: novelRefs.length > 0,
      autoApplied: false,
      source: 'concordance_foundation',
    });
  }

  assertNoAutomaticCardMutation({ cards, reinforcement: support });
  return support;
}

function buildConcordanceComposerHints(cards = []) {
  const support = enrichCardsWithConcordance(cards);
  if (!support.length) return [];

  return support.map((s) => ({
    topic: s.topic,
    hint: 'Original-language concordance entries support this topic (facts only — cite naturally in prose)',
    entries: s.concordanceSupportFound.map((e) => `${e.transliteration} (${e.strongsId}): ${e.gloss}`),
  }));
}

function resetConcordanceCache() {
  _plan = null;
  _seedIndex = null;
}

module.exports = {
  loadConcordancePlan,
  getSeedConcordanceIndex,
  lookupByTopic,
  lookupByStrongs,
  enrichCardsWithConcordance,
  buildConcordanceComposerHints,
  resetConcordanceCache,
  PLAN_PATH,
};
