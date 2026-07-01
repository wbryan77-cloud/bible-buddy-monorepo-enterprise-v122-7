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
    activeDoctrineUpdatedAt: null,
    lastAnsweredTopic: null,
    lastLane: 'companion',
    lastStrictDoctrineTopic: null,
    releaseRequested: false,
    nonDoctrineTurnCount: 0,
    doctrineSuspended: false,
    activeBibleConcept: null,
    lastBibleConcept: null,
    usedConceptWitnesses: [],
    lastPendingQuestion: null,
    lastAnsweredConcept: null,
    topicHistory: [],
    turnMemory: {
      lastUserQuestion: null,
      lastAnsweredConcept: null,
      lastRefsShown: [],
      lastAnswerSummary: null,
    },
    sessionMemory: {
      currentStruggle: null,
      activeConcept: null,
      pendingQuestion: null,
      stylePreferences: {},
    },
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
  const topicHistory = topicChanged
    ? [...(prev.topicHistory || []), prev.activeDoctrineTopic].filter(Boolean).slice(-8)
    : prev.topicHistory || [];
  const now = new Date().toISOString();
  return updateDoctrineConversationState(userId, {
    activeDoctrineTopic: topic,
    previousDoctrineTopic: topicChanged ? prev.activeDoctrineTopic : prev.previousDoctrineTopic,
    topicHistory,
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
    activeDoctrineUpdatedAt: now,
    lastAnsweredTopic: topic,
    lastLane: 'strict_doctrine',
    lastStrictDoctrineTopic: topic,
    releaseRequested: false,
    nonDoctrineTurnCount: 0,
    doctrineSuspended: false,
    activeBibleConcept: null,
    usedConceptWitnesses: [],
    lastAnsweredConcept: topic === 'kingdom' ? 'kingdom_on_earth' : topic === 'dietary_law' ? 'dietary_pork_unclean' : topic === 'sabbath' ? 'sabbath_seventh_day' : null,
  });
}

function recordUserTurn(userId, message = '', lane = 'companion') {
  const prev = getDoctrineConversationState(userId);
  const m = String(message || '').trim();
  const patch = {
    lastUserQuestion: m || prev.lastUserQuestion,
    lastLane: lane,
    lastUpdatedAt: new Date().toISOString(),
  };
  if (m && !/^(stop|show me another|give me more)$/i.test(m)) {
    patch.lastPendingQuestion = m;
  }
  if (lane === 'companion') {
    patch.nonDoctrineTurnCount = (prev.nonDoctrineTurnCount || 0) + 1;
  } else if (lane === 'strict_doctrine') {
    patch.nonDoctrineTurnCount = 0;
    patch.doctrineSuspended = false;
  }
  return updateDoctrineConversationState(userId, patch);
}

function releaseDoctrineTopic(userId, reason = 'release', options = {}) {
  const prev = getDoctrineConversationState(userId);
  const blockContinuation = options.blockContinuation !== false;
  const releasedTopic = prev.activeDoctrineTopic || null;
  const topicHistory =
    releasedTopic && !(prev.topicHistory || []).includes(releasedTopic)
      ? [...(prev.topicHistory || []), releasedTopic].filter(Boolean).slice(-8)
      : prev.topicHistory || [];
  return updateDoctrineConversationState(userId, {
    activeDoctrineTopic: null,
    previousDoctrineTopic: prev.previousDoctrineTopic,
    topicHistory,
    activeStrictContract: null,
    activeContract: null,
    doctrineSuspended: true,
    releaseRequested: blockContinuation,
    lastLane: 'companion',
    nonDoctrineTurnCount: prev.nonDoctrineTurnCount || 0,
    activeBibleConcept: blockContinuation ? null : prev.activeBibleConcept,
    lastAnsweredConcept: blockContinuation ? null : prev.lastAnsweredConcept,
    lastAnsweredTopic: blockContinuation ? null : prev.lastAnsweredTopic,
    lastStrictDoctrineTopic: blockContinuation ? null : prev.lastStrictDoctrineTopic,
    usedConceptWitnesses: blockContinuation ? [] : prev.usedConceptWitnesses,
    releaseReason: String(reason).slice(0, 80),
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

function clearReleaseRequested(userId) {
  return updateDoctrineConversationState(userId, {
    releaseRequested: false,
    doctrineSuspended: false,
  });
}

function updateTurnMemory(userId, patch = {}) {
  const state = getDoctrineConversationState(userId);
  const turn = { ...(state.turnMemory || {}), ...patch };
  const session = {
    ...(state.sessionMemory || {}),
    activeConcept: patch.lastAnsweredConcept || state.sessionMemory?.activeConcept,
    pendingQuestion: patch.lastUserQuestion || state.sessionMemory?.pendingQuestion,
  };
  return updateDoctrineConversationState(userId, {
    turnMemory: turn,
    sessionMemory: session,
    lastAnsweredConcept: patch.lastAnsweredConcept || state.lastAnsweredConcept,
  });
}

function finalizeStopRelease(userId) {
  const prev = getDoctrineConversationState(userId);
  return updateDoctrineConversationState(userId, {
    activeDoctrineTopic: null,
    activeStrictContract: null,
    activeContract: null,
    activeBibleConcept: null,
    lastAnsweredConcept: null,
    lastAnsweredTopic: null,
    lastStrictDoctrineTopic: null,
    usedConceptWitnesses: [],
    releaseRequested: false,
    doctrineSuspended: false,
    sessionMemory: {
      ...(prev.sessionMemory || {}),
      activeConcept: null,
      pendingQuestion: null,
    },
    releaseReason: 'stop_acknowledged',
  });
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
  recordUserTurn,
  releaseDoctrineTopic,
  clearReleaseRequested,
  updateTurnMemory,
  finalizeStopRelease,
};
