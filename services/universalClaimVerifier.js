/**
 * CERTIFICATION_V5 — Lightweight universal claim-audit layer.
 * Detects category blur / contradiction patterns. Does not invent doctrine.
 * May request one safe revision; never loops.
 */
function auditBiblicalReply(reply = '', message = '') {
  const text = String(reply || '');
  const issues = [];

  if (/explicitly says|the bible clearly says/i.test(text) && /i (think|believe|infer)/i.test(text)) {
    issues.push({ code: 'MIXED_EXPLICIT_INFERENCE', severity: 'medium' });
  }
  if (/historically/i.test(text) && /scripture (commands|says) that (sunday|tradition)/i.test(text)) {
    issues.push({ code: 'HISTORY_AS_SCRIPTURE', severity: 'high' });
  }
  if (/already risen/i.test(text) && /rose sunday morning as the discovery moment|rose at the exact moment the women arrived/i.test(text)) {
    issues.push({ code: 'DISCOVERY_EVENT_CONTRADICTION', severity: 'high' });
  }
  if (/yes, jesus rose on sunday morning/i.test(text) && /matthew\s*28/i.test(text) && !/already risen|discovery|does not (state|give)/i.test(text)) {
    issues.push({ code: 'TRADITION_AS_EXPLICIT', severity: 'high' });
  }
  if (/\bno\b.*exact.*(moment|time|hour)/i.test(message) && /^yes\b/i.test(text.trim()) && !/already risen|discovery/i.test(text)) {
    issues.push({ code: 'SILENCE_OVERCLAIM', severity: 'high' });
  }

  return {
    passed: issues.filter((i) => i.severity === 'high').length === 0,
    issues,
    categoriesObserved: {
      hasExplicitLabel: /explicit scripture|explicitly/i.test(text),
      hasInferenceLabel: /reasoned inference|inference \(labeled\)|comparing these passages/i.test(text),
      hasSilenceLabel: /scripture silent|does not (state|give|say the exact)/i.test(text),
      hasHistoryLabel: /historical (tradition|context)/i.test(text),
    },
  };
}

module.exports = { auditBiblicalReply };
