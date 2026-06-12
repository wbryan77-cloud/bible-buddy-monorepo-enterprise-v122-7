/**
 * Phase 4D.2 — Active doctrine topic memory per user/session.
 */

const fs = require('fs');
const path = require('path');
const { BASE_CONTRACTS } = require('./doctrineAuthorityContract');

const STATE_PATH = path.join(__dirname, '..', 'data', 'doctrine-conversation-state.json');

const TOPIC_LABELS = {
  death_state: 'what Scripture teaches about death and resurrection',
  dietary_law: 'clean and unclean foods in Scripture',
  acts_10: 'Acts 10 and Peter’s explanation of the vision',
  sabbath: 'the Sabbath in Scripture',
  kingdom: 'the kingdom in Scripture',
  resurrection: 'resurrection hope in Scripture',
  holy_spirit: 'the Holy Spirit in Scripture',
  david: 'David and the Davidic covenant',
  new_jerusalem: 'New Jerusalem in Scripture',
  heavens: 'the heavens in Scripture',
};

function loadAll() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    }
  } catch {
    /* fresh */
  }
  return { users: {} };
}

function saveAll(state) {
  try {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.warn('[doctrineConversationState] save failed:', e.message);
  }
}

function defaultUserState() {
  return {
    activeDoctrineTopic: null,
    previousDoctrineTopic: null,
    activeStrictContract: null,
    activeContract: null,
    usedWitnesses: [],
    usedApproved: [],
    usedSupporting: [],
    lastApprovedWitness: null,
    lastUserDoctrineIntent: null,
    lastUserQuestion: null,
    lastDoctrineAnswerSummary: null,
    lastApprovedAnswerSummary: null,
    correctionPreferences: [],
    witnessExhausted: false,
    lastUpdatedAt: null,
  };
}

function getDoctrineConversationState(userId) {
  const all = loadAll();
  if (!all.users[userId]) {
    all.users[userId] = defaultUserState();
  }
  return all.users[userId];
}

function persistDoctrineConversationState(userId, userState) {
  const all = loadAll();
  all.users[userId] = { ...userState, lastUpdatedAt: new Date().toISOString() };
  saveAll(all);
}

function serializeContract(contract = {}) {
  if (!contract) return null;
  return {
    topic: contract.topic,
    requiredConclusion: contract.requiredConclusion,
    approvedWitnesses: contract.approvedWitnesses || [],
    supportingWitnesses: contract.supportingWitnesses || [],
    minimumWitnessCount: contract.minimumWitnessCount,
  };
}

function updateDoctrineConversationState(userId, patch = {}) {
  const state = getDoctrineConversationState(userId);
  const next = { ...state, ...patch, lastUpdatedAt: new Date().toISOString() };
  persistDoctrineConversationState(userId, next);
  return next;
}

function setActiveDoctrineConversation({
  userId,
  topic,
  contract,
  userMessage = '',
  answerSummary = '',
  usedWitnesses = null,
  lastWitness = null,
  witnessExhausted = false,
}) {
  const prev = getDoctrineConversationState(userId);
  const serialized = contract
    ? serializeContract(contract)
    : BASE_CONTRACTS[topic]
      ? serializeContract(BASE_CONTRACTS[topic])
      : null;
  const topicChanged = prev.activeDoctrineTopic && prev.activeDoctrineTopic !== topic;
  return updateDoctrineConversationState(userId, {
    activeDoctrineTopic: topic,
    previousDoctrineTopic: topicChanged ? prev.activeDoctrineTopic : prev.previousDoctrineTopic,
    activeStrictContract: serialized,
    activeContract: serialized,
    lastUserDoctrineIntent: userMessage,
    lastUserQuestion: userMessage || prev.lastUserQuestion,
    lastDoctrineAnswerSummary: answerSummary || stateSummary(topic, serialized),
    lastApprovedAnswerSummary: answerSummary || prev.lastApprovedAnswerSummary,
    usedWitnesses: usedWitnesses ?? prev.usedWitnesses,
    lastApprovedWitness: lastWitness ?? prev.lastApprovedWitness,
    witnessExhausted: topicChanged ? false : witnessExhausted,
    correctionPreferences: prev.correctionPreferences || [],
  });
}

function addCorrectionPreference(userId, entry = {}) {
  const state = getDoctrineConversationState(userId);
  const prefs = state.correctionPreferences || [];
  const exists = prefs.some((p) => p.topic === entry.topic && p.avoidPhrase === entry.avoidPhrase);
  if (!exists) prefs.push({ ...entry, loggedAt: new Date().toISOString() });
  return updateDoctrineConversationState(userId, { correctionPreferences: prefs });
}

function stateSummary(topic, contract) {
  if (contract?.requiredConclusion) return contract.requiredConclusion.slice(0, 200);
  return TOPIC_LABELS[topic] || topic;
}

function getActiveDoctrineTopic(userId) {
  return getDoctrineConversationState(userId).activeDoctrineTopic || null;
}

function markWitnessUsedInState(userId, ref, pool = 'approved') {
  const state = getDoctrineConversationState(userId);
  const key = String(ref).trim();
  if (pool === 'supporting') {
    if (!state.usedSupporting.includes(key)) state.usedSupporting.push(key);
  } else if (!state.usedApproved.includes(key)) {
    state.usedApproved.push(key);
  }
  if (!state.usedWitnesses.includes(key)) state.usedWitnesses.push(key);
  state.lastApprovedWitness = key;
  persistDoctrineConversationState(userId, state);
  return state;
}

function setWitnessExhausted(userId, exhausted = true) {
  return updateDoctrineConversationState(userId, { witnessExhausted: exhausted });
}

function clearDoctrineConversationState(userId) {
  const all = loadAll();
  delete all.users[userId];
  saveAll(all);
}

function topicDisplayLabel(topic) {
  return TOPIC_LABELS[topic] || topic;
}

module.exports = {
  STATE_PATH,
  TOPIC_LABELS,
  getDoctrineConversationState,
  updateDoctrineConversationState,
  setActiveDoctrineConversation,
  getActiveDoctrineTopic,
  markWitnessUsedInState,
  setWitnessExhausted,
  clearDoctrineConversationState,
  serializeContract,
  topicDisplayLabel,
  addCorrectionPreference,
};
