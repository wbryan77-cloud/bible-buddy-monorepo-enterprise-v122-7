const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'active-conversation-state.json');

// Conversation is considered active if the last turn happened within this window.
const ACTIVE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8') || '{}');
  } catch (_) {
    return {};
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (_) {}
}

// Topic family normalization — keeps sabbath/sabbath_history together, etc.
const TOPIC_FAMILY = {
  sabbath: 'sabbath',
  sabbath_history: 'sabbath',
  grief: 'grief',
  rest: 'grief',
  health: 'health',
  health_support: 'health',
  wellness: 'health',
  prayer: 'prayer',
  feast_days: 'feast_days',
  dietary_law: 'dietary_law',
  traditions: 'traditions',
  resurrection_timeline: 'resurrection_timeline',
  kingdom: 'kingdom',
};

function normalizeTopicFamily(topic = '') {
  const key = String(topic || '').toLowerCase().trim();
  return TOPIC_FAMILY[key] || key || null;
}

function getActiveConversation(userId = 'anonymous') {
  const state = readState();
  const entry = state[userId] || null;
  if (!entry) return null;
  const age = Date.now() - (entry.updatedAtMs || 0);
  return {
    ...entry,
    conversationAge: age,
    isActive: age <= ACTIVE_WINDOW_MS && !!entry.topic,
  };
}

function isConversationActive(userId = 'anonymous') {
  const active = getActiveConversation(userId);
  return !!(active && active.isActive);
}

/**
 * Record the active conversation turn. This is NOT long-term memory — it is the
 * live thread context that must outrank memory and companion enrichment.
 */
function updateActiveConversation({
  userId = 'anonymous',
  topic = null,
  subtopic = null,
  questionType = null,
  depth = 'standard',
  message = '',
  answerTopic = null,
  answerSummary = null,
  lastDirectQuestion = null,
  unansweredQuestion = null,
  lockUntilResolved = false,
  allowMemorySurfacing = null,
  allowStudyPrompt = null,
  correctionMode = false,
  frustrationMode = false,
} = {}) {
  if (!userId) return null;
  const state = readState();
  const prev = state[userId] || null;
  const family = normalizeTopicFamily(topic) || prev?.topic || null;
  const sameThread = prev && normalizeTopicFamily(prev.topic) === family;

  const isCorrection = correctionMode || questionType === 'correction';
  const isHistorical =
    ['historical_causation', 'historical_confirmation', 'evidence_request', 'historical_follow_up', 'follow_up', 'history'].includes(
      questionType
    ) || family === 'sabbath';

  const entry = {
    topic: family,
    subtopic: subtopic || prev?.subtopic || null,
    rawTopic: topic || prev?.rawTopic || null,
    questionType: questionType || prev?.questionType || null,
    depth: depth || prev?.depth || 'standard',
    lastUserQuestion: String(message || '').slice(0, 400),
    lastAnswerTopic: answerTopic || family,
    lastAnswerSummary: answerSummary || prev?.lastAnswerSummary || null,
    lastDirectQuestion: lastDirectQuestion || (isCorrection ? prev?.unansweredQuestion || prev?.lastUserQuestion : String(message || '').slice(0, 400)),
    unansweredQuestion: isCorrection
      ? unansweredQuestion || prev?.unansweredQuestion || prev?.lastDirectQuestion || prev?.lastUserQuestion
      : null,
    turnCount: sameThread ? (prev.turnCount || 0) + 1 : 1,
    startedAtMs: sameThread ? prev.startedAtMs || Date.now() : Date.now(),
    updatedAtMs: Date.now(),
    updatedAt: new Date().toISOString(),
    lockUntilResolved:
      lockUntilResolved ||
      isCorrection ||
      frustrationMode ||
      (sameThread && prev?.lockUntilResolved && isHistorical),
    allowMemorySurfacing:
      allowMemorySurfacing !== null
        ? allowMemorySurfacing
        : !isCorrection && !frustrationMode && !isHistorical && family !== 'sabbath',
    allowStudyPrompt:
      allowStudyPrompt !== null
        ? allowStudyPrompt
        : !isCorrection && !frustrationMode && !isHistorical && !sameThread,
    correctionMode: isCorrection,
    frustrationMode: frustrationMode || prev?.frustrationMode || false,
  };
  entry.conversationAge = Date.now() - entry.startedAtMs;

  state[userId] = entry;
  writeState(state);
  return entry;
}

function clearActiveConversation(userId = 'anonymous') {
  const state = readState();
  if (state[userId]) {
    delete state[userId];
    writeState(state);
  }
}

module.exports = {
  getActiveConversation,
  isConversationActive,
  updateActiveConversation,
  clearActiveConversation,
  normalizeTopicFamily,
  ACTIVE_WINDOW_MS,
};
