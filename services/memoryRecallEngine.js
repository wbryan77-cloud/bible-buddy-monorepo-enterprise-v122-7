const fs = require('fs');
const path = require('path');
const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');
const { buildRelationshipContext, getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { getConversationState } = require('./runtimeConversationStateEngine');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'buddy-sessions.jsonl');
const MEMORY_FILE = path.join(DATA_DIR, 'buddy-memory.json');

const MEMORY_WINDOWS = Object.freeze({
  CURRENT: 'current_conversation',
  TODAY: 'earlier_today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  OLDER: 'older',
  ANY: 'any',
});

const RECALL_PATTERNS = [
  /what were we (talking|discussing)/i,
  /what did we (talk|discuss)/i,
  /do you remember (what|when|our)/i,
  /last conversation/i,
  /previous conversation/i,
  /what have we been (talking|discussing|studying)/i,
  /do you remember what we studied/i,
  /studied earlier today/i,
  /earlier today/i,
  /a few days ago/i,
];

const HONEST_UNAVAILABLE =
  "I don't have that conversation stored. If you'd like, we can start fresh on any Scripture or topic.";

function readMemorySummaries(userId) {
  try {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    const store = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')) || {};
    return (store[userId]?.summaries || []).map((item) => ({
      source: 'summary',
      at: item.at,
      message: item.userSaid,
      topic: item.intent,
      emotion: item.emotion,
      mode: item.buddyMode,
    }));
  } catch (_) {
    return [];
  }
}

function readAllSessions(userId, limit = 200) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const text = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = text.trim().split('\n').filter(Boolean);
    const out = [];

    for (let i = lines.length - 1; i >= 0 && out.length < limit; i -= 1) {
      const entry = JSON.parse(lines[i]);
      if (entry.userId !== userId) continue;
      out.push({
        source: 'session',
        at: entry.createdAt,
        message: entry.message,
        reply: entry.reply,
        mode: entry.mode,
        topic: entry.runtime?.doctrineTopic || entry.structured?.runtime?.doctrineTopic || null,
      });
    }

    return out.reverse();
  } catch (_) {
    return [];
  }
}

function classifyTimestamp(iso, now = new Date()) {
  if (!iso) return MEMORY_WINDOWS.OLDER;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return MEMORY_WINDOWS.OLDER;

  const diffMs = now - date;
  const diffMins = diffMs / 60000;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (diffMins <= 45) return MEMORY_WINDOWS.CURRENT;
  if (date >= todayStart) return MEMORY_WINDOWS.TODAY;
  if (date >= yesterdayStart && date < todayStart) return MEMORY_WINDOWS.YESTERDAY;
  if (date >= weekAgo) return MEMORY_WINDOWS.LAST_7_DAYS;
  return MEMORY_WINDOWS.OLDER;
}

function classifyMemoryRecallQuery(message = '') {
  const lower = String(message).toLowerCase();
  const isRecallQuery =
    RECALL_PATTERNS.some((pattern) => pattern.test(lower)) ||
    (lower.includes('remember') && (/\bwe\b|\bus\b|\bour\b/.test(lower) || lower.includes('last week')));

  if (!isRecallQuery) {
    return { isRecallQuery: false, timeWindow: null };
  }

  let timeWindow = MEMORY_WINDOWS.LAST_7_DAYS;
  if (/earlier today|this morning|studied earlier today/.test(lower)) {
    timeWindow = MEMORY_WINDOWS.TODAY;
  } else if (/a few days ago/.test(lower)) {
    timeWindow = MEMORY_WINDOWS.LAST_7_DAYS;
  } else if (/yesterday/.test(lower)) {
    timeWindow = MEMORY_WINDOWS.YESTERDAY;
  } else if (/last week|past week|seven days|7 days/.test(lower)) {
    timeWindow = MEMORY_WINDOWS.LAST_7_DAYS;
  } else if (/last month|long ago|months ago|years ago/.test(lower)) {
    timeWindow = MEMORY_WINDOWS.OLDER;
  } else if (/current|right now|this conversation|what were we just/.test(lower)) {
    timeWindow = MEMORY_WINDOWS.CURRENT;
  }

  return { isRecallQuery: true, timeWindow };
}

