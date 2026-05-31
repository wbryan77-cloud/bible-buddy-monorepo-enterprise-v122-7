const { HISTORICAL_REFERENCE_INDEX } = require('./historicalReferenceIndex');
const { buildHistoricalEvidence } = require('./historicalEvidenceLayer');
const { mapDoctrineTopicToRegistryKey } = require('./doctrineSafetyLayer');
const { getRegistryTopic } = require('./genesisToRevelationContinuityRegistry');

const BLOCKED_IDENTITY_PATTERNS = [
  /\bidentity evidence\b/i,
  /\bdiaspora bucket\b/i,
  /\blineage bucket\b/i,
  /\bethnic identity\b/i,
  /\bgenealogy doctrine\b/i,
  /\bmodern identity conclusion\b/i,
  /\bwho (are|is) (the )?(true )?(israel|jews|edomites|edom)\b/i,
  /\b(african|european|ashkenazi|sephardic) (jews|identity|lineage)\b/i,
];

const BLOCKED_TOPIC_KEYS = new Set([
  'identity',
  'diaspora',
  'lineage',
  'ethnic_identity',
  'genealogy_doctrine',
  'edomHistoricalEvidenceBucket',
  'historicalEvidenceSeparate',
]);

const DOCTRINE_HISTORICAL_MAP = Object.freeze({
  sabbath: {
    evidenceKey: 'sabbath',
    indexKey: 'romanHistory',
    topics: ['sabbath_sunday_history', 'rome'],
  },
  feast_days: {
    evidenceKey: 'feastDaysHighSabbaths',
    indexKey: 'feastAndCalendarHistory',
    topics: ['passover', 'pentecost', 'tabernacles', 'high_sabbaths'],
  },
  traditions: {
    evidenceKey: 'traditionsOfMen',
    indexKey: 'romanHistory',
    topics: ['rome', 'imperial_religion'],
  },
  resurrection_timeline: {
    evidenceKey: null,
    indexKey: 'josephus',
    topics: ['first_century_judea', '70_ad_jerusalem'],
  },
  dietary_law: {
    evidenceKey: null,
    indexKey: 'ancientNearEast',
    topics: ['canaan'],
  },
});

const DISTINCTION_LINE =
  'Historical developments are not the same as biblical commands. History may support understanding, but history may not override Scripture.';

function isIdentityBlocked({ message = '', doctrineTopic = '' }) {
  const combined = `${message} ${doctrineTopic}`.toLowerCase();
  if (BLOCKED_IDENTITY_PATTERNS.some((pattern) => pattern.test(combined))) return true;
  if (BLOCKED_TOPIC_KEYS.has(String(doctrineTopic).toLowerCase())) return true;

  const registryKey = mapDoctrineTopicToRegistryKey(doctrineTopic);
  const entry = registryKey ? getRegistryTopic(registryKey) : null;
  const forbidden = entry?.forbiddenSources || [];
  return forbidden.some((source) =>
    ['edomHistoricalEvidenceBucket', 'historicalEvidenceSeparate', 'blackColorDescriptions'].includes(source)
  );
}

function resolveHistoricalBundle(doctrineTopic = '') {
  const registryKey = mapDoctrineTopicToRegistryKey(doctrineTopic) || doctrineTopic;
  return DOCTRINE_HISTORICAL_MAP[doctrineTopic] || DOCTRINE_HISTORICAL_MAP[registryKey] || null;
}

function routeHistoricalContext({ doctrineTopic = '', message = '' }) {
  if (isIdentityBlocked({ message, doctrineTopic })) {
    return {
      included: false,
      blocked: true,
      reason: 'identity_or_forbidden_bucket',
      formattedBlock: '',
      authorityOrder: ['Scripture', 'Scripture interpreting Scripture', 'Continuity chains'],
    };
  }

  const bundle = resolveHistoricalBundle(doctrineTopic);
  if (!bundle) {
    return {
      included: false,
      blocked: false,
      reason: 'no_historical_bundle',
      formattedBlock: '',
    };
  }

  const indexEntry = HISTORICAL_REFERENCE_INDEX[bundle.indexKey] || null;
  const evidence = bundle.evidenceKey ? buildHistoricalEvidence(bundle.evidenceKey) : { evidence: [] };
  const references = [
    ...(indexEntry?.works || []),
    ...(evidence.evidence || []),
  ].filter(Boolean);

  if (!references.length) {
    return {
      included: false,
      blocked: false,
      reason: 'empty_historical_references',
      formattedBlock: '',
    };
  }

  const formattedBlock = [
    'Historical context, secondary to Scripture:',
    ...references.slice(0, 4).map((ref) => `- ${ref}`),
    indexEntry?.usage || HISTORICAL_REFERENCE_INDEX.caution,
    DISTINCTION_LINE,
  ].join('\n');

  return {
    included: true,
    blocked: false,
    tier: 'D',
    labeled: true,
    secondary: true,
    formattedBlock,
    references: references.slice(0, 6),
    authorityOrder: [
      'Scripture',
      'Scripture interpreting Scripture',
      'Continuity chains',
      'Historical context',
      'Research questions',
    ],
    distinction: DISTINCTION_LINE,
  };
}

module.exports = {
  routeHistoricalContext,
  isIdentityBlocked,
  DISTINCTION_LINE,
  BLOCKED_IDENTITY_PATTERNS,
};
