function runBibleOnlyRetrieval(topic = {}) {
  return {
    scriptures: topic.scriptureChain || [],
    parallels: topic.parallelThemes || [],
    retrievalMode: 'bible_only',
    historicalReferencesAllowed: false,
  };
}

module.exports = { runBibleOnlyRetrieval };
