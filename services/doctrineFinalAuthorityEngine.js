/**
 * Phase 4D.3 — Doctrine final authority engine.
 * Produces doctrinal conclusions BEFORE any OpenAI call.
 * OpenAI may not reason doctrine; only optional warmth on pre-approved text.
 */

const { BASE_CONTRACTS, resolveStrictTopic } = require('./doctrineAuthorityContract');
const { getCorrectionsForUser, applyCorrectionsToReply } = require('./doctrineCorrectionMemory');
const { isYesNoQuestion, formatDirectDoctrineReply } = require('./directAnswerFormatter');
const { detectKingdomOnEarthTopic } = require('./doctrineTopicDetector');

const STRICT_FINAL_TOPICS = [
  'acts_10',
  'dietary_law',
  'death_state',
  'sabbath',
  'kingdom',
  'resurrection',
  'holy_spirit',
  'david',
  'new_jerusalem',
  'heavens',
];

const ACTS10_FORBIDDEN = [
  'primarily',
  'mainly',
  'largely',
  'broader point',
  'central message',
  'while it mentions food',
  'while the vision involves food',
  'not just about dietary',
  'not solely about dietary',
  'dietary aspects',
  'part of the larger picture',
  'could also refer to food',
  'challenges traditional jewish dietary',
  'jewish dietary laws',
  'traditional jewish',
  'inclusivity',
  'not simply',
  'not just',
];

const DRIFT_VERSE_BLOCKLIST = ['romans 10:12', 'jeremiah 29:11', 'jeremiah 29'];

function isStrictFinalTopic(topic) {
  if (!topic) return false;
  const k = String(topic).toLowerCase().replace(/\s+/g, '_');
  return STRICT_FINAL_TOPICS.includes(k);
}

function isInitialDoctrineQuestion(message = '') {
  const m = String(message).trim();
  if (!m) return false;
  const continuation = [
    /\banother (verse|witness|scripture)\b/i,
    /\bshow me another\b/i,
    /\bwhy are you saying\b/i,
    /\bwhy did you say\b/i,
    /\bstop saying\b/i,
    /\bcan you remember\b/i,
    /\bbefore that\b/i,
    /\bprove it\b/i,
    /\bi disagree\b/i,
    /\bwhat else\b/i,
    /\bcontinue\b/i,
    /\bgive me more\b/i,
  ];
  if (continuation.some((re) => re.test(m))) return false;
  return true;
}

function getContract(topic, evidencePack = {}) {
  return evidencePack.doctrineStrict?.contract || BASE_CONTRACTS[topic] || null;
}

function buildActs10FinalAnswer() {
  const exactConclusion =
    'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';
  return {
    finalConclusion: exactConclusion,
    reply: `${exactConclusion} Acts 10:14 shows Peter refusing unclean food. Acts 10:34-35 shows God is no respecter of persons. Acts 11:1-18 records Peter explaining the vision to the church.`,
    scriptureWitnesses: ['Acts 10:14', 'Acts 10:28', 'Acts 10:34-35', 'Acts 11:1-18'],
    requiredWording:
      'Acts 10 is about people/Gentiles. Peter explains that in Acts 10:28.',
    forbiddenPhrases: ACTS10_FORBIDDEN,
    topic: 'acts_10',
  };
}

function buildDietaryLawFinalAnswer(message = '') {
  const exactConclusion =
    'Scripture distinguishes clean and unclean animals. Pork and shellfish are unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';
  const yesNo = isYesNoQuestion(message);
  const directOpener = yesNo
    ? 'No. According to Scripture, pork is unclean. Leviticus 11:7 and Deuteronomy 14:8 say the swine is unclean and shall not be eaten.'
    : 'According to Scripture, pork and shellfish remain unclean.';
  return {
    finalConclusion: exactConclusion,
    reply: `${directOpener} ${exactConclusion} Leviticus 11 and Deuteronomy 14 distinguish clean and unclean animals. Daniel 1:8-16 shows faithful refusal of unclean food. Acts 10:14 shows Peter refusing unclean food. Acts 10:28 explains the vision concerned people, not food permission. Isaiah 66:17 treats eating swine’s flesh seriously in judgment.`,
    scriptureWitnesses: [
      'Leviticus 11:7',
      'Deuteronomy 14:8',
      'Leviticus 11',
      'Deuteronomy 14',
      'Daniel 1:8-16',
      'Acts 10:14',
      'Acts 10:28',
      'Acts 11:1-18',
      'Isaiah 66:17',
    ],
    topic: 'dietary_law',
  };
}

