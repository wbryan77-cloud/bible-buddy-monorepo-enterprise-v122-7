/**
 * Phase 4C.1 — Warm corpus-only safe answers when doctrine strict validation fails.
 */

function buildDeathStateSafeAnswer(message = '') {
  const lower = String(message).toLowerCase();
  if (/\bluke\s*16\b/.test(lower) && /\b(memory|prove|aware)\b/.test(lower)) {
    return {
      directAnswer: 'No, Luke 16 is not primary doctrine proof of conscious memory after death.',
      scriptureWitnesses: [
        'Ecclesiastes 9:5',
        'Psalm 146:4',
        'John 11:11-14',
        '1 Thessalonians 4:13-16',
      ],
      cautionHandled: true,
      unsupportedClaimsRejected: ['Luke 16 as proof of memory after death'],
      finalAnswer:
        'No, Luke 16 should not be used as primary proof that the dead have conscious memory after death. It is a parable passage and belongs in caution, not the primary doctrine chain. From the approved witness chain, Scripture teaches that the dead know nothing and are described as asleep until resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called Lazarus’ death sleep in John 11:11-14. Paul speaks of those who are asleep in 1 Thessalonians 4:13-16. So BibleBuddy stays with those approved witnesses for doctrine on death.',
      reply:
        'No, Luke 16 should not be used as primary proof that the dead have conscious memory after death. It is a parable passage and belongs in caution, not the primary doctrine chain. From the approved witness chain, Scripture teaches that the dead know nothing and are described as asleep until resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called Lazarus’ death sleep in John 11:11-14. Paul speaks of those who are asleep in 1 Thessalonians 4:13-16.',
      safeCorpusFallback: true,
      doctrineStrictSafeAnswer: true,
    };
  }

  if (/\b(memory|remember|aware)\b/.test(lower) && /\b(after death|when.*die)\b/.test(lower)) {
    return {
      directAnswer: 'No, the approved Scripture witnesses do not support conscious memory immediately after death.',
      scriptureWitnesses: ['Ecclesiastes 9:5', 'Psalm 146:4', 'John 11:11-14'],
      cautionHandled: true,
      unsupportedClaimsRejected: ['conscious memory after death'],
      finalAnswer:
        'Brother, you are right to ask Scripture to speak clearly. The approved witness chain does not support conscious memory immediately after death as doctrine. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called death sleep in John 11:11-14, and Paul speaks of those asleep until resurrection in 1 Thessalonians 4:13-16. Luke 16 is not used here as primary proof.',
      reply:
        'Brother, you are right to ask Scripture to speak clearly. The approved witness chain does not support conscious memory immediately after death as doctrine. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called death sleep in John 11:11-14, and Paul speaks of those asleep until resurrection in 1 Thessalonians 4:13-16.',
      safeCorpusFallback: true,
      doctrineStrictSafeAnswer: true,
    };
  }

  return {
    directAnswer: 'Scripture describes death as sleep until resurrection; the dead know nothing.',
    scriptureWitnesses: [
      'Ecclesiastes 9:5',
      'Psalm 146:4',
      'John 11:11-14',
      '1 Thessalonians 4:13-16',
      '1 Corinthians 15',
    ],
    cautionHandled: true,
    unsupportedClaimsRejected: ['Luke 16 as primary death doctrine proof'],
    finalAnswer:
      'Brother, you are right to ask for Scripture to speak clearly. From the approved witness chain, the Bible teaches that the dead know nothing and are described as asleep until the resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called Lazarus’ death sleep in John 11:11-14. Paul also speaks of those who are asleep in 1 Thessalonians 4:13-16. Daniel 12:2 and 1 Corinthians 15 anchor hope in resurrection, not conscious life in death.',
    reply:
      'Brother, you are right to ask for Scripture to speak clearly. From the approved witness chain, the Bible teaches that the dead know nothing and are described as asleep until the resurrection. Ecclesiastes 9:5 says the dead know not any thing. Psalm 146:4 says a man’s thoughts perish. Jesus called Lazarus’ death sleep in John 11:11-14. Paul also speaks of those who are asleep in 1 Thessalonians 4:13-16.',
    safeCorpusFallback: true,
    doctrineStrictSafeAnswer: true,
  };
}

