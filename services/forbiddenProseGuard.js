/**
 * Forbidden template/evidence labels — must never appear in final user text.
 */

const FORBIDDEN_PATTERNS = [
  { id: 'witness_establishes', re: /establishes the matter/i },
  { id: 'witness_confirms', re: /confirms it alongside Scripture/i },
  { id: 'witness_carries', re: /carries the theme forward/i },
  { id: 'witness_path', re: /Witness path:/i },
  { id: 'genesis_revelation_path', re: /Genesis-to-Revelation Study Path/i },
  { id: 'continue_studying', re: /Would you like to continue studying/i },
  { id: 'youve_been_studying', re: /You've been studying/i },
  { id: 'tell_me_more', re: /I'm here with you\. Tell me a little more\./i },
  { id: 'continue_that_study', re: /We can continue that study/i },
  { id: 'study_journey', re: /continue your study journey/i },
];

const REGEN_INSTRUCTION =
  'Answer the latest user question directly. Use evidence silently. Do not use template language, study continuation, prior-topic continuation, or history unless asked.';

const HISTORY_MARKERS = /Constantine|Council of Laodicea|Saturday to Sunday/i;

function detectForbiddenProse(reply = '') {
  const text = String(reply || '');
  const hits = FORBIDDEN_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id);
  return {
    detected: hits.length > 0,
    hits,
    forbiddenPhraseDetected: hits.length > 0,
  };
}

function stripForbiddenProse(reply = '') {
  let text = String(reply || '');
  for (const { re } of FORBIDDEN_PATTERNS) {
    text = text.replace(re, '');
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = {
  FORBIDDEN_PATTERNS,
  REGEN_INSTRUCTION,
  HISTORY_MARKERS,
  detectForbiddenProse,
  stripForbiddenProse,
};