function buildKingdomOnEarthFinalAnswer(message = '') {
  const exactConclusion =
    'Scripture ties kingdom hope to God’s reign on earth — the meek inheriting the earth and the holy city coming down, not believers leaving earth for a disembodied heaven-only hope.';
  const witnesses = [
    'Matthew 6:10',
    'Revelation 21:1-3',
    'Revelation 5:10',
    'Daniel 7:27',
    'Psalm 37:9-11',
    'Matthew 5:5',
  ];
  return {
    finalConclusion: exactConclusion,
    reply: `Scripture witnesses kingdom hope on earth. Matthew 6:10 teaches “Thy kingdom come.” Revelation 21:1-3 shows the holy city coming down and God dwelling with men. Revelation 5:10 speaks of reigning on the earth. Daniel 7:27 gives the kingdom to the people of the saints. Psalm 37:9-11 promises the meek inheriting the earth. Matthew 5:5 says the meek shall inherit the earth.`,
    scriptureWitnesses: witnesses,
    topic: 'kingdom',
  };
}

function buildDeathStateFinalAnswer() {
  return {
    finalConclusion:
      'The dead know nothing, their thoughts perish, and Scripture describes death as sleep until resurrection.',
    reply:
      'Brother, Scripture teaches that the dead know nothing and are described as asleep until resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called death sleep in John 11:11-14. Paul speaks of those asleep until the Lord comes in 1 Thessalonians 4:13-16. Daniel 12:2 and 1 Corinthians 15 anchor hope in resurrection.',
    scriptureWitnesses: [
      'Ecclesiastes 9:5',
      'Ecclesiastes 9:10',
      'Psalm 146:4',
      'John 11:11-14',
      'Daniel 12:2',
      '1 Thessalonians 4:13-16',
      '1 Corinthians 15',
    ],
    topic: 'death_state',
  };
}

function buildGenericFinalAnswer(topic, contract) {
  const witnesses = (contract.approvedWitnesses || []).slice(0, 4);
  const witnessText = witnesses.join('; ');
  return {
    finalConclusion: contract.requiredConclusion,
    reply: `From the approved Scripture witnesses (${witnessText}), ${contract.requiredConclusion}`,
    scriptureWitnesses: witnesses,
    topic,
  };
}

function buildFinalAuthorityAnswer({ topic, contract, userId, message = '' } = {}) {
  const c = contract || BASE_CONTRACTS[topic];
  if (!c) return null;

  let base;
  if (topic === 'acts_10') base = buildActs10FinalAnswer();
  else if (topic === 'death_state') base = buildDeathStateFinalAnswer();
  else if (topic === 'dietary_law') base = buildDietaryLawFinalAnswer(message);
  else if (topic === 'kingdom' && detectKingdomOnEarthTopic(message)) base = buildKingdomOnEarthFinalAnswer(message);
  else base = buildGenericFinalAnswer(topic, c);

  let reply = base.reply;
  if (userId) {
    reply = applyCorrectionsToReply(reply, userId, topic);
    if (topic === 'acts_10' || topic === 'dietary_law') {
      reply = applyCorrectionsToReply(reply, userId, 'acts_10');
    }
  }

  reply = formatDirectDoctrineReply(reply, message, {
    topic,
    scripture: (base.scriptureWitnesses || []).map((r) => ({ reference: r })),
    userId,
    userPreferences: require('./userCorrectionMemory').getUserAnswerPreferences(userId),
  });

  return {
    ...base,
    reply,
    allowedWitnesses: c.approvedWitnesses || base.scriptureWitnesses,
    supportingWitnesses: c.supportingWitnesses || [],
    forbiddenClaims: c.prohibitedClaims || [],
    forbiddenPhrases: [...new Set([...(c.forbiddenPhrases || []), ...(base.forbiddenPhrases || [])])],
    noDoctrineReasoning: true,
    finalAuthority: true,
    scripture: (base.scriptureWitnesses || []).map((r) => ({ reference: r, theme: topic })),
  };
}

