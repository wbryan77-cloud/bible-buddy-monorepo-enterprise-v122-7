function expandParallelVerses(topic, catalogs = []) {
  const normalized = String(topic || '').toLowerCase();

  const results = [];

  catalogs.forEach((catalog) => {
    Object.values(catalog || {}).forEach((entries) => {
      if (Array.isArray(entries)) {
        entries.forEach((verse) => {
          if (!results.includes(verse)) {
            results.push(verse);
          }
        });
      }
    });
  });

  return {
    topic: normalized,
    parallelVerses: results,
    expansionMode: 'canonical_parallel_expansion'
  };
}

module.exports = { expandParallelVerses };
