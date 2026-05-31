const fs = require('fs');
const path = require('path');
const { buildLearningContext, getCompanionLearningProfile } = require('./companionLearningLayer');

let getRelationalProfile = () => null;
try {
  ({ getProfile: getRelationalProfile } = require('./relationalPresence'));
} catch (_) {}

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'buddy-memory.json');

const DEFAULT_PROFILE = {
  scriptureDepth: 'balanced',
  tone: 'warm',
  memoryEnabled: true,
};

function readProfile(userId) {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return { ...DEFAULT_PROFILE };
    const store = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) || {};
    return { ...DEFAULT_PROFILE, ...(store[userId]?.profile || {}) };
  } catch (_) {
    return { ...DEFAULT_PROFILE };
  }
}

const DEPTH_RANK = { light: 1, moderate: 2, deep: 3, balanced: 2 };

function resolveScriptureDepth(profile = {}, learning = {}) {
  const fromProfile = profile.scriptureDepth || 'balanced';
  const fromLearning = learning.studyDepth || 'light';
  const rankProfile = DEPTH_RANK[fromProfile] || 2;
  const rankLearning = DEPTH_RANK[fromLearning] || 1;
  if (rankProfile <= 1 && rankLearning <= 1) return 'light';
  if (rankProfile >= 3 || rankLearning >= 3) return 'deep';
  return 'balanced';
}

function resolveDeliveryMode({ userId, profile = null }) {
  const userProfile = profile || readProfile(userId);
  const learning = buildLearningContext(userId);
  const stored = getCompanionLearningProfile(userId);
  let depth = resolveScriptureDepth(userProfile, learning);

  const presence = typeof getRelationalProfile === 'function' ? getRelationalProfile(userId) : null;
  if (presence?.companionDepth === 'light' || presence?.scriptureIntegration === 'light') {
    depth = 'light';
  }
  if (presence?.companionDepth === 'deep' || presence?.scriptureIntegration === 'study') {
    depth = 'deep';
  }

  return {
    depth,
    isLight: depth === 'light',
    isDeep: depth === 'deep',
    maxScriptureRefs: depth === 'light' ? 3 : depth === 'deep' ? 8 : 5,
    maxPathRefs: depth === 'light' ? 4 : depth === 'deep' ? 10 : 6,
    includeExpandedPaths: depth === 'deep',
    includeSummaryFirst: depth === 'light',
    studyPacing: learning.studyPacing || stored?.studyPacing || 'steady',
    studyFrequency: learning.studyFrequency || stored?.studyFrequency || { sessions: 0 },
    favoriteTopics: learning.favoriteTopics || [],
    favoriteBooks: stored?.favoriteBooks || [],
    favoriteContinuityPaths: stored?.favoriteContinuityPaths || [],
    prayerTopics: learning.prayerTopics || [],
    preferences: learning.preferences || userProfile,
  };
}

function trimScriptureForDelivery(scripture = [], delivery = {}) {
  const max = delivery.maxScriptureRefs || 5;
  return (scripture || []).slice(0, max);
}

function trimPathForDelivery(refs = [], delivery = {}) {
  const max = delivery.maxPathRefs || 6;
  return (refs || []).slice(0, max);
}

function buildDeliverySummary({ delivery, topicLabel = '' }) {
  if (!delivery.isLight) return null;
  if (topicLabel) {
    return `Here is a concise summary for ${topicLabel}. We can go deeper anytime you want.`;
  }
  return 'Here is a concise summary. We can go deeper anytime you want.';
}

function buildDeepStudyExtension({ delivery, registryKey = '', extraRefs = [] }) {
  if (!delivery.isDeep) return null;
  const parts = [];
  if (registryKey === 'kingdom') {
    parts.push('Messiah connection: Daniel 7:13-14 and Revelation 11:15 carry the kingdom theme forward.');
  }
  if (extraRefs.length) {
    parts.push(`Additional cross-references: ${extraRefs.slice(0, 4).join('; ')}.`);
  }
  if (delivery.includeExpandedPaths) {
    parts.push('Genesis-to-Revelation continuity path is available if you want to continue line upon line.');
  }
  return parts.length ? parts.join('\n') : null;
}

function applyDeliveryToReply({ reply = '', delivery = {}, summaryLine = null, extensionLine = null }) {
  const parts = [];
  if (delivery.isLight && summaryLine) parts.push(summaryLine);
  parts.push(reply);
  if (delivery.isDeep && extensionLine) parts.push(extensionLine);
  return parts.filter(Boolean).join('\n\n');
}

module.exports = {
  resolveDeliveryMode,
  trimScriptureForDelivery,
  trimPathForDelivery,
  buildDeliverySummary,
  buildDeepStudyExtension,
  applyDeliveryToReply,
};
