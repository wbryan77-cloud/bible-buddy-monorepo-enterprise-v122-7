/**
 * Sprint 2.FINAL — Companion discernment for life decisions (job, timing, direction).
 * Not a verse machine — listens first, then Scripture.
 */

const { buildScriptureWitnessBlock } = require('./scriptureWitnessEngine');
const { polishCompanionReply } = require('./companionReplyPolish');

const DISCERNMENT_PATTERNS = [
  /\bjob opportunity\b/i,
  /\bnew job\b/i,
  /\binterview\b/i,
  /\bshould i (take|accept|apply)\b/i,
  /\boffer (letter|from)\b/i,
  /\bdon'?t know if i should\b/i,
  /\bpush or wait\b/i,
  /\b(is )?far away\b/i,
  /\bdecision about\b/i,
  /\bwhat (should|do) i do\b/i,
];

const DISCERNMENT_SCRIPTURES = [
  { reference: 'Proverbs 3:5-6', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.', reason: 'trust and direction' },
  { reference: 'James 1:5', text: 'If any of you lack wisdom, let him ask of God.', reason: 'wisdom for decisions' },
  { reference: 'Psalm 37:23', text: 'The steps of a good man are ordered by the LORD.', reason: 'ordered steps' },
];

function classifyDiscernment(message = '') {
  const text = String(message || '');
  const isDiscernment = DISCERNMENT_PATTERNS.some((p) => p.test(text));
  return { isDiscernment, matched: isDiscernment ? 'discernment' : null };
}

function buildDiscernmentResponse({
  userId = 'anonymous',
  message = '',
  runtimeContext = {},
  profile = {},
  isFollowUp = false,
} = {}) {
  const text = String(message || '');
  const witness = buildScriptureWitnessBlock({
    doctrineTopic: 'discernment',
    scripture: DISCERNMENT_SCRIPTURES,
    chainMeta: { genesisToRevelationPath: DISCERNMENT_SCRIPTURES.map((s) => s.reference) },
  });

  let opening;
  if (isFollowUp && /\bfar away\b/i.test(text)) {
    opening =
      "That distance can feel heavy — it's not just a job, it's a whole life shift. What feels heaviest right now: leaving people behind, the unknown, or whether this timing is from the Lord?";
  } else if (isFollowUp && /\bpush or wait\b/i.test(text)) {
    opening =
      "That's a real tension — wanting to move forward but not wanting to force something that isn't ready. What would waiting look like for you, and what would pushing look like?";
  } else if (/\bjob opportunity\b|\bnew job\b|\boffer\b/i.test(text)) {
    opening =
      "That sounds like an important decision. What feels heaviest right now — the distance, timing, money, or whether this is from God?";
  } else if (isFollowUp) {
    opening = "I'm listening — tell me more about what's weighing on you with this decision.";
  } else {
    opening = "That sounds like something worth sitting with carefully. What's the part that feels most uncertain right now?";
  }

  const scriptureBlock =
    witness.connection ||
    'Proverbs 3:5-6 invites trust rather than leaning on our own understanding. James 1:5 says we can ask God for wisdom. Psalm 37:23 reminds us the LORD orders our steps.';

  const parts = [opening, scriptureBlock];
  if (!isFollowUp) {
    parts.push('If you want, we can pray through this together or walk through the decision one piece at a time.');
  }

  const reply = polishCompanionReply(parts.filter(Boolean).join('\n\n'));

  return {
    reply,
    scripture: witness.enrichedScripture.length ? witness.enrichedScripture : DISCERNMENT_SCRIPTURES,
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: ['Pray for wisdom.', 'List what you know and what you still need clarity on.'],
    admin_flags: ['discernment_support'],
    runtime: {
      intent: 'discernment',
      emotion: runtimeContext?.emotion,
      supportType: 'discernment',
      questionIntent: runtimeContext?.questionIntent || null,
      companionPresentation: { skipRelationshipEnrichment: false, skipStudyPrompts: true },
    },
    quality: { score: 96, issues: [], passed: true },
  };
}

function buildOpenLifeResponse({
  userId = 'anonymous',
  message = '',
  runtimeContext = {},
  isFollowUp = false,
} = {}) {
  const text = String(message || '');
  const witness = buildScriptureWitnessBlock({
    doctrineTopic: 'discernment',
    scripture: DISCERNMENT_SCRIPTURES,
    chainMeta: { genesisToRevelationPath: DISCERNMENT_SCRIPTURES.map((s) => s.reference) },
  });

  let opening;
  if (isFollowUp && /\bhelp me think\b/i.test(text)) {
    opening =
      "Let's think through it together. What part feels hardest to sort out — knowing God's direction, timing, or what step comes first?";
  } else if (/\bwhat god wants\b/i.test(text)) {
    opening =
      "That's a honest place to be. What makes you feel unsure right now — a specific decision, or a general sense that life doesn't fit where you are?";
  } else if (isFollowUp) {
    opening = "I'm listening. Tell me more about what's feeling lost or heavy right now.";
  } else {
    opening =
      "I hear you. Feeling lost can be disorienting. What feels most unsettled — direction, purpose, or just not knowing the next step?";
  }

  const scriptureBlock =
    witness.connection ||
    'Proverbs 3:5-6 invites trust rather than leaning on our own understanding. James 1:5 says we can ask God for wisdom. Psalm 37:23 reminds us the LORD orders our steps.';

  const reply = polishCompanionReply([opening, scriptureBlock].filter(Boolean).join('\n\n'));

  return {
    reply,
    scripture: witness.enrichedScripture.length ? witness.enrichedScripture : DISCERNMENT_SCRIPTURES,
    mode: 'companion',
    confidence: 'medium',
    memory_used: false,
    orb_state: 'speaking',
    safety_level: 'standard',
    admin_flags: ['open_life_support'],
    runtime: {
      intent: 'open_life',
      masterRoute: 'open_general',
      companionPresentation: { skipRelationshipEnrichment: true, skipStudyPrompts: true },
    },
    quality: { score: 96, issues: [], passed: true },
  };
}

module.exports = {
  classifyDiscernment,
  buildDiscernmentResponse,
  buildOpenLifeResponse,
  DISCERNMENT_PATTERNS,
};
