/**
 * Phase 4C.1 — Doctrine Authority Contract
 * Builds pre-OpenAI contracts for strict doctrine topics from approved evidence only.
 */

const FORBIDDEN_PHRASES = [
  'interpretations vary',
  'different interpretations',
  'differing views',
  'theological perspectives',
  'some believe',
  'many believe',
  'many theologians',
  'different traditions',
  'complex topic',
  'depends on tradition',
  'scholars disagree',
  'denominations differ',
];

const STRICT_TOPIC_IDS = [
  'death_state',
  'dietary_law',
  'sabbath',
  'acts_10',
  'kingdom',
  'resurrection',
  'holy_spirit',
  'david',
  'new_jerusalem',
  'heavens',
  'heaven',
];

const TOPIC_ALIASES = {
  death_state: 'death_state',
  dietary_law: 'dietary_law',
  acts_10: 'acts_10',
  acts_10_clarification: 'dietary_law',
  isaiah_66_17: 'dietary_law',
  sabbath: 'sabbath',
  kingdom: 'kingdom',
  kingdom_of_god: 'kingdom',
  resurrection: 'resurrection',
  resurrection_timeline: 'resurrection',
  holy_spirit: 'holy_spirit',
  spirit_of_god: 'holy_spirit',
  david: 'david',
  new_jerusalem: 'new_jerusalem',
  heavens: 'heavens',
  heaven: 'heavens',
  heavensLayers: 'heavens',
};

