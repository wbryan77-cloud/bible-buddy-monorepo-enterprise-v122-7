/**
 * Phase 5E — Map natural language to Bible concepts (BNC bridge, not doctrine authority).
 */

const fs = require('fs');
const path = require('path');
const {
  detectConceptFromGraph,
  getGraphNode,
  MERGED_GRAPH,
  hasExplicitConcept,
} = require('./bibleConceptGraph');


const EXPLICIT_SCRIPTURE_REFERENCE_RE =
  /\b(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|1\s*samuel|2\s*samuel|1\s*kings|2\s*kings|1\s*chronicles|2\s*chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song\s+of\s+solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|1\s*corinthians|2\s*corinthians|galatians|ephesians|philippians|colossians|1\s*thessalonians|2\s*thessalonians|1\s*timothy|2\s*timothy|titus|philemon|hebrews|james|1\s*peter|2\s*peter|1\s*john|2\s*john|3\s*john|jude|revelation)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?\b/i;

const LIFE_DECISION_RE =
  /\b(decision|decide|help me choose|help me decide|what should i do|next step|life choice)\b/i;

const BNC_GENERATED_PATH = path.join(
  __dirname,
  '..',
  'docs',
  'bible-learning',
  'bible-natural-concordance.generated.json',
);

const TYPO_MAP = {
  desalation: 'desolation',
  desolaiton: 'desolation',
  millium: 'millennium',
  millenium: 'millennium',
  scriture: 'scripture',
  scritures: 'scriptures',
  sed: 'sex',
  sat: 'saturday',
  saturday: 'saturday',
  'loss her': 'lose her',
  'abomination talk about': 'abomination spoken',
  'abomination talk about by': 'abomination spoken by',
};

function normalizeBibleQuestion(message = '') {
  let m = String(message || '').trim().toLowerCase();
  for (const [from, to] of Object.entries(TYPO_MAP)) {
    m = m.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), to);
  }
  m = m.replace(/\s+/g, ' ').trim();
  return m;
}

function loadBncEntries() {
  try {
    if (fs.existsSync(BNC_GENERATED_PATH)) {
      const data = JSON.parse(fs.readFileSync(BNC_GENERATED_PATH, 'utf8'));
      return data.entries || [];
    }
  } catch {
    /* fallback to graph */
  }
  return [];
}

function scorePhraseMatch(normalized, phrase = '') {
  const p = String(phrase).toLowerCase().trim();
  if (!p || !normalized) return 0;
  if (normalized.includes(p)) return 1;
  const words = p.split(/\s+/).filter((w) => w.length > 3);
  if (!words.length) return 0;
  const hits = words.filter((w) => normalized.includes(w));
  return hits.length / words.length;
}

function rankConceptCandidates(message = '', context = {}) {
  const normalized = normalizeBibleQuestion(message);
  const candidates = [];
  const bnc = loadBncEntries();

  for (const entry of bnc) {
    let score = 0;
    const phrases = [
      ...(entry.naturalPhrases || []),
      ...(entry.aliases || []),
      ...(entry.misspellings || []),
    ];
    for (const phrase of phrases) {
      score = Math.max(score, scorePhraseMatch(normalized, phrase));
    }
    if (entry.bibleTerms) {
      for (const term of entry.bibleTerms) {
        score = Math.max(score, scorePhraseMatch(normalized, term));
      }
    }
    if (score > 0.2) {
      candidates.push({
        id: entry.conceptId,
        score,
        source: 'bnc_generated',
        needsHumanReview: entry.needsHumanReview,
      });
    }
  }

  for (const [id, node] of Object.entries(MERGED_GRAPH)) {
    const fromGraph = detectConceptFromGraph(message);
    if (fromGraph && fromGraph.id === id) {
      candidates.push({ id, score: 0.95, source: 'graph' });
    }
    for (const ex of node.examples || []) {
      const s = scorePhraseMatch(normalized, ex);
      if (s >= 0.5) candidates.push({ id, score: s * 0.9, source: 'example' });
    }
  }

  const merged = new Map();
  for (const c of candidates) {
    const prev = merged.get(c.id);
    if (!prev || c.score > prev.score) merged.set(c.id, c);
  }
  return [...merged.values()].sort((a, b) => b.score - a.score);
}

