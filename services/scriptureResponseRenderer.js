function buildStructuredScriptureResponse({
  topic = 'Scripture Study',
  summary = '',
  references = [],
  continuity = null,
  historicalReferences = [],
}) {
  const sections = [];

  sections.push(`Topic: ${topic}`);

  if (summary) {
    sections.push(`Summary:\n${summary}`);
  }

  if (references.length) {
    sections.push(
      'Scripture Chain:\n' +
      references.map((ref, index) => `${index + 1}. ${ref}`).join('\n')
    );
  }

  if (continuity?.recentThreads?.length) {
    sections.push(
      'Continuity:\n' +
      continuity.recentThreads
        .slice(-3)
        .map((item) => `- ${item.message}`)
        .join('\n')
    );
  }

  if (historicalReferences.length) {
    sections.push(
      'Historical References:\n' +
      historicalReferences.map((item) => `- ${item}`).join('\n')
    );
  }

  return sections.join('\n\n');
}

function buildVerseObjects(references = []) {
  return references.map((reference) => ({
    reference,
    text: '',
    reason: 'Structured Scripture continuity rendering',
  }));
}

module.exports = {
  buildStructuredScriptureResponse,
  buildVerseObjects,
};
