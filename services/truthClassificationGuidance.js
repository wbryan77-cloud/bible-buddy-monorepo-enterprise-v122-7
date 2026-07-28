/**
 * Phase 6X Obj4 — Truth classification presentation guidance.
 * Extends existing specialty labels; does not replace claim verifier.
 */

const TRUTH_CATEGORIES = [
  'Explicit Scripture',
  'Historical Context',
  'Original Language',
  'Doctrinal Synthesis',
  'Inference',
  'Scholarly Opinion',
  'Practical Application',
  'Companion Guidance',
  'Uncertainty',
];

const TRUTH_CLASSIFICATION_INSTRUCTION = `
TRUTH CLASSIFICATION (presentation — never merge categories):
When the answer mixes evidence types, present them as distinct labeled sections using only these names when needed:
- Historical Context
- Biblical Comparison
- What Scripture Explicitly Says
- Scripture Does Not Explicitly State
Also keep categories distinct in prose for: Explicit Scripture, Original Language, Doctrinal Synthesis, Inference, Scholarly Opinion, Practical Application, Companion Guidance, Uncertainty.
Do not blend Historical Context into Explicit Scripture. Do not present inference as explicit Scripture.
`.trim();

function buildTruthClassificationGuidance({ currentIntent = '', historyIncluded = false, originalLanguage = false } = {}) {
  const lines = [TRUTH_CLASSIFICATION_INSTRUCTION];
  if (currentIntent === 'general_factual') {
    lines.push(
      'For ordinary facts: lead with the Direct Answer. If Scripture is not the subject, do not invent Explicit Scripture sections.',
    );
  }
  if (historyIncluded) {
    lines.push('Include a distinct Historical Context section when using history — labeled, supplemental, not Scripture.');
  }
  if (originalLanguage) {
    lines.push('If original-language evidence is present, keep Original Language as its own labeled section.');
  }
  return lines.join('\n');
}

module.exports = {
  TRUTH_CATEGORIES,
  TRUTH_CLASSIFICATION_INSTRUCTION,
  buildTruthClassificationGuidance,
};