function detectSemanticConcept(message = '', context = {}) {
  const m = String(message || '').trim();
  if (!m) return null;

  const normalized = normalizeBibleQuestion(m);
  if (/\bzephyrian\b/i.test(normalized)) return null;

  // Explicit Scripture references are owned by Scripture retrieval,
  // not by the semantic concept bridge.
  if (EXPLICIT_SCRIPTURE_REFERENCE_RE.test(normalized)) return null;

  // Ordinary life decisions stay companion-owned. Even when the
  // user asks for biblical wisdom, do not invent a nearest doctrine.
  if (LIFE_DECISION_RE.test(normalized)) return null;

  if (/parable/i.test(m) && !/spilled seed|spill.*seed|brother.*seed|onan\b|genesis\s*38/i.test(m)) {
    const ranked = rankConceptCandidates(m, context);
    if (!ranked.length || ranked[0].score < 0.75) return null;
  }

  if (/\babomination\b/i.test(normalized) || /\bdesolation\b/i.test(normalized)) {
    if (!/\b(pork|swine|shellfish|unclean food|eat pork)\b/i.test(normalized)) {
      return getGraphNode('abomination_desolation');
    }
  }

  if (
    /\b(heaven coming to earth|is heaven coming|kingdom coming to earth|kingdom coming here)\b/i.test(
      normalized,
    )
  ) {
    return getGraphNode('kingdom_on_earth');
  }

  if (/\bcan you have sex\b/i.test(m) || /\bcan we have sex\b/i.test(m)) {
    return getGraphNode('fornication_sexual_sin');
  }

  if (/\bsed\b/i.test(m) || /\bmay want to have sex\b/i.test(normalized)) {
    return getGraphNode('sexual_boundaries_dating') || getGraphNode('fornication_sexual_sin');
  }

  if (/pull out|have a baby|try to have a baby/i.test(normalized) && /sex/i.test(normalized)) {
    return getGraphNode('sexual_boundaries_dating') || getGraphNode('fornication_sexual_sin');
  }

  if (/spilled seed|spill.*seed|brother.*seed|onan\b/i.test(normalized)) {
    return getGraphNode('onan_seed_context');
  }

  if (/\boverwhelmed\b/i.test(normalized) || /\bmy feeling overwhelmed\b/i.test(normalized)) {
    return getGraphNode('overwhelmed_comfort');
  }

  if (/\bpray with me\b/i.test(m)) {
    return getGraphNode('prayer_with_user');
  }

  if (/\blord'?s sabbath\b/i.test(m) || /\bfriday\b.*\bsat\b/i.test(m) || /\bsaturday or sunday\b/i.test(m)) {
    return getGraphNode('sabbath_seventh_day') || getGraphNode('sabbath');
  }

  const ranked = rankConceptCandidates(m, context);
  const top = ranked[0] || null;
  const second = ranked[1] || null;
  const margin = top ? top.score - (second?.score || 0) : 0;

  // Semantic promotion requires high confidence and separation
  // from the next candidate. Low confidence resolves to null.
  if (top && top.score >= 0.75 && margin >= 0.15) {
    return getGraphNode(top.id);
  }

  // Graph fallback is permitted only when the user supplied an
  // explicit canonical concept, never merely the closest concept.
  return hasExplicitConcept(m) ? detectConceptFromGraph(m) : null;
}

function explainConceptMatch(message = '', concept = null) {
  if (!concept) return { matched: false };
  const normalized = normalizeBibleQuestion(message);
  return {
    matched: true,
    conceptId: concept.id,
    normalizedMessage: normalized,
    canonicalLabel: concept.canonicalLabel || concept.id,
    strictTopic: concept.strictTopic || null,
  };
}

function hasStrongNewTopic(message = '', previousTopic = null) {
  const concept = detectSemanticConcept(message);
  if (!concept) return false;
  const prevConcept = previousTopic;
  if (!prevConcept) return true;
  if (concept.id === prevConcept) return false;
  const ranked = rankConceptCandidates(message);
  return ranked[0]?.score >= 0.55;
}

function shouldClearStaleTopic(message = '', previousTopic = null, context = {}) {
  const concept = detectSemanticConcept(message, context);
  if (!concept) return false;

  const prev =
    previousTopic ||
    context.activeDoctrineTopic ||
    context.activeBibleConcept ||
    context.lastAnsweredConcept ||
    null;

  if (!prev) return false;

  const prevNode = getGraphNode(prev) || { id: prev };
  const forbidden = prevNode.forbiddenConfusions || [];
  const newForbidden = concept.forbiddenConfusions || [];

  if (concept.id !== prev && hasStrongNewTopic(message, prev)) {
    if (concept.strictTopic && context.activeDoctrineTopic && concept.strictTopic !== context.activeDoctrineTopic) {
      // Explicit strict-doctrine switch — setActiveDoctrineConversation records previous topic.
      return false;
    }
    if (concept.id === 'abomination_desolation' && /dietary|pork|acts_10/i.test(prev)) return true;
    if (concept.id === 'kingdom_on_earth' && /heaven_layers|third_heaven/i.test(prev)) return true;
    if (concept.id === 'sabbath_seventh_day' && /fornication|sexual/i.test(prev)) return true;
    return true;
  }

  for (const f of newForbidden) {
    if (String(prev).includes(f) || String(prev).replace(/_/g, ' ').includes(String(f).replace(/_/g, ' '))) {
      return true;
    }
  }
  return false;
}

module.exports = {
  normalizeBibleQuestion,
  detectSemanticConcept,
  rankConceptCandidates,
  explainConceptMatch,
  hasStrongNewTopic,
  shouldClearStaleTopic,
  TYPO_MAP,
  BNC_GENERATED_PATH,
};
