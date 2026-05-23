function separateHistoricalReferences(reply = '') {
  const lines = String(reply).split('\n');

  const scripture = [];
  const history = [];
  const interpretation = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes('genesis') ||
      lower.includes('exodus') ||
      lower.includes('leviticus') ||
      lower.includes('isaiah') ||
      lower.includes('matthew') ||
      lower.includes('acts') ||
      lower.includes('john') ||
      lower.includes('hebrews')
    ) {
      scripture.push(line);
      continue;
    }

    if (
      lower.includes('rome') ||
      lower.includes('roman') ||
      lower.includes('history') ||
      lower.includes('historical') ||
      lower.includes('church history')
    ) {
      history.push(line);
      continue;
    }

    interpretation.push(line);
  }

  return {
    scripture,
    history,
    interpretation,
  };
}

module.exports = {
  separateHistoricalReferences,
};