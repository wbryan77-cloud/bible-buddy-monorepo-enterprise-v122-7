/**
 * Phase 4D.1 — Doctrine witness inventory and continuation (no OpenAI).
 */

const fs = require('fs');
const path = require('path');
const { BASE_CONTRACTS, resolveStrictTopic } = require('./doctrineAuthorityContract');
const { extractScriptureRefs } = require('./doctrineStrictValidator');
const {
  getActiveDoctrineTopic,
  markWitnessUsedInState,
  getDoctrineConversationState,
} = require('./doctrineConversationState');

const STATE_PATH = path.join(__dirname, '..', 'data', 'doctrine-witness-state.json');
const EXHAUSTION_MESSAGE =
  'I have shown the approved witness chain currently attached to this topic.';

const USER_FACING_EXHAUSTION_MESSAGE =
  'I have shown the approved witness chain currently attached to this topic.';

const CONTINUATION_PATTERNS = [
  /\banother (verse|witness|scripture|passage|reference)\b/i,
  /\bshow me another\b/i,
  /\bgive me another\b/i,
  /\bmore scripture\b/i,
  /\bmore verses?\b/i,
  /\bprove it\b/i,
  /\bi disagree\b/i,
  /\bwhat else\b/i,
  /\bany other (verse|witness|scripture)\b/i,
];

