const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'runtime-conversation-state.json');

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function readStore() {
  try {
    if (!fs.existsSync(STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Conversation state write failed:', error.message);
  }
}

function saveConversationState({
  userId,
  mode = 'talk',
  currentTopic = '',
  unresolvedTopics = [],
  lastScriptures = [],
}) {
  const store = readStore();

  store[userId] = {
    mode,
    currentTopic,
    unresolvedTopics,
    lastScriptures,
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
}

function getConversationState(userId) {
  const store = readStore();

  return store[userId] || {
    mode: 'talk',
    currentTopic: null,
    unresolvedTopics: [],
    lastScriptures: [],
  };
}

function buildConversationStateContext(userId) {
  const state = getConversationState(userId);

  return {
    scriptureFirst: true,
    continuityEnabled: true,
    currentMode: state.mode,
    currentTopic: state.currentTopic,
    unresolvedTopics: state.unresolvedTopics,
    priorScriptureChain: state.lastScriptures,
  };
}

module.exports = {
  saveConversationState,
  getConversationState,
  buildConversationStateContext,
};
