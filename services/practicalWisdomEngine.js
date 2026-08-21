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

function extractPriorDraftText(state = {}) {
  const mem = state.conversationMemory || state.sessionMemory?.conversationMemory || {};
  const raw = String(mem.lastReply || '');
  if (!raw) return '';
  // Prefer the copyable body after our draft header.
  const m = raw.match(/here is a text[^\n]*\n+([\s\S]+)/i);
  if (m?.[1]) return m[1].trim().slice(0, 900);
  if (/you could say/i.test(raw)) {
    return raw.replace(/^[\s\S]*you could say:\s*/i, '').replace(/^['"]|['"]$/g, '').trim().slice(0, 900);
  }
  return raw.slice(0, 900);
}

function buildPracticalWisdomResponse({ message = '', anchor = {}, conceptId = null, state = {} } = {}) {
  const id = resolvePracticalConceptId(conceptId, anchor, state);
  const m = String(message || '');
  const wantsFamilyWording =
    /family|explain|disagree|what should i say/i.test(m) ||
    CONTEXT_META_RE.test(m) ||
    FAMILY_EXPLAIN_RE.test(m) ||
    anchor.currentPracticalNeed === 'gentle_explanation';

  if (wantsFamilyWording && !/\b(text|message|draft|copy|professional|warmer|final text)\b/i.test(m)) {
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

  const writingHelp =
    /\b(give me (a |the )?(text|message|draft)|write (me )?(a )?(text|message)|copy(\s*and\s*|\s*)paste|final text|final version|make that (text|message)|use the text|warmer|more human|more professional|professional|improve (that|the|it)|shorten|tell (her|him)|not ready|boundary|what should i say)\b/i.test(
      m,
    ) || anchor.currentGoal === 'set_boundary';

  if (writingHelp) {
    const priorDraft = extractPriorDraftText(state);
    const boundary = buildBoundaryScript({ situation: m, priorDraft });
    const body = boundary.reply.replace(/^I hear you\.\s*/i, '').trim();
    const alreadyDraft = /^here is a text/i.test(body);
    return {
      reply: alreadyDraft ? body : `You could say:\n\n${body}`,
      scripture: boundary.scripture,
      masterRoute: 'phase5k_practical_wisdom_boundary',
    };
  }

  return null;
}

module.exports = {
  buildPracticalWisdomResponse,
  extractPriorDraftText,
};