const WITNESS_SNIPPETS = {
  death_state: {
    'Ecclesiastes 9:5': 'Ecclesiastes 9:5 says the dead know not any thing.',
    'Ecclesiastes 9:10': 'Ecclesiastes 9:10 says there is no work, device, knowledge, nor wisdom in the grave.',
    'Psalm 146:4': 'Psalm 146:4 says his breath goeth forth and in that very day his thoughts perish.',
    'John 11:11-14': 'Jesus called Lazarus’ death sleep in John 11:11-14.',
    'Daniel 12:2': 'Daniel 12:2 speaks of many who sleep in the dust awakening at the resurrection.',
    '1 Thessalonians 4:13-16': 'Paul speaks of those asleep until the Lord brings them in 1 Thessalonians 4:13-16.',
    '1 Corinthians 15': '1 Corinthians 15 anchors hope in resurrection, not ongoing conscious life in death.',
    'Genesis 2:7': 'Genesis 2:7 shows life as breath from God; without breath, man returns to dust.',
    'Daniel 12:2-3': 'Daniel 12:2-3 ties awakening to the time of the end, not immediate heaven.',
    '1 Corinthians 15:51-55': '1 Corinthians 15:51-55 describes the dead raised incorruptible at the last trumpet.',
    'Psalm 6:5': 'Psalm 6:5 says in death there is no remembrance of thee.',
    'Psalm 115:17': 'Psalm 115:17 says the dead praise not the Lord.',
    'Job 14:10-15': 'Job 14:10-15 describes man dying and lying down until God calls.',
  },
  dietary_law: {
    'Leviticus 11': 'Leviticus 11 distinguishes clean and unclean animals for food.',
    'Deuteronomy 14': 'Deuteronomy 14 repeats the clean and unclean food law.',
    'Daniel 1:8': 'Daniel 1:8 shows faithful refusal of the king’s unclean food.',
    'Daniel 1:8-16': 'Daniel 1:8-16 records Daniel refusing unclean food and God honoring that stand.',
    'Acts 10:14': 'Acts 10:14 records Peter saying he has never eaten anything common or unclean.',
    'Acts 10:28': 'Acts 10:28 explains Peter learned not to call any man common or unclean — people, not food permission.',
    'Acts 11:1-18': 'Acts 11:1-18 records Peter explaining the vision concerned Gentiles, not unclean meat.',
    'Isaiah 66:17': 'Isaiah 66:17 treats eating swine’s flesh and abomination seriously in judgment.',
  },
  acts_10: {
    'Acts 10:14': 'Acts 10:14 records Peter saying he has never eaten anything common or unclean.',
    'Acts 10:28': 'Acts 10:28 — Peter explains God showed him not to call any man common or unclean.',
    'Acts 10:34-35': 'Acts 10:34-35 — Peter says God is no respecter of persons.',
    'Acts 11:1-18': 'Acts 11:1-18 records Peter explaining the vision concerned Gentiles, not unclean meat.',
  },
  sabbath: {
    'Genesis 2:2-3': 'Genesis 2:2-3 establishes the seventh day as rest blessed by God.',
    'Exodus 20:8-11': 'Exodus 20:8-11 commands remembering the Sabbath day to keep it holy.',
    'Isaiah 58:13-14': 'Isaiah 58:13-14 calls honoring the Sabbath a delight.',
    'Luke 4:16': 'Luke 4:16 shows Jesus keeping the Sabbath as was his custom.',
    'Acts 17:2': 'Acts 17:2 shows Paul reasoning in the synagogue on the Sabbath.',
    'Hebrews 4:9': 'Hebrews 4:9 speaks of a sabbatismos — a remaining rest for God’s people.',
    'Revelation 14:12': 'Revelation 14:12 ties patience of saints to commandments of God.',
  },
  kingdom: {
    'Matthew 6:10': 'Matthew 6:10 prays thy kingdom come.',
    'Luke 17:20-21': 'Luke 17:20-21 teaches the kingdom is not observed with outward show in that moment.',
    'Revelation 21:1-3': 'Revelation 21:1-3 describes God making all things new and dwelling with his people.',
    'Daniel 2:44': 'Daniel 2:44 foretells God’s kingdom that shall not be destroyed.',
    'Acts 1:6-7': 'Acts 1:6-7 records the disciples asking about restoring the kingdom to Israel.',
  },
  resurrection: {
    '1 Corinthians 15': '1 Corinthians 15 is the resurrection hope chapter — death swallowed up in victory.',
    '1 Thessalonians 4:13-16': '1 Thessalonians 4:13-16 speaks of the dead raised when the Lord comes.',
    'Daniel 12:2': 'Daniel 12:2 describes many asleep in dust awakening.',
    'John 11:25': 'John 11:25 records Jesus as the resurrection and the life.',
    'Acts 24:15': 'Acts 24:15 affirms hope in the resurrection of the dead.',
  },
  holy_spirit: {
    'John 14:16-17': 'John 14:16-17 promises the Spirit of truth with believers.',
    'John 16:13': 'John 16:13 says the Spirit of truth guides into all truth.',
    'Acts 2:38': 'Acts 2:38 ties repentance, baptism, and receiving the gift of the Holy Spirit.',
    'Romans 8:9': 'Romans 8:9 says anyone without the Spirit of Christ does not belong to him.',
    '1 Corinthians 12:4-11': '1 Corinthians 12:4-11 describes gifts distributed by the same Spirit.',
  },
  david: {
    '2 Samuel 7:12-16': '2 Samuel 7:12-16 establishes David’s house and kingdom through his seed.',
    'Psalm 89:3-4': 'Psalm 89:3-4 confirms David’s covenant with his seed forever.',
    'Acts 2:29-31': 'Acts 2:29-31 shows David’s tomb and prophecy of resurrection fulfilled in Christ.',
    'Matthew 22:41-45': 'Matthew 22:41-45 ties David’s Lord to Messiah.',
  },
  new_jerusalem: {
    'Revelation 21:1-3': 'Revelation 21:1-3 describes a new heaven, new earth, and God dwelling with his people.',
    'Revelation 21:2': 'Revelation 21:2 sees the holy city, new Jerusalem, coming down from God.',
    'Revelation 21:10-27': 'Revelation 21:10-27 details the city’s glory and gates.',
    'Isaiah 65:17-19': 'Isaiah 65:17-19 foretells new heavens and a new earth where former troubles are forgotten.',
  },
  heavens: {
    'Genesis 1:1': 'Genesis 1:1 begins with God creating the heaven and the earth.',
    'Deuteronomy 10:14': 'Deuteronomy 10:14 says heaven and heaven of heavens belong to the Lord.',
    '2 Corinthians 12:2': '2 Corinthians 12:2 speaks of a man caught up to the third heaven.',
    'John 3:13': 'John 3:13 says no man hath ascended to heaven but he that came down from heaven.',
    'Isaiah 66:1': 'Isaiah 66:1 says heaven is God’s throne and earth his footstool.',
  },
};

function normalizeWitnessKey(ref = '') {
  return String(ref).trim().replace(/\s+/g, ' ');
}

function loadStateFile() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    }
  } catch {
    /* fresh state */
  }
  return { users: {} };
}