function matchesWindow(itemWindow, requestedWindow) {
  if (!requestedWindow || requestedWindow === MEMORY_WINDOWS.ANY) return true;
  if (requestedWindow === MEMORY_WINDOWS.LAST_7_DAYS) {
    return [
      MEMORY_WINDOWS.CURRENT,
      MEMORY_WINDOWS.TODAY,
      MEMORY_WINDOWS.YESTERDAY,
      MEMORY_WINDOWS.LAST_7_DAYS,
    ].includes(itemWindow);
  }
  if (requestedWindow === MEMORY_WINDOWS.TODAY) {
    return [MEMORY_WINDOWS.CURRENT, MEMORY_WINDOWS.TODAY].includes(itemWindow);
  }
  return itemWindow === requestedWindow;
}

function windowLabel(window) {
  const labels = {
    current_conversation: 'just a few minutes ago',
    earlier_today: 'earlier today',
    yesterday: 'yesterday',
    last_7_days: 'within the last week',
    older: 'a while back',
  };
  return labels[window] || 'recently';
}

function collectMemoryHits({ userId, timeWindow }) {
  const now = new Date();
  const hits = [];

  for (const session of readAllSessions(userId)) {
    const itemWindow = classifyTimestamp(session.at, now);
    if (!matchesWindow(itemWindow, timeWindow)) continue;
    hits.push({ ...session, timeWindow: itemWindow });
  }

  for (const summary of readMemorySummaries(userId)) {
    const itemWindow = classifyTimestamp(summary.at, now);
    if (!matchesWindow(itemWindow, timeWindow)) continue;
    hits.push({ ...summary, timeWindow: itemWindow });
  }

  const continuity = getContinuityMemory(userId);
  for (const thread of continuity.recentThreads || []) {
    const itemWindow = classifyTimestamp(thread.createdAt, now);
    if (!matchesWindow(itemWindow, timeWindow)) continue;
    hits.push({
      source: 'continuity',
      at: thread.createdAt,
      message: thread.message,
      reply: thread.reply,
      tags: thread.tags,
      timeWindow: itemWindow,
    });
  }

  for (const session of getRecentStudySessions(userId, 30)) {
    const itemWindow = classifyTimestamp(session.createdAt, now);
    if (!matchesWindow(itemWindow, timeWindow)) continue;
    hits.push({
      source: 'study',
      at: session.createdAt,
      message: session.userQuestion,
      topic: session.topic,
      references: session.references,
      studyStep: session.studyStep,
      timeWindow: itemWindow,
    });
  }

  for (const prayer of getPrayerContinuity(userId, 20)) {
    const itemWindow = classifyTimestamp(prayer.createdAt, now);
    if (!matchesWindow(itemWindow, timeWindow)) continue;
    hits.push({
      source: 'prayer',
      at: prayer.createdAt,
      topic: prayer.topic,
      message: prayer.prayerRequest,
      timeWindow: itemWindow,
    });
  }

  for (const rel of getRelationshipMemory(userId, 30)) {
    const itemWindow = classifyTimestamp(rel.createdAt, now);
    if (!matchesWindow(itemWindow, timeWindow)) continue;
    hits.push({
      source: 'relationship',
      at: rel.createdAt,
      category: rel.category,
      message: rel.detail,
      timeWindow: itemWindow,
    });
  }

  hits.sort((a, b) => new Date(b.at) - new Date(a.at));
  return hits;
}

function hitsMatchingRequestedWindow(hits, requestedWindow) {
  if (!requestedWindow) return hits;
  if (requestedWindow === MEMORY_WINDOWS.LAST_7_DAYS) {
    return hits.filter((hit) =>
      [MEMORY_WINDOWS.YESTERDAY, MEMORY_WINDOWS.LAST_7_DAYS, MEMORY_WINDOWS.OLDER].includes(hit.timeWindow)
    );
  }
  if (requestedWindow === MEMORY_WINDOWS.TODAY) {
    return hits.filter((hit) =>
      [MEMORY_WINDOWS.CURRENT, MEMORY_WINDOWS.TODAY].includes(hit.timeWindow)
    );
  }
  if (requestedWindow === MEMORY_WINDOWS.YESTERDAY) {
    return hits.filter((hit) => hit.timeWindow === MEMORY_WINDOWS.YESTERDAY);
  }
  if (requestedWindow === MEMORY_WINDOWS.CURRENT) {
    return hits.filter((hit) => hit.timeWindow === MEMORY_WINDOWS.CURRENT);
  }
  if (requestedWindow === MEMORY_WINDOWS.OLDER) {
    return hits.filter((hit) => hit.timeWindow === MEMORY_WINDOWS.OLDER);
  }
  return hits;
}

