/**
 * Sprint 2.FINAL-C — Response Contract
 * Every route owner output is normalized and validated against the reasoning snapshot.
 */

function buildResponseContract(structured = {}, reasoningSnapshot = {}) {
  const answer = String(structured.reply || structured.answer || '').trim();
  const replyLower = answer.toLowerCase();

  return {
    answer,
    answeredQuestion:
      structured.runtime?.responseContract?.answeredQuestion ||
      reasoningSnapshot.exactUserQuestion ||
      '',
    usedScripture: !!(structured.scripture && structured.scripture.length) || /\b(genesis|exodus|matthew|psalm|isaiah)\b/i.test(answer),
    usedHistory: /\b(constantine|laodicea|ad 321|canon 29|roman catholic)\b/i.test(answer),
    usedMemory: !!structured.memory_used || /\blast week|when we spoke|you mentioned last time\b/i.test(answer),
    offeredStudy: /\b(continue studying|study journey|feast days|genesis-to-revelation path)\b/i.test(answer),
    confidence: structured.confidence || 'medium',
    unresolved: !!structured.runtime?.responseContract?.unresolved,
    plainEnglishMatch: null,
  };
}

function questionsAlign(answeredQuestion = '', exactUserQuestion = '') {
  const a = String(answeredQuestion || '').trim().toLowerCase();
  const b = String(exactUserQuestion || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b.slice(0, Math.min(40, b.length))) || b.includes(a.slice(0, Math.min(40, a.length)))) {
    return true;
  }
  return false;
}

function validateResponseContract(contract = {}, reasoningSnapshot = {}) {
  const issues = [];
  const answer = contract.answer || '';
  const qType = reasoningSnapshot.questionType;
  const requested = reasoningSnapshot.requestedAnswerType;

  if (!answer) {
    issues.push('empty_answer');
    return { valid: false, issues };
  }

  if (!questionsAlign(contract.answeredQuestion, reasoningSnapshot.exactUserQuestion)) {
    if (qType === 'meta_about_previous_answer' || requested === 'wording_explanation') {
      // Wording answers restate the user's concern implicitly
      if (!/\b(wording|worded|shorthand|precise|roman catholic|exact question|you'?re right)\b/i.test(answer)) {
        issues.push('answeredQuestion_mismatch');
      }
    } else if (qType === 'correction' || reasoningSnapshot.strictAnswerMode) {
      if (!/\b(you'?re right|exact question|wording|answer is|i hear you)\b/i.test(answer)) {
        issues.push('answeredQuestion_mismatch');
      }
    } else if (qType === 'health' || qType === 'grief' || qType === 'discernment') {
      // Personal support — reflect + question/step is enough
      if (answer.length < 30) issues.push('answeredQuestion_mismatch');
    } else {
      issues.push('answeredQuestion_mismatch');
    }
  }

  for (const distraction of reasoningSnapshot.forbiddenDistractions || []) {
    const key = distraction.toLowerCase();
    const constantineCount = (answer.match(/\bconstantine\b/gi) || []).length;
    const laodiceaCount = (answer.match(/\blaodicea\b/gi) || []).length;
    if (key.includes('constantine') && constantineCount >= 2) {
      issues.push(`forbidden:${distraction}`);
    }
    if (key.includes('laodicea') && laodiceaCount >= 2) {
      issues.push(`forbidden:${distraction}`);
    }
    if (key.includes('study prompt') && contract.offeredStudy) {
      issues.push(`forbidden:${distraction}`);
    }
    if (key.includes('knee') && /\bknee pain\b/i.test(answer) && qType !== 'health') {
      issues.push(`forbidden:${distraction}`);
    }
    if (key.includes('grief memory') && /\blost a friend\b/i.test(answer) && qType !== 'grief') {
      issues.push(`forbidden:${distraction}`);
    }
    if (key.includes('feast days') && /\bfeast days\b/i.test(answer)) {
      issues.push(`forbidden:${distraction}`);
    }
    if (key.includes('generic fallback') && /\btell me a little more\b/i.test(answer)) {
      issues.push(`forbidden:${distraction}`);
    }
  }

  if (reasoningSnapshot.shouldUseMemory === false && contract.usedMemory && qType !== 'memory_recall') {
    issues.push('unauthorized_memory');
  }
  if (!reasoningSnapshot.shouldOfferStudy && contract.offeredStudy) {
    issues.push('unauthorized_study_prompt');
  }

  return { valid: issues.length === 0, issues };
}

function attachResponseContract(structured = {}, reasoningSnapshot = {}) {
  const contract = buildResponseContract(structured, reasoningSnapshot);
  contract.answeredQuestion = reasoningSnapshot.exactUserQuestion;
  contract.plainEnglishMatch = validatePlainEnglishMatch(structured.reply || '', reasoningSnapshot);

  structured.runtime = {
    ...(structured.runtime || {}),
    responseContract: contract,
    reasoningSnapshot,
  };
  return structured;
}

function validatePlainEnglishMatch(reply = '', reasoningSnapshot = {}) {
  const text = String(reply || '');
  const restatement = String(reasoningSnapshot.plainEnglishRestatement || '').toLowerCase();

  if (reasoningSnapshot.questionType === 'meta_about_previous_answer') {
    return /\b(wording|worded|shorthand|precise|roman catholic|exact question)\b/i.test(text);
  }
  if (restatement.includes('wording')) {
    return /\b(wording|worded|shorthand|precise|exact question|you'?re right)\b/i.test(text);
  }
  if (restatement.includes('health concern')) {
    return /\b(sorry|hear you|dealing with|how long|today|few days)\b/i.test(text);
  }
  if (restatement.includes('grieving')) {
    return /\b(sorry|tell me about|gently|loss)\b/i.test(text);
  }
  return text.length > 40;
}

module.exports = {
  buildResponseContract,
  validateResponseContract,
  attachResponseContract,
  questionsAlign,
  validatePlainEnglishMatch,
};
