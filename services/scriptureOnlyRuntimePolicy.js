const SCRIPTURE_ONLY_RUNTIME_POLICY = {
  scriptureFirst: true,
  forbidTraditionOverride: true,
  forbidSpeculativeDoctrine: true,
  prioritizeCanonicalTraversal: true,
  separateHistoryFromScripture: true,
  contradictionSuppression: true,
  ambiguityEscalation: true,
  allowedSources: [
    'Bible',
    'Parallel Scripture Chains',
    'Historical Support Layer'
  ],
  blockedPatterns: [
    'church tradition says',
    'modern doctrine states',
    'popular interpretation says',
    'denominational tradition'
  ],
  rendererOrder: [
    'scripture',
    'parallel_verses',
    'canonical_continuity',
    'historical_support'
  ]
};

module.exports = { SCRIPTURE_ONLY_RUNTIME_POLICY };