function saveStateFile(state) {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function getUserWitnessState(userId) {
  const state = loadStateFile();
  if (!state.users[userId]) {
    state.users[userId] = { activeTopic: null, topics: {} };
  }
  return state.users[userId];
}

function persistUserWitnessState(userId, userState) {
  const state = loadStateFile();
  state.users[userId] = userState;
  saveStateFile(state);
}

function ensureTopicState(userState, topic) {
  if (!userState.topics[topic]) {
    userState.topics[topic] = { usedApproved: [], usedSupporting: [] };
  }
  return userState.topics[topic];
}

function setActiveDoctrineTopic(userId, topic) {
  if (!topic) return;
  const userState = getUserWitnessState(userId);
  userState.activeTopic = topic;
  ensureTopicState(userState, topic);
  persistUserWitnessState(userId, userState);
}

function witnessMatchesUsed(ref, usedList = []) {
  const key = normalizeWitnessKey(ref).toLowerCase();
  return usedList.some((u) => {
    const uk = normalizeWitnessKey(u).toLowerCase();
    return key.includes(uk) || uk.includes(key) || key.split(':')[0] === uk.split(':')[0];
  });
}

function buildWitnessInventory(topic, contract = {}, evidencePack = {}) {
  const base = BASE_CONTRACTS[topic] || contract;
  const strictOnly = base?.primaryWitnessesOnly || contract?.primaryWitnessesOnly || topic === 'acts_10';

  let approved = [...new Set([...(base?.approvedWitnesses || []), ...(contract.approvedWitnesses || [])])];
  let supporting = [...new Set([...(base?.supportingWitnesses || []), ...(contract.supportingWitnesses || [])])];

  if (!strictOnly) {
    const cards = evidencePack?.doctrine?.evidenceCards?.cards || [];
    for (const card of cards) {
      for (const r of card.supportingScriptures || []) {
        if (!approved.includes(r) && !supporting.includes(r)) supporting.push(r);
      }
    }
  }

  const userId = evidencePack?.userId;
  const convState = userId ? getDoctrineConversationState(userId) : null;
  const witnessState = userId ? getUserWitnessState(userId) : null;
  const topicState = witnessState?.topics?.[topic] || {
    usedApproved: convState?.usedApproved || [],
    usedSupporting: convState?.usedSupporting || [],
  };

  return {
    topic,
    approvedWitnesses: approved.filter(Boolean),
    supportingWitnesses: supporting.filter(Boolean),
    usedWitnesses: [...topicState.usedApproved, ...topicState.usedSupporting],
  };
}

function getWitnessSnippet(topic, ref) {
  const snippets = WITNESS_SNIPPETS[topic] || {};
  const key = normalizeWitnessKey(ref);
  if (snippets[key]) return snippets[key];
  for (const [k, v] of Object.entries(snippets)) {
    if (key.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(key.toLowerCase())) {
      return v;
    }
  }
  return `${key} is part of the approved witness chain for this topic.`;
}

function markWitnessUsed(userId, topic, ref, pool = 'approved') {
  const userState = getUserWitnessState(userId);
  userState.activeTopic = topic;
  const topicState = ensureTopicState(userState, topic);
  const key = normalizeWitnessKey(ref);
  if (pool === 'supporting') {
    if (!witnessMatchesUsed(key, topicState.usedSupporting)) topicState.usedSupporting.push(key);
  } else if (!witnessMatchesUsed(key, topicState.usedApproved)) {
    topicState.usedApproved.push(key);
  }
  persistUserWitnessState(userId, userState);
  markWitnessUsedInState(userId, key, pool);
}

function witnessInInventory(ref, list = []) {
  return list.some((w) => witnessMatchesUsed(ref, [w]));
}

function syncUsedWitnessesFromReply(userId, topic, reply = '', { limit = 2 } = {}) {
  const inventory = buildWitnessInventory(topic, BASE_CONTRACTS[topic] || {});
  const cited = extractScriptureRefs(reply).slice(0, limit);
  for (const ref of cited) {
    if (witnessInInventory(ref, inventory.approvedWitnesses)) {
      markWitnessUsed(userId, topic, ref, 'approved');
    } else if (witnessInInventory(ref, inventory.supportingWitnesses)) {
      markWitnessUsed(userId, topic, ref, 'supporting');
    } else {
      markWitnessUsed(userId, topic, ref, 'approved');
    }
  }
}

function isWitnessContinuationRequest(message = '') {
  const m = String(message).trim();
  if (!m) return false;
  return CONTINUATION_PATTERNS.some((re) => re.test(m));
}

function inferTopicFromSessions(recentSessions = []) {
  const corpus = recentSessions.map((s) => `${s.message || ''} ${s.reply || ''}`).join(' ').toLowerCase();
  const fakePack = { userMessage: corpus };
  return resolveStrictTopic(fakePack);
}

function resolveActiveStrictTopic({ userId, message, recentSessions = [], evidencePack = {} }) {
  if (userId) {
    const convTopic = getActiveDoctrineTopic(userId);
    if (convTopic && BASE_CONTRACTS[convTopic]) return convTopic;
  }

  const userState = userId ? getUserWitnessState(userId) : null;
  if (userState?.activeTopic && BASE_CONTRACTS[userState.activeTopic]) return userState.activeTopic;

  const fromPack = evidencePack.doctrineStrict?.strictTopic || resolveStrictTopic(evidencePack);
  if (fromPack) return fromPack;

  return inferTopicFromSessions(recentSessions);
}

function getNextWitness({ topic, userId, contract, evidencePack }) {
  const inventory = buildWitnessInventory(topic, contract, { ...evidencePack, userId });
  const userState = getUserWitnessState(userId);
  const topicState = ensureTopicState(userState, topic);

  for (const ref of inventory.approvedWitnesses) {
    if (!witnessMatchesUsed(ref, topicState.usedApproved)) {
      return { witness: ref, pool: 'approved', exhausted: false, inventory };
    }
  }

  for (const ref of inventory.supportingWitnesses) {
    if (!witnessMatchesUsed(ref, topicState.usedSupporting)) {
      return { witness: ref, pool: 'supporting', exhausted: false, inventory };
    }
  }

  return { witness: null, pool: null, exhausted: true, inventory };
}

function buildWitnessContinuationReply({ userId, message, topic, contract, evidencePack }) {
  const next = getNextWitness({ topic, userId, contract, evidencePack });

  if (next.exhausted) {
    return {
      reply: USER_FACING_EXHAUSTION_MESSAGE,
      scripture: [],
      exhausted: true,
      witness: null,
      inventory: next.inventory,
    };
  }

  const snippet = getWitnessSnippet(topic, next.witness);
  markWitnessUsed(userId, topic, next.witness, next.pool);

  const warmPrefix =
    next.pool === 'supporting'
      ? 'Here is a supporting Scripture witness from the approved chain.'
      : 'Here is another approved Scripture witness on this topic.';

  return {
    reply: `${warmPrefix} ${snippet}`,
    scripture: [{ reference: next.witness, theme: topic }],
    exhausted: false,
    witness: next.witness,
    pool: next.pool,
    inventory: next.inventory,
  };
}

function handleWitnessContinuation({ userId, message, evidencePack, recentSessions = [] }) {
  const topic = resolveActiveStrictTopic({ userId, message, recentSessions, evidencePack });
  if (!topic || !BASE_CONTRACTS[topic]) {
    return null;
  }

  const convState = getDoctrineConversationState(userId);
  if (convState.witnessExhausted && isWitnessContinuationRequest(message)) {
    return {
      reply: USER_FACING_EXHAUSTION_MESSAGE,
      scripture: [],
      exhausted: true,
      witness: null,
      inventory: buildWitnessInventory(topic, BASE_CONTRACTS[topic], { userId }),
    };
  }

  const contract = evidencePack.doctrineStrict?.contract || BASE_CONTRACTS[topic];
  setActiveDoctrineTopic(userId, topic);

  return buildWitnessContinuationReply({
    userId,
    message,
    topic,
    contract,
    evidencePack,
  });
}

function buildWitnessContinuationStructured({
  witnessResult,
  message,
  safety,
  runtimeContext,
  topic,
  userId,
}) {
  return {
    reply: witnessResult.reply,
    scripture: witnessResult.scripture || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: false,
    safety_level: safety?.level || 'standard',
    orb_state: runtimeContext?.intent === 'prayer' ? 'praying' : 'speaking',
    admin_flags: witnessResult.exhausted ? ['witness_inventory_exhausted'] : ['witness_inventory_continuation'],
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent || 'study',
      masterRoute: 'doctrine_witness_inventory',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      doctrineWitnessContinuation: true,
      doctrineWitnessExhausted: witnessResult.exhausted,
      doctrineWitnessTopic: topic,
      doctrineWitnessRef: witnessResult.witness,
    },
  };
}

module.exports = {
  EXHAUSTION_MESSAGE,
  USER_FACING_EXHAUSTION_MESSAGE,
  CONTINUATION_PATTERNS,
  buildWitnessInventory,
  isWitnessContinuationRequest,
  resolveActiveStrictTopic,
  handleWitnessContinuation,
  buildWitnessContinuationStructured,
  syncUsedWitnessesFromReply,
  setActiveDoctrineTopic,
  markWitnessUsed,
  getUserWitnessState,
  getWitnessSnippet,
};
