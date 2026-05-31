const fs = require('fs');
const path = require('path');
const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { getRecentStudySessions } = require('./continuityStudySessionRuntime');
const { getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { getConversationState } = require('./runtimeConversationStateEngine');
const { buildLearningContext, getCompanionLearningProfile } = require('./companionLearningLayer');
const {
  classifyTimestamp,
  classifyMemoryRecallQuery,
  MEMORY_WINDOWS,
  HONEST_UNAVAILABLE,
  readMemorySummaries,
} = require('./memoryRecallEngine');
const {
  buildTruthfulnessMeta,
  classifyTruthLevel,
  phrasingForTruthLevel,
  TRUTH_LEVEL,
} = require('./memoryTruthfulness');
const { getOpenLoops } = require('./openLoopsEngine');
const { analyzeEmotionalArc } = require('./emotionalArcEngine');
const { getActiveJourneys } = require('./lifeTimelineMemory');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'buddy-sessions.jsonl');

const RELATIONSHIP_RECALL_PATTERNS = [
  /how have i been doing/i,
  /what have i been carrying/i,
  /what have we been working on/i,
  /how am i progressing/i,
  /what has been on my mind/i,
  /how have i been feeling/i,
  /what have we talked about recently/i,
  /what should i focus on/i,
  /how have you been/i,
  /what were we talking about/i,
  /what did we talk about/i,
];

function classifyRelationshipRecallQuery(message = '') {
  const standard = classifyMemoryRecallQuery(message);
  const lower = String(message || '').toLowerCase();
  const isRelationshipRecall =
    standard.isRecallQuery ||
    RELATIONSHIP_RECALL_PATTERNS.some((pattern) => pattern.test(lower));

  if (!isRelationshipRecall) {
    return { isRecallQuery: false, timeWindow: null, recallType: null };
  }

  let recallType = 'general';
  if (/carrying|on my mind|feeling|focus on|how have i been/i.test(lower)) {
    recallType = 'relationship_status';
  } else if (/working on|progressing|studied|study/i.test(lower)) {
    recallType = 'study_progress';
  } else if (/talked about|talking about|remember/i.test(lower)) {
    recallType = 'conversation';
  }

  return {
    isRecallQuery: true,
    timeWindow: standard.timeWindow || MEMORY_WINDOWS.LAST_7_DAYS,
    recallType,
  };
}

function memoryAgeLabel(iso, now = new Date()) {
  const window = classifyTimestamp(iso, now);
  const labels = {
    current_conversation: 'just now',
    earlier_today: 'earlier today',
    yesterday: 'yesterday',
    last_7_days: 'this past week',
    older: 'a while back',
  };
  return labels[window] || 'recently';
}

function confidenceForHit(hit = {}) {
  if (hit.importance === 'high') return 'high';
  if (hit.source === 'relationship' || hit.source === 'prayer') return 'high';
  if (hit.source === 'study' || hit.source === 'summary') return 'medium';
  return 'medium';
}

function readAllSessions(userId, limit = 100) {
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
        category: 'conversation',
        at: entry.createdAt,
        message: entry.message,
        topic: entry.runtime?.doctrineTopic || entry.structured?.runtime?.doctrineTopic || null,
        importance: 'normal',
      });
    }
    return out.reverse();
  } catch (_) {
    return [];
  }
}

