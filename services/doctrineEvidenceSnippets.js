/**
 * Doctrine evidence snippets for OpenAI composer — references and facts only, no canned answer prose.
 */

function buildDoctrineEvidenceSnippets(topic = '', message = '') {
  const lower = String(message || '').toLowerCase();
  const snippets = [];

  if (topic === 'sabbath' || /\bsabbath\b/.test(lower)) {
    snippets.push({
      topic: 'sabbath',
      references: [
        'Genesis 2:2-3',
        'Exodus 20:8-11',
        'Isaiah 58:13-14',
        'Luke 4:16',
        'Acts 13:14-15',
        'Acts 17:2',
        'Hebrews 4:9',
      ],
      howToObserveHints: [
        'Cease ordinary work and commerce where possible',
        'Rest and worship',
        'Delight in the LORD on His day',
        'Mercy and doing good are permitted (cf. Matthew 12:11-12)',
      ],
      misreadingsToAvoid: ['Do not answer a HOW question with Constantine/Sunday-change history unless user asked history'],
    });
  }

  if (topic === 'dietary_law' || /\b(pork|swine|unclean|dietary)\b/.test(lower)) {
    snippets.push({
      topic: 'dietary_law',
      references: [
        'Leviticus 11',
        'Deuteronomy 14',
        'Daniel 1:8',
        'Isaiah 66:17',
        'Acts 10:28',
        'Acts 11:1-18',
      ],
      facts: [
        'Swine is listed among unclean animals in Leviticus 11 and Deuteronomy 14',
        'Acts 10:28 — Peter states God showed him not to call any man common or unclean (people/Gentiles context)',
        'Do not treat Acts 10 as automatic permission to eat unclean animals without examining Peter’s explanation in context',
      ],
      yesNoHint: 'For yes/no pork questions: lead with direct yes or no from Scripture, then brief Acts 10 context if needed',
    });
  }

  if (/\b(heaven|heavens|third heaven|firmament|no man hath ascended)\b/.test(lower)) {
    snippets.push({
      topic: 'heavens',
      references: [
        'Genesis 1:1',
        'Genesis 1:6-8',
        'Genesis 1:14-17',
        'John 3:13',
        '2 Corinthians 12:2',
        'Acts 1:9-11',
      ],
      facts: [
        'Scripture uses heaven/heavens in layered ways — firmament/sky, celestial region, and Paul’s third heaven',
        'Genesis 1:6-8 firmament; Genesis 1:14-17 sun/moon/stars in heaven',
        'John 3:13 — no man hath ascended up to heaven but the Son of Man',
        '2 Corinthians 12:2 — Paul caught up to third heaven (vision); not proof believers go there',
        'Do not teach believers go to the third heaven unless Scripture explicitly proves it',
      ],
    });
  }

  if (
    /\b(kingdom|thy kingdom come|new jerusalem|where i go ye cannot come|where i go you cannot come|revelation 21)\b/.test(
      lower
    )
  ) {
    snippets.push({
      topic: 'kingdom',
      references: [
        'Matthew 6:9-10',
        'John 7:33-34',
        'John 8:21',
        'John 13:33',
        'John 14:3',
        'Acts 1:9-11',
        'Revelation 5:10',
        'Revelation 11:15',
        'Revelation 21:1-3',
      ],
      facts: [
        'Matthew 6:10 — thy kingdom come, thy will be done in earth',
        'John 7/8/13 — where I go ye cannot come (present separation before glorification)',
        'John 14:3 — I will come again, and receive you unto myself',
        'Revelation 21:1-3 — holy city comes down; tabernacle of God is with men',
        'Final hope: Christ’s return and kingdom on earth — not unsupported third-heaven relocation',
      ],
    });
  }

  if (/\b(logos|yahweh|jesus).*(old testament|god)|god.*old testament\b/i.test(lower)) {
    snippets.push({
      topic: 'messiah_logos',
      references: ['John 1:1-14', 'Isaiah 9:6', 'Micah 5:2', 'Colossians 1:15-17', 'Hebrews 1:1-3'],
      facts: [
        'Address whether Jesus is the God revealed in the OT — Scripture-first, not church-history lecture',
      ],
    });
  }

  if (/\bwording\b/i.test(lower) || /\bwhy do you say\b/i.test(lower) || /\byahweh\b/i.test(lower)) {
    snippets.push({
      topic: 'wording',
      facts: [
        'User is asking about Buddy’s wording choice, not Sabbath history or Rome',
        'Explain naming choice briefly; do not pivot to Constantine/Laodicea chain',
      ],
    });
  }

  if (/\b(easter|christmas|tradition)\b/i.test(lower)) {
    snippets.push({
      topic: 'traditions',
      references: ['Jeremiah 10:1-5', 'Leviticus 23', 'Mark 7:6-9'],
      facts: [
        'Distinguish biblical feast days from later traditions',
        'Answer whether Easter/Christmas are commanded in Scripture — they are not biblical commands',
      ],
    });
  }

  if (/\b(die|death|soul|grave|sleep)\b/i.test(lower) && /\b(heaven|when we die|after death)\b/i.test(lower)) {
    snippets.push({
      topic: 'death_state',
      references: ['Ecclesiastes 9:5', 'Psalm 146:4', 'John 11:11-14', '1 Thessalonians 4:13-16'],
      facts: ['Scripture-first study of death state; do not teach heaven-at-death as settled without Scripture chain'],
    });
  }

  if (/\bcan you search\b/i.test(lower) && /\bbible|scripture\b/i.test(lower)) {
    snippets.push({
      topic: 'capability',
      facts: [
        'Buddy searches Scripture from embedded Bible evidence and retrieval — not the public internet',
        'Answer honestly: can reference and reason from provided Scripture evidence; not a live web search engine',
      ],
    });
  }

  return snippets;
}

module.exports = {
  buildDoctrineEvidenceSnippets,
};
