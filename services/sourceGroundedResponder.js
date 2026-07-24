const { getBoundariesForTopic } = require('./doctrineBoundaries');

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function detectSourceTopic(message = '') {
  const text = String(message).toLowerCase();

  if (hasAny(text, ['dietary', 'unclean food', 'unclean foods', 'swine', 'pork', 'mouse', 'acts 10', 'acts 11', 'peter vision', 'clean and unclean'])) {
    return 'dietary_law';
  }

  if (hasAny(text, ['sabbath', 'seventh day', 'sunday worship', 'fourth commandment', 'sunday observance'])) {
    return 'sabbath';
  }

  if (hasAny(text, ['feast day', 'feast days', 'high sabbath', 'leviticus 23', 'passover', 'tabernacles', 'pentecost', 'unleavened bread'])) {
    return 'feast_days';
  }

  if (hasAny(text, ['christmas', 'easter', 'december 25', 'tree out of the forest', 'jeremiah 10'])) {
    return 'traditions';
  }

  if (
    hasAny(text, [
      'resurrection',
      'three days and three nights',
      'resurrection timeline',
      'matthew 12:40',
      'matthew 28',
      'mark 16',
      'luke 24',
      'john 20',
      'daniel 9:27',
      'midst of the week',
      'first day of the week',
      'already risen',
      'empty tomb',
      'rose sunday',
      'rise sunday',
      'sunday morning',
      'before the first day',
      'discovery of the empty tomb',
      'when mary reached',
      'when mary came',
      'friday afternoon to sunday',
    ])
  ) {
    return 'resurrection_timeline';
  }

  return null;
}

function basePayload(topic, reply, scripture, nextSteps = [], extraRuntime = {}) {
  return {
    reply,
    scripture,
    mode: 'study',
    confidence: 'high',
    memory_used: false,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: nextSteps,
    admin_flags: ['source_grounded_guardrail_used'],
    runtime: { topic, adaptive: true, ...extraRuntime },
    quality: { score: 96, issues: [], passed: true },
  };
}

function companionOpening(questionType = 'definition', topic = '') {
  if (questionType === 'comparison') {
    return "I hear what you're asking — you want the difference spelled out clearly, with Scripture first.";
  }
  if (topic === 'sabbath') {
    return "That's a thoughtful question. Let's answer it directly from Scripture.";
  }
  return "Let's stay close to the text and answer your question directly.";
}

function sabbathReply({ questionType = 'definition', message = '' } = {}) {
  const opening = companionOpening(questionType, 'sabbath');

  if (questionType === 'comparison' || /\bdifference between\b/i.test(message)) {
    const reply = [
      opening,
      '',
      'Direct answer:',
      'The biblical Sabbath is the seventh day — set apart by God in Genesis 2:2-3 and commanded in Exodus 20:8-11. Sunday observance, as commonly practiced in much of Christianity, developed later through historical church and civil practice — not through a biblical command changing the Sabbath day.',
      '',
      'Scripture foundation:',
      'Genesis 2:2-3 — God blessed and sanctified the seventh day.',
      'Exodus 20:8-11 — the fourth commandment identifies the seventh day as the Sabbath of the LORD your God.',
      'Isaiah 58:13-14 — the Sabbath is connected to delight and honoring the LORD.',
      '',
      'Historical context, secondary to Scripture:',
      'Sunday became a common day of rest and worship through early first-day gatherings, Constantine\'s AD 321 Sunday law, the Council of Laodicea (circa AD 364), and later Roman Catholic liturgical authority. That history explains how Sunday observance spread — it does not replace what Scripture says about the seventh-day Sabbath.',
      '',
      'History can explain how practice changed, but history cannot override Scripture.',
    ].join('\n');

    return basePayload(
      'sabbath',
      reply,
      [
        { reference: 'Genesis 2:2-3', text: '', reason: 'seventh day blessed and sanctified' },
        { reference: 'Exodus 20:8-11', text: '', reason: 'fourth commandment' },
        { reference: 'Isaiah 58:13-14', text: '', reason: 'Sabbath delight and honor' },
      ],
      ['Compare Genesis 2:2-3 and Exodus 20:8-11 side by side.']
    );
  }

  const reply = [
    opening,
    '',
    'Direct answer:',
    'The Sabbath is the seventh day — the day God rested, blessed, and set apart. Scripture identifies it in Genesis 2:2-3 and commands it in Exodus 20:8-11 as the Sabbath of the LORD your God.',
    '',
    'Scripture foundation:',
    'Genesis 2:2-3 — God rested on the seventh day and blessed it.',
    'Exodus 20:8-11 — Remember the Sabbath day; the seventh day is the Sabbath of the LORD your God.',
    'Isaiah 58:13-14 — call the Sabbath a delight and honor the LORD.',
    'Luke 4:16 — Yeshua kept the Sabbath as His custom.',
    'Hebrews 4:9 — a Sabbath rest remains for the people of God.',
    '',
    'Scripture identifies the seventh day as the Sabbath and does not record God changing the Sabbath to Sunday.',
  ].join('\n');

  return basePayload(
    'sabbath',
    reply,
    [
      { reference: 'Genesis 2:2-3', text: '', reason: 'seventh day blessed and sanctified' },
      { reference: 'Exodus 20:8-11', text: '', reason: 'fourth commandment' },
      { reference: 'Isaiah 58:13-14', text: '', reason: 'Sabbath delight and honor' },
      { reference: 'Luke 4:16', text: '', reason: 'Yeshua kept the Sabbath' },
      { reference: 'Hebrews 4:9', text: '', reason: 'Sabbath rest remains' },
    ],
    ['Read Genesis 2:2-3 and Exodus 20:8-11 together.']
  );
}

