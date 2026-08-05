/**
 * BIE v1.1 — Retrieval Intelligence Lab (shadow mode only).
 * Compares candidate strategies against current production retrieval owners.
 * Never replaces production retrieval.
 */

const { appendExperienceEvent } = require('./experienceEventLedger');

function lexicalRefsFromMessage(message = '') {
  const m = String(message || '');
  const refs = [];
  const re =
    /\b((?:[1-3]\s*)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?\b/g;
  let match;
  while ((match = re.exec(m)) && refs.length < 8) {
    refs.push(match[0].replace(/\s+/g, ' ').trim());
  }
  return refs;
}

function topicKeywords(message = '') {
  return String(message || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 12);
}

/**
 * Shadow compare: production pack summary vs candidate strategies.
 * productionPack may be a slim summary object (no private payloads required).
 */
function runRetrievalShadowCompare({
  message = '',
  productionPack = null,
  requestId = null,
  persist = true,
} = {}) {
  const lexical = lexicalRefsFromMessage(message);
  const keywords = topicKeywords(message);
  const productionRefs = []
    .concat(productionPack?.scriptureRefs || [])
    .concat((productionPack?.approvedWitnesses || []).slice(0, 8));
  const productionHistory = !!(productionPack?.historyIncluded || productionPack?.history?.included);
  const productionOl = !!(productionPack?.originalLanguage || productionPack?.languageEvidence);

  const candidates = [
    {
      strategyId: 'production_champion',
      kind: 'champion',
      refs: productionRefs,
      history: productionHistory,
      originalLanguage: productionOl,
    },
    {
      strategyId: 'lexical_phrase',
      kind: 'challenger',
      refs: lexical,
      history: false,
      originalLanguage: false,
    },
    {
      strategyId: 'keyword_semantic_proxy',
      kind: 'challenger',
      refs: keywords.slice(0, 5).map((k) => `keyword:${k}`),
      history: /\b(history|historical|rome|sunday|holocaust|slave)\b/i.test(message),
      originalLanguage: /\b(hebrew|greek|strong'|transliterat)\b/i.test(message),
    },
  ];

  const scored = candidates.map((c) => {
    const overlap = c.refs.filter((r) =>
      productionRefs.some((p) => String(p).toLowerCase().includes(String(r).toLowerCase().replace(/^keyword:/, ''))),
    ).length;
    return {
      ...c,
      metrics: {
        refCount: c.refs.length,
        overlapWithChampion: overlap,
        historyFlag: c.history,
        originalLanguageFlag: c.originalLanguage,
        doctrinalAuthorityViolation: false, // shadow never promotes
      },
    };
  });

  const result = {
    mode: 'SHADOW',
    productionReplacement: false,
    messageFingerprint: require('./experienceEventLedger').fingerprint(message),
    candidates: scored,
    recommendation: null,
  };

  // Only recommend when challenger finds explicit lexical refs champion missed.
  const lexicalOnly = scored.find((s) => s.strategyId === 'lexical_phrase');
  const champion = scored.find((s) => s.strategyId === 'production_champion');
  if (
    lexicalOnly &&
    champion &&
    lexicalOnly.refs.length > 0 &&
    lexicalOnly.metrics.overlapWithChampion === 0 &&
    champion.refs.length === 0
  ) {
    result.recommendation = {
      status: 'DRAFT_RECOMMENDATION',
      strategyId: 'lexical_phrase',
      reason: 'Challenger found explicit Scripture refs while champion summary had none',
      requiresAdminApproval: true,
      autoPromote: false,
    };
  }

  if (persist) {
    appendExperienceEvent({
      eventType: 'RESEARCH_OPPORTUNITY',
      requestId,
      turnId: requestId,
      traceId: requestId,
      evaluationResults: { lab: 'retrievalShadowLab', result },
      privacyScope: 'INTERNAL_ENGINEERING',
      governanceStatus: result.recommendation ? 'DRAFT_RECOMMENDATION' : 'OBSERVED',
      mutationFlags: { productionBehaviorChanged: false, evidenceActivated: false },
    });
  }

  return { ok: true, ...result };
}

module.exports = {
  lexicalRefsFromMessage,
  runRetrievalShadowCompare,
};
