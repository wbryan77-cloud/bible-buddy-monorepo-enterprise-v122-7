/**
 * Scripture Relationship Discovery — strengthens approved doctrine; never auto-modifies cards or answers.
 */

const fs = require('fs');
const path = require('path');
const { assertNoAutomaticCardMutation, isForbiddenGapPrompt } = require('./approvedDoctrineRegistry');
const { enrichCardsWithConcordance } = require('./concordanceFoundation');

const CONTINUITY_PATH = path.join(__dirname, '..', 'docs', 'bible-learning', 'scripture-continuity-sample.json');
const LANGUAGE_PATH = path.join(__dirname, '..', 'docs', 'bible-learning', 'original-language-chain-sample.json');

let _continuity = null;
let _language = null;

function loadContinuityChains() {
  if (_continuity) return _continuity;
  _continuity = JSON.parse(fs.readFileSync(CONTINUITY_PATH, 'utf8'));
  return _continuity;
}

function loadLanguageChains() {
  if (_language) return _language;
  _language = JSON.parse(fs.readFileSync(LANGUAGE_PATH, 'utf8'));
  return _language;
}

function getContinuityChainForTopic(topic = '') {
  const chains = loadContinuityChains().chains || [];
  return chains.find((c) => c.topic === topic && c.approved) || null;
}

function getLanguageChainForTopic(topic = '') {
  const chains = loadLanguageChains().chains || [];
  return chains.find((c) => c.topic === topic && c.approved) || null;
}

/**
 * Doctrine reinforcement finding — may strengthen assets; may NOT alter them automatically.
 */
function buildDoctrineReinforcementFinding({
  topic,
  cards = [],
  continuityChain = null,
  languageChain = null,
  concordanceSupport = [],
} = {}) {
  const card = cards.find((c) => c.topic === topic);
  const supportingScripturesFound = [];
  const continuityRefs = (continuityChain?.nodes || []).map((n) => n.reference).filter(Boolean);
  const existing = new Set([
    ...(card?.primaryScriptures || []),
    ...(card?.supportingScriptures || []),
  ]);

  for (const ref of continuityRefs) {
    if (!existing.has(ref)) supportingScripturesFound.push(ref);
  }

  const concordanceRefs = concordanceSupport
    .filter((s) => s.topic === topic)
    .flatMap((s) => s.additionalScriptureCandidates || []);

  const allNovel = [...new Set([...supportingScripturesFound, ...concordanceRefs])];

  const finding = {
    topic,
    supportingScripturesFound: allNovel,
    concordanceSupportFound: concordanceSupport
      .filter((s) => s.topic === topic)
      .flatMap((s) => s.concordanceSupportFound || []),
    originalLanguageSupportFound: languageChain
      ? {
          chainId: languageChain.chainId,
          confidenceScore: languageChain.confidenceScore,
          nodes: languageChain.nodes,
        }
      : null,
    continuityChainFound: continuityChain
      ? {
          chainId: continuityChain.chainId,
          confidenceScore: continuityChain.confidenceScore,
          eraFlow: continuityChain.nodes?.map((n) => ({ era: n.era, reference: n.reference })),
        }
      : null,
    confidenceScore: Math.min(
      1,
      (
        (continuityChain?.confidenceScore || 0.7) +
        (languageChain?.confidenceScore || 0.7) +
        (allNovel.length ? 0.05 : 0)
      ) / 2
    ),
    reviewRequired: allNovel.length > 0,
    autoApplied: false,
    timestamp: new Date().toISOString(),
    summary: allNovel.length
      ? `Additional supporting evidence candidates for ${topic} (admin review before card merge)`
      : `Approved ${topic} doctrine reinforced by continuity and language chains`,
  };

  if (isForbiddenGapPrompt(finding.summary)) {
    throw new Error('Discovery engine: forbidden gap-detection output');
  }

  return finding;
}

/**
 * Run discovery for retrieved cards — returns reinforcement array for composer/admin only.
 */
function discoverScriptureRelationships(cards = []) {
  const concordanceSupport = enrichCardsWithConcordance(cards);
  const reinforcement = [];

  for (const card of cards) {
    const continuityChain = getContinuityChainForTopic(card.topic);
    const languageChain = getLanguageChainForTopic(card.topic);
    const finding = buildDoctrineReinforcementFinding({
      topic: card.topic,
      cards,
      continuityChain,
      languageChain,
      concordanceSupport,
    });
    reinforcement.push(finding);
  }

  assertNoAutomaticCardMutation({ cards, reinforcement });
  return reinforcement;
}

function resetDiscoveryCache() {
  _continuity = null;
  _language = null;
}

module.exports = {
  loadContinuityChains,
  loadLanguageChains,
  getContinuityChainForTopic,
  getLanguageChainForTopic,
  buildDoctrineReinforcementFinding,
  discoverScriptureRelationships,
  resetDiscoveryCache,
};
