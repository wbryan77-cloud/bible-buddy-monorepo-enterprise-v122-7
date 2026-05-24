const CANONICAL_GROUPS = {
  salvation: ['John 3:16', 'Acts 2:38', 'Romans 6:23', 'Ephesians 2:8-10'],
  sabbath: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Isaiah 58:13-14', 'Mark 2:27'],
  dietary: ['Leviticus 11', 'Isaiah 66:15-17', 'Daniel 1:8', 'Acts 10:14'],
  resurrection: ['1 Thessalonians 4:16-17', 'Revelation 20:4-6', 'John 5:28-29'],
  kingdom: ['Daniel 2:44', 'Revelation 11:15', 'Matthew 6:10'],
  priesthood: ['Hebrews 7', 'Psalm 110:4', 'Hebrews 9'],
};

function normalizeTopic(topic = '') {
  return String(topic || '').toLowerCase().trim();
}

function findCanonicalChain(topic = '') {
  const normalized = normalizeTopic(topic);

  for (const [key, chain] of Object.entries(CANONICAL_GROUPS)) {
    if (normalized.includes(key)) {
      return {
        topic: key,
        chain,
        continuityScore: 95,
      };
    }
  }

  return {
    topic: normalized || 'general',
    chain: [],
    continuityScore: 40,
  };
}

function expandParallelVerses(references = []) {
  const expansions = [];

  references.forEach((reference) => {
    Object.values(CANONICAL_GROUPS).forEach((group) => {
      if (group.includes(reference)) {
        expansions.push(...group.filter((item) => item !== reference));
      }
    });
  });

  return [...new Set(expansions)];
}

function buildTraversalContext(topic = '') {
  const canonical = findCanonicalChain(topic);

  return {
    topic: canonical.topic,
    continuityScore: canonical.continuityScore,
    primaryChain: canonical.chain,
    expandedParallelVerses: expandParallelVerses(canonical.chain),
    scriptureFirst: true,
    canonicalTraversalEnabled: true,
  };
}

module.exports = {
  buildTraversalContext,
  expandParallelVerses,
  findCanonicalChain,
};
