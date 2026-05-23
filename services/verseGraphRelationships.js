function buildVerseGraph(topics = {}) {
  const graph = {};

  Object.entries(topics).forEach(([topicKey, topic]) => {
    const verses = topic.scriptureChain || [];

    verses.forEach((verse, index) => {
      if (!graph[verse]) {
        graph[verse] = {
          related: [],
          topics: [],
        };
      }

      graph[verse].topics.push(topicKey);

      if (verses[index + 1]) {
        graph[verse].related.push(verses[index + 1]);
      }
    });
  });

  return graph;
}

module.exports = { buildVerseGraph };
