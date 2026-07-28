const { stripInternalRuntimeLabels, containsInternalRuntimeLabels } = require('./runtimeLabelStripper');

function dedupePhrasePattern(text, pattern) {
  let keepFirst = true;
  return text.replace(pattern, (match) => {
    if (keepFirst) {
      keepFirst = false;
      return match;
    }
    return '';
  });
}

function polishCompanionReply(reply = '') {
  let text = stripInternalRuntimeLabels(String(reply || ''));

  const stripEntirely = [
    /That's a thoughtful question\.?\s*/gi,
    /Let's build this carefully[^.\n]*\.\s*/gi,
    /Let's stay close to (the text|Scripture)[^.\n]*\.\s*/gi,
    /Let's explore that together\.?\s*/gi,
    /I appreciate you (asking|sharing)[^.\n]*\.\s*/gi,
    /As an AI[^.\n]*\.\s*/gi,
    /I('m| am) (just )?an AI[^.\n]*\.\s*/gi,
  ];
  for (const pattern of stripEntirely) {
    text = text.replace(pattern, '');
  }

  const patterns = [
    /You've been walking a study journey[^?\n]+?\?/gi,
    /Next in your study journey:[^\n.]+\./gi,
    /Would you like to continue (into|from|at|there)[^?\n]+?\?/gi,
    /We can begin a Genesis-to-Revelation path[^?\n]+?\?/gi,
    /Last time we were (studying|looking at)[^?\n]+?\?/gi,
    /If it would help, we could[^?\n]+?— only if you want to\./gi,
    /You've been studying [^.\n]+ frequently\.[^?\n]+?\?/gi,
    /You've been studying general[^.\n]*[.!?]/gi,
    /We can continue that study[^.\n]*[.!?]/gi,
    /If it would help, we could continue your study[^.\n]*[.!?]/gi,
    /Thank you for (telling|sharing|bringing)[^.\n]*\./gi,
    /You mentioned recently that[^.\n]*\./gi,
  ];

  for (const pattern of patterns) {
    text = dedupePhrasePattern(text, pattern);
  }

  text = text.replace(/\[object Object\]/g, '').replace(/\s+\./g, '.');

  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\n(\n\n)+/g, '\n\n')
    .trim();
}

module.exports = {
  polishCompanionReply,
  dedupePhrasePattern,
  containsInternalRuntimeLabels,
};
