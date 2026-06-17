/**
 * Phase 5L — Final companion contract gate. No reply leaves without passing here.
 */

const { detectHumanNeed, APP_IDENTITY_RE } = require('./humanNeedDetector');
const { buildPracticalWisdomResponse } = require('./practicalWisdomEngine');
const { buildPrayerCompanionResponse } = require('./prayerCompanionEngine');
const { buildIdentityReply, isAppIdentityQuestion } = require('./companionIdentityEngine');
const { buildPresenceResponse } = require('./companionPresenceEngine');
const { formatRecallReply } = require('./relationshipSummaryEngine');
const { LEARNING_ACK } = require('./reflectionMemoryEngine');

const FORBIDDEN_PHRASES = [
  {
    id: 'clarification_loop',
    re: /which book, topic, or passage you mean/i,
    when: (ctx) =>
      ctx.humanNeed === 'practical_words_to_say' ||
      ctx.humanNeed === 'conflict_guidance' ||
      ctx.hasEstablishedTopic ||
      /\bhow (do|should) i explain\b/i.test(ctx.message),
  },
  {
    id: 'scripture_witnesses_label',
    re: /\bScripture witnesses:\s*/i,
    when: () => true,
  },
  {
    id: 'pray_verse_list_only',
    re: /\bI'?m here to pray with you\.\s*Scripture invites/i,
    when: (ctx) => ctx.humanNeed === 'prayer',
  },
  {
    id: 'lowercase_staying',
    re: /\bNo\.\s+staying\b/,
    when: () => true,
  },
  {
    id: 'yes_staying',
    re: /Yes\s*[—-]\s*staying/i,
    when: () => true,
  },
  {
    id: 'absolutely_staying',
    re: /Absolutely\s*[—-]\s*staying with the Bible text:/i,
    when: () => true,
  },
  {
    id: 'you_might_pray',
    re: /\byou might pray\b/i,
    when: (ctx) => ctx.humanNeed === 'prayer',
  },
  {
    id: 'db_deny',
    re: /\bi cannot modify a database\b/i,
    when: () => true,
  },
];

const PORK_TASTE_RE = /\b(does pork taste|pork taste good|taste good per the bible)\b/i;
const PORK_GOOD_MEAT_RE = /\b(is pork good meat|good meat to eat)\b/i;
const PORK_PERMISSION_RE =
  /\b(can we eat pork|is pork clean|is pork unclean|is pork okay to eat|should i eat pork|is pork allowed)\b/i;
const CORRECTION_CHALLENGE_RE =
  /\b(why are you (still )?saying yes|why are you saying yes|you said yes again|sounds like permission|sounds like it'?s ok|don'?t ever do|you didn'?t learn|don'?t say yes before a question|why did you say yes)\b/i;

const SAFE_COMPANION_CLARIFICATION =
  'I want to make sure I answer the right thing. Are you asking about a Bible passage, a life situation, or something you want prayer for?';

const FORBIDDEN_FINAL_SUBSTRINGS = [
  'Yes — staying',
  'No. staying',
  'Absolutely — staying',
  'I want to answer from Scripture directly',
  'which book, topic, or passage',
  'Scripture witnesses:',
  'Scripture invites us to cast our care upon God',
  'Yes — staying with Scripture, pork and shellfish remain unclean',
  'No. staying with Scripture',
];
const CONTEXT_META_RE =
  /\b(what we were talking about|about what we talked|what we talked about|asking what we were talking)\b/i;
