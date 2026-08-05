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

/**
 * V1.3A — resurrection chronology from existing governed witnesses.
 * Focuses conclusion by current message; does not hard-code Founder wording.
 */
function buildResurrectionFinalAnswer(message = '', contract = null) {
  const c = contract || BASE_CONTRACTS.resurrection;
  const m = String(message || '');
  const baseConclusion =
    c.requiredConclusion ||
    'Scripture distinguishes Jesus’ resurrection from the resurrection of the dead: Revelation 20 describes a first resurrection of those who reign with Christ a thousand years, and says the rest of the dead lived not again until the thousand years were finished; John 5 and Daniel 12 also speak of resurrection unto life and unto judgment.';

  const chronologyWitnesses = [
    'Revelation 20:4-6',
    'Revelation 20:5',
    'John 5:28-29',
    '1 Thessalonians 4:13-17',
    '1 Corinthians 15:51-54',
    'Daniel 12:2',
    'Acts 24:15',
  ];

  let finalConclusion = baseConclusion;
  let focusWitnesses = chronologyWitnesses.slice();

  if (/\brest of the dead\b/i.test(m)) {
    finalConclusion =
      'Revelation 20:5 says the rest of the dead lived not again until the thousand years were finished; that is distinct from the first resurrection of those who reign with Christ.';
    focusWitnesses = ['Revelation 20:5', 'Revelation 20:4-6', 'John 5:28-29', 'Daniel 12:2'];
  } else if (/\b(what do (they|those|the (saints|righteous|people)) do|after (they|the saints) (are )?raised|reign with)\b/i.test(m)) {
    finalConclusion =
      'Those of the first resurrection are gathered to Christ and reign with Him; Revelation 20:4-6 and 1 Thessalonians 4 describe that hope.';
    focusWitnesses = ['Revelation 20:4-6', '1 Thessalonians 4:13-17', '1 Corinthians 15:51-54', 'Revelation 20:5'];
  } else if (/\bfirst resurrection\b/i.test(m)) {
    finalConclusion =
      'In the first resurrection, God’s people who are Christ’s are raised to life and reign with Him; Revelation 20:4-6 calls this the first resurrection, with 1 Thessalonians 4 and 1 Corinthians 15 describing the gathering of the dead in Christ.';
    focusWitnesses = ['Revelation 20:4-6', '1 Thessalonians 4:13-17', '1 Corinthians 15:51-54', 'John 5:28-29'];
  } else if (/\bsecond resurrection\b/i.test(m) || /\braised again\b/i.test(m)) {
    finalConclusion =
      'Scripture does not teach that the same first-resurrection saints are raised again in the second; Revelation 20 distinguishes the first resurrection from the rest of the dead who live after the thousand years, and John 5 / Daniel 12 speak of resurrection unto life and unto judgment.';
    focusWitnesses = ['Revelation 20:4-6', 'Revelation 20:5', 'John 5:28-29', 'Daniel 12:2'];
  } else if (/\bhow many resurrections\b/i.test(m) || /\bresurrection chronology\b/i.test(m)) {
    finalConclusion =
      'Scripture speaks of Jesus’ resurrection and of the resurrection of the dead in ordered witness: a first resurrection of the righteous who reign with Christ, and the rest of the dead afterward (Revelation 20; John 5; Daniel 12) — not a single collapsed answer.';
    focusWitnesses = ['Revelation 20:4-6', 'Revelation 20:5', 'John 5:28-29', 'Daniel 12:2', '1 Thessalonians 4:13-17'];
  }

  const witnessText = focusWitnesses.slice(0, 4).join('; ');
  return {
    finalConclusion,
    reply: `Direct answer: ${finalConclusion} Scripture witnesses: ${witnessText}.`,
    scriptureWitnesses: focusWitnesses,
    topic: 'resurrection',
    chronologyFocus: true,
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
  else if (topic === 'resurrection') base = buildResurrectionFinalAnswer(message, c);
  else if (topic === 'kingdom' && detectKingdomOnEarthTopic(message)) base = buildKingdomOnEarthFinalAnswer(message);
  else base = buildGenericFinalAnswer(topic, c);

  // seedReply = legacy template prose (decision evidence only; not final composition)
  let seedReply = base.reply;
  if (userId) {
    seedReply = applyCorrectionsToReply(seedReply, userId, topic);
    if (topic === 'acts_10' || topic === 'dietary_law') {
      seedReply = applyCorrectionsToReply(seedReply, userId, 'acts_10');
    }
  }

  seedReply = formatDirectDoctrineReply(seedReply, message, {
    topic,
    scripture: (base.scriptureWitnesses || []).map((r) => ({ reference: r })),
    userId,
    userPreferences: require('./userCorrectionMemory').getUserAnswerPreferences(userId),
  });

  return {
    ...base,
    seedReply,
    reply: seedReply,
    allowedWitnesses: c.approvedWitnesses || base.scriptureWitnesses,
    supportingWitnesses: c.supportingWitnesses || [],
    forbiddenClaims: c.prohibitedClaims || [],
    forbiddenPhrases: [...new Set([...(c.forbiddenPhrases || []), ...(base.forbiddenPhrases || [])])],
    noDoctrineReasoning: true,
    finalAuthority: true,
    scripture: (base.scriptureWitnesses || []).map((r) => ({ reference: r, theme: topic })),
  };
}

/**
 * Phase 1D — doctrine decision contract (immutable authority fields).
 * Does not own final conversational prose.
 */
function buildDoctrineDecisionContract(authority = {}, evidencePack = null, message = '') {
  const packet = evidencePack?.verifiedLessonPacket || null;
  const msg = String(message || '');
  return {
    doctrinalConclusion: authority.finalConclusion || null,
    requiredWitnesses: authority.scriptureWitnesses || authority.allowedWitnesses || [],
    prohibitedClaims: authority.forbiddenClaims || [],
    forbiddenPhrases: authority.forbiddenPhrases || [],
    topic: authority.topic || null,
    explicitScripture: authority.scriptureWitnesses || [],
    governanceLocks: {
      noDoctrineReasoning: true,
      finalAuthority: true,
      openAiMayDetermineDoctrine: false,
      openAiMayApproveEvidence: false,
    },
    responseRequirements: {
      directAnswerFirst: isYesNoQuestion(msg),
      shortAnswer: /\b(short|brief|briefly|concise)\b/i.test(msg),
      scriptureOnly: /\bscripture only\b/i.test(msg),
      goDeeper: /\b(go deeper|more detail|explain more|deeper)\b/i.test(msg),
      followUpFocus:
        /\bwhat (do|did|does) (they|those|the)\b/i.test(msg) ||
        /\bnot merely when\b/i.test(msg) ||
        /\bi asked\b/i.test(msg),
    },
    packetPresent: !!packet,
    passageRoleCount: Array.isArray(packet?.passageRoles) ? packet.passageRoles.length : 0,
    evidenceLimitations: packet?.prohibitedOverstatements || [],
  };
}

function isGospelDiscoveryWitness(ref = '') {
  const r = String(ref || '').toLowerCase();
  return /\b(matthew\s*12:40|matthew\s*27|matthew\s*28|mark\s*16|luke\s*24|john\s*20)\b/.test(r);
}

function pickWitnessPresentation(authority, packet, limit = 4, message = '') {
  const witnesses = authority.scriptureWitnesses || authority.allowedWitnesses || [];
  const roles = Array.isArray(packet?.passageRoles) ? packet.passageRoles : [];
  const chronologyFocus =
    authority.topic === 'resurrection' &&
    (authority.chronologyFocus ||
      /\b(first resurrection|second resurrection|rest of the dead|how many resurrections|resurrection chronology|reign with)\b/i.test(
        String(message || ''),
      ));

  const ranked = [];
  const seen = new Set();

  // For resurrection chronology, prefer contract/authority witnesses first so Gospel
  // discovery packet roles cannot hijack first/second-resurrection answers.
  if (chronologyFocus) {
    for (const w of witnesses) {
      if (ranked.length >= limit) break;
      const key = String(w);
      if (isGospelDiscoveryWitness(key)) continue;
      if (seen.has(key.toLowerCase())) continue;
      seen.add(key.toLowerCase());
      ranked.push(key);
    }
  }

  for (const role of roles) {
    if (ranked.length >= limit) break;
    const ref = String(role.reference || '').trim();
    if (!ref) continue;
    if (chronologyFocus && isGospelDiscoveryWitness(ref)) continue;
    const hit = witnesses.find((w) => {
      const wNorm = String(w).toLowerCase();
      const rNorm = ref.toLowerCase();
      return wNorm.includes(rNorm) || rNorm.includes(wNorm) || wNorm.startsWith(rNorm.slice(0, 12));
    });
    const key = String(hit || ref);
    if (chronologyFocus && !hit && isGospelDiscoveryWitness(key)) continue;
    if (seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    ranked.push(key);
  }
  for (const w of witnesses) {
    if (ranked.length >= limit) break;
    const key = String(w);
    if (seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    ranked.push(key);
  }
  return ranked.slice(0, limit);
}

/**
 * Phase 1D — subordinate deterministic composer (not a new engine).
 * Locks doctrinal conclusion; shapes prose from current message + VLP.
 */
function composeDeterministicDoctrineReply({
  authority = null,
  evidencePack = null,
  message = '',
  userId = null,
} = {}) {
  if (!authority || !authority.finalConclusion) {
    return { reply: authority?.reply || '', doctrineDecision: null };
  }

  const packet = evidencePack?.verifiedLessonPacket || null;
  const decision = buildDoctrineDecisionContract(authority, evidencePack, message);
  const msg = String(message || '');
  const conclusion = authority.finalConclusion;
  const witnessLimit = decision.responseRequirements.shortAnswer ? 2 : decision.responseRequirements.goDeeper ? 6 : 4;
  const witnessLines = pickWitnessPresentation(authority, packet, witnessLimit, msg);
  const witnessBlock = witnessLines.length ? `Scripture witnesses: ${witnessLines.join('; ')}.` : '';

  let usedPacketComposition = false;
  let reply;
  if (decision.responseRequirements.scriptureOnly) {
    reply = `${witnessBlock} ${conclusion}`.trim();
    usedPacketComposition = !!packet;
  } else if (decision.responseRequirements.shortAnswer) {
    reply = `${conclusion}${witnessLines.length ? ` (${witnessLines.join('; ')})` : ''}`;
    usedPacketComposition = !!packet;
  } else if (decision.responseRequirements.followUpFocus) {
    reply = `Direct answer to your follow-up: ${conclusion} ${witnessBlock}`.trim();
    usedPacketComposition = !!packet;
  } else if (packet) {
    // Packet present: compose from decision + VLP roles/witnesses (never stamp fixed template)
    reply = `Direct answer: ${conclusion} ${witnessBlock}`.trim();
    usedPacketComposition = true;
  } else {
    // Fallback: seed template when packet absent (backward compatible)
    reply = authority.seedReply || authority.reply || conclusion;
  }

  if (decision.responseRequirements.goDeeper && packet?.scriptureBlocks?.length) {
    const excerpts = packet.scriptureBlocks.slice(0, 2).map((b) => {
      const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 180);
      return text ? `${b.reference}: ${text}` : b.reference;
    });
    if (excerpts.length) {
      reply = `${reply} Supporting text: ${excerpts.join(' ')}`;
      usedPacketComposition = true;
    }
  }

  if (userId) {
    reply = applyCorrectionsToReply(reply, userId, authority.topic);
    if (authority.topic === 'acts_10' || authority.topic === 'dietary_law') {
      reply = applyCorrectionsToReply(reply, userId, 'acts_10');
    }
  }

  reply = formatDirectDoctrineReply(reply, message, {
    topic: authority.topic,
    scripture: (authority.scriptureWitnesses || []).map((r) => ({ reference: r })),
    userId,
    userPreferences: require('./userCorrectionMemory').getUserAnswerPreferences(userId),
  });

  // Governance: conclusion must remain visible
  const clip = conclusion.slice(0, Math.min(48, conclusion.length)).toLowerCase();
  if (clip && !String(reply).toLowerCase().includes(clip)) {
    reply = `${conclusion} ${reply}`;
  }

  return {
    reply,
    doctrineDecision: {
      ...decision,
      composedFromVerifiedLessonPacket: usedPacketComposition,
    },
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

function buildFinalAuthorityStructured(authority, runtimeContext = {}, safety = {}, opts = {}) {
  const { evidencePack = null, message = '', userId = null } = opts || {};
  const composed = composeDeterministicDoctrineReply({
    authority,
    evidencePack,
    message,
    userId,
  });
  const reply = composed?.reply || authority.reply;
  const fromPacket = !!composed?.doctrineDecision?.composedFromVerifiedLessonPacket;
  return {
    reply,
    scripture: authority.scripture || [],
    mode: 'companion',
    confidence: 'high',
    memory_used: false,
    safety_level: safety?.level || 'standard',
    orb_state: runtimeContext?.intent === 'prayer' ? 'praying' : 'speaking',
    admin_flags: ['doctrine_final_authority'],
    finalConclusion: authority.finalConclusion,
    doctrineFinalAuthority: true,
    doctrineDecision: composed?.doctrineDecision || null,
    doctrineComposedFromPacket: fromPacket,
    runtime: {
      emotion: runtimeContext?.emotion,
      intent: runtimeContext?.intent || 'study',
      masterRoute: 'doctrine_final_authority',
      openAiCalled: false,
      buddyRuntime: 'core_openai_first',
      doctrineTopic: authority.topic,
      noDoctrineReasoning: true,
      doctrineComposedFromPacket: fromPacket,
      doctrineDecisionTopic: authority.topic || null,
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
  buildDoctrineDecisionContract,
  composeDeterministicDoctrineReply,
  resolveFinalAuthorityForPack,
  validateWarmthAgainstAuthority,
  buildOpenAiWarmthPayload,
  containsDriftVerses,
  buildActs10FinalAnswer,
  buildDeathStateFinalAnswer,
  buildDietaryLawFinalAnswer,
  buildResurrectionFinalAnswer,
};
