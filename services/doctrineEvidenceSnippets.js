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

  if (/\b(heaven|heavens|third heaven)\b/.test(lower)) {
    snippets.push({
      topic: 'heavens',
      references: ['Genesis 1:1', '2 Corinthians 12:2', 'Deuteronomy 10:14', 'Psalm 148:1-4'],
      facts: [
        'Answer how many / which heavens the user asked about first',
        '2 Corinthians 12:2 mentions a third heaven',
        'Deuteronomy 10:14 speaks of heaven and heaven of heavens',
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
