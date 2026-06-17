/**
 * Phase 5K — One caring follow-up question when appropriate.
 */

function buildCuriosityFollowUp({ message = '', anchor = {}, humanNeed = '' } = {}) {
  const m = String(message || '').toLowerCase();

  if (humanNeed === 'doctrine_answer' && /\?/.test(m) && /\b(can we|can i|should i)\b/i.test(m)) {
    return null;
  }
  if (humanNeed === 'prayer' || humanNeed === 'app_identity' || humanNeed === 'memory_recall') {
    return null;
  }
  if (humanNeed === 'practical_words_to_say') return null;

  if (/\boverwhelmed\b/i.test(m)) {
    return 'What feels heaviest right now — family, work, health, faith, or something else?';
  }
  if (/\bnervous\b/i.test(m) && anchor.currentRelationshipContext === 'family') {
    return 'Is the conversation itself making you nervous, or are you worried how they might respond?';
  }
  if (/\bnervous\b/i.test(m)) {
    return 'Is the conversation itself making you nervous, or are you worried how they might respond?';
  }
  if (/\bfamily still disagree|family disagree\b/i.test(m)) {
    return 'Are they disagreeing with the Scripture itself, or more with the change you’re making?';
  }
  if (humanNeed === 'emotional_support' && !/\?/.test(message)) {
    return 'What is weighing on you most right now?';
  }
  return null;
}

module.exports = {
  buildCuriosityFollowUp,
};
