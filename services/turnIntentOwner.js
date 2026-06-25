/**
 * Phase 5R.1 — Turn Intent Owner
 * One deterministic owner decides what the user is trying to do before routers compete.
 */

function wordCount(message = '') {
  return String(message || '').trim().split(/\s+/).filter(Boolean).length;
}

function determineTurnIntent({ message = '', hasMemory = false } = {}) {
  const m = String(message || '').trim();
  const lower = m.toLowerCase();

  if (!m) return { intent: 'EMPTY', confidence: 'high' };

  if (/\b(stop|pause|leave it|never mind|nevermind|drop it)\b/i.test(lower)) {
    return { intent: 'STOP', confidence: 'high' };
  }

  if (/\b(kill myself|suicide|end my life|hurt myself|self harm)\b/i.test(lower)) {
    return { intent: 'CRISIS', confidence: 'high' };
  }

  if (
    /\b(better|deeper|expand|tell me more|more scriptures|more detail|try again|explain further|go deeper|longer prayer|better prayer|clarify|rewrite|reword|how so|why)\b/i.test(lower)
  ) {
    return { intent: 'REVISE', confidence: 'high' };
  }

  if (hasMemory && wordCount(m) <= 5 && /\b(more|again|deeper|better|why|decision|continue)\b/i.test(lower)) {
    return { intent: 'REVISE', confidence: 'medium' };
  }

  if (/\b(pray|prayer|pray with me)\b/i.test(lower)) {
    return { intent: 'PRAY', confidence: 'high' };
  }

  if (/\b(acts|leviticus|deuteronomy|sabbath|pork|shellfish|unclean|clean foods|scripture|bible|verse)\b/i.test(lower)) {
    return { intent: 'TEACH', confidence: 'medium' };
  }

  return { intent: 'COMPANION', confidence: 'medium' };
}

module.exports = {
  determineTurnIntent,
};
