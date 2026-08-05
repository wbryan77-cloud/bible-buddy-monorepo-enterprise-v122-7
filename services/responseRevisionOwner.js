/**
 * Phase 5Q — Response Revision Owner
 * Owns "better / deeper / more / explain further" requests before
 * no-glitch, doctrine, BibleWide, pending question, and OpenAI routing.
 *
 * CORE_COMPANION_RECOVERY — also owns correction turns that challenge a prior
 * claim, so they cannot fall through to OpenAI connection-error / ask-again.
 */

const { getContinuationMemory } = require('./conversationContinuationMemory');
const REVISION_RE =
  /\b(better|deeper|expand|more scriptures|more detail|try again|explain further|go deeper|longer prayer|clarify|clarification|rewrite|reword)\b/i;
const CORRECTION_RE =
  /\b(does not say|doesn't say|did not say|didn't say|not say that|contradicting yourself|you are contradicting|you did not answer|you didn't answer|that verse does not|glitching|that's not what i asked|not what i asked)\b/i;

function detectRevisionRequest(message = '', memory = null) {
  const m = String(message || '').trim();
  if (!m || !memory) return false;

  // Phase 7A — prayer intent stays prayer (Case 4). "again" alone must not open revision menus.
  if (/\b(pray|prayer)\b/i.test(m) && !/\b(better prayer|longer prayer|deeper prayer)\b/i.test(m)) {
    return false;
  }

  if (REVISION_RE.test(m)) return true;

  const shortWords = m.split(/\s+/).filter(Boolean).length <= 5;
  if (shortWords && /\b(more|why|how so|again|deeper|better)\b/i.test(m)) return true;

  return false;
}

function scriptureRefs(memory = {}) {
  return (memory.lastScripture || []).map((s) => s.reference || s).filter(Boolean);
}

function classifyRevision(message = '', memory = {}) {
  const m = String(message || '').toLowerCase();
  const route = String(memory.lastRoute || '').toLowerCase();
  const refs = scriptureRefs(memory).join(' ').toLowerCase();

  if (/prayer|better prayer|longer prayer/.test(m) || /prayer/.test(route)) return 'prayer';
  if (/more scriptures|scriptures|witness/.test(m) || refs || /doctrine|bible|acts|dietary|sabbath|kingdom/.test(route)) return 'scripture';
  if (/app_identity|identity/.test(route) || /what does.*app|biblebuddy/.test(String(memory.lastUserMessage || '').toLowerCase())) return 'identity';
  return 'explanation';
}

function detectCorrectionRequest(message = '', memory = null) {
  const m = String(message || '').trim();
  if (!m) return false;
  if (!CORRECTION_RE.test(m)) return false;
  // Allow pork/Acts-10 meta-corrections even when continuation memory is thin
  // (ephemeral production hosts can miss the prior write between turns).
  if (/pork|acts\s*10|unclean|swine/i.test(m) && /you did not answer|you didn't answer|not what i asked/i.test(m)) {
    return true;
  }
  // Prefer corrections that have prior conversation context; still allow
  // standalone "answer yes or no" when memory exists from the prior turn.
  return !!(memory && (memory.lastReply || memory.lastRoute || memory.lastScripture?.length));
}

/**
 * Repair the exact disputed claim using prior turn evidence — not a canned
 * apology and not an ask-again clarifier.
 */
