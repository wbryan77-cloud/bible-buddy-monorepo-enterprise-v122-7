function extractVersesFromCatalogValue(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const verses = [];
  if (Array.isArray(value.scriptureChain)) verses.push(...value.scriptureChain);
  if (Array.isArray(value.teachingOrder)) verses.push(...value.teachingOrder);
  return verses;
}

function expandParallelVerses(topic, catalogs = []) {
  const normalized = String(topic || '').toLowerCase();
  const results = [];

  catalogs.forEach((catalog) => {
    Object.values(catalog || {}).forEach((entry) => {
      extractVersesFromCatalogValue(entry).forEach((verse) => {
        if (!results.includes(verse)) {
          results.push(verse);
        }
      });
    });
  });

  return {
    topic: normalized,
    parallelVerses: results,
    expansionMode: 'canonical_parallel_expansion',
  };
}

module.exports = { expandParallelVerses };
