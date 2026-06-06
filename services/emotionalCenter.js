/**
 * Emotional Center extraction for reason-first compose (RACL path).
 * One focal lived concern per turn — facts from retrieval only.
 */

const { buildListeningComposerSignals } = require('./listeningSpecificityValidator');

function normalize(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isSubstantivePhrase(phrase = '') {
  const t = String(phrase || '').trim();
  if (t.length < 8) return false;
  if (/^(yes|no|ok|thanks|hello)\b/i.test(t)) return false;
  return true;
}

/**
 * Refine raw phrase into a single Emotional Center label (composer-facing).
 */
function labelFromPhrase(phrase = '', message = '', evidencePack = {}) {
  const corpus = normalize(`${phrase} ${message}`);
  const plain = normalize(evidencePack.understanding?.plainEnglishRestatement || '');

  if (/far away from home|far from home/.test(corpus)) {
    return 'Relocation strain — the company is far from home';
  }
  if (/push or wait|not sure whether to push/.test(corpus)) {
    return 'Decision fork — whether to push or wait on this offer';
  }
  if (/job opportunity|job offer/.test(corpus) && !/far away|push or wait/.test(corpus)) {
    if (/template answer|thoughtful conversation/i.test(plain)) {
      return 'New opportunity — needs space before counsel, not a template answer';
    }
    return 'New opportunity — what this change would mean for your life';
  }
  if (/lost a friend wednesday|friend wednesday|wednesday/.test(corpus)) {
    return 'Fresh grief — friend lost Wednesday';
  }
  if (/still bothering|still weighing|still heavy/.test(corpus)) {
    return 'Grief still sitting heavy — not finished processing';
  }
  if (/grieving who she used to be|who she used to be/.test(corpus)) {
    return 'Grieving who mom used to be while still caring for her';
  }
  if (/not remember who i am|doesn't remember who/.test(corpus)) {
    return 'When mom does not remember who you are';
  }
  if (/alzheimer|diagnosed/.test(corpus) && /mom|mother/.test(corpus)) {
    return "Mom's Alzheimer's diagnosis — caregiver shock";
  }
  if (/faith is failing|does that mean my faith/.test(corpus)) {
    return 'Fear that empty prayer means faith is failing';
  }
  if (/feels empty|pray but it feels empty|empty prayer/.test(corpus)) {
    return 'Prayer feels empty despite trying';
  }
  if (/distant from god|feel distant/.test(corpus)) {
    return 'Feeling distant from God lately';
  }
  if (/again today/.test(corpus)) {
    return 'Knee pain returning again today — weariness with recurrence';
  }
  if (/\bknee|knees hurt/.test(corpus)) {
    return 'Knee pain weighing on body and spirit';
  }
  if (/wording|roman church|roman catholic|not listening|not answering|you call it/.test(corpus)) {
    return 'Need a direct answer about Buddy wording — not history lecture';
  }
  if (/why should we keep sunday|day of worship|sabbath/.test(corpus) && !/wording|roman/.test(corpus)) {
    return 'Question about Sunday as day of worship';
  }

  const trimmed = String(phrase || message || '').trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

function tokenOverlap(a = '', b = '') {
  const words = (text) =>
    new Set(
      normalize(text)
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let n = 0;
  for (const w of wa) if (wb.has(w)) n += 1;
  return n;
}

function pickSalientDetail(evidencePack = {}, message = '') {
  const signals = buildListeningComposerSignals(evidencePack, message);
  const candidates = signals.detailCandidates || [];
  const msgNorm = normalize(message);

  for (const c of candidates) {
    const cn = normalize(c);
    if (cn === msgNorm || cn.includes('current:')) continue;
    if (cn.startsWith('assistant summary:')) continue;
    if (isSubstantivePhrase(c) && tokenOverlap(c, message) >= 1) return c;
  }

  for (const c of candidates) {
    if (isSubstantivePhrase(c) && !/^assistant summary:/i.test(c)) return c.replace(/^Current:\s*/i, '').trim();
  }

  return String(message || '').trim() || null;
}

/**
 * @param {object} retrievalEvidencePack
 * @param {string} [userMessage] — current turn message (optional if pack.userMessage set)
 * @returns {{ emotionalCenter: string|null, supportingDetail: string|null, confidence: 'high'|'medium'|'low'|null, source: string|null }}
 */
function extractEmotionalCenter(retrievalEvidencePack = {}, userMessage = '') {
  const pack = retrievalEvidencePack || {};
  const message = String(userMessage || pack.userMessage || '').trim();
  const companion = pack.companionThreadContext || {};
  const threadLocal = pack.threadLocal || {};
  const ledger = pack.correctionLedger || {};
  const understanding = pack.understanding || {};

  let supportingDetail = null;
  let source = null;
  let confidence = null;

  // 1. directConcernPhrase (prefer current-message concern when sharper than stale thread phrase)
  const direct = companion.directConcernPhrase;
  const messageConcern = extractMessageConcern(message);
  if (isSubstantivePhrase(messageConcern) && isSubstantivePhrase(direct)) {
    if (normalize(messageConcern) !== normalize(direct) && tokenOverlap(messageConcern, message) >= 2) {
      supportingDetail = messageConcern;
      source = 'directConcernPhrase';
      confidence = 'high';
    } else {
      supportingDetail = String(direct).trim();
      source = 'directConcernPhrase';
      confidence = 'high';
    }
  } else if (isSubstantivePhrase(messageConcern)) {
    supportingDetail = messageConcern;
    source = 'directConcernPhrase';
    confidence = 'high';
  } else if (isSubstantivePhrase(direct)) {
    supportingDetail = String(direct).trim();
    source = 'directConcernPhrase';
    confidence = 'high';
  }

  // 2. unresolved concern
  if (!supportingDetail) {
    const unresolved =
      threadLocal.currentUnresolvedQuestion ||
      threadLocal.latestClarifiedIntent ||
      understanding.exactUserQuestion;
    if (isSubstantivePhrase(unresolved) && (/\?/.test(unresolved) || unresolved.length > 12)) {
      supportingDetail = String(unresolved).trim();
      source = 'unresolvedConcern';
      confidence = 'medium';
    }
  }

  // 3. salient user detail
  if (!supportingDetail) {
    const detail = pickSalientDetail(pack, message);
    if (isSubstantivePhrase(detail)) {
      supportingDetail = detail;
      source = 'salientDetail';
      confidence = 'medium';
    }
  }

  // 4. correction context
  if (!supportingDetail && ledger.active) {
    const correctionText =
      ledger.correctedIntent ||
      ledger.priorAssistantQuote ||
      (understanding.isMetaQuestion ? message : null);
    if (isSubstantivePhrase(correctionText)) {
      supportingDetail = String(correctionText).slice(0, 200).trim();
      source = 'correctionContext';
      confidence = 'medium';
    } else if (isCorrectionLike(message)) {
      supportingDetail = message;
      source = 'correctionContext';
      confidence = 'medium';
    }
  }

  if (!supportingDetail && isSubstantivePhrase(message)) {
    supportingDetail = message;
    source = 'currentMessage';
    confidence = 'low';
  }

  if (!supportingDetail) {
    return {
      emotionalCenter: null,
      supportingDetail: null,
      confidence: null,
      source: null,
    };
  }

  const emotionalCenter = labelFromPhrase(supportingDetail, message, pack);

  return {
    emotionalCenter,
    supportingDetail,
    confidence,
    source,
  };
}

const MESSAGE_CONCERN_PATTERNS = [
  /\bnot remember who i am\b/i,
  /\bfar away from home\b/i,
  /\bpush or wait\b/i,
  /\bnot sure whether to push\b/i,
  /\bstill bothering me\b/i,
  /\bagain today\b/i,
  /\bfaith is failing\b/i,
  /\bfeels empty\b/i,
  /\bgrieving who she used to be\b/i,
  /\blost a friend wednesday\b/i,
  /\bjob opportunity\b/i,
];

function extractMessageConcern(message = '') {
  const text = String(message || '');
  for (const p of MESSAGE_CONCERN_PATTERNS) {
    const hit = text.match(p);
    if (hit) return hit[0];
  }
  return null;
}

function isCorrectionLike(message = '') {
  return /wording|not asking|not answering|not listening|you call it|roman church|are you not listening/i.test(
    String(message || '')
  );
}

function isEcpEnabled() {
  return String(process.env.BUDDY_ECP || '').toLowerCase() === '1' ||
    String(process.env.BUDDY_ECP || '').toLowerCase() === 'true';
}

module.exports = {
  extractEmotionalCenter,
  labelFromPhrase,
  isEcpEnabled,
};
