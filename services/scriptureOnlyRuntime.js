const { sortCanonicalReferences } = require('./canonicalResponseFormatter');

function buildScriptureOnlyResponse({ topic = '', references = [], continuity = null }) {
  const ordered = sortCanonicalReferences(references);

  return {
    topic,
    scriptureOnlyMode: true,
    scriptureFirst: true,
    continuityThemes: continuity?.unresolvedThemes || [],
    references: ordered,
    rendered: [
      `Topic: ${topic}`,
      'Scripture Chain:',
      ...ordered.map((reference, index) => `${index + 1}. ${reference}`),
    ].join('\n\n'),
  };
}

function filterNonScriptureContent({ scripture = [], history = [] }) {
  return {
    scripture: sortCanonicalReferences(scripture),
    historySuppressed: history.length > 0,
  };
}

module.exports = {
  buildScriptureOnlyResponse,
  filterNonScriptureContent,
};
