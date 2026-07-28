const fs = require('fs');
const path = require('path');
const { classifyImportance, IMPORTANCE_TIER, isEphemeralQuestion } = require('./memoryTruthfulness');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RELATIONSHIP_FILE = path.join(DATA_DIR, 'runtime-relationship-memory.json');

const MAX_STORED = 500;
const RETENTION_LIMIT = 80;

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(RELATIONSHIP_FILE)) return {};
    return JSON.parse(fs.readFileSync(RELATIONSHIP_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(RELATIONSHIP_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Relationship memory write failed:', error.message);
  }
}

function countCategoryFrequency(memories = [], category = '', issue = '') {
  const norm = String(issue || '').toLowerCase().trim();
  return memories.filter(
    (item) =>
      item.category === category &&
      (!norm || String(item.issue || item.detail || '').toLowerCase().includes(norm))
  ).length;
}

function applyMemoryRetention(memories = [], limit = RETENTION_LIMIT) {
  const ranked = memories.map((item) => ({
    ...item,
    tier: classifyImportance(item.category, item.importance, item.detail || item.issue),
  }));

  const high = ranked.filter((m) => m.tier === IMPORTANCE_TIER.HIGH);
  const medium = ranked.filter((m) => m.tier === IMPORTANCE_TIER.MEDIUM);
  const low = ranked.filter((m) => m.tier === IMPORTANCE_TIER.LOW);

  const highCap = Math.min(high.length, Math.ceil(limit * 0.5));
  const mediumCap = Math.min(medium.length, Math.ceil(limit * 0.35));
  const lowCap = Math.max(0, Math.min(low.length, limit - highCap - mediumCap));

  return [
    ...high.slice(-highCap),
    ...medium.slice(-mediumCap),
    ...low.slice(-lowCap),
  ].map(({ tier, ...item }) => item);
}

function saveRelationshipMemory({
  userId,
  category,
  detail,
  issue = null,
  importance = 'normal',
  frequency = 1,
}) {
  const store = readStore();
  const memories = store[userId] || [];
  const issueText = issue || detail;
  const priorCount = countCategoryFrequency(memories, category, issueText);

  let resolvedCategory = category;
  let resolvedImportance = importance;

  if (isEphemeralQuestion(detail || issueText)) {
    resolvedCategory = 'ephemeral_questions';
    resolvedImportance = 'low';
  } else if (category === 'important_people') {
    resolvedImportance = 'high';
  } else if (category === 'ongoing_goals' && /major|life|career|family|health|house|job/.test(String(detail))) {
    resolvedImportance = 'high';
  } else if (['grief_events', 'prayer_requests', 'health_concerns'].includes(category)) {
    resolvedImportance = 'high';
  }

  memories.push({
    category: resolvedCategory,
    detail: String(detail || issueText || '').slice(0, 220),
    issue: issueText ? String(issueText).slice(0, 120) : null,
    importance: resolvedImportance,
    frequency: priorCount + 1,
    createdAt: new Date().toISOString(),
  });

  store[userId] = applyMemoryRetention(memories).slice(-MAX_STORED);
  writeStore(store);

  // Phase 7C — mirror categorical facts into durableUserMemory (single durable owner)
  try {
    const {
      upsertMemory,
      MEMORY_TYPES,
      CONFIDENCE,
      PROVENANCE,
    } = require('./durableUserMemory');
    const typeMap = {
      important_people: MEMORY_TYPES.IMPORTANT_PERSON,
      prayer_requests: MEMORY_TYPES.PRAYER_SUBJECT,
      health_concerns: MEMORY_TYPES.ACTIVE_BURDEN,
      grief_events: MEMORY_TYPES.ACTIVE_BURDEN,
      ongoing_goals: MEMORY_TYPES.SPIRITUAL_GOAL,
      recurring_struggles: MEMORY_TYPES.ACTIVE_BURDEN,
    };
    const memoryType = typeMap[resolvedCategory];
    if (memoryType) {
      upsertMemory({
        userId,
        memoryType,
        content: String(detail || issueText || '').slice(0, 220),
        subject: issueText ? String(issueText).slice(0, 80) : null,
        confidence: resolvedImportance === 'high' ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM,
        provenance: PROVENANCE.SYSTEM_DERIVED_SUMMARY,
        retentionScope: 'long_term',
      });
    }
  } catch (_) {}
}

function getRelationshipMemory(userId, limit = 25) {
  const store = readStore();
  return (store[userId] || []).slice(-limit);
}

function getRelationshipMemoryByCategory(userId, category, limit = 10) {
  return getRelationshipMemory(userId, 100)
    .filter((item) => item.category === category)
    .slice(-limit);
}

function buildRelationshipContext(userId) {
  const memories = getRelationshipMemory(userId, 50);

  const grouped = memories.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item.detail || item.issue);
    return acc;
  }, {});

  return {
    scriptureFirst: true,
    relationshipContinuityEnabled: true,
    groupedMemory: grouped,
    healthConcerns: memories.filter((item) => item.category === 'health_concerns'),
    importantThemes: memories
      .filter((item) => item.importance === 'high')
      .map((item) => item.detail || item.issue),
    continuityEnabled: true,
  };
}

module.exports = {
  saveRelationshipMemory,
  getRelationshipMemory,
  getRelationshipMemoryByCategory,
  buildRelationshipContext,
};
