/**
 * Build approved evidence graph from retrieval pack — no new doctrine content.
 */

const { collectApprovedReferences } = require('./approvedCatalogEvidence');
const { buildApprovedSupportGraph } = require('./approvedSupportGraph');

function collectBindingRules(evidencePack = {}) {
  const rules = [];
  const cards = evidencePack.evidenceCards?.cards || [];
  for (const card of cards) {
    for (const rule of card.bindingRules || []) {
      rules.push({ rule, cardTopic: card.topic, cardId: card.cardId });
    }
  }
  for (const chain of evidencePack.approvedCatalogEvidence?.chains || []) {
    for (const theme of chain.themes || []) {
      rules.push({ rule: theme, cardTopic: chain.catalogKey, cardId: chain.catalogKey });
    }
  }
  return rules;
}

function collectCautionRefs(evidencePack = {}) {
  const cautions = [];
  for (const card of evidencePack.evidenceCards?.cards || []) {
    for (const item of card.cautionScriptures || []) {
      const ref = typeof item === 'string' ? item : item.reference;
      if (ref) {
        cautions.push({ reference: ref, note: item.note || '', cardId: card.cardId, strict: true });
      }
    }
    for (const passage of card.cautionPassages || []) {
      cautions.push({ reference: null, note: passage, cardId: card.cardId, strict: false });
    }
  }
  return cautions;
}

function buildApprovedEvidenceGraph(evidencePack = {}) {
  const cards = evidencePack.evidenceCards?.cards || [];
  const cardTopics = cards.map((c) => c.topic).filter(Boolean);
  const cardIds = cards.map((c) => c.cardId).filter(Boolean);
  const catalogKeys = evidencePack.approvedCatalogEvidence?.catalogKeys || [];
  const refs = collectApprovedReferences(evidencePack.approvedCatalogEvidence || {}, cards);
  const bindingRules = collectBindingRules(evidencePack);
  const cautionRefs = collectCautionRefs(evidencePack);
  const teachingOrders = (evidencePack.approvedCatalogEvidence?.chains || []).map((c) => ({
    catalogKey: c.catalogKey,
    teachingOrder: c.teachingOrder || [],
  }));

  const supportGraph = buildApprovedSupportGraph(evidencePack);

  return {
    refs,
    bindingRules,
    cautionRefs,
    cardTopics,
    cardIds,
    catalogKeys,
    teachingOrders,
    supportGraph,
    hasEvidence: refs.length > 0 || cards.length > 0,
    effectiveTopic: evidencePack.effectiveTopic || evidencePack.topic || cardTopics[0] || null,
    evidencePack,
  };
}

module.exports = {
  buildApprovedEvidenceGraph,
  collectBindingRules,
  collectCautionRefs,
};