function buildCorrectionReply({ userId, message = '' } = {}) {
  const memory = getContinuationMemory(userId);
  if (!detectCorrectionRequest(message, memory)) return null;

  const m = String(message || '').toLowerCase();
  const prior = String(memory.lastUserMessage || '').toLowerCase();
  const priorReply = String(memory.lastReply || '');
  const route = String(memory.lastRoute || '');
  const refs = scriptureRefs(memory);

  const aboutResurrectionTiming =
    /matthew\s*28|resurrection|rose|risen|tomb|women/i.test(prior) ||
    /matthew\s*28|resurrection|rose|risen|tomb/i.test(priorReply) ||
    /matthew\s*28|resurrection/i.test(route) ||
    refs.some((r) => /matthew\s*28/i.test(String(r)));

  if (aboutResurrectionTiming && /exact time|moment|when.*(rose|risen)|time he rose|does not say|doesn't say/i.test(m)) {
    return {
      revisionType: 'correction_scripture_silence',
      route: 'response_correction_matthew28_silence',
      reply:
        'You are right to press that point. Matthew 28 tells when the women came to the tomb and that Jesus was already risen when they found it empty — “as it began to dawn toward the first day of the week.” That passage does not explicitly state the precise moment He rose. We should not turn the time of discovery into an exact resurrection timestamp without additional evidence. Scripture is clear that He rose; Matthew 28 does not give a clock-time for the rising itself.',
      scripture: [{ reference: 'Matthew 28:1-6', theme: 'women arrive; already risen' }],
    };
  }

  if (/you did not answer|you didn't answer|not what i asked/i.test(m)) {
    const priorAnswered =
      priorReply.length > 60 &&
      (/^no\b|^yes\b/i.test(priorReply.trim()) ||
        /acts\s*10|leviticus|deuteronomy|matthew|scripture speaks|staying with scripture/i.test(priorReply));
    const aboutPork =
      /pork|acts\s*10|unclean|swine/i.test(prior) ||
      /pork|acts\s*10|unclean|swine/i.test(priorReply) ||
      /pork|acts\s*10|unclean|swine/i.test(m);

    // If the prior turn already answered, or the correction itself names pork/Acts 10,
    // restate — do not ask the user to repeat (production memory can be thin on ephemeral hosts).
    if (aboutPork && (priorAnswered || /pork|acts\s*10/i.test(m))) {
      return {
        revisionType: 'correction_restate_prior',
        route: 'response_correction_restate_dietary',
        reply:
          'You are right to demand a direct answer. Here it is clearly: No — Acts 10 does not make pork clean. Peter refused unclean food (Acts 10:14), and he explained the vision as God teaching him not to call people common or unclean (Acts 10:28). Leviticus 11 and Deuteronomy 14 still identify swine as unclean.',
        scripture: [
          { reference: 'Acts 10:14', theme: 'Peter refused unclean food' },
          { reference: 'Acts 10:28', theme: 'vision about people' },
          { reference: 'Leviticus 11', theme: 'clean and unclean' },
          { reference: 'Deuteronomy 14', theme: 'clean and unclean' },
        ],
      };
    }
    if (priorAnswered) {
      const clipped = priorReply.length > 900 ? `${priorReply.slice(0, 900).trim()}…` : priorReply.trim();
      return {
        revisionType: 'correction_restate_prior',
        route: 'response_correction_restate_prior',
        reply: `I hear you. Staying with your question — “${String(memory.lastUserMessage || '').slice(0, 200)}” — here is the direct answer again:\n\n${clipped}`,
        scripture: memory.lastScripture || [],
      };
    }

    return {
      revisionType: 'correction_missed_question',
      route: 'response_correction_missed_question',
      reply: prior
        ? `You are right — I should answer what you asked. You asked: “${String(memory.lastUserMessage).slice(0, 220)}.” Ask me the part I missed in one direct sentence, or say “answer both parts,” and I will stay on that question instead of changing the subject.`
        : 'You are right — I should answer what you asked. Tell me the exact part I missed, and I will answer that directly.',
      scripture: memory.lastScripture || [],
    };
  }

  if (/contradict/i.test(m)) {
    return {
      revisionType: 'correction_contradiction',
      route: 'response_correction_contradiction',
      reply:
        'Thank you for catching that. If my last answer overstated the text, the Scripture itself is the authority — not my wording. Point me to the exact claim that felt contradictory, and I will correct it against the verses we were using instead of defending the earlier reply.',
      scripture: memory.lastScripture || [],
    };
  }

  return {
    revisionType: 'correction_general',
    route: 'response_correction_general',
    reply:
      'I hear the correction. I will stay with the same subject and measure my answer by the text, not by my previous wording. What exact claim should I correct — and should I answer with the verses only, or also explain what is explicit versus what is inference?',
    scripture: memory.lastScripture || [],
  };
}

