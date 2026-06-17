/**
 * Phase 5F — Word-sense bridge (not doctrine authority).
 */

const fs = require('fs');
const path = require('path');
const { normalizeBibleQuestion, TYPO_MAP } = require('./bibleSemanticConceptNormalizer');
const { MERGED_GRAPH, getGraphWitnesses } = require('./bibleConceptGraph');

const BNC_PATH = path.join(__dirname, '..', 'docs', 'bible-learning', 'bible-natural-concordance.generated.json');

const BARE_CONTINUATION_ONLY_RE = /^(show me another|another verse|give me more|more scripture)/i;

const STEM_SUFFIXES = ['ing', 'ed', 'es', 's'];

function tokenizeMessage(message = '') {
  const normalized = normalizeBibleQuestion(message);
  return normalized.split(/\s+/).filter((t) => t.length > 0);
}

function normalizeTypos(tokens = []) {
  return tokens.map((t) => {
    if (TYPO_MAP[t]) return TYPO_MAP[t];
    return t;
  });
}

function stemWord(word = '') {
  let w = String(word).toLowerCase();
  for (const suf of STEM_SUFFIXES) {
    if (w.length > 4 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

function loadBncAliases() {
  try {
    if (fs.existsSync(BNC_PATH)) {
      const data = JSON.parse(fs.readFileSync(BNC_PATH, 'utf8'));
      const map = {};
      for (const e of data.entries || []) {
        const phrases = [
          ...(e.aliases || []),
          ...(e.naturalPhrases || []),
          ...(e.misspellings || []),
        ];
        map[e.conceptId] = { phrases, refs: e.scriptureRefs || [], forbidden: e.forbiddenConfusions || [] };
      }
      return map;
    }
  } catch {
    /* graph fallback */
  }
  return {};
}

function scoreTokensAgainstPhrases(tokens, phrases = []) {
  const joined = tokens.join(' ');
  let best = 0;
  for (const phrase of phrases) {
    const p = String(phrase).toLowerCase();
    if (joined.includes(p)) return 1;
    const words = p.split(/\s+/).filter((w) => w.length > 2);
    if (!words.length) continue;
    const hits = words.filter((w) => joined.includes(w));
    best = Math.max(best, hits.length / words.length);
  }
  return best;
}

function detectWordSense(message = '', context = {}) {
  const tokens = normalizeTypos(tokenizeMessage(message));
  const joined = tokens.join(' ');
  const trimmed = String(message || '').trim();

  if (
    /^(show me another( verse)?|another verse|give me more( scriptures?)?|more scriptures?)$/i.test(trimmed) ||
    (BARE_CONTINUATION_ONLY_RE.test(joined) && tokens.length <= 4)
  ) {
    return { sense: null, candidates: [], ambiguous: false, skipped: 'bare_continuation' };
  }
  const candidates = [];
  const bnc = loadBncAliases();

  for (const [id, node] of Object.entries(MERGED_GRAPH)) {
    let score = 0;
    const phrases = [
      ...(node.aliases || []),
      ...(node.naturalPhrases || []),
      ...(bnc[id]?.phrases || []),
    ];
    score = scoreTokensAgainstPhrases(tokens, phrases);
    if (score > 0.35) {
      candidates.push({ conceptId: id, score, source: 'graph_bnc' });
    }
  }

  // Context-sensitive word senses
  if (/\bsed\b|\bsex\b/i.test(joined) && /\b(dating|relationship|marriage|sleep|together|want)\b/i.test(joined)) {
    candidates.push({ conceptId: 'fornication_sexual_sin', score: 0.9, source: 'context_sex' });
    candidates.push({ conceptId: 'sexual_boundaries_dating', score: 0.85, source: 'context_sex' });
  }

  if (
    /\bseed\b/i.test(joined) &&
    /\b(spill|spilled|ground|onan|genesis\s*38|multiply|sperm|copulation)\b/i.test(joined)
  ) {
    candidates.push({ conceptId: 'onan_seed_context', score: 0.92, source: 'context_seed' });
  }

  if (/\bdaniel\b/i.test(joined) && !/\b(abomination|desolation|holy place|prophecy|maketh desolate)\b/i.test(joined)) {
    candidates.push({ conceptId: null, score: 0.2, source: 'daniel_ambiguous', needsClarification: true });
  }

  if (
    /\b(heaven|heavens)\b/i.test(joined) &&
    /\b(coming to earth|kingdom|new jerusalem|earth|here)\b/i.test(joined)
  ) {
    candidates.push({ conceptId: 'kingdom_on_earth', score: 0.9, source: 'context_kingdom_earth' });
  } else if (/^heaven\b|\bheavens\b/i.test(joined) && joined.split(/\s+/).length <= 3) {
    candidates.push({ conceptId: 'heaven_layers', score: 0.6, source: 'heaven_ambiguous' });
  }

  if (
    context.lastAnsweredConcept === 'abomination_desolation' &&
    /\b(person|this a person|is this a person)\b/i.test(joined)
  ) {
    candidates.push({ conceptId: 'abomination_desolation', score: 0.95, source: 'actor_followup' });
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (!top || top.needsClarification || top.score < 0.62) {
    return { sense: null, candidates: candidates.slice(0, 5), ambiguous: !!top?.needsClarification };
  }
  return {
    sense: top.conceptId,
    score: top.score,
    candidates: candidates.slice(0, 5),
    ambiguous: false,
  };
}

function mapWordsToConceptCandidates(message = '', context = {}) {
  const sense = detectWordSense(message, context);
  return sense.candidates || [];
}

function rejectUnsafeWordSenseMatch({ message = '', concept = null } = {}) {
  if (!concept) return { ok: false, reason: 'no_concept' };
  const id = concept.id || concept;
  const witnesses = getGraphWitnesses(id);
  const available = witnesses.all || witnesses.direct || [];
  if (available.length === 0) {
    return { ok: false, reason: 'no_witnesses' };
  }
  const forbidden = concept.forbiddenConfusions || [];
  const m = String(message).toLowerCase();
  for (const f of forbidden) {
    if (m.includes(String(f).replace(/_/g, ' '))) {
      return { ok: false, reason: 'forbidden_confusion', field: f };
    }
  }
  return { ok: true, witnessCount: available.length };
}

function explainWordSenseMatch(message = '', concept = null) {
  const sense = detectWordSense(message);
  const id = concept?.id || concept || sense.sense;
  if (!id) return 'No confident word-sense match; clarification may be needed.';
  const node = MERGED_GRAPH[id];
  const refs = (getGraphWitnesses(id).direct || []).slice(0, 3);
  return `Phrase maps to ${id} via word-sense bridge (${node?.canonicalLabel || id}). Witnesses: ${refs.join(', ')}.`;
}

module.exports = {
  tokenizeMessage,
  normalizeTypos,
  stemWord,
  detectWordSense,
  mapWordsToConceptCandidates,
  rejectUnsafeWordSenseMatch,
  explainWordSenseMatch,
};