function dietaryLawReply() {
  return basePayload(
    'dietary_law',
    [
      "Let's answer this directly from Scripture.",
      '',
      "The Bible gives the clean and unclean distinction in Leviticus 11 and Deuteronomy 14. Peter's vision should be read with Peter's own explanation, not separated from it.",
      '',
      'Line upon line:',
      '1. Leviticus 11 and Deuteronomy 14 define clean and unclean animals.',
      "2. Daniel 1 shows Daniel refusing the king's food and choosing pulse and water.",
      '3. Acts 10:14 — Peter: "Not so, Lord; for I have never eaten any thing that is common or unclean."',
      "4. Acts 10:28 — Peter's explanation: God showed him not to call any man common or unclean.",
      '5. Acts 11:1-18 — Peter rehearses the matter to the brethren.',
      "6. Isaiah 66:17 — continuity passage involving swine's flesh and the mouse.",
      '',
      'Acts 10 should not be presented alone as permission to eat unclean animals. Peter explains the vision as dealing with people and Gentile inclusion.',
    ].join('\n'),
    [
      { reference: 'Leviticus 11', text: '', reason: 'clean and unclean animal distinction' },
      { reference: 'Deuteronomy 14', text: '', reason: 'clean and unclean animal distinction repeated' },
      { reference: 'Daniel 1', text: '', reason: 'example of refusing defiling food' },
      { reference: 'Acts 10:14', text: 'Not so, Lord; for I have never eaten any thing that is common or unclean.', reason: 'Peter states his practice' },
      { reference: 'Acts 10:28', text: '', reason: 'Peter explains the vision as concerning people' },
      { reference: 'Acts 11:1-18', text: '', reason: 'Peter explains the matter to the brethren' },
      { reference: 'Isaiah 66:17', text: '', reason: 'continuity passage involving unclean food' },
    ],
    ['Read Acts 10:14, Acts 10:28, and Acts 11:1-18 together before forming a conclusion.']
  );
}

function feastDaysReply() {
  return basePayload(
    'feast_days',
    [
      "Let's answer from Scripture first.",
      '',
      "Leviticus 23 is the core chapter for the LORD's appointed feasts and holy convocations. A Bible-first answer begins there before discussing later religious holidays.",
      '',
      'Continuity study path: Leviticus 23, Acts 2, 1 Corinthians 5:7-8, and Zechariah 14:16.',
      '',
      'Later holidays should not be presented as replacements for what Scripture explicitly lists unless the text itself says so.',
    ].join('\n'),
    [
      { reference: 'Leviticus 23', text: '', reason: 'appointed feasts and holy convocations' },
      { reference: 'Acts 2', text: '', reason: 'Pentecost context' },
      { reference: '1 Corinthians 5:7-8', text: '', reason: 'Passover/unleavened bread language' },
      { reference: 'Zechariah 14:16', text: '', reason: 'future tabernacles reference' },
    ],
    ['Start with Leviticus 23 and then trace later references.']
  );
}

