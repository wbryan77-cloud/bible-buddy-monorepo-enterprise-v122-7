const { getContinuityMemory } = require('./continuityMemoryRuntime');
const { buildTraversalContext } = require('./topicContinuityTraversal');

function detectThemes(message = '') {
  const text = String(message || '').toLowerCase();
  const themes = [];

  if (text.includes('sabbath')) themes.push('sabbath');
  if (text.includes('dietary') || text.includes('unclean') || text.includes('pork')) themes.push('dietary');
  if (text.includes('salvation') || text.includes('repentance')) themes.push('salvation');
  if (text.includes('kingdom')) themes.push('kingdom');
  if (text.includes('resurrection')) themes.push('resurrection');
  if (text.includes('melchizedek') || text.includes('priesthood')) themes.push('priesthood');

  return [...new Set(themes)];
}

function buildThemeRetrievalRuntime({ userId, message }) {
  const continuity = getContinuityMemory(userId);
  const themes = detectThemes(message);

  return {
    continuity,
    themes,
    traversal: themes.map((theme) => ({
      theme,
      context: buildTraversalContext(theme),
    })),
    retrievalMode: 'scripture-first',
    canonicalTraversalEnabled: true,
  };
}

module.exports = {
  buildThemeRetrievalRuntime,
  detectThemes,
};
