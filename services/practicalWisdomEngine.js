/**
 * Phase 5K/5L — Practical wording drafts (not final authority).
 */

const { buildFamilyExplanation, buildBoundaryScript } = require('./practicalGuidanceEngine');

const CONTEXT_META_RE =
  /\b(what we were talking about|about what we talked|what we talked about|asking what we were talking)\b/i;
const FAMILY_EXPLAIN_RE =
  /\b(how (do|should|can) i explain|yes\.\s*how do i explain|explain to (my )?family)\b/i;

function resolvePracticalConceptId(conceptId, anchor = {}, state = {}) {
  const sm = state.sessionMemory || {};
  const candidates = [
    conceptId,
    anchor.currentDoctrineConcept,
    sm.activeConcept,
    state.lastAnsweredConcept,
    anchor.currentTopic,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (/^(ten_commandments|prayer_comfort|abomination_desolation)$/i.test(c)) continue;
    return c;
  }
  return null;
}

function buildPracticalWisdomResponse({ message = '', anchor = {}, conceptId = null, state = {} } = {}) {
  const id = resolvePracticalConceptId(conceptId, anchor, state);
  const m = String(message || '');
  const wantsFamilyWording =
    /family|explain|disagree|what should i say/i.test(m) ||
    CONTEXT_META_RE.test(m) ||
    FAMILY_EXPLAIN_RE.test(m) ||
    anchor.currentPracticalNeed === 'gentle_explanation';

  if (wantsFamilyWording) {
    if (!id) {
      return {
        reply: "I hear you. What is the situation with your son? Tell me what happened and what you want him to understand, and I’ll help you say it with truth, love, and wisdom.",
        scripture: [],
        masterRoute: 'phase5n_practical_context_needed',
      };
    }
    const fam = buildFamilyExplanation({ concept: id });
    if (fam) {
      const wording =
        "I love you and respect you. I'm not judging anyone. After studying Scripture, I believe God distinguishes clean and unclean foods. Leviticus 11 and Deuteronomy 14 are the passages that led me there, and Acts 10:28 shows Peter's vision was about people, not changing food laws. I'm choosing to follow what I understand God has shown me.";
      const opening = /disagree/i.test(m)
        ? "Family disagreement can feel heavy — you don't have to win an argument."
        : "I hear you — you're asking how to say it without sounding harsh.";
      return {
        reply: `${opening} You could say: '${wording}'\n\nTry to speak with peace, not pressure.`,
        scripture: fam.scripture,
        masterRoute: 'phase5l_practical_wisdom_family',
      };
    }
  }

  if (/tell (her|him)|not ready|boundary|what should i say/i.test(m) || anchor.currentGoal === 'set_boundary') {
    const boundary = buildBoundaryScript({ situation: m });
    return {
      reply: `You could say:\n\n${boundary.reply.replace(/^I hear you\.\s*/i, '')}`,
      scripture: boundary.scripture,
      masterRoute: 'phase5k_practical_wisdom_boundary',
    };
  }

  return null;
}

module.exports = {
  buildPracticalWisdomResponse,
};
