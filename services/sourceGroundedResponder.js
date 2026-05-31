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

  if (hasAny(text, ['resurrection', 'three days and three nights', 'resurrection timeline', 'matthew 12:40', 'matthew 28', 'mark 16', 'luke 24', 'john 20', 'daniel 9:27', 'midst of the week', 'first day of the week'])) {
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

function resurrectionReply() {
  return basePayload(
    'resurrection_timeline',
    [
      "Let's read Scripture line upon line before stating any chronology.",
      '',
      'Anchor passages:',
      '1. Matthew 12:40 — three days and three nights in the heart of the earth.',
      '2. Daniel 9:27 — in the midst of the week he shall cause the sacrifice and the oblation to cease.',
      '3. Matthew 28:1-6 — women came toward dawn on the first day of the week; He was already risen.',
      '4. Mark 16:1-6, Luke 24:1-6, John 20:1-8 — resurrection accounts.',
      '',
      'What these passages state explicitly:',
      '• Daniel 9:27 places a decisive event in the middle of the week in prophetic Scripture.',
      '• Matthew 12:40 requires three days and three nights, not a partial count.',
      '• Matthew 28:1-6 records Christ already risen when the women arrived at dawn.',
      '',
      'Chronology (tested against the passages above):',
      'Wednesday afternoon — Crucifixion',
      'Before sunset — Burial',
      'Thursday — Day 1 / Night 1',
      'Friday — Day 2 / Night 2',
      'Saturday — Day 3 / Night 3',
      'Before dawn toward the first day of the week — Already risen (Matthew 28:1-6)',
      '',
      'This chronology is Scripture-first. Where the exact hour is not stated, that limit should be acknowledged rather than filled from later tradition.',
    ].join('\n'),
    [
      { reference: 'Daniel 9:27', text: '', reason: 'in the midst of the week; sacrifice and oblation cease' },
      { reference: 'Matthew 12:40', text: '', reason: 'three days and three nights in the heart of the earth' },
      { reference: 'Matthew 28:1-6', text: 'He is not here: for he is risen, as he said.', reason: 'already risen when women arrived at dawn' },
      { reference: 'Mark 16:1-6', text: '', reason: 'resurrection account' },
      { reference: 'Luke 24:1-6', text: '', reason: 'resurrection account' },
      { reference: 'John 20:1-8', text: '', reason: 'resurrection account' },
    ],
    [
      'Read Daniel 9:27, Matthew 12:40, and all four resurrection accounts together before forming a chronology.',
    ]
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
  if (topic === 'resurrection_timeline') return resurrectionReply();
  return null;
}

module.exports = {
  buildSourceGroundedReply,
  detectSourceTopic,
  sabbathReply,
  getBoundariesForTopic,
};
