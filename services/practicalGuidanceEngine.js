/**
 * Phase 5G — Practical guidance: Scripture truth first, companion help second.
 */

const { getGraphNode } = require('./bibleConceptGraph');
const { getRelationshipContext, buildMemoryAwareOpening } = require('./relationshipMemoryEngine');
const { resolveConceptFromState } = require('./companionIntentIntelligence');

const PRACTICAL_HELP_RE = [
  { re: /\bhow (should|do|can) i explain\b/i, type: 'family_explanation' },
  { re: /\bbut how do i explain\b/i, type: 'family_explanation' },
  { re: /\bhow do i tell (her|him)\b/i, type: 'boundary_script' },
  { re: /\bif i'?m not ready.{0,40}tell (her|him)\b/i, type: 'boundary_script' },
  { re: /\bhow do i tell (my |the )?(family|them)\b/i, type: 'family_explanation' },
  { re: /\bwhat (words|should i say)\b/i, type: 'boundary_script' },
  { re: /\bwhat if my family disagree/i, type: 'family_disagreement' },
  { re: /\bfamily (still )?disagree/i, type: 'family_disagreement' },
  { re: /\bnervous about talking\b/i, type: 'nervous_family' },
  { re: /\bwhat verse should i remember\b/i, type: 'verse_for_situation' },
];

const PRAYER_RE = /\b(can you pray with me|pray with me|please pray|will you pray with me)\b/i;

function detectPracticalHelpRequest(message = '', state = {}) {
  const m = String(message || '').trim();
  if (!m) return null;

  if (PRAYER_RE.test(m)) {
    return { type: 'prayer', conceptId: 'prayer_with_user' };
  }

  for (const { re, type } of PRACTICAL_HELP_RE) {
    if (re.test(m)) {
      const conceptId = resolveConceptFromState(state);
      return { type, conceptId, message: m };
    }
  }

  if (
    /\bnervous\b/i.test(m) &&
    (state.familyConversationContext || state.sessionMemory?.familyContext)
  ) {
    return { type: 'nervous_family', conceptId: resolveConceptFromState(state), message: m };
  }

  if (/^why\??$/i.test(m) && resolveConceptFromState(state)) {
    return { type: 'why_followup', conceptId: resolveConceptFromState(state) };
  }

  return null;
}

function buildFamilyExplanation({ concept = null } = {}) {
  const id = concept?.id || concept;
  if (id === 'dietary_pork_unclean' || id === 'dietary_law' || id === 'dietary_clean_unclean') {
    return {
      reply:
        "You can say it gently: \"I'm not judging anyone. I'm trying to obey what I see in Scripture. Leviticus 11 and Deuteronomy 14 call swine unclean, and Acts 10:28 shows Peter's vision was about people, not changing food laws. I'm choosing to follow that.\"",
      scripture: [
        { reference: 'Leviticus 11:7-8', theme: 'dietary' },
        { reference: 'Deuteronomy 14:8', theme: 'dietary' },
        { reference: 'Acts 10:28', theme: 'acts_10' },
      ],
    };
  }
  if (id === 'acts_10_people_not_food' || id === 'acts_10') {
    return {
      reply:
        "You could say: \"Acts 10 is about people, not food. Peter explains in Acts 10:28 that God showed him not to call any man common or unclean. Acts 10:14 still shows Peter refusing unclean food. I'm not using that passage to change what Leviticus teaches about food.\"",
      scripture: [
        { reference: 'Acts 10:28', theme: 'acts_10' },
        { reference: 'Acts 10:14', theme: 'acts_10' },
      ],
    };
  }
  return null;
}

function buildBoundaryScript({ situation = '', priorDraft = '' } = {}) {
  const s = String(situation).toLowerCase();
  const prior = String(priorDraft || '').trim();
  const wantsFinal =
    /\b(final text|copy(\s*and\s*|\s*)paste|give me the (final )?text)\b/i.test(s);
  const wantsProfessional = /\b(more )?professional\b/i.test(s);
  const wantsWarmRevision =
    /\b(warmer|more human|improve|revise|rewrite|use the text)\b/i.test(s) && !wantsProfessional;
  const sexualBoundary =
    /sex|fornicat|strings|not ready|dating|girl|massage|her\b|commit fornication|outside of marriage/i.test(
      s,
    ) || /sex|fornicat|massage|faith|marriage/i.test(prior);

  if (sexualBoundary || wantsWarmRevision || wantsProfessional || wantsFinal || prior) {
    let draft;
    if (wantsProfessional) {
      draft =
        "I want to be clear and respectful. After we talked about the massage, I realized things could become more physical. My faith in God is important to me, and I am not willing to have sex outside of marriage. This is not a judgment of you — it is a boundary I need to honor. I hope you can understand, and I still want to treat you with respect.";
    } else if (wantsWarmRevision || (prior && /\bimprove\b/i.test(s))) {
      draft =
        "I want to be honest with you because I respect you and I've enjoyed getting to know you. I know we talked about the massage, and I can feel things might become more physical. My faith in God matters to me, and I don't want to put either of us in a place where I compromise what I believe about sex outside of marriage. I'm not judging you or rejecting you — I just want to be clear and treat you with respect. I hope you can understand.";
    } else if (wantsFinal && prior) {
      // Prefer a clean copyable artifact — strip meta wrappers from prior draft.
      draft = prior
        .replace(/^here is a text[^\n]*\n+/i, '')
        .replace(/^you could say:\s*/i, '')
        .replace(/^["'“]+|["'”]+$/g, '')
        .trim();
      if (draft.length < 40) {
        draft =
          "I want to be honest with you because I respect you and I've enjoyed getting to know you. I know we talked about the massage, and I can feel things might become more physical. My faith in God matters to me, and I don't want to put either of us in a place where I compromise what I believe about sex outside of marriage. I'm not judging you or rejecting you — I just want to be clear and treat you with respect. I hope you can understand.";
      }
    } else {
      draft =
        "I care about you, and I want to be honest. I'm not ready to cross into sex outside of marriage — my faith in God matters to me, and I want to honor that for both of us. I'm not judging you. I'd rather slow down and stay respectful than do something I believe is wrong.";
    }
    return {
      reply: `Here is a text you can copy and send:\n\n${draft}`,
      scripture: [
        { reference: '1 Corinthians 6:18', theme: 'fornication' },
        { reference: '1 Thessalonians 4:3-5', theme: 'fornication' },
        { reference: 'Hebrews 13:4', theme: 'marriage_bed' },
      ],
    };
  }
  return {
    reply:
      'You can speak clearly and kindly: name what you are not ready for, why Scripture matters to you, and what boundary you need. Ask for respect without arguing in the moment.',
    scripture: [{ reference: '1 Corinthians 6:18', theme: 'boundaries' }],
  };
}

function buildPrayerResponse({ message = '', state = {}, userId = '' } = {}) {
  const opening = buildMemoryAwareOpening({ userId, message });
  const familyCtx = state.familyConversationContext || getRelationshipContext({ userId }).familyConversationContext;
  const focus = familyCtx ? 'steady his heart as he talks with family' : 'steady his heart';

  const prayer = `Father, please ${focus}. Give him wisdom, peace, and courage to obey You with love. Help him speak gently, listen well, and not be moved by fear. In Jesus' name, amen.`;

  const prefix = opening ? `${opening} ` : '';
  return {
    reply: `${prefix}Yes, I'll pray with you.\n\n${prayer}\n\nHold onto Philippians 4:6-7 and James 1:5.`,
    scripture: [
      { reference: 'Philippians 4:6-7', theme: 'prayer' },
      { reference: 'James 1:5', theme: 'prayer' },
    ],
  };
}

function buildNextStepSuggestion({ concept = null, emotionalState = '' } = {}) {
  const id = concept?.id || concept;
  if (/overwhelmed|nervous|afraid/i.test(emotionalState)) {
    return 'Would you like me to pray with you about this?';
  }
  if (id === 'dietary_pork_unclean' || id === 'dietary_law') {
    return 'If you want, I can help you think through what to say at a family meal.';
  }
  if (id === 'fornication_sexual_sin' || id === 'sexual_boundaries_dating') {
    return 'Would a short boundary script help for what to say?';
  }
  return null;
}

function buildPracticalGuidance({
  concept = null,
  message = '',
  state = {},
  type = null,
  userId = '',
} = {}) {
  const conceptId = concept?.id || concept || resolveConceptFromState(state);
  const node = conceptId ? getGraphNode(conceptId) : null;
  const detected = type || detectPracticalHelpRequest(message, state)?.type;

  if (detected === 'prayer') {
    return { ...buildPrayerResponse({ message, state, userId }), masterRoute: 'practical_guidance_prayer' };
  }

  if (detected === 'boundary_script' || detected === 'sexual_boundary') {
    const boundary = buildBoundaryScript({ situation: message });
    const nodeAnswer = node?.directAnswer ? `${node.directAnswer} ` : '';
    return {
      reply: nodeAnswer + boundary.reply,
      scripture: boundary.scripture,
      masterRoute: 'practical_guidance_boundary',
    };
  }

  if (detected === 'family_explanation' || detected === 'family_disagreement') {
    const fam = buildFamilyExplanation({ concept: conceptId || 'dietary_pork_unclean' });
    if (fam) {
      const opener =
        detected === 'family_disagreement'
          ? "Family disagreement can feel heavy. You don't have to win an argument — you can speak with respect and stay with Scripture. "
          : "Here's wording you can use — gentle and clear: ";
      return {
        reply: opener + fam.reply,
        scripture: fam.scripture,
        masterRoute: 'practical_guidance_family',
      };
    }
  }

  if (detected === 'nervous_family') {
    const opening = buildMemoryAwareOpening({ userId, message }) || "I hear that you're nervous.";
    const next = buildNextStepSuggestion({ concept: conceptId, emotionalState: 'nervous' });
    return {
      reply: `${opening} That's understandable when Scripture and family relationships are both on the line. Speak slowly, listen, and don't try to answer every objection in one sitting. Joshua 1:9 reminds us to be strong and courageous — the LORD is with you. ${next || 'Would you like me to pray with you before you talk with them?'}`,
      scripture: [
        { reference: 'Joshua 1:9', theme: 'courage' },
        { reference: 'Philippians 4:6-7', theme: 'peace' },
      ],
      masterRoute: 'practical_guidance_nervous',
    };
  }

  if (detected === 'verse_for_situation') {
    const ref = state.familyConversationContext ? 'Joshua 1:9' : 'Philippians 4:6-7';
    return {
      reply: `For courage in a hard conversation, hold onto ${ref}. For peace when you're anxious, Philippians 4:6-7 invites you to bring every care to God.`,
      scripture: [
        { reference: 'Joshua 1:9', theme: 'courage' },
        { reference: 'Philippians 4:6-7', theme: 'peace' },
      ],
      masterRoute: 'practical_guidance_verse',
    };
  }

  if (detected === 'why_followup' && node) {
    const witnesses = (node.witnesses || []).slice(0, 3).join(', ');
    const ack = /\bwhy won'?t you answer|not what i asked|that's not what i asked\b/i.test(message)
      ? "You're right — let me answer directly. "
      : '';
    return {
      reply: `${ack}${node.directAnswer || ''} Scripture witnesses: ${witnesses}.`.trim(),
      scripture: (node.witnesses || []).slice(0, 3).map((r) => ({ reference: r, theme: conceptId })),
      masterRoute: 'practical_guidance_why',
    };
  }

  return null;
}

module.exports = {
  detectPracticalHelpRequest,
  buildPracticalGuidance,
  buildFamilyExplanation,
  buildBoundaryScript,
  buildPrayerResponse,
  buildNextStepSuggestion,
  PRAYER_RE,
};