function traditionsReply() {
  return basePayload(
    'traditions',
    [
      "Let's answer your question directly.",
      '',
      'First: where is this practice commanded in Scripture? If it is not explicitly commanded, that should be stated clearly before discussing history.',
      '',
      'Relevant passages: Jeremiah 10:1-4, Mark 7:6-13, and Colossians 2:8 — warnings about vain customs, tradition making commandments void, and traditions of men.',
      '',
      'Historical origins may be discussed after the biblical test, but must be labeled as history, not Scripture.',
    ].join('\n'),
    [
      { reference: 'Jeremiah 10:1-4', text: '', reason: 'warning about customs of the people' },
      { reference: 'Mark 7:6-13', text: '', reason: 'tradition making the commandment of God of none effect' },
      { reference: 'Colossians 2:8', text: '', reason: 'warning about traditions of men' },
    ],
    ['Ask first whether the practice is commanded in Scripture; then discuss historical origins separately.']
  );
}

function resurrectionReply(message = '') {
  const m = String(message || '');

  const scripture = [
    { reference: 'Matthew 12:40', text: '', reason: 'three days and three nights' },
    { reference: 'Matthew 28:1-6', text: 'He is not here: for he is risen, as he said.', reason: 'already risen at the women’s arrival' },
    { reference: 'Mark 16:1-6', text: '', reason: 'women arrive; He is risen' },
    { reference: 'Luke 24:1-7', text: '', reason: 'first day dawn; not here, is risen' },
    { reference: 'John 20:1-10', text: '', reason: 'first day early; stone taken away' },
    { reference: 'Luke 23:50-56', text: '', reason: 'burial before Sabbath; women rested' },
  ];

  // Direct answers for common Founder phrasings — claim categories labeled.
  if (/\b(exact (moment|time|clock|hour|minute)|clock time|precise moment|exact second)\b/i.test(m)) {
    return basePayload(
      'resurrection_timeline',
      [
        'Direct answer: No — Scripture does not give the exact clock time / precise moment Jesus rose.',
        '',
        'Explicit Scripture:',
        'Matthew 28:1-6 (and Mark 16 / Luke 24 / John 20) tell when the women arrived toward dawn of the first day and that He was already risen then.',
        '',
        'Scripture Silent:',
        'The Gospels do not state the exact hour or minute of the rising itself. Discovery time is not the same as a revealed resurrection timestamp.',
      ].join('\n'),
      scripture,
      [],
      { masterRoute: 'resurrection_timing_source_grounded', claimGovernance: true },
    );
  }

  if (/\balready risen when (mary|the women)|already gone when mary|was he already risen\b/i.test(m)) {
    return basePayload(
      'resurrection_timeline',
      [
        'Direct answer: Yes — according to the Gospel accounts, Jesus was already risen when the women reached the tomb.',
        '',
        'Explicit Scripture:',
        'Matthew 28:1-6 — the women came toward dawn of the first day of the week, and the angel said He is risen; He is not here.',
        'Mark 16:1-6 and Luke 24:1-7 record the same discovery: they arrive and find that He is already risen.',
        'John 20:1 — early on the first day the stone is already taken away.',
        '',
        'Scripture Silent:',
        'Those passages state the condition of the tomb at discovery. They do not give the exact clock time of the rising itself.',
        '',
        'Do not confuse the time of discovery with an exact resurrection timestamp Scripture does not provide.',
      ].join('\n'),
      scripture,
      ['Compare Matthew 28:1-6 with Mark 16 and Luke 24 on the discovery wording.'],
      { masterRoute: 'resurrection_timing_source_grounded', claimGovernance: true },
    );
  }

  if (/\bdid jesus rise sunday|rose sunday morning|resurrection on sunday\b/i.test(m)) {
    return basePayload(
      'resurrection_timeline',
      [
        'Direct answer: Scripture records that the women discovered the empty tomb toward dawn of the first day of the week — and that Jesus was already risen then. It does not state an exact Sunday-morning rising moment.',
        '',
        'Explicit Scripture:',
        'Matthew 28:1-6 — arrival toward dawn of the first day; “He is risen.”',
        'Mark 16:1-6; Luke 24:1-7; John 20:1 — first-day discovery of the empty tomb.',
        '',
        'Comparison / reasoned inference:',
        'If He was already risen when they arrived, the first-day visit describes discovery, not a proof of the exact rising minute.',
        'Matthew 12:40 also requires “three days and three nights,” which challenges a short Friday-afternoon-to-Sunday-morning count when that count is pressed as exact.',
        '',
        'Scripture Silent:',
        'The Gospels do not give a clock-hour for the resurrection event itself.',
        '',
        'Historical tradition that He “rose Sunday morning” must not be presented as if Matthew 28 stated the rising moment. The text states discovery and that He was already risen.',
      ].join('\n'),
      scripture,
      ['Hold discovery wording (Matthew 28:1-6) separate from any later tradition about the exact rising hour.'],
      { masterRoute: 'resurrection_timing_source_grounded', claimGovernance: true },
    );
  }

  if (/\b(first day describe|resurrection or the discovery|discovery of the empty tomb)\b/i.test(m)) {
    return basePayload(
      'resurrection_timeline',
      [
        'Direct answer: In the Gospel wording, the first day of the week primarily marks the discovery of the empty tomb — and that Jesus was already risen — not a stated clock-time for the rising itself.',
        '',
        'Explicit Scripture: Matthew 28:1-6; Mark 16:1-6; Luke 24:1-7; John 20:1.',
        'Scripture Silent: the exact minute/hour He rose.',
      ].join('\n'),
      scripture,
      [],
      { masterRoute: 'resurrection_timing_source_grounded', claimGovernance: true },
    );
  }

  if (/\bfriday afternoon to sunday|three days and three nights\b/i.test(m)) {
    return basePayload(
      'resurrection_timeline',
      [
        'Direct answer: Matthew 12:40 explicitly requires “three days and three nights.” A short Friday-afternoon-to-Sunday-morning span is difficult to reconcile with that wording if pressed as an exact full count.',
        '',
        'Explicit Scripture:',
        'Matthew 12:40 — three days and three nights in the heart of the earth.',
        'Matthew 28:1-6 — toward dawn of the first day, He was already risen.',
        'Luke 23:50-56 — burial before Sabbath; women rested the Sabbath day.',
        '',
        'Reasoned inference (not explicit timestamp):',
        'Any full chronology that satisfies Matthew 12:40 must be tested against the burial, Sabbath rest, and already-risen discovery texts — without importing later church tradition as if it were the verse.',
        '',
        'Scripture Silent: the exact clock hour of the resurrection event.',
      ].join('\n'),
      scripture.concat([{ reference: 'Matthew 12:40', text: '', reason: 'three days and three nights' }]),
      [],
      { masterRoute: 'resurrection_timing_source_grounded', claimGovernance: true },
    );
  }

  // Default: Sunday vs already-risen-before-first-day Founder question
  return basePayload(
    'resurrection_timeline',
    [
      'Direct answer: Scripture shows Jesus was already risen before / when the first-day discovery happened. The first day of the week is when the empty tomb is discovered — not a verse that states “He rose at Sunday morning o’clock.”',
      '',
      'Explicit Scripture:',
      '• Matthew 28:1-6 — women came toward dawn of the first day; the angel says He is risen; He is not here.',
      '• Mark 16:1-6; Luke 24:1-7; John 20:1-10 — first-day arrival finds the tomb already empty / He is risen.',
      '• Matthew 12:40 — three days and three nights (duration constraint).',
      '• Luke 23:50-56 — burial before Sabbath; women rested on the Sabbath.',
      '',
      'Comparison of Scripture:',
      'All four Gospels agree the women find Him already risen at the first-day visit. That supports distinguishing discovery timing from an unstated exact rising minute.',
      '',
      'Reasoned inference (labeled):',
      'Because He was already risen at dawn discovery, traditional wording that He “rose Sunday morning” as the discovery moment should not be treated as the explicit text. Chronologies that honor Matthew 12:40 must be argued carefully from the passages, not from later tradition alone.',
      '',
      'Scripture Silent:',
      'The exact hour/minute of the resurrection event is not stated.',
      '',
      'Do not answer the time of discovery as if it automatically proves the exact time of the rising.',
    ].join('\n'),
    scripture,
    [
      'Keep discovery (first day dawn) separate from any claimed exact rising timestamp.',
      'Read Matthew 12:40 with Matthew 28:1-6 and Luke 23:50-56 together.',
    ],
    { masterRoute: 'resurrection_timing_source_grounded', claimGovernance: true },
  );
}

function buildSourceGroundedReply({ message, questionIntent = null } = {}) {
  const topic = detectSourceTopic(message);
  if (!topic) return null;

  const questionType = questionIntent?.questionType || 'definition';

  if (topic === 'dietary_law') return dietaryLawReply();
  if (topic === 'sabbath') return sabbathReply({ questionType, message });
  if (topic === 'feast_days') return feastDaysReply();
  if (topic === 'traditions') return traditionsReply();
  if (topic === 'resurrection_timeline') return resurrectionReply(message);
  return null;
}

module.exports = {
  buildSourceGroundedReply,
  detectSourceTopic,
  sabbathReply,
  getBoundariesForTopic,
};