const NEXT_STEP_RE = /\b(what do i do about it|and then what do i do)\b/i;
const PRAYER_CHALLENGE_RE = /\b(why can'?t you pray|not just (send )?scripture|not just scripture)\b/i;

function classifyPorkQuestion(message = '') {
  const m = String(message || '');
  if (PORK_TASTE_RE.test(m) || /\bdo people like the taste of pork\b/i.test(m)) return 'taste';
  if (PORK_GOOD_MEAT_RE.test(m)) return 'good_meat';
  if (PORK_PERMISSION_RE.test(m)) return 'permission';
  if (/\bpork\b/i.test(m) && /\b(clean|unclean|eat|allowed|okay)\b/i.test(m)) return 'permission';
  return null;
}

function buildPorkContractReply(porkType = 'permission') {
  if (porkType === 'taste') {
    return {
      reply:
        'Some people may like the taste, but that is different from whether Scripture says it is clean to eat. Staying with Scripture, pork is unclean in Leviticus 11 and Deuteronomy 14.',
      scripture: [
        { reference: 'Leviticus 11:7-8', theme: 'dietary' },
        { reference: 'Deuteronomy 14:8', theme: 'dietary' },
      ],
    };
  }
  if (porkType === 'good_meat') {
    return {
      reply:
        'No. If you mean biblically good to eat, Scripture classifies pork as unclean. Leviticus 11 and Deuteronomy 14 are the main witnesses.',
      scripture: [
        { reference: 'Leviticus 11:7-8', theme: 'dietary' },
        { reference: 'Deuteronomy 14:8', theme: 'dietary' },
      ],
    };
  }
  return {
    reply:
      'No. Staying with Scripture, pork is unclean. Leviticus 11 and Deuteronomy 14 identify swine as unclean. Acts 10 does not overturn that; Peter explains in Acts 10:28 that the vision was about not calling people common or unclean.',
    scripture: [
      { reference: 'Leviticus 11:7-8', theme: 'dietary' },
      { reference: 'Deuteronomy 14:8', theme: 'dietary' },
      { reference: 'Acts 10:28', theme: 'acts_10' },
    ],
  };
}

function buildCorrectionAckReply(userId, message = '') {
  const { recordUserCorrection } = require('./userCorrectionMemory');
  if (userId) recordUserCorrection(userId, message);
  return {
    reply:
      "You're right — I apologize. I should not start with 'Yes' when the Bible answer is 'No.' Taste is different from permission: some people may like the taste, but Scripture still classifies pork as unclean in Leviticus 11 and Deuteronomy 14.",
    scripture: [],
  };
}

const PRACTICAL_RE =
  /\bhow (do|should|can) i explain|how do i tell|what should i say|help me talk to|how should i respond|what do i do next|yes\.\s*how do i explain\b/i;

function resolveStableDoctrineConcept(state = {}, anchor = {}) {
  const sm = state.sessionMemory || {};
  const candidates = [
    sm.activeConcept,
    state.lastAnsweredConcept,
    anchor.currentDoctrineConcept,
    state.turnMemory?.lastAnsweredConcept,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (/^(ten_commandments|prayer_comfort|abomination_desolation)$/i.test(c)) continue;
    return c;
  }
  return sm.activeConcept || state.lastAnsweredConcept || 'dietary_pork_unclean';
}

function hasEstablishedTopic(state = {}) {
  return !!(
    state.lastAnsweredConcept ||
    state.sessionMemory?.activeConcept ||
    state.familyConversationContext ||
    state.sessionMemory?.familyContext
  );
}

function hasAlphaContext(state = {}) {
  const hist = (state.topicHistory || []).join(' ');
  const sm = state.sessionMemory || {};
  return (
    sm.alphaTestingContext ||
    /\balpha test|alpha testing|test plan|testers?\b/i.test(hist) ||
    /\balpha test|alpha testing|test plan\b/i.test(String(state.lastUserQuestion || ''))
  );
}

function detectAlphaShorthand(message = '') {
  const m = String(message || '').trim();
  if (/^\d+\s+users?\b/i.test(m)) return 'alpha_users';
  if (/^\d+\s+weeks?\b/i.test(m)) return 'alpha_duration';
  return null;
}

function buildSingleCompanionContract({
  message = '',
  state = {},
  relationshipContext = {},
  humanNeed = null,
  concept = null,
  anchor = {},
} = {}) {
  const need = humanNeed || detectHumanNeed(message, anchor, state);
  const established = hasEstablishedTopic(state);
  const alphaCtx = hasAlphaContext(state);
  const shorthand = detectAlphaShorthand(message);

  let mode = need;
  const porkType = classifyPorkQuestion(message);
  if (porkType) mode = porkType === 'taste' ? 'doctrine_answer_taste' : 'doctrine_answer';
  if (CORRECTION_CHALLENGE_RE.test(message)) mode = 'correction_repair';
  if (CONTEXT_META_RE.test(message) && established) mode = 'practical_guidance';
  if (/yes\.\s*how do i explain/i.test(message) && established) mode = 'practical_guidance';
  if (PRACTICAL_RE.test(message) && established) mode = 'practical_guidance';
  if (NEXT_STEP_RE.test(message)) mode = 'next_steps';
  if (PRAYER_CHALLENGE_RE.test(message) || /\bpray with me\b/i.test(message)) mode = 'prayer';
  if (isAppIdentityQuestion(message) || APP_IDENTITY_RE.test(message)) mode = 'app_identity';
  if (/\bwhat do you remember\b/i.test(message)) mode = 'memory_recall';
  if (/what does the bible say about prayer/i.test(message)) mode = 'prayer_teaching';
  if (shorthand && alphaCtx) mode = 'alpha_plan';
  if (/\bcan we eat pork\b/i.test(message)) mode = 'doctrine_answer';
  if (/\bacts\s*10\b/i.test(message) && !/\bexplain\b/i.test(message)) mode = 'doctrine_answer';

  return {
    mode,
    humanNeed: need,
    message,
    state,
    anchor,
    relationshipContext,
    concept,
    hasEstablishedTopic: established,
    alphaContext: alphaCtx,
    alphaShorthand: shorthand,
    porkType,
  };
}

function compressDuplicateDoctrine(reply = '') {
  let t = String(reply || '').trim();
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const s of sentences) {
    const key = s.toLowerCase().replace(/\s+/g, ' ').slice(0, 90);
    if (seen.has(key)) continue;
    if (
      out.length &&
      /\bpork\b.*\bunclean\b/i.test(s) &&
      /\bpork\b.*\bunclean\b/i.test(out[out.length - 1])
    ) {
      continue;
    }
    if (
      out.length &&
      /\bshellfish\b.*\bunclean\b/i.test(s) &&
      /\bshellfish\b.*\bunclean\b/i.test(out[out.length - 1])
    ) {
      continue;
    }
    seen.add(key);
    out.push(s);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function polishDoctrineOpener(reply = '', message = '') {
  let t = String(reply || '').trim();
  t = t.replace(/Absolutely\s*[—-]\s*staying with the Bible text:\s*/gi, '');
  t = t.replace(/Yes\s*[—-]\s*staying[^.]*[.:]?\s*/gi, '');
  t = t.replace(/\bNo\.\s+Staying with Scripture,\s+with Scripture,\s*/gi, 'No. Staying with Scripture, ');
  t = t.replace(/\bScripture witnesses:\s*/gi, '');
  if (/^No\.\s+According to Scripture,\s*pork/i.test(t) && /\bpork and shellfish remain unclean\b/i.test(t)) {
    t = t.replace(/\s*According to Scripture, pork and shellfish remain unclean\.\s*/i, ' ');
  }
  if (/^No\.\s+Staying with Scripture,\s*According to Scripture/i.test(t)) {
    t = t.replace(/^No\.\s+Staying with Scripture,\s*According to Scripture,\s*/i, 'No. Staying with Scripture, ');
  }
  if (/^No\.\s+Staying with Scripture,\s*pork is unclean.*pork.*unclean/i.test(t)) {
    t = t.replace(
      /\.\s*According to Scripture, pork and shellfish remain unclean\.\s*/i,
      '. ',
    );
  }
  if (/^No\.\s+Staying with Scripture,\s*pork is unclean/i.test(t) && !/not food God permits/i.test(t)) {
    if (/can we eat pork/i.test(message)) {
      return buildPorkContractReply('permission').reply;
    }
  }
  return t.replace(/\s+/g, ' ').trim();
}

function buildAlphaShorthandReply(shorthand, state = {}) {
  if (shorthand === 'alpha_users') {
    return {
      reply:
        'Got it — you’re thinking about a small alpha group. If you mean about 10 testers for one week, that can work for focused feedback. What would you want them to try most — companion chat, prayer, or Bible study threads?',
      scripture: [],
    };
  }
  if (shorthand === 'alpha_duration') {
    return {
      reply:
        'One week can be enough for a first alpha pass if the test plan is clear. What do you want testers to focus on each day — one conversation type, or a mix of Bible questions and real-life support?',
      scripture: [],
    };
  }
  return null;
}

function repairReplyIfContractBroken(draftReply = '', contract = {}) {
  const message = contract.message || '';
  const anchor = contract.anchor || {};
  const state = contract.state || {};

  if (CORRECTION_CHALLENGE_RE.test(message)) {
    const ack = buildCorrectionAckReply(state.userId, message);
    return { reply: ack.reply, scripture: ack.scripture, repaired: true, repairLane: 'correction_ack' };
  }

  if (contract.porkType || classifyPorkQuestion(message)) {
    const pork = buildPorkContractReply(contract.porkType || classifyPorkQuestion(message));
    return { reply: pork.reply, scripture: pork.scripture, repaired: true, repairLane: 'pork_contract' };
  }

  if (CONTEXT_META_RE.test(message) && contract.hasEstablishedTopic) {
    const wisdom = buildPracticalWisdomResponse({
      message: 'How do I explain it to my family?',
      anchor,
      state,
      conceptId: resolveStableDoctrineConcept(state, anchor),
    });
    if (wisdom?.reply) return { reply: wisdom.reply, scripture: wisdom.scripture || [], repaired: true, repairLane: 'context_meta' };
  }

  if (NEXT_STEP_RE.test(message)) {
    const { buildNextStepsResponse } = require('./companionPresenceEngine');
    const steps = buildNextStepsResponse({ message, anchor, state });
    if (steps?.reply) return { reply: steps.reply, scripture: steps.scripture || [], repaired: true, repairLane: 'next_steps' };
  }

  if (contract.mode === 'practical_guidance' || (PRACTICAL_RE.test(message) && contract.hasEstablishedTopic)) {
    const wisdom = buildPracticalWisdomResponse({
      message,
      anchor,
      state,
      conceptId: resolveStableDoctrineConcept(state, anchor),
    });
    if (wisdom?.reply) return { reply: wisdom.reply, scripture: wisdom.scripture || [], repaired: true, repairLane: 'practical_wisdom' };
  }

  if (
    /\bnervous\b/i.test(message) &&
    !(
      anchor.currentRelationshipContext === 'family' ||
      state.familyConversationContext ||
      state.sessionMemory?.familyContext
    )
  ) {
    const presence = buildPresenceResponse({ message, anchor, state });
    if (presence?.reply) return { reply: presence.reply, scripture: presence.scripture || [], repaired: true, repairLane: 'nervous_presence' };
  }

  if (contract.mode === 'prayer' || /\b(pray with me|can you pray|deeper prayer)\b/i.test(message)) {
    const prayer = buildPrayerCompanionResponse({ message, anchor });
    if (prayer?.reply) return { reply: prayer.reply, scripture: prayer.scripture || [], repaired: true, repairLane: 'prayer' };
  }

  if (/what does the bible say about prayer/i.test(message)) {
    return {
      reply:
        'Scripture teaches believers to pray with reverence and faith. Philippians 4:6-7 calls us to pray with thanksgiving. Matthew 6:9-13 gives the Lord\'s Prayer pattern. James 5:16 invites earnest prayer.',
      scripture: [
        { reference: 'Philippians 4:6-7', theme: 'prayer' },
        { reference: 'Matthew 6:9-13', theme: 'prayer' },
        { reference: 'James 5:16', theme: 'prayer' },
      ],
      repaired: true,
      repairLane: 'prayer_teaching',
    };
  }

  if (contract.mode === 'app_identity' || isAppIdentityQuestion(message)) {
    const id = buildIdentityReply(message);
    let reply = id.reply;
    if (/\bnervous\b/i.test(message)) {
      reply = `I hear that you're nervous — that's understandable. ${reply}`;
    }
    if (/how does it work/i.test(message)) {
      reply += ' You send a message, I listen, answer from Scripture when it\'s a Bible question, pray with you when you ask, and stay with you through real-life situations.';
    }
    return { reply, scripture: [], repaired: true, repairLane: 'app_identity' };
  }

  if (contract.mode === 'memory_recall') {
    return {
      reply: formatRecallReply({ userId: state.userId, message, state }),
      scripture: [],
      repaired: true,
      repairLane: 'memory_recall',
    };
  }

  if (contract.mode === 'alpha_plan' && contract.alphaShorthand) {
    const alpha = buildAlphaShorthandReply(contract.alphaShorthand, state);
    if (alpha) return { ...alpha, repaired: true, repairLane: 'alpha_plan' };
  }

  if (
    contract.mode === 'emotional_support' ||
    contract.humanNeed === 'emotional_support' ||
    /\boverwhelmed\b/i.test(message)
  ) {
    const presence = buildPresenceResponse({ message, anchor, state });
    if (presence?.reply) return { reply: presence.reply, scripture: presence.scripture || [], repaired: true, repairLane: 'presence' };
  }

  if (/^can we eat pork/i.test(String(message || '').trim())) {
    const pork = buildPorkContractReply('permission');
    return { reply: pork.reply, scripture: pork.scripture, repaired: true, repairLane: 'pork_doctrine' };
  }

  if (/^what about acts\s*10/i.test(message.trim()) || /^acts\s*10\??$/i.test(message.trim())) {
    return {
      reply:
        'Acts 10 does not give permission to eat unclean foods. Peter explains the meaning in Acts 10:28: God showed him not to call any man common or unclean. Acts 10:14 also shows Peter still refusing unclean food.',
      scripture: [
        { reference: 'Acts 10:14', theme: 'acts_10' },
        { reference: 'Acts 10:28', theme: 'acts_10' },
      ],
      repaired: true,
      repairLane: 'acts10_doctrine',
    };
  }

  if (FORBIDDEN_PHRASES.some((p) => p.re.test(draftReply) && (p.when(contract) || p.id === 'db_deny'))) {
    if (/\bi cannot modify a database\b/i.test(draftReply)) {
      return { reply: LEARNING_ACK, scripture: [], repaired: true, repairLane: 'learning_ack' };
    }
  }

  return { reply: draftReply, scripture: [], repaired: false, repairLane: null };
}

function detectForbiddenOldPath(reply = '', contract = {}) {
  const hits = [];
  for (const p of FORBIDDEN_PHRASES) {
    if (p.re.test(reply) && (typeof p.when === 'function' ? p.when(contract) : true)) {
      hits.push(p.id);
    }
  }
  return hits;
}

function scanForbiddenFinalSubstrings(reply = '', contract = {}) {
  const hits = [];
  const t = String(reply || '');
  for (const sub of FORBIDDEN_FINAL_SUBSTRINGS) {
    if (t.includes(sub)) hits.push(sub);
  }
  if ((contract.humanNeed === 'prayer' || contract.mode === 'prayer') && /\byou might pray\b/i.test(t)) {
    hits.push('you might pray');
  }
  return hits;
}

function repairAbsoluteForbiddenFinal(reply = '', contract = {}) {
  const hits = scanForbiddenFinalSubstrings(reply, contract);
  if (!hits.length) return { reply, scripture: [], repaired: false };
  console.log(
    '[LIVE_TRUTH_FORBIDDEN_FINAL]',
    JSON.stringify({ hits, message: contract.message, humanNeed: contract.humanNeed }),
  );
  const repaired = repairReplyIfContractBroken('', contract);
  if (repaired.repaired) {
    return { reply: repaired.reply, scripture: repaired.scripture || [], repaired: true, repairLane: repaired.repairLane };
  }
  return {
    reply: SAFE_COMPANION_CLARIFICATION,
    scripture: [],
    repaired: true,
    repairLane: 'safe_clarification_fallback',
  };
}

function enforceSingleCompanionContract({ draftReply = '', contract = {}, scripture = [] } = {}) {
  let reply = String(draftReply || '').trim();
  let finalScripture = scripture || [];
  let repairLane = null;

  if (/what does the bible say about prayer/i.test(String(contract.message || ''))) {
    const repaired = repairReplyIfContractBroken('', contract);
    if (repaired.repaired) {
      return {
        reply: compressDuplicateDoctrine(polishDoctrineOpener(repaired.reply, contract.message)),
        scripture: repaired.scripture || [],
        contract,
        forbiddenBlocked: [],
        repairLane: repaired.repairLane,
        forbiddenPhraseDetected: false,
        passed: true,
      };
    }
  }

  if (CONTEXT_META_RE.test(String(contract.message || '')) && contract.hasEstablishedTopic) {
    const repaired = repairReplyIfContractBroken('', contract);
    if (repaired.repaired) {
      return {
        reply: compressDuplicateDoctrine(polishDoctrineOpener(repaired.reply, contract.message)),
        scripture: repaired.scripture || [],
        contract,
        forbiddenBlocked: [],
        repairLane: repaired.repairLane,
        passed: true,
      };
    }
  }

  if (
    /yes\.\s*how do i explain/i.test(String(contract.message || '')) &&
    contract.hasEstablishedTopic
  ) {
    const repaired = repairReplyIfContractBroken('', contract);
    if (repaired.repaired) {
      return {
        reply: compressDuplicateDoctrine(polishDoctrineOpener(repaired.reply, contract.message)),
        scripture: repaired.scripture || [],
        contract,
        forbiddenBlocked: [],
        repairLane: repaired.repairLane,
        passed: true,
      };
    }
  }

  if (/\bcan we eat pork\b/i.test(String(contract.message || '').trim()) || contract.porkType) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (
    /^what about acts\s*10/i.test(String(contract.message || '').trim()) ||
    /^acts\s*10\??$/i.test(String(contract.message || '').trim())
  ) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (CORRECTION_CHALLENGE_RE.test(String(contract.message || ''))) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      finalScripture = [];
      repairLane = repaired.repairLane;
    }
  }

  if (contract.porkType && !/\bcan we eat pork\b/i.test(String(contract.message || ''))) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (CONTEXT_META_RE.test(String(contract.message || '')) && contract.hasEstablishedTopic) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (contract.mode === 'practical_guidance' && PRACTICAL_RE.test(contract.message || '')) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (NEXT_STEP_RE.test(String(contract.message || ''))) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (contract.mode === 'prayer' && !/\b(father|lord|jesus|amen)\b/i.test(reply)) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (contract.mode === 'app_identity' || isAppIdentityQuestion(contract.message || '')) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      finalScripture = [];
      repairLane = repaired.repairLane;
    }
  }

  if (
    (contract.mode === 'emotional_support' || /\boverwhelmed\b/i.test(contract.message || '')) &&
    /\boverwhelmed\b/i.test(contract.message || '')
  ) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (
    /\bnervous\b/i.test(contract.message || '') &&
    !/family about what you believe/i.test(reply) &&
  !/\b(breathe|concern|weighing on you)\b/i.test(reply)
  ) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (
    (contract.mode === 'anxiety_support' || contract.humanNeed === 'anxiety_support') &&
    /\bnervous\b/i.test(contract.message || '') &&
    !/\b(breathe|concern|weighing on you)\b/i.test(reply)
  ) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (
    /\bnervous\b/i.test(contract.message || '') &&
    (contract.anchor?.currentRelationshipContext === 'family' || contract.hasEstablishedTopic)
  ) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired && /family about what you believe/i.test(repaired.reply)) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (contract.alphaShorthand && contract.alphaContext) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
      repairLane = repaired.repairLane;
    }
  }

  if (contract.alphaShorthand && !contract.alphaContext) {
    reply =
      'Are you thinking about an alpha test — how many testers and how long you want the test to run?';
    repairLane = 'alpha_clarify';
  }

  const forbidden = detectForbiddenOldPath(reply, contract);

  if (forbidden.length) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
    }
  }

  reply = polishDoctrineOpener(reply, contract.message);
  reply = compressDuplicateDoctrine(reply);

  const stillForbidden = detectForbiddenOldPath(reply, contract);
  if (stillForbidden.includes('clarification_loop') && contract.hasEstablishedTopic) {
    const repaired = repairReplyIfContractBroken(reply, contract);
    if (repaired.repaired) {
      reply = repaired.reply;
      if (repaired.scripture?.length) finalScripture = repaired.scripture;
    }
  }

  if (/\bI hear you\.\s+I hear you\./i.test(reply)) {
    reply = reply.replace(/\bI hear you\.\s+I hear you\./i, 'I hear you.');
  }

  let forbiddenPhraseDetected = scanForbiddenFinalSubstrings(reply, contract).length > 0;
  if (forbiddenPhraseDetected) {
    const absolute = repairAbsoluteForbiddenFinal(reply, contract);
    reply = compressDuplicateDoctrine(polishDoctrineOpener(absolute.reply, contract.message));
    if (absolute.scripture?.length) finalScripture = absolute.scripture;
    repairLane = absolute.repairLane || repairLane;
    forbiddenPhraseDetected = scanForbiddenFinalSubstrings(reply, contract).length > 0;
  }

  return {
    reply,
    scripture: finalScripture,
    contract,
    forbiddenBlocked: forbidden,
    repairLane,
    forbiddenPhraseDetected,
    passed:
      detectForbiddenOldPath(reply, contract).length === 0 && !forbiddenPhraseDetected,
  };
}

function explainContractDecision(contract = {}) {
  return {
    mode: contract.mode,
    humanNeed: contract.humanNeed,
    hasEstablishedTopic: contract.hasEstablishedTopic,
    alphaContext: contract.alphaContext,
    alphaShorthand: contract.alphaShorthand,
  };
}

module.exports = {
  FORBIDDEN_PHRASES,
  buildSingleCompanionContract,
  enforceSingleCompanionContract,
  repairReplyIfContractBroken,
  detectForbiddenOldPath,
  scanForbiddenFinalSubstrings,
  repairAbsoluteForbiddenFinal,
  buildCorrectionAckReply,
  buildPorkContractReply,
  SAFE_COMPANION_CLARIFICATION,
  explainContractDecision,
  compressDuplicateDoctrine,
  polishDoctrineOpener,
  hasEstablishedTopic,
  hasAlphaContext,
  detectAlphaShorthand,
};
