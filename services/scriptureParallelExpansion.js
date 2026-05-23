function expandScriptureParallels(topic = {}) {
  const scriptureChain = topic.scriptureChain || [];
  const expanded = new Set(scriptureChain);

  scriptureChain.forEach((verse) => {
    if (String(verse).includes('Genesis')) {
      expanded.add('John 1:1-14');
    }

    if (String(verse).includes('Exodus 20')) {
      expanded.add('Hebrews 4:9');
      expanded.add('Luke 4:16');
    }

    if (String(verse).includes('Leviticus 23')) {
      expanded.add('Acts 2:1-4');
      expanded.add('1 Corinthians 5:7-8');
    }
  });

  return Array.from(expanded);
}

module.exports = { expandScriptureParallels };