const BASE_CONTRACTS = {
  death_state: {
    topic: 'death_state',
    strictMode: true,
    approvedWitnesses: [
      'Ecclesiastes 9:5',
      'Ecclesiastes 9:10',
      'Psalm 146:4',
      'John 11:11-14',
      'Daniel 12:2',
      '1 Thessalonians 4:13-16',
      '1 Corinthians 15',
    ],
    supportingWitnesses: [],
    cautionWitnesses: ['Luke 16', 'Luke 16:19-31', 'Luke 16:20-23', 'Luke 16:25'],
    prohibitedWitnesses: [],
    commonMisreadings: [
      'Luke 16 as proof of conscious memory after death',
      'Dead people awake in heaven or torment now',
    ],
    requiredConclusion:
      'The dead know nothing, their thoughts perish, and Scripture describes death as sleep until resurrection.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: [
      'approved_evidence_cards',
      'approved_support_graph',
      'phase4a4_primary_chains',
      'scripture_traceability_index',
      'scripture_vine_network',
      'observed_relationships_secondary_only',
    ],
    fallbackSafeAnswer: 'death_state',
    prohibitedClaims: [
      'conscious memory immediately after death',
      'dead people are awake in heaven or torment now',
      'luke 16 proves awareness after death',
      'the topic is complex',
      'soul continues',
      'conscious existence after death',
      'continued existence after death',
      'absent from the body',
      'memory after death',
      '2 corinthians 5:8',
      'philippians 1:21',
    ],
    primaryWitnessesOnly: true,
  },
  dietary_law: {
    topic: 'dietary_law',
    strictMode: true,
    approvedWitnesses: [
      'Leviticus 11',
      'Deuteronomy 14',
      'Daniel 1:8-16',
      'Acts 10:14',
      'Acts 10:28',
      'Acts 11:1-18',
      'Isaiah 66:17',
    ],
    supportingWitnesses: [],
    cautionWitnesses: ['Acts 10', 'Mark 7', 'Romans 14'],
    prohibitedWitnesses: [],
    commonMisreadings: [
      'Acts 10 vision as permission to eat unclean animals',
      'Mark 7 erasing clean/unclean law',
      'Romans 14 erasing Leviticus 11 / Deuteronomy 14',
    ],
    requiredConclusion:
      'Scripture distinguishes clean and unclean foods. Pork and shellfish are unclean. Acts 10 is explained by Peter as concerning people/Gentiles, not permission to eat unclean animals.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: [
      'approved_evidence_cards',
      'approved_support_graph',
      'phase4a4_primary_chains',
      'scripture_traceability_index',
    ],
    fallbackSafeAnswer: 'dietary_law',
    prohibitedClaims: ['acts 10 permits eating unclean', 'pork is clean', 'shrimp is clean'],
  },
  acts_10: {
    topic: 'acts_10',
    strictMode: true,
    approvedWitnesses: ['Acts 10:14', 'Acts 10:28', 'Acts 10:34-35', 'Acts 11:1-18'],
    supportingWitnesses: [],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: [
      'Acts 10 vision as permission to eat unclean animals',
      'Primarily or mainly about dietary law change',
    ],
    requiredConclusion:
      'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about Gentiles/people, not permission to eat unclean foods.',
    forbiddenPhrases: [
      ...FORBIDDEN_PHRASES,
      'primarily',
      'mainly',
      'largely',
      'broader point',
      'not just about dietary',
      'not solely about dietary',
      'significant',
    ],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph'],
    fallbackSafeAnswer: 'acts_10',
    prohibitedClaims: [
      'primarily about',
      'mainly about',
      'broader point',
      'not just about dietary',
      'vision involves food',
      'could also refer to food',
    ],
    acts10Strict: true,
  },
  sabbath: {
    topic: 'sabbath',
    strictMode: true,
    approvedWitnesses: [
      'Genesis 2:2-3',
      'Exodus 20:8-11',
      'Isaiah 58:13-14',
      'Luke 4:16',
      'Acts 17:2',
      'Hebrews 4:9',
      'Revelation 14:12',
    ],
    supportingWitnesses: ['Exodus 31:13', 'Matthew 12:11-12', 'Acts 13:42-44'],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['Sunday replacing seventh-day Sabbath without Scripture authority'],
    requiredConclusion:
      'The seventh day is the Sabbath established at creation and commanded in Scripture.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph', 'phase4a4_primary_chains'],
    fallbackSafeAnswer: 'sabbath',
    prohibitedClaims: [],
  },
  kingdom: {
    topic: 'kingdom',
    strictMode: true,
    approvedWitnesses: [
      'Matthew 6:10',
      'Luke 17:20-21',
      'Revelation 21:1-3',
      'Revelation 21:2',
      'Daniel 2:44',
      'Acts 1:6-7',
    ],
    supportingWitnesses: [],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['Kingdom only in heaven now without earthly restoration'],
    requiredConclusion:
      'The kingdom is established by God; Scripture ties kingdom hope to Messiah and restoration, not merely disembodied heaven.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph', 'phase4a4_primary_chains'],
    fallbackSafeAnswer: 'kingdom',
    prohibitedClaims: [],
  },
  resurrection: {
    topic: 'resurrection',
    strictMode: true,
    approvedWitnesses: [
      '1 Corinthians 15',
      '1 Thessalonians 4:13-16',
      'Daniel 12:2',
      'John 11:25',
      'Acts 24:15',
    ],
    supportingWitnesses: ['John 11:11-14'],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['Immediate conscious existence after death without resurrection'],
    requiredConclusion:
      'Resurrection is the hope Scripture gives; death is described as sleep until God raises the dead.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph', 'phase4a4_primary_chains'],
    fallbackSafeAnswer: 'resurrection',
    prohibitedClaims: [],
  },
  holy_spirit: {
    topic: 'holy_spirit',
    strictMode: true,
    approvedWitnesses: [
      'John 14:16-17',
      'John 16:13',
      'Acts 2:38',
      'Romans 8:9',
      '1 Corinthians 12:4-11',
    ],
    supportingWitnesses: [],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['Spirit as impersonal force only'],
    requiredConclusion:
      'The Holy Spirit is the Spirit of God active in believers according to Scripture witnesses.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph', 'phase4a4_primary_chains'],
    fallbackSafeAnswer: 'holy_spirit',
    prohibitedClaims: [],
  },
  david: {
    topic: 'david',
    strictMode: true,
    approvedWitnesses: [
      '2 Samuel 7:12-16',
      'Psalm 89:3-4',
      'Acts 2:29-31',
      'Matthew 22:41-45',
    ],
    supportingWitnesses: [],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['Davidic hope detached from Messiah'],
    requiredConclusion:
      'Davidic covenant witnesses tie David’s line to Messiah and kingdom hope in Scripture.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'scripture_vine_network', 'phase4a4_primary_chains'],
    fallbackSafeAnswer: 'david',
    prohibitedClaims: [],
  },
  new_jerusalem: {
    topic: 'new_jerusalem',
    strictMode: true,
    approvedWitnesses: ['Revelation 21:1-3', 'Revelation 21:2', 'Revelation 21:10-27', 'Isaiah 65:17-19'],
    supportingWitnesses: [],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['New Jerusalem only symbolic with no Scripture anchor'],
    requiredConclusion:
      'New Jerusalem is the restored dwelling place Scripture describes in Revelation and prophets.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph'],
    fallbackSafeAnswer: 'new_jerusalem',
    prohibitedClaims: [],
  },
  heavens: {
    topic: 'heavens',
    strictMode: true,
    approvedWitnesses: [
      'Genesis 1:1',
      'Deuteronomy 10:14',
      '2 Corinthians 12:2',
      'John 3:13',
      'Isaiah 66:1',
    ],
    supportingWitnesses: [],
    cautionWitnesses: [],
    prohibitedWitnesses: [],
    commonMisreadings: ['Single heaven only without Scripture layers'],
    requiredConclusion:
      'Scripture describes heavens in layers; no man hath ascended to heaven except Christ per John 3:13.',
    forbiddenPhrases: [...FORBIDDEN_PHRASES],
    minimumWitnessCount: 2,
    yesNoDirectnessRequired: false,
    sourcePriority: ['approved_evidence_cards', 'approved_support_graph'],
    fallbackSafeAnswer: 'heavens',
    prohibitedClaims: [],
  },
};

