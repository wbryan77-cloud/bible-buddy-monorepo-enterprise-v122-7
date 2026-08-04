/**
 * Phase 6B.3 — User Response Format for original-language study requests.
 *
 * Formats services/originalLanguageProvider.getPassageStudy() output into
 * the exact ordered response required by the batch:
 *   1. KJV
 *   2. Original-language text
 *   3. Transliteration
 *   4. Word-by-word literal gloss
 *   5. Literal study rendering
 *   6. Short grammatical explanation
 *   7. Primary witness
 *   8. Supporting witnesses
 *   9. Cross-references
 *   10. Dataset/source notice
 *
 * This module only formats already-retrieved, source-grounded data — it
 * never generates Scripture or linguistic content itself.
 */

const RE_ORIGINAL_LANGUAGE_REQUEST =
  /\boriginal\s+(language|hebrew|aramaic|greek|text|wording)\b|\b(original\s+language|hebrew|aramaic|greek)\b.*\b(word|study|text|gloss|lemma|morpholog|transliterat|strong'?s|behind|underlying|wording|translated|translation)\b|\b(word|study|text|gloss|lemma|morpholog|transliterat|strong'?s|behind|underlying|wording|translated|translation)\b.*\b(original\s+language|hebrew|aramaic|greek)\b|\bwhat (hebrew|greek|aramaic) word\b|\b(hebrew|greek) wording\b|\bliteral gloss\b/i;

function isOriginalLanguageRequest(message = '') {
  return RE_ORIGINAL_LANGUAGE_REQUEST.test(String(message || ''));
}

function formatOriginalLanguageReply(study) {
  if (!study || !study.ok) {
    const ref = study ? study.reference : '';
    const reasons = (study && study.limitations && study.limitations.length)
      ? study.limitations.join(' ')
      : 'the requested passage could not be located in the vendored original-language corpus.';
    return `I could not produce an original-language study for "${ref}": ${reasons}${study && study.kjvText ? `\n\nKJV: ${study.kjvText}` : ''}`;
  }

  const lines = [];
  lines.push(`KJV: ${study.kjvText || '(not available)'}`);
  lines.push('');
  lines.push(`Original language (${study.sourceLanguage}): ${study.originalText}`);
  lines.push('');
  lines.push(`Transliteration: ${study.tokens.map((t) => t.transliteration || '—').join(' ')}`);
  lines.push('');
  lines.push(`Word-by-word literal gloss:`);
  study.tokens.forEach((t) => {
    lines.push(`  ${t.surface} (${t.lemma || '—'}, ${t.morphology}, ${t.strongs || 'no Strong\'s match'}) — ${t.literalGloss || 'no dictionary gloss available'}`);
  });
  lines.push('');
  lines.push(study.literalRendering || 'Literal study rendering unavailable.');
  lines.push('');
  if (study.studyExplanation) {
    lines.push(`Grammatical explanation: ${study.studyExplanation}`);
    lines.push('');
  }
  if (study.primaryWitness && study.primaryWitness.reference) {
    lines.push(`Primary witness: ${study.primaryWitness.reference}`);
  }
  if (study.supportingWitnesses && study.supportingWitnesses.length) {
    lines.push(`Supporting witnesses: ${study.supportingWitnesses.map((w) => w.reference).join(', ')}`);
  }
  if (study.crossReferences && study.crossReferences.length) {
    lines.push(`Cross-references: ${study.crossReferences.map((c) => c.reference).join(', ')}`);
  }
  lines.push('');
  lines.push(`Dataset/source notice: ${study.provenance}.`);
  if (study.limitations && study.limitations.length) {
    lines.push(`Honest note: ${study.limitations.join(' ')}`);
  }

  return lines.join('\n');
}

module.exports = {
  isOriginalLanguageRequest,
  formatOriginalLanguageReply,
};