function containsDriftVerses(text = '', allowedWitnesses = []) {
  const lower = String(text).toLowerCase();
  const allowed = allowedWitnesses.map((w) => w.toLowerCase());
  for (const drift of DRIFT_VERSE_BLOCKLIST) {
    if (lower.includes(drift) && !allowed.some((a) => a.includes(drift.split(':')[0]))) {
      return { blocked: true, verse: drift };
    }
  }
  return { blocked: false };
}

function validateWarmthAgainstAuthority(warmReply = '', authority = {}) {
  const violations = [];
  const lower = String(warmReply).toLowerCase();
  if (authority.finalConclusion && !lower.includes(authority.finalConclusion.slice(0, 40).toLowerCase())) {
    violations.push({ code: 'conclusion_changed', detail: 'warmth altered conclusion' });
  }
  const drift = containsDriftVerses(warmReply, authority.allowedWitnesses || []);
  if (drift.blocked) violations.push({ code: 'drift_verse', detail: drift.verse });
  if (authority.topic === 'acts_10') {
    for (const phrase of ACTS10_FORBIDDEN) {
      if (lower.includes(phrase)) violations.push({ code: 'acts10_forbidden', detail: phrase });
    }
  }
  return { passed: violations.length === 0, violations };
}

function buildFinalAuthorityStructured(authority, runtimeContext = {}, safety = {}) {
  return {
    reply: authority.reply,
    scripture: authority.scripture || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: false,
    safety_level: safety?.level || 'standard',
    orb_state: runtimeContext?.intent === 'prayer' ? 'praying' : 'speaking',
    admin_flags: ['doctrine_final_authority'],
    finalConclusion: authority.finalConclusion,
    doctrineFinalAuthority: true,
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent || 'study',
      masterRoute: 'doctrine_final_authority',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      doctrineTopic: authority.topic,
      noDoctrineReasoning: true,
    },
  };
}

function resolveFinalAuthorityForPack({ userId, message, evidencePack, recentSessions = [] }) {
  const { isExplicitHistoricalCausationAsk } = require('./historicalCausationAsk');
  if (isExplicitHistoricalCausationAsk(message)) {
    return { handled: false, reason: 'explicit_historical_causation' };
  }

  const topic =
    evidencePack.doctrineStrict?.strictTopic ||
    resolveStrictTopic(evidencePack);

  if (!topic || !isStrictFinalTopic(topic)) {
    return { handled: false };
  }

  if (!isInitialDoctrineQuestion(message)) {
    return { handled: false, reason: 'not_initial_doctrine_question' };
  }

  const contract = getContract(topic, evidencePack);
  const authority = buildFinalAuthorityAnswer({ topic, contract, userId, message });
  if (!authority) return { handled: false };

  return { handled: true, authority, topic };
}

function buildOpenAiWarmthPayload(authority = {}) {
  return {
    noDoctrineReasoning: true,
    finalConclusion: authority.finalConclusion,
    allowedWitnesses: authority.allowedWitnesses,
    forbiddenClaims: authority.forbiddenClaims,
    forbiddenPhrases: authority.forbiddenPhrases,
    requiredWording: authority.requiredWording || authority.finalConclusion,
    instruction:
      'Rewrite ONLY for warmth and readability. Do NOT change the conclusion. Do NOT add verses. Do NOT add qualifiers. Return JSON: { "reply": "..." }',
    seedReply: authority.reply,
  };
}

module.exports = {
  STRICT_FINAL_TOPICS,
  ACTS10_FORBIDDEN,
  DRIFT_VERSE_BLOCKLIST,
  isStrictFinalTopic,
  isInitialDoctrineQuestion,
  buildFinalAuthorityAnswer,
  buildFinalAuthorityStructured,
  resolveFinalAuthorityForPack,
  validateWarmthAgainstAuthority,
  buildOpenAiWarmthPayload,
  containsDriftVerses,
  buildActs10FinalAnswer,
  buildDeathStateFinalAnswer,
  buildDietaryLawFinalAnswer,
};