function normalizeTopicKey(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
  return TOPIC_ALIASES[key] || (STRICT_TOPIC_IDS.includes(key) ? key : null);
}

function isYesNoDoctrineQuestion(message = '') {
  const m = String(message).trim().toLowerCase();
  if (/^(yes|no)\b/i.test(m)) return false;
  return (
    /^(can|could|should|do|does|did|is|are|was|were|will|would|may|might)\b/i.test(m) ||
    /\bso we can\b/i.test(m) ||
    /\bprove\b/i.test(m) ||
    /\bmean killed in judgment\b/i.test(m)
  );
}

function collectWitnessesFromEvidencePack(evidencePack = {}) {
  const approved = new Set();
  const supporting = new Set();
  const caution = new Set();

  const cards = evidencePack.doctrine?.evidenceCards?.cards || evidencePack.doctrine?.evidenceCards || [];
  for (const card of cards) {
    for (const ref of card.primaryScriptures || []) approved.add(ref);
    for (const ref of card.supportingScriptures || []) supporting.add(ref);
    for (const ref of card.cautionPassages || []) caution.add(ref);
  }

  for (const ref of evidencePack.scripture?.references || []) {
    const r = ref.reference || ref;
    if (r) approved.add(r);
  }

  const catalog = evidencePack.approvedCatalogEvidence?.entries || [];
  for (const entry of catalog) {
    for (const ref of entry.references || entry.scriptures || []) {
      approved.add(typeof ref === 'string' ? ref : ref.reference || ref);
    }
  }

  return {
    approvedWitnesses: [...approved].filter(Boolean),
    supportingWitnesses: [...supporting].filter(Boolean),
    cautionWitnesses: [...caution].filter(Boolean),
  };
}

function mergeContractWithPack(baseContract, evidencePack) {
  const fromPack = collectWitnessesFromEvidencePack(evidencePack);
  const approved = [...new Set([...baseContract.approvedWitnesses, ...fromPack.approvedWitnesses])];
  const supporting = [...new Set([...baseContract.supportingWitnesses, ...fromPack.supportingWitnesses])];
  const caution = [...new Set([...baseContract.cautionWitnesses, ...fromPack.cautionWitnesses])];

  const yesNoRequired = isYesNoDoctrineQuestion(evidencePack.userMessage || '');

  return {
    ...baseContract,
    approvedWitnesses: approved,
    supportingWitnesses: supporting,
    cautionWitnesses: caution,
    yesNoDirectnessRequired: yesNoRequired,
    minimumWitnessCount: baseContract.minimumWitnessCount || 2,
  };
}