function collectRelationshipMemoryHits({ userId, recallType = 'general' }) {
  const now = new Date();
  const hits = [];

  for (const item of getRelationshipMemory(userId, 40)) {
    hits.push({
      source: 'relationship',
      category: item.category,
      message: item.detail || item.issue,
      issue: item.issue,
      at: item.createdAt,
      importance: item.importance || 'normal',
      frequency: item.frequency || 1,
      timeWindow: classifyTimestamp(item.createdAt, now),
      confidence: confidenceForHit({ source: 'relationship', importance: item.importance }),
    });
  }

  for (const session of getRecentStudySessions(userId, 20)) {
    hits.push({
      source: 'study',
      category: 'study',
      message: session.userQuestion,
      topic: session.topic,
      references: session.references,
      at: session.createdAt,
      importance: 'normal',
      timeWindow: classifyTimestamp(session.createdAt, now),
      confidence: 'medium',
    });
  }

  for (const prayer of getPrayerContinuity(userId, 10)) {
    hits.push({
      source: 'prayer',
      category: 'prayer_requests',
      message: prayer.prayerRequest,
      topic: prayer.topic,
      at: prayer.createdAt,
      importance: 'high',
      timeWindow: classifyTimestamp(prayer.createdAt, now),
      confidence: 'high',
    });
  }

  const continuity = getContinuityMemory(userId);
  for (const thread of continuity.recentThreads || []) {
    hits.push({
      source: 'continuity',
      category: 'continuity',
      message: thread.message,
      tags: thread.tags,
      at: thread.createdAt,
      importance: 'normal',
      timeWindow: classifyTimestamp(thread.createdAt, now),
      confidence: 'medium',
    });
  }

  for (const summary of readMemorySummaries(userId)) {
    hits.push({
      source: 'summary',
      category: 'conversation',
      message: summary.message,
      topic: summary.topic,
      at: summary.at,
      importance: 'normal',
      timeWindow: classifyTimestamp(summary.at, now),
      confidence: 'medium',
    });
  }

  const learning = getCompanionLearningProfile(userId);
  if (learning?.favoriteTopics) {
    for (const [topic, count] of Object.entries(learning.favoriteTopics)) {
      if (topic === 'companion') continue;
      hits.push({
        source: 'learning',
        category: 'favorite_study_topics',
        message: `frequent study: ${topic}`,
        topic,
        frequency: count,
        at: learning.updatedAt,
        importance: count >= 2 ? 'high' : 'normal',
        timeWindow: classifyTimestamp(learning.updatedAt, now),
        confidence: count >= 2 ? 'high' : 'medium',
      });
    }
  }

  for (const session of readAllSessions(userId, 30)) {
    hits.push({
      ...session,
      confidence: 'medium',
      timeWindow: classifyTimestamp(session.at, now),
    });
  }

  hits.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  if (recallType === 'relationship_status') {
    const priority = ['health_concerns', 'grief_events', 'recurring_struggles', 'prayer_requests', 'ongoing_goals'];
    hits.sort((a, b) => {
      const ai = priority.indexOf(a.category);
      const bi = priority.indexOf(b.category);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }

  return hits;
}

function buildMemoryConfidenceBlock(hits = []) {
  return hits.slice(0, 8).map((hit) => {
    const ageWindow = hit.timeWindow || classifyTimestamp(hit.at);
    const truthLevel = classifyTruthLevel({
      hit,
      frequency: hit.frequency || 1,
      ageWindow,
    });
    return {
      source: hit.source,
      category: hit.category || hit.source,
      age: memoryAgeLabel(hit.at),
      confidence: hit.confidence || confidenceForHit(hit),
      truthLevel,
      importance: hit.importance || 'normal',
      issue: hit.issue || null,
      frequency: hit.frequency || null,
    };
  });
}

function humanizeIssue(issue = '') {
  const lower = String(issue || '').toLowerCase();
  if (/knee/.test(lower)) return 'your knees have been bothering you';
  if (/back pain/.test(lower)) return 'your back has been giving you trouble';
  if (/sleep/.test(lower)) return 'sleep has been difficult';
  if (/fatigue|tired|weary/.test(lower)) return 'you have been feeling worn down';
  return `you have been carrying ${issue}`;
}

function buildMemoryPresenceLine(hits = [], recallType = 'general', message = '') {
  if (!hits.length) return null;

  const lower = String(message || '').toLowerCase();
  const health = hits.filter((h) => h.category === 'health_concerns').slice(0, 2);
  const grief = hits.filter((h) => h.category === 'grief_events').slice(0, 1);
  const struggles = hits.filter((h) => h.category === 'recurring_struggles').slice(0, 2);
  const prayers = hits.filter((h) => h.source === 'prayer' || h.category === 'prayer_requests').slice(0, 1);
  const studies = hits.filter((h) => h.source === 'study' || h.category === 'favorite_study_topics').slice(0, 2);
  const milestones = hits.filter((h) => h.category === 'life_milestones' || h.category === 'ongoing_goals').slice(0, 1);

  const fragments = [];
  const isHealthFocus = /knee|pain|hurt|health|sleep|fatigue|tired/i.test(lower);
  const isGriefFocus = /grief|loss|friend|died|mourning|bothering/i.test(lower);
  const isStudyFocus = /study|focus|working on|scripture|sabbath|kingdom/i.test(lower);

  if (health.length && (!isGriefFocus || isHealthFocus)) {
    const issue = health[0].issue || health[0].message;
    const phrase = humanizeIssue(issue);
    if (/\b(again|still|today)\b/i.test(lower)) {
      fragments.push(`${phrase} — and you're still feeling it`);
    } else {
      fragments.push(phrase);
    }
  }

  if (grief.length && (recallType === 'relationship_status' || recallType === 'general') && !isHealthFocus) {
    if (/\b(still|again|bothering)\b/i.test(lower)) {
      fragments.push('the loss you shared is still weighing on you');
    } else {
      fragments.push('you have been walking through grief after a loss');
    }
  }

  if (struggles.length && !isHealthFocus) {
    const fatigue = struggles.find((s) => /fatigue|rest|weary|tired/i.test(String(s.issue || s.message)));
    if (fatigue) {
      fragments.push('you have been feeling tired and needing rest');
    }
  }

  if (prayers.length && (recallType === 'relationship_status' || recallType === 'general')) {
    fragments.push('we have been praying together about something on your heart');
  }

  if (studies.length && (recallType === 'study_progress' || recallType === 'general' || isStudyFocus)) {
    const topic = studies[0].topic || studies[0].message;
    if (topic && !String(topic).includes('companion')) {
      const label = String(topic).replace(/^frequent study:\s*/i, '').replace(/studying /i, '').replace(/_/g, ' ');
      const refs = (studies[0].references || []).slice(-1)[0];
      if (refs) {
        fragments.push(`we have been studying ${label} together, recently around ${refs}`);
      } else {
        fragments.push(`we have been studying ${label} together`);
      }
    }
  }

  if (milestones.length && recallType === 'relationship_status') {
    fragments.push('you have been working toward something important in your life');
  }

  if (!fragments.length) return null;

  if (fragments.length === 1 && /knee|back pain|sleep|fatigue|weary/i.test(fragments[0])) {
    const pronoun = /knee/i.test(fragments[0]) ? 'they' : 'things';
    return `You mentioned recently that ${fragments[0]}. How have ${pronoun} been feeling lately?`;
  }

  const joined =
    fragments.length === 1
      ? fragments[0]
      : `${fragments.slice(0, -1).join(', ')} and ${fragments[fragments.length - 1]}`;

  return `You mentioned recently that ${joined}.`;
}

function dedupeRecallHits(hits = []) {
  const seen = new Set();
  const healthIssues = new Set();
  const out = [];

  for (const hit of hits) {
    if (hit.source === 'continuity' || hit.source === 'summary' || hit.source === 'session') {
      continue;
    }

    if (hit.category === 'health_concerns') {
      const issue = String(hit.issue || hit.message || '')
        .toLowerCase()
        .trim();
      if (!issue || healthIssues.has(issue)) continue;
      healthIssues.add(issue);
      out.push(hit);
      continue;
    }

    const key = `${hit.category}:${String(hit.message || hit.topic || hit.issue || '')
      .toLowerCase()
      .trim()
      .slice(0, 100)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }

  return out;
}

function formatRelationshipRecallResponse({ userId, message, recallType = 'general', timeWindow = null }) {
  const hits = collectRelationshipMemoryHits({ userId, recallType });
  const confidenceBlock = buildMemoryConfidenceBlock(hits);
  const recallHits = dedupeRecallHits(hits);

  if (!hits.length) {
    return {
      reply: HONEST_UNAVAILABLE,
      memoryAvailable: false,
      hits: [],
      confidenceBlock,
      timeWindow,
      recallType,
    };
  }

  const presence = buildMemoryPresenceLine(hits, recallType, message);
  const lines = [];

  if (presence) {
    lines.push(presence);
  } else {
    lines.push('Here is what I remember from our recent walk together:');
  }

  const narrativeParts = [];
  for (const hit of recallHits.slice(0, 4)) {
    if (hit.source === 'study' && hit.topic) {
      const refs = (hit.references || []).slice(-2).join(', ');
      narrativeParts.push(
        refs
          ? `We have been studying ${String(hit.topic).replace(/_/g, ' ')}, and we were recently in ${refs}.`
          : `We have been studying ${String(hit.topic).replace(/_/g, ' ')} together.`
      );
    } else if (hit.category === 'health_concerns') {
      narrativeParts.push(`You have mentioned ${humanizeIssue(hit.issue || hit.message).replace(/^you have been carrying /, '')} along the way.`);
    } else if (hit.category === 'grief_events') {
      narrativeParts.push('You have shared grief after a loss, and I have been holding that gently with you.');
    } else if (hit.source === 'prayer' || hit.category === 'prayer_requests') {
      const snippet = String(hit.message || '').slice(0, 80);
      narrativeParts.push(
        snippet
          ? `We have prayed together about "${snippet}${snippet.length >= 80 ? '...' : ''}".`
          : 'We have prayed together about something you were carrying.'
      );
    }
  }

  if (narrativeParts.length) {
    lines.push(narrativeParts.slice(0, 3).join('\n\n'));
  }

  const openLoops = getOpenLoops(userId, true).slice(0, 2);
  if (openLoops.length) {
    lines.push(`I am also holding these gently with you: ${openLoops.map((l) => l.label).join(', ')}.`);
  }

  const journeys = getActiveJourneys(userId);
  if (journeys.length && (recallType === 'study_progress' || /working on|focus on/i.test(String(message)))) {
    lines.push(`In your life journey, we have been walking through ${journeys[0].type} together.`);
  }

  if (/focus on|working on lately/i.test(String(message))) {
    const focusThemes = [];
    const studyHit = recallHits.find((h) => h.source === 'study' || h.category === 'favorite_study_topics');
    const prayerHit = recallHits.find((h) => h.source === 'prayer' || h.category === 'prayer_requests');
    const healthHit = recallHits.find((h) => h.category === 'health_concerns');
    const griefHit = recallHits.find((h) => h.category === 'grief_events');

    if (studyHit?.topic) {
      focusThemes.push(`continue your ${String(studyHit.topic).replace(/_/g, ' ')} study`);
    }
    if (prayerHit) focusThemes.push('pray through what you have been carrying');
    if (healthHit) focusThemes.push('care gently for your health');
    if (griefHit) focusThemes.push('give space for the grief you shared');

    if (focusThemes.length) {
      lines.push(
        `If you are wondering what to focus on this week, we could gently ${focusThemes.slice(0, 3).join(', or ')} — only what feels right for you.`
      );
    }
  }

  lines.push('Would you like to continue from any of that, pray through it, or turn to Scripture together?');

  return {
    reply: lines.join('\n'),
    memoryAvailable: true,
    hits: recallHits.slice(0, 10),
    confidenceBlock,
    timeWindow: timeWindow || hits[0]?.timeWindow,
    recallType,
    presenceUsed: !!presence,
  };
}

function searchRelationshipRecall({ userId, message, recallType, timeWindow }) {
  return formatRelationshipRecallResponse({
    userId,
    message,
    recallType,
    timeWindow,
  });
}

function filterHitsForMessage(hits = [], message = '') {
  const lower = String(message || '').toLowerCase();
  const healthFocus = /knee|pain|hurt|health|sleep|fatigue|tired|ache/i.test(lower);
  const griefFocus = /grief|loss|friend|died|mourning|bothering|passed/i.test(lower);
  const studyFocus = /study|scripture|sabbath|kingdom|focus|working on/i.test(lower);

  return hits.filter((hit) => {
    if (healthFocus && !griefFocus && hit.category === 'grief_events') return false;
    if (griefFocus && !healthFocus && hit.category === 'health_concerns') return false;
    if (studyFocus && hit.category === 'health_concerns' && !healthFocus) return false;
    return true;
  });
}

function getRelevantMemoryForSurfacing({ userId, message = '', maxItems = 3 }) {
  const hits = filterHitsForMessage(
    collectRelationshipMemoryHits({ userId, recallType: 'relationship_status' }),
    message
  );
  const line = buildMemoryPresenceLine(hits.slice(0, maxItems + 2), 'relationship_status', message);
  return {
    line,
    hits: hits.slice(0, maxItems),
    confidenceBlock: buildMemoryConfidenceBlock(hits.slice(0, maxItems)),
  };
}

module.exports = {
  RELATIONSHIP_RECALL_PATTERNS,
  classifyRelationshipRecallQuery,
  collectRelationshipMemoryHits,
  buildMemoryPresenceLine,
  buildMemoryConfidenceBlock,
  formatRelationshipRecallResponse,
  searchRelationshipRecall,
  getRelevantMemoryForSurfacing,
  memoryAgeLabel,
};
