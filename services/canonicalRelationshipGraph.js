const RELATIONSHIP_GRAPH = {
  sabbath: {
    foundations: ['Genesis 2:2-3', 'Exodus 20:8-11'],
    prophets: ['Isaiah 58:13-14', 'Ezekiel 20:12'],
    gospel: ['Mark 2:27-28', 'Luke 4:16'],
    apostolic: ['Acts 13:42-44', 'Hebrews 4:9'],
  },
  dietary: {
    foundations: ['Leviticus 11', 'Deuteronomy 14'],
    prophets: ['Isaiah 66:15-17'],
    gospel: ['Matthew 5:17-19'],
    apostolic: ['Acts 10:14', '2 Corinthians 6:17'],
  },
  salvation: {
    foundations: ['Deuteronomy 30:1-6'],
    prophets: ['Ezekiel 36:24-27'],
    gospel: ['John 3:16', 'Matthew 28:19-20'],
    apostolic: ['Acts 2:38', 'Romans 6:23'],
  },
  kingdom: {
    foundations: ['Genesis 49:10'],
    prophets: ['Daniel 2:44', 'Isaiah 9:6-7'],
    gospel: ['Matthew 6:10', 'Luke 1:32-33'],
    apostolic: ['Revelation 11:15'],
  },
};

function buildCanonicalRelationshipGraph(topic = '') {
  const key = String(topic || '').toLowerCase().trim();
  const graph = RELATIONSHIP_GRAPH[key] || {};

  return {
    topic: key,
    scriptureFirst: true,
    graph,
    canonicalFlow: [
      ...(graph.foundations || []),
      ...(graph.prophets || []),
      ...(graph.gospel || []),
      ...(graph.apostolic || []),
    ],
  };
}

function renderCanonicalRelationshipGraph(graph = {}) {
  const sections = [];

  if (graph.graph?.foundations?.length) {
    sections.push('Foundations:\n' + graph.graph.foundations.join('\n'));
  }

  if (graph.graph?.prophets?.length) {
    sections.push('Prophets:\n' + graph.graph.prophets.join('\n'));
  }

  if (graph.graph?.gospel?.length) {
    sections.push('Gospel:\n' + graph.graph.gospel.join('\n'));
  }

  if (graph.graph?.apostolic?.length) {
    sections.push('Apostolic Witness:\n' + graph.graph.apostolic.join('\n'));
  }

  return sections.join('\n\n');
}

module.exports = {
  buildCanonicalRelationshipGraph,
  renderCanonicalRelationshipGraph,
};