function resolveStrictTopic(evidencePack = {}) {
  const { detectStrictTopicFromMessage } = require('./doctrineTopicDetector');
  const messageRaw = String(evidencePack.userMessage || '');
  const detected = detectStrictTopicFromMessage(messageRaw);
  if (detected && BASE_CONTRACTS[detected]) return detected;

  const candidates = [
    evidencePack.effectiveTopic,
    evidencePack.topic,
    evidencePack.scripture?.topic,
  ];

  const cardTopics = (evidencePack.doctrine?.evidenceCards?.cards || [])
    .map((c) => c.topic)
    .filter(Boolean);
  candidates.push(...cardTopics);

  const message = messageRaw.toLowerCase();
  if (
    /\b(die|dies|died|death|after death|when a person dies|dead know|soul sleep|memory after death)\b/.test(
      message,
    )
  ) {
    return 'death_state';
  }
  if (/\bwhat does acts\s*10\b|\bacts\s*10 mean\b|\bacts\s*10 vision\b/.test(message)) {
    return 'acts_10';
  }
  if (
    /\b(clean and unclean|unclean food|pork|shrimp|swine|shellfish|dietary|consumed together|abomination)\b/.test(
      message,
    )
  ) {
    return 'dietary_law';
  }
  if (/\bacts\s*10\b/.test(message)) {
    return 'acts_10';
  }
  if (/\bluke\s*16\b/.test(message)) {
    return 'death_state';
  }
  if (/\bisaiah\s*66\b/.test(message)) {
    return 'dietary_law';
  }
  if (/\bnew jerusalem\b/.test(message)) {
    return 'new_jerusalem';
  }
  if (/\b(sabbath|seventh day)\b/.test(message)) {
    return 'sabbath';
  }
  if (/\bresurrection\b/.test(message) && !/\bdeath_state\b/.test(message)) {
    return 'resurrection';
  }
  if (/\b(holy spirit|spirit of god)\b/.test(message)) {
    return 'holy_spirit';
  }
  if (/\b(kingdom of heaven|kingdom of god|thy kingdom)\b/.test(message)) {
    return 'kingdom';
  }
  if (/\b(heavens|third heaven|firmament)\b/.test(message)) {
    return 'heavens';
  }

  for (const c of candidates) {
    const normalized = normalizeTopicKey(c);
    if (normalized && BASE_CONTRACTS[normalized]) return normalized;
  }

  return null;
}

function buildDoctrineAuthorityContract(evidencePack = {}) {
  const strictTopic = resolveStrictTopic(evidencePack);
  if (!strictTopic || !BASE_CONTRACTS[strictTopic]) {
    return null;
  }

  const base = BASE_CONTRACTS[strictTopic];
  return mergeContractWithPack(base, evidencePack);
}

function attachDoctrineStrictContract(evidencePack = {}) {
  const contract = buildDoctrineAuthorityContract(evidencePack);
  if (!contract) {
    evidencePack.doctrineStrict = { enabled: false };
    return evidencePack;
  }

  evidencePack.doctrineStrict = {
    enabled: true,
    contract,
    approvedWitnesses: contract.approvedWitnesses,
    cautionWitnesses: contract.cautionWitnesses,
    prohibitedWitnesses: contract.prohibitedWitnesses || [],
    minimumWitnessCount: contract.minimumWitnessCount,
    forbiddenPhrases: contract.forbiddenPhrases,
    requiredConclusion: contract.requiredConclusion,
    yesNoDirectnessRequired: contract.yesNoDirectnessRequired,
    strictTopic: contract.topic,
  };

  return evidencePack;
}

function buildDoctrineStrictComposerInstruction(evidencePack = {}) {
  const ds = evidencePack.doctrineStrict;
  if (!ds?.enabled) return '';

  const contract = ds.contract;
  return [
    'DOCTRINE AUTHORITY CONTRACT (STRICT MODE — MANDATORY):',
    'You are the companion voice, not the doctrine authority.',
    'Use only approvedWitnesses for doctrine conclusions.',
    'Do not introduce outside doctrine.',
    'Do not add non-approved verses.',
    'Do not use cautionWitnesses as proof.',
    'Observed relationships and candidate relationships are never doctrine authority.',
    'Parables are not primary doctrine proof unless explicitly listed as approved witnesses.',
    contract.yesNoDirectnessRequired
      ? 'If asked yes/no, the first sentence must begin with "Yes," or "No," then give Scripture witnesses.'
      : 'Answer directly from approved witnesses.',
    'If approved evidence is insufficient, say so clearly.',
    `Required conclusion direction: ${contract.requiredConclusion}`,
    `Approved witnesses: ${contract.approvedWitnesses.join('; ')}`,
    contract.cautionWitnesses.length
      ? `Caution only (not proof): ${contract.cautionWitnesses.join('; ')}`
      : '',
    `Minimum witness count for doctrine claims: ${contract.minimumWitnessCount}`,
    `Forbidden phrases: ${contract.forbiddenPhrases.join('; ')}`,
    'Return JSON with: directAnswer, scriptureWitnesses (array), cautionHandled, unsupportedClaimsRejected, finalAnswer.',
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  FORBIDDEN_PHRASES,
  STRICT_TOPIC_IDS,
  BASE_CONTRACTS,
  normalizeTopicKey,
  isYesNoDoctrineQuestion,
  resolveStrictTopic,
  buildDoctrineAuthorityContract,
  attachDoctrineStrictContract,
  buildDoctrineStrictComposerInstruction,
  collectWitnessesFromEvidencePack,
};