function buildRevisionReply({ userId, message = '' } = {}) {
  const memory = getContinuationMemory(userId);
  // Corrections outrank "more/deeper" revisions.
  const correction = buildCorrectionReply({ userId, message });
  if (correction?.reply) return correction;
  if (!detectRevisionRequest(message, memory)) return null;

  const type = classifyRevision(message, memory);

  if (type === 'prayer') {
    return {
      revisionType: 'prayer',
      route: 'response_revision_prayer',
      reply:
        "Yes. Let me pray with more depth. Father, I come before You with a heart that needs Your peace, Your wisdom, and Your strength. Please calm every anxious thought, remove confusion, and help me hear clearly what is right. Give me courage without pride, patience without fear, and a clean heart that wants Your will above my own. Guide my steps, protect my mind, and help me walk in truth, love, and obedience. In Jesus' name, amen.",
      scripture: [
        { reference: 'Philippians 4:6-7', theme: 'peace' },
        { reference: 'James 1:5', theme: 'wisdom' },
        { reference: 'Psalm 51:10', theme: 'clean heart' },
      ],
    };
  }

  if (type === 'scripture') {
    const priorReply = String(memory.lastReply || '').trim();
    const priorQ = String(memory.lastUserMessage || '').trim();
    const refs = scriptureRefs(memory);
    const aboutDietary =
      /acts\s*10|pork|unclean|dietary|leviticus 11|deuteronomy 14/i.test(priorReply) ||
      /acts\s*10|pork|unclean/i.test(priorQ) ||
      /dietary|acts_10/i.test(String(memory.lastRoute || ''));

    if (aboutDietary) {
      return {
        revisionType: 'scripture',
        route: 'response_revision_scripture',
        reply:
          'Yes. Here are more Scripture witnesses, staying with the Bible itself. Acts 10:14 shows Peter still refused unclean food. Acts 10:28 explains the vision was about not calling people common or unclean. Acts 11:1-18 repeats the matter as God receiving Gentiles. Leviticus 11 and Deuteronomy 14 remain the direct clean and unclean food chapters.',
        scripture: [
          { reference: 'Acts 10:14', theme: 'Peter refused unclean food' },
          { reference: 'Acts 10:28', theme: 'vision explained as people' },
          { reference: 'Acts 11:1-18', theme: 'Gentiles received' },
          { reference: 'Leviticus 11', theme: 'clean and unclean' },
          { reference: 'Deuteronomy 14', theme: 'clean and unclean' },
        ],
      };
    }

    const refLine = refs.length ? `Scripture already on the table: ${refs.slice(0, 6).join('; ')}.` : '';
    const clipped = priorReply
      ? priorReply.length > 700
        ? `${priorReply.slice(0, 700).trim()}…`
        : priorReply
      : '';
    return {
      revisionType: 'scripture',
      route: 'response_revision_scripture_context',
      reply: [
        'Going deeper on what we were just discussing — not switching topics.',
        priorQ ? `Your question was: “${priorQ.slice(0, 180)}.”` : '',
        clipped ? `Building from the prior answer:\n${clipped}` : '',
        refLine,
        'If you want another witness, name the passage or ask for a related verse on this same question.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      scripture: memory.lastScripture || [],
    };
  }

  if (type === 'identity') {
    return {
      revisionType: 'identity',
      route: 'response_revision_identity',
      reply:
        "BibleBuddy is meant to be a Scripture-grounded companion, not just a Bible search box. It should listen to what you are actually asking, pray with you, help you study line upon line and precept upon precept, and help apply Scripture to real-life situations. The goal is one steady voice: caring like a companion, careful with Scripture, and guarded from drifting into man-made tradition.",
      scripture: [],
    };
  }

  const priorReply = String(memory.lastReply || '').trim();
  if (priorReply) {
    const clipped = priorReply.length > 800 ? `${priorReply.slice(0, 800).trim()}…` : priorReply;
    return {
      revisionType: 'explanation',
      route: 'response_revision_explanation_context',
      reply: `Going deeper on what we were just discussing:\n\n${clipped}\n\nWhat part should I open further — the Scripture itself, the comparison, or the practical application?`,
      scripture: memory.lastScripture || [],
    };
  }

  return {
    revisionType: 'explanation',
    route: 'response_revision_explanation',
    reply:
      "Let me go deeper without changing the subject. What I was saying is not meant to push you into a Bible-topic menu. I should stay with the actual conversation, listen to what you meant, and help you slow it down clearly. Tell me the part that feels most important, and I will keep building from there instead of restarting.",
    scripture: [],
  };
}

module.exports = {
  detectRevisionRequest,
  detectCorrectionRequest,
  buildCorrectionReply,
  buildRevisionReply,
};