function formatMemoryRecallResponse({ hits, timeWindow }) {
  const requestedLabel = windowLabel(timeWindow);
  const matchingHits = hitsMatchingRequestedWindow(hits, timeWindow);
  const recentOutsideWindow = hits.filter((hit) => !matchingHits.includes(hit));

  if (!matchingHits.length && !hits.length) {
    return {
      reply: HONEST_UNAVAILABLE,
      memoryAvailable: false,
      hits: [],
      timeWindow,
      requestedWindow: timeWindow,
    };
  }

  if (!matchingHits.length && hits.length) {
    const recentLabel = windowLabel(hits[0].timeWindow);
    const lines = [
      `I found a recent memory from ${recentLabel}, but I do not have a stored memory from ${requestedLabel}.`,
      `The most recent thing I have is:`,
    ];

    const hit = hits[0];
    if (hit.source === 'study') {
      const refs = (hit.references || []).slice(0, 3).join(', ');
      lines.push(`- We were studying ${hit.topic || 'Scripture'}${refs ? ` (${refs})` : ''}.`);
    } else if (hit.message) {
      lines.push(`- You said: "${String(hit.message).slice(0, 160)}".`);
    }

    lines.push('Would you like to continue from that recent memory, or start fresh?');

    return {
      reply: lines.join('\n'),
      memoryAvailable: true,
      partialMatch: true,
      hits: hits.slice(0, 10),
      timeWindow: hits[0].timeWindow,
      requestedWindow: timeWindow,
    };
  }

  const label = requestedLabel;
  const lines = [`From ${label}, here is what I have stored:`];

  const seen = new Set();
  for (const hit of matchingHits.slice(0, 5)) {
    const key = `${hit.source}:${hit.message || hit.topic || hit.category}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (hit.source === 'study') {
      const refs = (hit.references || []).slice(0, 3).join(', ');
      lines.push(
        `- We were studying ${hit.topic || 'Scripture'}${refs ? ` (${refs})` : ''}.`
      );
      continue;
    }

    if (hit.source === 'prayer') {
      lines.push(`- We prayed about ${hit.topic || 'a concern'}: "${String(hit.message || '').slice(0, 120)}".`);
      continue;
    }

    if (hit.source === 'relationship') {
      lines.push(`- You shared about ${hit.category}: "${String(hit.message || '').slice(0, 120)}".`);
      continue;
    }

    if (hit.message) {
      lines.push(`- You said: "${String(hit.message).slice(0, 160)}".`);
    }
  }

  lines.push('Would you like to continue from there, or turn to a related Scripture?');

  return {
    reply: lines.join('\n'),
    memoryAvailable: true,
    hits: matchingHits.slice(0, 10),
    timeWindow,
    requestedWindow: timeWindow,
  };
}

function searchMemoryRecall({ userId, message, timeWindow }) {
  const hits = collectMemoryHits({ userId, timeWindow: timeWindow || MEMORY_WINDOWS.LAST_7_DAYS });
  return formatMemoryRecallResponse({ hits, timeWindow: timeWindow || MEMORY_WINDOWS.LAST_7_DAYS });
}

function buildMemoryReadContext(userId) {
  const summaries = readMemorySummaries(userId).slice(-10);
  const continuity = getContinuityMemory(userId);
  const relationship = buildRelationshipContext(userId);
  const conversation = getConversationState(userId);
  const studySessions = getRecentStudySessions(userId, 8);
  const prayers = getPrayerContinuity(userId, 5);

  return {
    summaries,
    continuity,
    relationship,
    conversation,
    studySessions,
    prayers,
    memoryEnabled: true,
  };
}

module.exports = {
  MEMORY_WINDOWS,
  HONEST_UNAVAILABLE,
  classifyMemoryRecallQuery,
  classifyTimestamp,
  collectMemoryHits,
  searchMemoryRecall,
  buildMemoryReadContext,
  readMemorySummaries,
};
