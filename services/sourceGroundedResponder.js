function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function detectSourceTopic(message = '') {
  const text = String(message).toLowerCase();

  if (hasAny(text, ['dietary', 'unclean food', 'unclean foods', 'swine', 'pork', 'mouse', 'acts 10', 'acts 11', 'peter vision', 'clean and unclean'])) {
    return 'dietary_law';
  }

  if (hasAny(text, ['sabbath', 'seventh day', 'sunday worship', 'fourth commandment'])) {
    return 'sabbath';
  }

  if (hasAny(text, ['feast day', 'feast days', 'high sabbath', 'leviticus 23', 'passover', 'tabernacles', 'pentecost'])) {
    return 'feast_days';
  }

  if (hasAny(text, ['christmas', 'easter', 'december 25', 'tree out of the forest', 'jeremiah 10'])) {
    return 'traditions';
  }

  if (hasAny(text, ['three days and three nights', 'resurrection timeline', 'matthew 12:40', 'matthew 28', 'first day of the week'])) {
    return 'resurrection_timeline';
  }

  return null;
}

function basePayload(topic, reply, scripture, nextSteps = []) {
  return {
    reply,
    scripture,
    mode: 'study',
    confidence: 'high',
    memory_used: true,
    suggested_settings_change: null,
    orb_state: 'speaking',
    safety_level: 'standard',
    next_steps: nextSteps,
    admin_flags: ['source_grounded_guardrail_used'],
    runtime: { topic, deterministic: true },
    quality: { score: 96, issues: [], passed: true },
  };
}

function dietaryLawReply() {
  return basePayload(
    'dietary_law',
    [
      'Source-grounded answer:',
      '',
      'The Bible gives the clean and unclean distinction in Leviticus 11 and Deuteronomy 14. Peter’s vision should be read with Peter’s own explanation, not separated from it.',
      '',
      'Line upon line:',
      '1. Leviticus 11 and Deuteronomy 14 define clean and unclean animals.',
      '2. Daniel 1 shows Daniel refusing the king’s food and choosing pulse and water.',
      '3. Acts 10:14 shows Peter saying, “Not so, Lord; for I have never eaten any thing that is common or unclean.”',
      '4. Acts 10:28 gives Peter’s own explanation: God showed him not to call any man common or unclean.',
      '5. Acts 11:1-18 repeats Peter rehearsing the matter to the brethren.',
      '6. Isaiah 66:17 should be included in a full continuity study because it mentions swine’s flesh, the abomination, and the mouse.',
      '',
      'Therefore Acts 10 should not be presented by itself as a direct permission statement to eat unclean animals. The text itself records Peter explaining the vision as dealing with people and Gentile inclusion.',
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

function sabbathReply() {
  return basePayload(
    'sabbath',
    [
      'Source-grounded answer:',
      '',
      'Scripture explicitly identifies the seventh day as the Sabbath. Genesis 2:2-3 says God blessed and sanctified the seventh day. Exodus 20:8-11 commands the Sabbath and identifies the seventh day as the Sabbath of the LORD thy God.',
      '',
      'Line upon line study path: Genesis 2:2-3, Exodus 20:8-11, Isaiah 58:13-14, Luke 4:16, Acts 13:42-44, Acts 17:2, Hebrews 4:9.',
      '',
      'The app should not present later Sunday practice as an explicit Bible command changing the seventh-day Sabbath. If history is discussed, it must be separated from the biblical text.',
    ].join('\n'),
    [
      { reference: 'Genesis 2:2-3', text: '', reason: 'seventh day blessed and sanctified' },
      { reference: 'Exodus 20:8-11', text: '', reason: 'fourth commandment' },
      { reference: 'Isaiah 58:13-14', text: '', reason: 'Sabbath delight and honor' },
      { reference: 'Luke 4:16', text: '', reason: 'Jesus customarily in synagogue on the Sabbath' },
      { reference: 'Acts 17:2', text: '', reason: 'Paul reasoning on Sabbath days' },
      { reference: 'Hebrews 4:9', text: '', reason: 'Sabbath-rest language for the people of God' },
    ],
    ['Compare explicit Sabbath passages first, then discuss later history separately.']
  );
}

function feastDaysReply() {
  return basePayload(
    'feast_days',
    [
      'Source-grounded answer:',
      '',
      'Leviticus 23 is the core chapter for the LORD’s appointed feasts and holy convocations. A Bible-first answer should begin with that chapter before discussing later religious holidays.',
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
      'Source-grounded answer:',
      '',
      'A Bible-first answer should first ask: where is this practice commanded in Scripture? If it is not explicitly commanded, that should be clearly stated before discussing history.',
      '',
      'Relevant passages for testing traditions include Jeremiah 10:1-4, Mark 7:6-13, and Colossians 2:8. These passages warn about learning vain customs, making commandments void through tradition, and being spoiled through philosophy and traditions of men.',
      '',
      'Historical origins may be discussed after the biblical test, but they must be labeled as history, not Scripture.',
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
      'Source-grounded answer:',
      '',
      'Matthew 28:1-6 says the women came as it began to dawn toward the first day of the week, and the angel said, “He is not here: for he is risen.” That wording shows He was already risen when they arrived. The passage does not by itself state the exact moment He rose.',
      '',
      'Matthew 12:40 says the Son of man would be three days and three nights in the heart of the earth. Any chronology should be tested against that statement together with Matthew 28, Mark 16, Luke 24, and John 20.',
    ].join('\n'),
    [
      { reference: 'Matthew 12:40', text: '', reason: 'three days and three nights' },
      { reference: 'Matthew 28:1-6', text: 'He is not here: for he is risen, as he said.', reason: 'already risen when women arrived' },
      { reference: 'Mark 16:1-6', text: '', reason: 'resurrection account' },
      { reference: 'Luke 24:1-6', text: '', reason: 'resurrection account' },
      { reference: 'John 20:1-8', text: '', reason: 'resurrection account' },
    ],
    ['Compare Matthew 12:40 with all four resurrection accounts.']
  );
}

function buildSourceGroundedReply({ message }) {
  const topic = detectSourceTopic(message);
  if (topic === 'dietary_law') return dietaryLawReply();
  if (topic === 'sabbath') return sabbathReply();
  if (topic === 'feast_days') return feastDaysReply();
  if (topic === 'traditions') return traditionsReply();
  if (topic === 'resurrection_timeline') return resurrectionReply();
  return null;
}

module.exports = { buildSourceGroundedReply, detectSourceTopic };
