/**
 * Approved Doctrine Freeze — baseline truth assets; discovery may strengthen, never auto-modify.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'docs', 'bible-learning', 'approved-doctrine-registry.json');

let _registry = null;

function loadApprovedDoctrineRegistry() {
  if (_registry) return _registry;
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  _registry = JSON.parse(raw);
  return _registry;
}

function getFreezePolicy() {
  return loadApprovedDoctrineRegistry().freezePolicy;
}

function getApprovedTopics() {
  return loadApprovedDoctrineRegistry().approvedTopics || [];
}

function isTopicApprovedFrozen(topicKey = '') {
  const key = String(topicKey || '').trim();
  if (!key) return false;
  return getApprovedTopics().some(
    (t) => t.topicKey === key || t.cardId === key || t.parentTopic === key
  );
}

function getApprovedTopicEntry(topicKey = '') {
  const key = String(topicKey || '').trim();
  return getApprovedTopics().find((t) => t.topicKey === key || t.cardId === key) || null;
}

function isBibleFirstConclusionLocked(topicKey = '') {
  const entry = getApprovedTopicEntry(topicKey);
  return !!entry?.bibleFirstConclusionLocked;
}

const FORBIDDEN_GAP_PROMPTS = [
  /should this doctrine be approved\??/i,
  /should this doctrine be removed\??/i,
  /should this doctrine be reconsidered\??/i,
];

function isForbiddenGapPrompt(text = '') {
  return FORBIDDEN_GAP_PROMPTS.some((re) => re.test(String(text || '')));
}

/**
 * Reject any operation that would auto-modify approved doctrine.
 */
function assertNoAutomaticCardMutation({ cards = [], reinforcement = [], proposedChanges = null } = {}) {
  if (proposedChanges) {
    const blocked = [];
    if (proposedChanges.remove) blocked.push('remove');
    if (proposedChanges.downgrade) blocked.push('downgrade');
    if (proposedChanges.alterBibleFirstConclusion) blocked.push('alterBibleFirstConclusion');
    if (proposedChanges.replaceDoctrine) blocked.push('replaceDoctrine');
    if (proposedChanges.modifyFinalAnswer) blocked.push('modifyFinalAnswer');
    if (blocked.length) {
      throw new Error(
        `Approved doctrine freeze: automatic modification blocked (${blocked.join(', ')}). Administrator review required.`
      );
    }
  }

  for (const card of cards) {
    if (card.status && card.status !== 'approved_frozen' && card.approved) {
      throw new Error(`Approved doctrine freeze: card status mutation blocked for ${card.topic}`);
    }
  }

  for (const finding of reinforcement) {
    if (finding.autoApplied) {
      throw new Error('Approved doctrine freeze: reinforcement findings may not be auto-applied to cards');
    }
    if (isForbiddenGapPrompt(finding.summary || finding.message || '')) {
      throw new Error('Approved doctrine freeze: forbidden gap-detection prompt');
    }
  }
}

/**
 * Validate a proposed admin change (returns review queue item shape).
 */
function buildAdminReviewItem({ topic, changeType, proposedBy = 'discovery', details = {} } = {}) {
  return {
    topic,
    changeType,
    proposedBy,
    details,
    reviewRequired: true,
    autoApplied: false,
    timestamp: new Date().toISOString(),
    status: 'pending_administrator_review',
  };
}

function resetRegistryCache() {
  _registry = null;
}

module.exports = {
  loadApprovedDoctrineRegistry,
  getFreezePolicy,
  getApprovedTopics,
  isTopicApprovedFrozen,
  getApprovedTopicEntry,
  isBibleFirstConclusionLocked,
  isForbiddenGapPrompt,
  assertNoAutomaticCardMutation,
  buildAdminReviewItem,
  resetRegistryCache,
  REGISTRY_PATH,
};