function buildDietaryLawSafeAnswer(message = '') {
  const lower = String(message).toLowerCase();

  if (
    /\b(consumed together|killed in judgment)\b/.test(lower) ||
    (/\bisaiah\s*66\b/.test(lower) && /\b(judgment|swine|abomination)\b/.test(lower))
  ) {
    return {
      directAnswer: 'Yes, Isaiah 66:17 treats eating swine’s flesh and abomination seriously in judgment.',
      scriptureWitnesses: ['Isaiah 66:17', 'Leviticus 11', 'Deuteronomy 14'],
      cautionHandled: false,
      unsupportedClaimsRejected: [],
      finalAnswer:
        'Yes, Isaiah 66:17 speaks seriously about those who eat swine’s flesh, abomination, and mouse together in the context of judgment. Leviticus 11 and Deuteronomy 14 still identify clean and unclean animals. Acts 10:28 and Acts 11:1-18 explain Peter’s vision as concerning people, not permission to eat unclean animals.',
      reply:
        'Yes, Isaiah 66:17 speaks seriously about those who eat swine’s flesh, abomination, and mouse together in the context of judgment. Leviticus 11 and Deuteronomy 14 still identify clean and unclean animals. Acts 10:28 and Acts 11:1-18 explain Peter’s vision as concerning people, not permission to eat unclean animals.',
      safeCorpusFallback: true,
      doctrineStrictSafeAnswer: true,
    };
  }

  if (/\b(pork|shrimp|swine|shellfish)\b/.test(lower) || /\bso we can eat\b/.test(lower)) {
    return {
      directAnswer: 'No, pork and shellfish remain unclean under the approved Scripture witnesses.',
      scriptureWitnesses: ['Leviticus 11', 'Deuteronomy 14', 'Acts 10:28', 'Acts 11:1-18'],
      cautionHandled: true,
      unsupportedClaimsRejected: ['Acts 10 as pork permission'],
      finalAnswer:
        'No. According to the approved Scripture witnesses, eating unclean animals is against the clean/unclean food law. Leviticus 11 and Deuteronomy 14 identify clean and unclean animals. Acts 10 does not erase that law because Peter explains the vision as concerning people, not food, in Acts 10:28 and Acts 11:1-18. Isaiah 66:17 also treats eating swine’s flesh and abomination seriously in judgment.',
      reply:
        'No. According to the approved Scripture witnesses, eating unclean animals is against the clean/unclean food law. Leviticus 11 and Deuteronomy 14 identify clean and unclean animals. Acts 10 does not erase that law because Peter explains the vision as concerning people, not food, in Acts 10:28 and Acts 11:1-18.',
      safeCorpusFallback: true,
      doctrineStrictSafeAnswer: true,
    };
  }

  return {
    directAnswer: 'Scripture distinguishes clean and unclean foods; Acts 10 concerns people, not food.',
    scriptureWitnesses: ['Leviticus 11', 'Deuteronomy 14', 'Acts 10:14', 'Acts 10:28', 'Acts 11:1-18', 'Isaiah 66:17'],
    cautionHandled: true,
    unsupportedClaimsRejected: ['Acts 10 as unclean food permission'],
    finalAnswer:
      'According to the approved Scripture witnesses, Scripture distinguishes clean and unclean foods. Leviticus 11 and Deuteronomy 14 list them. Daniel 1:8-16 shows faithful refusal of unclean food. Acts 10:14 records Peter’s refusal; Acts 10:28 and Acts 11:1-18 explain the vision as concerning Gentiles, not permission to eat unclean animals. Isaiah 66:17 treats eating swine’s flesh and abomination seriously.',
    reply:
      'According to the approved Scripture witnesses, Scripture distinguishes clean and unclean foods. Leviticus 11 and Deuteronomy 14 list them. Acts 10:28 and Acts 11:1-18 explain the vision as concerning Gentiles, not permission to eat unclean animals.',
    safeCorpusFallback: true,
    doctrineStrictSafeAnswer: true,
  };
}

function buildActs10SafeAnswer() {
  return {
    directAnswer:
      'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean.',
    scriptureWitnesses: ['Acts 10:14', 'Acts 10:28', 'Acts 10:34-35', 'Acts 11:1-18'],
    cautionHandled: false,
    unsupportedClaimsRejected: ['primarily', 'mainly', 'broader point'],
    finalAnswer:
      'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about Gentiles and people, not permission to eat unclean foods. Acts 10:14 shows Peter’s refusal of unclean food; Acts 11:1-18 records his explanation to the church.',
    reply:
      'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about Gentiles and people, not permission to eat unclean foods. Acts 11:1-18 records Peter explaining the vision to the church.',
    safeCorpusFallback: true,
    doctrineStrictSafeAnswer: true,
  };
}

function buildGenericSafeAnswer(contract = {}) {
  const witnesses = (contract.approvedWitnesses || []).slice(0, 4).join('; ');
  return {
    directAnswer: contract.requiredConclusion || 'Scripture witnesses guide this topic.',
    scriptureWitnesses: contract.approvedWitnesses || [],
    cautionHandled: false,
    unsupportedClaimsRejected: [],
    finalAnswer: `From the approved Scripture witnesses (${witnesses}), ${contract.requiredConclusion || 'we stay within retrieved approved evidence.'}`,
    reply: `From the approved Scripture witnesses, ${contract.requiredConclusion || 'we stay within retrieved approved evidence.'}`,
    safeCorpusFallback: true,
    doctrineStrictSafeAnswer: true,
  };
}

function buildDoctrineStrictSafeAnswer({ message = '', evidencePack = {}, contract = {}, violations = [] } = {}) {
  const topic = contract.topic || evidencePack.doctrineStrict?.strictTopic;

  let safe;
  if (topic === 'death_state') safe = buildDeathStateSafeAnswer(message);
  else if (topic === 'dietary_law') safe = buildDietaryLawSafeAnswer(message);
  else if (topic === 'acts_10') safe = buildActs10SafeAnswer();
  else safe = buildGenericSafeAnswer(contract);

  safe.violationsRejected = violations;
  safe.strictTopic = topic;
  return safe;
}

module.exports = {
  buildDeathStateSafeAnswer,
  buildDietaryLawSafeAnswer,
  buildDoctrineStrictSafeAnswer,
};
