/**
 * Phase 5Q — Response Revision Owner
 * Owns "better / deeper / more / explain further" requests before
 * no-glitch, doctrine, BibleWide, pending question, and OpenAI routing.
 */

const { getContinuationMemory } = require('./conversationContinuationMemory');
const REVISION_RE =
  /\b(better|deeper|expand|more scriptures|more detail|try again|explain further|go deeper|longer prayer|clarify|clarification|rewrite|reword)\b/i;

function detectRevisionRequest(message = '', memory = null) {
  const m = String(message || '').trim();
  if (!m || !memory) return false;
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

function buildRevisionReply({ userId, message = '' } = {}) {
  const memory = getContinuationMemory(userId);
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
    return {
      revisionType: 'scripture',
      route: 'response_revision_scripture',
      reply:
        "Yes. Here are more Scripture witnesses, staying with the Bible itself. Acts 10:14 shows Peter still refused unclean food. Acts 10:28 explains the vision was about not calling people common or unclean. Acts 11:1-18 repeats the matter as God receiving Gentiles. Leviticus 11 and Deuteronomy 14 remain the direct clean and unclean food chapters.",
      scripture: [
        { reference: 'Acts 10:14', theme: 'Peter refused unclean food' },
        { reference: 'Acts 10:28', theme: 'vision explained as people' },
        { reference: 'Acts 11:1-18', theme: 'Gentiles received' },
        { reference: 'Leviticus 11', theme: 'clean and unclean' },
        { reference: 'Deuteronomy 14', theme: 'clean and unclean' },
      ],
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
  buildRevisionReply,
};
