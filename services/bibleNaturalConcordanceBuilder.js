#!/usr/bin/env node
/**
 * Phase 5E — Scan project assets and generate BNC semantic map (generated file only).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'docs', 'bible-learning', 'bible-natural-concordance.generated.json');
const { MERGED_GRAPH } = require('../services/bibleConceptGraph');

const SEED_CONCEPTS = {
  abomination_desolation: {
    canonicalLabel: 'Abomination of desolation',
    aliases: [
      'abomination',
      'abomination of desolation',
      'desolation',
      'desalation',
      'abomination spoken of by Daniel',
      'abomination talked about by Daniel',
      'Daniel abomination',
      'holy place',
      'stand in the holy place',
    ],
    naturalPhrases: [
      'the abomination talk about by Daniel',
      'abomination of desalation',
      'what is the abomination of desolation',
    ],
    misspellings: ['desalation', 'desolaiton'],
    bibleTerms: ['abomination', 'desolation', 'holy place'],
    scriptureRefs: ['Daniel 9:27', 'Daniel 11:31', 'Daniel 12:11', 'Matthew 24:15', 'Mark 13:14'],
    forbiddenConfusions: ['dietary_law', 'pork', 'clean_unclean_food'],
    needsHumanReview: true,
  },
  sexual_boundaries_dating: {
    canonicalLabel: 'Sexual boundaries and dating',
    aliases: ['can you have sex', 'sex without marriage', 'premarital sex', 'sleeping together', 'sexual intimacy'],
    naturalPhrases: ['if I have sex', 'she may want to have sex', 'can you have sex'],
    misspellings: ['sed'],
    bibleTerms: ['fornication', 'marriage', 'holiness'],
    scriptureRefs: ['1 Corinthians 6:18', '1 Thessalonians 4:3-5', 'Hebrews 13:4'],
    forbiddenConfusions: ['sexual mechanics', 'contraception advice'],
    needsHumanReview: false,
  },
  onan_seed_context: {
    canonicalLabel: 'Onan and spilled seed (Genesis 38)',
    aliases: ['spilled seed', 'spill seed', 'brother spilled seed', 'onan', 'levirate duty'],
    naturalPhrases: ['parable about the brother that spilled seed', 'brother that spilled seed'],
    scriptureRefs: ['Genesis 38:9-10', 'Genesis 1:28', 'Deuteronomy 25:5-6'],
    needsHumanReview: true,
  },
  sabbath_seventh_day: {
    canonicalLabel: 'Sabbath seventh day',
    aliases: ['lords sabbath', 'saturday or sunday', 'seventh day', 'friday to sat'],
    naturalPhrases: ['Is the Lords Sabbath Friday to Sat or Sunday'],
    scriptureRefs: ['Exodus 20:8-11', 'Deuteronomy 5:12-15'],
    needsHumanReview: false,
  },
  sabbath_how_to_keep: {
    canonicalLabel: 'How to keep the Sabbath',
    aliases: ['how to keep the sabbath', 'how are we supposed to keep it', 'keep the sabbath'],
    scriptureRefs: ['Exodus 20:8-11', 'Isaiah 58:13-14'],
    needsHumanReview: false,
  },
  third_heaven: {
    canonicalLabel: 'Third heaven',
    aliases: ['third heaven', 'three heavens'],
    scriptureRefs: ['2 Corinthians 12:2'],
    forbiddenConfusions: ['kingdom_on_earth'],
    needsHumanReview: false,
  },
  new_jerusalem_comes_down: {
    canonicalLabel: 'New Jerusalem comes down',
    aliases: ['new jerusalem comes down', 'holy city comes down'],
    scriptureRefs: ['Revelation 21:1-3', 'Revelation 21:2'],
    needsHumanReview: false,
  },
  death_state_sleep: {
    canonicalLabel: 'Death as sleep',
    aliases: ['death as sleep', 'dead know nothing'],
    scriptureRefs: ['Ecclesiastes 9:5', 'John 11:11-14'],
    needsHumanReview: false,
  },
  acts_10_people_not_food: {
    canonicalLabel: 'Acts 10 people not food',
    aliases: ['acts 10', 'peters vision', 'gentiles acts 10'],
    scriptureRefs: ['Acts 10:28', 'Acts 10:14', 'Acts 11:1-18'],
    strictTopic: 'acts_10',
    needsHumanReview: false,
  },
  millennial_kingdom: {
    canonicalLabel: 'Millennial kingdom',
    aliases: ['millennium', 'millennial kingdom', 'thousand years'],
    scriptureRefs: ['Revelation 20:4-6'],
    needsHumanReview: true,
  },
  prayer_with_user: {
    canonicalLabel: 'Pray with user',
    aliases: ['pray with me', 'can you pray with me'],
    needsHumanReview: false,
  },
  overwhelmed_comfort: {
    canonicalLabel: 'Overwhelmed comfort',
    aliases: ['overwhelmed', 'my feeling overwhelmed', 'feeling overwhelmed'],
    scriptureRefs: ['Psalm 34:18', '1 Peter 5:7'],
    needsHumanReview: false,
  },
  dating_anxiety: {
    canonicalLabel: 'Dating anxiety',
    aliases: ['dating anxiety', 'nervous about dating'],
    needsHumanReview: false,
  },
  repentance: {
    canonicalLabel: 'Repentance',
    aliases: ['repent', 'repentance', 'turn from sin'],
    scriptureRefs: ['Acts 2:38', '1 John 1:9'],
    needsHumanReview: false,
  },
  faith_obedience: {
    canonicalLabel: 'Faith and obedience',
    aliases: ['faith and obedience', 'obey God', 'faith without works'],
    scriptureRefs: ['James 2:17', 'Hebrews 11:1'],
    needsHumanReview: false,
  },
};

function scanEvidenceCards() {
  const dir = path.join(ROOT, 'services', 'evidenceCards');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.card.js'));
  const topics = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const topicMatch = text.match(/topic:\s*['"]([^'"]+)['"]/);
    if (topicMatch) topics.push({ file, topic: topicMatch[1] });
  }
  return topics;
}

function scanPhaseReports() {
  const reports = fs.readdirSync(ROOT).filter((f) => /^Phase[45].*\.md$/i.test(f));
  const phrases = [];
  for (const file of reports.slice(0, 30)) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const matches = text.match(/"([^"]{12,80})"/g) || [];
    for (const m of matches.slice(0, 20)) {
      phrases.push({ file, phrase: m.replace(/"/g, '') });
    }
  }
  return phrases;
}

function buildFromGraph() {
  const entries = [];
  for (const [id, node] of Object.entries(MERGED_GRAPH)) {
    entries.push({
      conceptId: id,
      canonicalLabel: id.replace(/_/g, ' '),
      aliases: (node.examples || []).slice(0, 10),
      naturalPhrases: (node.synonyms || [])
        .map((re) => re.source.replace(/\\b/g, '').replace(/\\/g, '').slice(0, 60))
        .slice(0, 8),
      relatedWords: node.relatedConcepts || [],
      bibleTerms: [],
      scriptureRefs: [...(node.directWitnesses || []).slice(0, 6)],
      sourceFiles: ['services/bibleConceptGraph.js', 'services/bibleConceptConcordance.js'],
      strictTopic: node.strictTopic || null,
      confidence: 0.85,
      needsHumanReview: false,
      forbiddenConfusions: node.forbiddenConfusions || [],
    });
  }
  return entries;
}

function mergeSeed(entries) {
  const map = new Map(entries.map((e) => [e.conceptId, e]));
  for (const [conceptId, seed] of Object.entries(SEED_CONCEPTS)) {
    const existing = map.get(conceptId) || { conceptId };
    map.set(conceptId, {
      ...existing,
      ...seed,
      conceptId,
      sourceFiles: [...new Set([...(existing.sourceFiles || []), 'bibleNaturalConcordanceBuilder.js'])],
    });
  }
  return [...map.values()];
}

function buildBnc() {
  const evidenceTopics = scanEvidenceCards();
  const reportPhrases = scanPhaseReports();
  const entries = mergeSeed(buildFromGraph());

  const output = {
    generatedAt: new Date().toISOString(),
    version: 'phase5e-1',
    disclaimer: 'BNC is a language bridge only — not doctrine authority. All entries pending_review until human review.',
    entryCount: entries.length,
    evidenceCardTopics: evidenceTopics,
    sampledReportPhrases: reportPhrases.slice(0, 40),
    entries,
  };

  const dir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  return output;
}

if (require.main === module) {
  const out = buildBnc();
  console.log(`BNC generated: ${OUT_PATH} (${out.entryCount} entries)`);
}

module.exports = { buildBnc, OUT_PATH, SEED_CONCEPTS };
